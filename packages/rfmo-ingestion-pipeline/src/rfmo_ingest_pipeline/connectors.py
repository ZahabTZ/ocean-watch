from __future__ import annotations

import re
import time
from abc import ABC, abstractmethod
from datetime import date
from html import unescape
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urldefrag, urljoin, urlparse
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

from rfmo_ingest_pipeline.models import DocumentCategory, DocumentRef, ParsedDocument, RawDocument


LINK_RE = re.compile(r'<a[^>]+href=["\'](?P<href>[^"\']+)["\'][^>]*>(?P<text>.*?)</a>', re.IGNORECASE | re.DOTALL)
TAG_RE = re.compile(r"<[^>]+>")
DATE_PATTERNS = [
    re.compile(r"(20\d{2}-\d{2}-\d{2})"),
    re.compile(r"([0-3]?\d/[0-1]?\d/20\d{2})"),
    re.compile(
        r"([0-3]?\d\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})",
        re.IGNORECASE,
    ),
]
DOC_NUMBER_RE = re.compile(r"\b(?:CMM|REC|RES|Recommendation|Resolution)\s*[-:]?\s*([0-9]{4}[-/][0-9]{1,3})\b", re.IGNORECASE)
MEETING_REF_RE = re.compile(r"\b(?:COM|WCPFC|IOTC)[-_ ]?(?:\d{1,2}|20\d{2})\b", re.IGNORECASE)
POLICY_ID_RE = re.compile(
    r"\b(?:CMM|REC|RES|Recommendation|Resolution|Circular)\s*[-:]?\s*(?:\d{4}[-/]\d{1,3}|[A-Z]{1,4}-\d{2,4})\b",
    re.IGNORECASE,
)


class RFMOAdapter(ABC):
    name: str
    rfmo: str

    @abstractmethod
    def list_documents(self) -> list[DocumentRef]:
        raise NotImplementedError

    @abstractmethod
    def fetch_document(self, ref: DocumentRef) -> RawDocument:
        raise NotImplementedError

    @abstractmethod
    def extract_metadata(self, raw: RawDocument, ref: DocumentRef) -> ParsedDocument:
        raise NotImplementedError


class HtmlRFMOAdapter(RFMOAdapter):
    def __init__(
        self,
        name: str,
        rfmo: str,
        category_indexes: dict[DocumentCategory, list[str]],
        user_agent: str,
        timeout_seconds: int = 30,
        min_request_interval_seconds: float = 0.25,
        respect_robots: bool = True,
    ) -> None:
        self.name = name
        self.rfmo = rfmo
        self.category_indexes = category_indexes
        self.user_agent = user_agent
        self.timeout_seconds = timeout_seconds
        self.min_request_interval_seconds = min_request_interval_seconds
        self.respect_robots = respect_robots
        self._robots_cache: dict[str, RobotFileParser] = {}
        self._last_request_at = 0.0
        self._last_filtered_out = 0
        self._last_scanned = 0

    def list_documents(self) -> list[DocumentRef]:
        refs: list[DocumentRef] = []
        seen_urls: set[str] = set()
        scanned_links = 0
        filtered_out = 0

        for category, index_urls in self.category_indexes.items():
            for index_url in index_urls:
                try:
                    raw = self._fetch(index_url)
                    html_text = raw.body.decode("utf-8", errors="replace")
                except Exception:
                    continue

                for href, link_text, context in self._extract_links(html_text):
                    scanned_links += 1
                    absolute = urldefrag(urljoin(index_url, href))[0]
                    if absolute in seen_urls:
                        continue
                    if absolute == urldefrag(index_url)[0]:
                        filtered_out += 1
                        continue
                    if not self._is_document_candidate(absolute, link_text, context):
                        filtered_out += 1
                        continue

                    seen_urls.add(absolute)
                    refs.append(
                        DocumentRef(
                            rfmo=self.rfmo,
                            source_url=absolute,
                            document_type=category,
                            index_url=index_url,
                            title_hint=self._clean_text(link_text)[:240] or self._filename_from_url(absolute),
                            published_date=self._extract_date(context),
                            document_number=self._extract_document_number(f"{link_text} {context}"),
                            meeting_reference=self._extract_meeting_reference(f"{link_text} {context}"),
                            rfmo_region=self._default_region(),
                            metadata={"queue": "hot"},
                        )
                    )

        self._last_scanned = scanned_links
        self._last_filtered_out = filtered_out
        return refs

    def fetch_document(self, ref: DocumentRef) -> RawDocument:
        return self._fetch(ref.source_url)

    def last_scan_counts(self) -> tuple[int, int]:
        return self._last_scanned, self._last_filtered_out

    def extract_metadata(self, raw: RawDocument, ref: DocumentRef) -> ParsedDocument:
        content_type = (raw.content_type or "").lower()
        text = ref.title_hint or self._filename_from_url(ref.source_url)
        publication_date = ref.published_date
        if "html" in content_type:
            html_text = raw.body.decode("utf-8", errors="replace")
            page_title = self._extract_html_title(html_text)
            text = page_title or text
            publication_date = publication_date or self._extract_date(html_text)

        return ParsedDocument(
            title=text,
            publication_date=publication_date,
            document_category=ref.document_type,
            document_number=ref.document_number,
            meeting_reference=ref.meeting_reference,
            rfmo_region=ref.rfmo_region,
        )

    def _fetch(self, url: str) -> RawDocument:
        self._wait_for_rate_limit()
        self._assert_allowed_by_robots(url)

        req = Request(url, headers={"User-Agent": self.user_agent})
        try:
            with urlopen(req, timeout=self.timeout_seconds) as resp:
                headers = {k: v for k, v in resp.headers.items()}
                body = resp.read()
                return RawDocument(
                    source_url=url,
                    status_code=getattr(resp, "status", 200),
                    headers=headers,
                    content_type=resp.headers.get("Content-Type"),
                    body=body,
                )
        except (HTTPError, URLError) as exc:
            raise RuntimeError(f"Failed to fetch URL: {url}") from exc

    def _wait_for_rate_limit(self) -> None:
        elapsed = time.monotonic() - self._last_request_at
        if elapsed < self.min_request_interval_seconds:
            time.sleep(self.min_request_interval_seconds - elapsed)
        self._last_request_at = time.monotonic()

    def _assert_allowed_by_robots(self, url: str) -> None:
        if not self.respect_robots:
            return
        parsed = urlparse(url)
        host = f"{parsed.scheme}://{parsed.netloc}"
        rp = self._robots_cache.get(host)
        if rp is None:
            robots_url = urljoin(host, "/robots.txt")
            rp = RobotFileParser()
            rp.set_url(robots_url)
            try:
                rp.read()
            except Exception:
                self._robots_cache[host] = rp
                return
            self._robots_cache[host] = rp

        if not rp.can_fetch(self.user_agent, url):
            raise RuntimeError(f"Blocked by robots.txt: {url}")

    def _extract_links(self, html_doc: str) -> Iterable[tuple[str, str, str]]:
        for match in LINK_RE.finditer(html_doc):
            href = match.group("href").strip()
            link_text = self._clean_text(match.group("text"))
            start = max(0, match.start() - 240)
            end = min(len(html_doc), match.end() + 240)
            context = self._clean_text(html_doc[start:end])
            yield href, link_text, context

    def _is_document_candidate(self, url: str, link_text: str, context: str) -> bool:
        lowered = f"{url} {link_text} {context}".lower()
        if url.startswith("mailto:") or url.startswith("javascript:"):
            return False

        # Drop obvious non-actionable pages before any expensive parsing.
        exclude_terms = [
            "news",
            "press",
            "newsletter",
            "manual",
            "guide",
            "brochure",
            "training",
            "faq",
            "photo",
            "gallery",
            "video",
            "event",
            "workshop",
            "vacancy",
            "procurement",
            "tender",
            "media",
            "twitter",
            "facebook",
        ]
        if any(t in lowered for t in exclude_terms):
            return False

        policy_terms = [
            "conservation and management measure",
            "management measure",
            "recommendation",
            "resolution",
            "circular",
            "iuu",
            "quota",
            "allocation",
            "catch limit",
            "closure",
            "closed area",
            "prohibited",
            "ban",
            "meeting",
            "decision",
        ]

        compliance_terms = [
            "shall",
            "must",
            "required",
            "deadline",
            "reporting",
            "obligation",
            "compliance",
            "entry into force",
            "effective",
            "implementation",
        ]
        has_policy_signal = any(t in lowered for t in policy_terms)
        has_compliance_signal = any(t in lowered for t in compliance_terms)
        has_policy_identifier = bool(POLICY_ID_RE.search(f"{link_text} {context}"))
        has_actionable_extension = any(ext in lowered for ext in [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".htm", ".html"])

        # High-signal policy filter:
        # - explicit policy ID, or
        # - policy + compliance signal
        # and ideally a downloadable extension / document-like URL.
        if has_policy_identifier:
            return has_actionable_extension or has_policy_signal
        if has_policy_signal and has_compliance_signal:
            return has_actionable_extension or "measure/" in lowered or "document/" in lowered
        return False

    def _extract_html_title(self, html_doc: str) -> str | None:
        m = re.search(r"<title[^>]*>(.*?)</title>", html_doc, re.IGNORECASE | re.DOTALL)
        if not m:
            return None
        return self._clean_text(m.group(1))[:240]

    def _extract_date(self, text: str) -> date | None:
        for idx, pattern in enumerate(DATE_PATTERNS):
            m = pattern.search(text)
            if not m:
                continue
            raw = m.group(1)
            try:
                if idx == 0:
                    return date.fromisoformat(raw)
                if idx == 1:
                    d, mth, y = raw.split("/")
                    return date(int(y), int(mth), int(d))
                return date.fromisoformat(time.strftime("%Y-%m-%d", time.strptime(raw, "%d %B %Y")))
            except Exception:
                continue
        return None

    def _extract_document_number(self, text: str) -> str | None:
        m = DOC_NUMBER_RE.search(text)
        if not m:
            return None
        return m.group(1)

    def _extract_meeting_reference(self, text: str) -> str | None:
        m = MEETING_REF_RE.search(text)
        if not m:
            return None
        return m.group(0)

    def _filename_from_url(self, url: str) -> str:
        tail = urlparse(url).path.rstrip("/").split("/")[-1]
        return tail or self.rfmo

    def _clean_text(self, value: str) -> str:
        text = TAG_RE.sub(" ", value)
        text = re.sub(r"\s+", " ", text).strip()
        return unescape(text)

    def _default_region(self) -> str:
        return {
            "ICCAT": "Atlantic Ocean",
            "WCPFC": "Western and Central Pacific Ocean",
            "IOTC": "Indian Ocean",
        }.get(self.rfmo, self.rfmo)


class ICCATAdapter(HtmlRFMOAdapter):
    def __init__(self, user_agent: str) -> None:
        super().__init__(
            name="iccat",
            rfmo="ICCAT",
            category_indexes={
                DocumentCategory.conservation_management_measures: [
                    "https://www.iccat.int/en/RecRes.asp",
                    "https://www.iccat.int/en/decisions.asp",
                ],
                DocumentCategory.recommendations_resolutions: [
                    "https://www.iccat.int/en/RecRes.asp",
                ],
                DocumentCategory.meeting_decisions: [
                    "https://www.iccat.int/en/meetings.asp",
                ],
                DocumentCategory.iuu_vessel_lists: [
                    "https://www.iccat.int/en/IUU.asp",
                ],
            },
            user_agent=user_agent,
        )


class WCPFCAdapter(HtmlRFMOAdapter):
    def __init__(self, user_agent: str) -> None:
        super().__init__(
            name="wcpfc",
            rfmo="WCPFC",
            category_indexes={
                DocumentCategory.conservation_management_measures: [
                    "https://www.wcpfc.int/conservation-and-management-measures",
                    "https://cmm.wcpfc.int",
                ],
                DocumentCategory.circular_letters: [
                    "https://circs.wcpfc.int",
                ],
                DocumentCategory.meeting_decisions: [
                    "https://meetings.wcpfc.int",
                ],
                DocumentCategory.iuu_vessel_lists: [
                    "https://www.wcpfc.int/iuu-vessel-list",
                ],
                DocumentCategory.quota_allocation_tables: [
                    "https://www.wcpfc.int/annual-catch-limits",
                ],
            },
            user_agent=user_agent,
        )


class IOTCAdapter(HtmlRFMOAdapter):
    def __init__(self, user_agent: str) -> None:
        super().__init__(
            name="iotc",
            rfmo="IOTC",
            category_indexes={
                DocumentCategory.conservation_management_measures: [
                    "https://iotc.org/cmm",
                ],
                DocumentCategory.recommendations_resolutions: [
                    "https://iotc.org/recommendations",
                    "https://iotc.org/resolutions",
                ],
                DocumentCategory.circular_letters: [
                    "https://iotc.org/documents/circulars",
                ],
                DocumentCategory.meeting_decisions: [
                    "https://iotc.org/meetings",
                ],
                DocumentCategory.iuu_vessel_lists: [
                    "https://iotc.org/iuu-list",
                ],
                DocumentCategory.quota_allocation_tables: [
                    "https://iotc.org/quota-allocation",
                ],
            },
            user_agent=user_agent,
        )


class AdapterRegistry:
    def __init__(self, user_agent: str = "ocean-watch-rfmo-ingestion/1.0") -> None:
        adapters: list[RFMOAdapter] = [
            ICCATAdapter(user_agent=user_agent),
            WCPFCAdapter(user_agent=user_agent),
            IOTCAdapter(user_agent=user_agent),
        ]
        self._adapters = {a.name: a for a in adapters}

    def names(self) -> list[str]:
        return sorted(self._adapters.keys())

    def all(self) -> list[RFMOAdapter]:
        return [self._adapters[name] for name in self.names()]

    def get(self, name: str) -> RFMOAdapter:
        adapter = self._adapters.get(name)
        if adapter is None:
            raise KeyError(name)
        return adapter
