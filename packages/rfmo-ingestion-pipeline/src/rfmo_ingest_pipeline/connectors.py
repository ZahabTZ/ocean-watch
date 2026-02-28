from __future__ import annotations

import hashlib
import html
import io
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, List, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from rfmo_ingest_pipeline.models import SourceDocumentCreate


@dataclass
class ConnectorItem:
    rfmo: str
    title: str
    published_at: datetime
    source_url: str
    content: str
    external_id: str


@dataclass
class SourceConfig:
    name: str
    rfmo: str
    base_url: str
    listing_url: str


class BaseConnector:
    name: str

    def fetch(self, limit: int = 20) -> List[ConnectorItem]:
        raise NotImplementedError


class GenericWebListingConnector(BaseConnector):
    def __init__(self, config: SourceConfig, fetch_timeout_seconds: int = 20) -> None:
        self.config = config
        self.name = config.name
        self.fetch_timeout_seconds = fetch_timeout_seconds

    def fetch(self, limit: int = 20) -> List[ConnectorItem]:
        html_doc = self._download(self.config.listing_url)
        links = list(self._extract_links(html_doc))

        items: List[ConnectorItem] = []
        seen: set[str] = set()
        for link_url, link_text, context in links:
            normalized_url = urljoin(self.config.base_url, link_url)
            if normalized_url in seen:
                continue
            if not self._is_document_candidate(normalized_url, link_text):
                continue

            seen.add(normalized_url)
            published_at = self._extract_date(context) or datetime.now(timezone.utc)
            title = self._clean_text(link_text) or self._title_from_url(normalized_url)
            context_clean = self._clean_text(context)
            content = ". ".join(
                [
                    title,
                    f"Context: {context_clean[:320]}" if context_clean else "",
                    f"Source: {normalized_url}",
                ]
            ).strip(" .")

            external_hash = hashlib.sha1(normalized_url.encode("utf-8")).hexdigest()[:16]
            items.append(
                ConnectorItem(
                    rfmo=self.config.rfmo,
                    title=title[:200],
                    published_at=published_at,
                    source_url=normalized_url,
                    content=content,
                    external_id=f"{self.name}:{external_hash}",
                )
            )

            if len(items) >= limit:
                break

        return items

    def _download(self, url: str) -> str:
        req = Request(url, headers={"User-Agent": "rfmo-intel-mvp/0.1"})
        try:
            with urlopen(req, timeout=self.fetch_timeout_seconds) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except (HTTPError, URLError) as exc:
            raise RuntimeError(f"Failed to download connector source: {url}") from exc

    def _extract_links(self, html_doc: str) -> Iterable[tuple[str, str, str]]:
        pattern = re.compile(r'<a[^>]+href=["\'](?P<href>[^"\']+)["\'][^>]*>(?P<text>.*?)</a>', re.IGNORECASE | re.DOTALL)
        for match in pattern.finditer(html_doc):
            href = match.group("href").strip()
            text = match.group("text").strip()
            start = max(0, match.start() - 220)
            end = min(len(html_doc), match.end() + 220)
            context = html_doc[start:end]
            yield href, text, context

    def _is_document_candidate(self, url: str, text: str) -> bool:
        if url.startswith("mailto:") or url.startswith("javascript:"):
            return False
        signal = f"{url} {text}".lower()
        keywords = [
            ".pdf",
            "circular",
            "recommendation",
            "resolution",
            "measure",
            "quota",
            "closure",
            "notice",
            "compliance",
            "reporting",
            "document",
        ]
        return any(k in signal for k in keywords)

    def _extract_date(self, text: str) -> Optional[datetime]:
        iso = re.search(r"(20\d{2}-\d{2}-\d{2})", text)
        if iso:
            return datetime.strptime(iso.group(1), "%Y-%m-%d").replace(tzinfo=timezone.utc)

        dmy = re.search(r"([0-3]?\d/[0-1]?\d/20\d{2})", text)
        if dmy:
            return datetime.strptime(dmy.group(1), "%d/%m/%Y").replace(tzinfo=timezone.utc)

        month = re.search(
            r"([0-3]?\d\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})",
            text,
            flags=re.IGNORECASE,
        )
        if month:
            return datetime.strptime(month.group(1), "%d %B %Y").replace(tzinfo=timezone.utc)
        return None

    def _clean_text(self, value: str) -> str:
        stripped = re.sub(r"<[^>]+>", " ", value)
        collapsed = re.sub(r"\s+", " ", stripped).strip()
        return html.unescape(collapsed)

    def _title_from_url(self, url: str) -> str:
        tail = url.rstrip("/").split("/")[-1]
        tail = re.sub(r"[-_]+", " ", tail)
        return tail[:200] or self.config.rfmo


class IotcCircularsConnector(BaseConnector):
    name = "iotc_circulars"
    base_url = "https://iotc.org"
    listing_url = "https://iotc.org/documents/circulars"

    def __init__(self, fetch_timeout_seconds: int = 20) -> None:
        self.fetch_timeout_seconds = fetch_timeout_seconds

    def fetch(self, limit: int = 20) -> List[ConnectorItem]:
        html_doc = self._download(self.listing_url)
        rows = self._extract_rows(html_doc)

        items: List[ConnectorItem] = []
        for row in rows:
            parsed = self._parse_row(row)
            if parsed is None:
                continue
            items.append(parsed)
            if len(items) >= limit:
                break
        return items

    def _download(self, url: str) -> str:
        req = Request(url, headers={"User-Agent": "rfmo-intel-mvp/0.1"})
        try:
            with urlopen(req, timeout=self.fetch_timeout_seconds) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except (HTTPError, URLError) as exc:
            raise RuntimeError(f"Failed to download connector source: {url}") from exc

    def _extract_rows(self, html_doc: str) -> Iterable[str]:
        return re.findall(r"<tr[^>]*>.*?</tr>", html_doc, flags=re.DOTALL | re.IGNORECASE)

    def _parse_row(self, row_html: str) -> Optional[ConnectorItem]:
        circ = re.search(r"IOTC\s+CIRCULAR\s*([0-9]{4}-[0-9]{2})", row_html, flags=re.IGNORECASE)
        if circ is None:
            return None
        circular_id = circ.group(1)

        title_match = re.search(
            r"<td[^>]*class=\"[^\"]*views-field-title[^\"]*\"[^>]*>.*?<a href=\"(?P<url>[^\"]+)\">(?P<title>.*?)</a>",
            row_html,
            flags=re.DOTALL | re.IGNORECASE,
        )
        date_match = re.search(
            r"content=\"(?P<date>[0-9]{4}-[0-9]{2}-[0-9]{2})T",
            row_html,
            flags=re.IGNORECASE,
        )
        pdf_match = re.search(r"href=\"(?P<pdf>https://iotc\.org/sites/default/files/documents/[^\"]+\.pdf)\"", row_html)

        if title_match is None or date_match is None:
            return None

        item_url = title_match.group("url")
        if item_url.startswith("/"):
            item_url = f"{self.base_url}{item_url}"

        title = self._clean_text(title_match.group("title"))
        pub_date = datetime.strptime(date_match.group("date"), "%Y-%m-%d").replace(tzinfo=timezone.utc)

        pdf_url = pdf_match.group("pdf") if pdf_match else ""
        detail_text = self._extract_detail_text(item_url)
        pdf_text = self._extract_pdf_text(pdf_url) if pdf_url else ""

        content_parts = [title]
        if detail_text:
            content_parts.append(f"Detail: {detail_text}")
        if pdf_text:
            content_parts.append(f"PDF_TEXT: {pdf_text}")
        if pdf_url:
            content_parts.append(f"PDF: {pdf_url}")
        content_parts.append(f"Reference: IOTC Circular {circular_id}")

        return ConnectorItem(
            rfmo="IOTC",
            title=f"IOTC Circular {circular_id}",
            published_at=pub_date,
            source_url=item_url,
            content=". ".join(content_parts),
            external_id=f"iotc:{circular_id}",
        )

    def _clean_text(self, value: str) -> str:
        stripped = re.sub(r"<[^>]+>", " ", value)
        collapsed = re.sub(r"\s+", " ", stripped).strip()
        return html.unescape(collapsed)

    def _extract_detail_text(self, item_url: str) -> str:
        try:
            html_doc = self._download(item_url)
        except RuntimeError:
            return ""

        title_match = re.search(r"<h1[^>]*>(.*?)</h1>", html_doc, flags=re.IGNORECASE | re.DOTALL)
        ref_match = re.search(
            r'field-name-field-reference[^>]*>.*?<div class="field-item[^\"]*">(.*?)</div>',
            html_doc,
            flags=re.IGNORECASE | re.DOTALL,
        )
        bits: List[str] = []
        if title_match:
            bits.append(self._clean_text(title_match.group(1)))
        if ref_match:
            bits.append(self._clean_text(ref_match.group(1)))
        return ". ".join(bits)

    def _extract_pdf_text(self, pdf_url: str) -> str:
        try:
            from pypdf import PdfReader
        except Exception:
            return ""

        try:
            req = Request(pdf_url, headers={"User-Agent": "rfmo-intel-mvp/0.1"})
            with urlopen(req, timeout=self.fetch_timeout_seconds) as resp:
                data = resp.read()
            reader = PdfReader(io.BytesIO(data))
            chunks: List[str] = []
            for page in reader.pages[:4]:
                txt = page.extract_text() or ""
                if txt.strip():
                    chunks.append(txt.strip())
            merged = " ".join(chunks)
            merged = re.sub(r"\s+", " ", merged).strip()
            return merged[:6000]
        except Exception:
            return ""


class ConnectorRegistry:
    def __init__(self) -> None:
        source_configs = [
            SourceConfig("ccamlr_documents", "CCAMLR", "https://www.ccamlr.org", "https://www.ccamlr.org/en/document/publications"),
            SourceConfig("ccsbt_news", "CCSBT", "https://www.ccsbt.org", "https://www.ccsbt.org/en/content/news"),
            SourceConfig("gfcm_news", "GFCM", "https://www.fao.org", "https://www.fao.org/gfcm/news-events/news/en/"),
            SourceConfig("iattc_news", "IATTC", "https://www.iattc.org", "https://www.iattc.org/en-US/News"),
            SourceConfig("iccat_news", "ICCAT", "https://www.iccat.int", "https://www.iccat.int/en/"),
            SourceConfig("nafo_documents", "NAFO", "https://www.nafo.int", "https://www.nafo.int/Portals/0/PDFs/"),
            SourceConfig("nasco_news", "NASCO", "https://nasco.int", "https://nasco.int/news/"),
            SourceConfig("neafc_news", "NEAFC", "https://www.neafc.org", "https://www.neafc.org/news"),
            SourceConfig("npfc_news", "NPFC", "https://www.npfc.int", "https://www.npfc.int/news"),
            SourceConfig("npafc_news", "NPAFC", "https://npafc.org", "https://npafc.org/news"),
            SourceConfig("seafo_news", "SEAFO", "https://www.seafo.org", "https://www.seafo.org/news"),
            SourceConfig("siofa_news", "SIOFA", "https://www.apsoi.org", "https://www.apsoi.org/news"),
            SourceConfig("sprfmo_news", "SPRFMO", "https://www.sprfmo.int", "https://www.sprfmo.int/news/"),
            SourceConfig("wcpfc_news", "WCPFC", "https://www.wcpfc.int", "https://www.wcpfc.int/news"),
            SourceConfig("wecafc_news", "WECAFC", "https://www.fao.org", "https://www.fao.org/wecafc/news-events/en/"),
            SourceConfig("cecaf_news", "CECAF", "https://www.fao.org", "https://www.fao.org/cecaf/news-events/en/"),
            SourceConfig("recofi_news", "RECOFI", "https://www.fao.org", "https://www.fao.org/recofi/news-events/en/"),
            SourceConfig("swiofc_news", "SWIOFC", "https://www.fao.org", "https://www.fao.org/swiofc/news-events/en/"),
            SourceConfig("apfic_news", "APFIC", "https://www.fao.org", "https://www.fao.org/apfic/news-events/en/"),
            SourceConfig("bobpigo_news", "BOBP-IGO", "https://www.bobpigo.org", "https://www.bobpigo.org/pages/news.php"),
            SourceConfig("sica_ospesca_news", "OSPESCA", "https://www.sica.int", "https://www.sica.int/ospesca/noticias/"),
        ]

        self._connectors: dict[str, BaseConnector] = {
            IotcCircularsConnector.name: IotcCircularsConnector(),
        }
        for config in source_configs:
            self._connectors[config.name] = GenericWebListingConnector(config)

    def names(self) -> List[str]:
        return sorted(self._connectors.keys())

    def get(self, name: str) -> BaseConnector:
        connector = self._connectors.get(name)
        if connector is None:
            raise KeyError(name)
        return connector

    def fetch_documents(self, name: str, limit: int = 20) -> List[SourceDocumentCreate]:
        connector = self.get(name)
        items = connector.fetch(limit=limit)
        return [
            SourceDocumentCreate(
                rfmo=i.rfmo,
                title=i.title,
                published_at=i.published_at,
                source_url=i.source_url,
                content=i.content,
                external_id=i.external_id,
                connector=name,
            )
            for i in items
        ]
