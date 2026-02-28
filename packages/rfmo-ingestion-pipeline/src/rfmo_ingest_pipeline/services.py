from __future__ import annotations

import hashlib
import json
import re
import subprocess
import threading
import time
import zipfile
from dataclasses import dataclass
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from typing import Any

from rfmo_ingest_pipeline.models import (
    ChangeDecision,
    DocumentRecord,
    DocumentRef,
    DocumentVersionRecord,
    IngestReason,
    ParsedDocument,
    ProcessingStatus,
    RawDocument,
)


@dataclass
class RetryPolicy:
    max_attempts: int = 3
    backoff_seconds: float = 1.0


class FetchService:
    def __init__(self, retry_policy: RetryPolicy | None = None) -> None:
        self.retry_policy = retry_policy or RetryPolicy()

    def fetch_with_retries(self, fetch_fn, ref: DocumentRef) -> RawDocument:
        last_error: Exception | None = None
        for attempt in range(1, self.retry_policy.max_attempts + 1):
            try:
                return fetch_fn(ref)
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                if attempt < self.retry_policy.max_attempts:
                    time.sleep(self.retry_policy.backoff_seconds * attempt)
        raise RuntimeError(f"Failed to fetch after retries: {ref.source_url}") from last_error


class ParseService:
    def parse(self, raw: RawDocument, base: ParsedDocument) -> ParsedDocument:
        content_type = (raw.content_type or "").lower()
        url_lower = raw.source_url.lower()

        extracted_text = ""
        snapshot_html: str | None = None
        parser_info: dict[str, Any] = {}

        if "pdf" in content_type or url_lower.endswith(".pdf"):
            extracted_text, parser_info = self._parse_pdf(raw.body)
        elif "html" in content_type or url_lower.endswith((".html", ".htm")):
            html_text = raw.body.decode("utf-8", errors="replace")
            extracted_text = self._visible_html_text(html_text)
            snapshot_html = html_text
            parser_info = {"parser": "html"}
        elif "word" in content_type or url_lower.endswith(".docx"):
            extracted_text = self._parse_docx(raw.body)
            parser_info = {"parser": "docx"}
        else:
            extracted_text = raw.body.decode("utf-8", errors="replace")[:200000]
            parser_info = {"parser": "bytes_decode"}

        return ParsedDocument(
            title=base.title,
            publication_date=base.publication_date,
            document_category=base.document_category,
            document_number=base.document_number,
            meeting_reference=base.meeting_reference,
            rfmo_region=base.rfmo_region,
            extracted_text=extracted_text,
            snapshot_html=snapshot_html,
            parser_info=parser_info,
        )

    def _parse_pdf(self, body: bytes) -> tuple[str, dict[str, Any]]:
        try:
            from pypdf import PdfReader
        except Exception:
            return "", {"parser": "pdf", "error": "pypdf_not_available", "ocr_attempted": False}

        try:
            reader = PdfReader(BytesIO(body))
            pages: list[str] = []
            for page in reader.pages:
                text = (page.extract_text() or "").strip()
                if text:
                    pages.append(text)
            merged = re.sub(r"\s+", " ", "\n".join(pages)).strip()
            if merged:
                return merged[:2_000_000], {"parser": "pdf", "ocr_attempted": False}
        except Exception as exc:  # noqa: BLE001
            return "", {"parser": "pdf", "error": str(exc), "ocr_attempted": False}

        ocr_available = self._command_available("tesseract")
        return "", {"parser": "pdf", "ocr_attempted": ocr_available, "ocr_used": False}

    def _parse_docx(self, body: bytes) -> str:
        try:
            with zipfile.ZipFile(BytesIO(body)) as zf:
                xml_data = zf.read("word/document.xml").decode("utf-8", errors="replace")
        except Exception:
            return ""

        text = re.sub(r"</w:p>", "\n", xml_data)
        text = re.sub(r"<[^>]+>", " ", text)
        return re.sub(r"\s+", " ", text).strip()

    def _visible_html_text(self, html: str) -> str:
        html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
        html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.IGNORECASE)
        html = re.sub(r"<nav[\s\S]*?</nav>", " ", html, flags=re.IGNORECASE)
        html = re.sub(r"<header[\s\S]*?</header>", " ", html, flags=re.IGNORECASE)
        html = re.sub(r"<footer[\s\S]*?</footer>", " ", html, flags=re.IGNORECASE)
        html = re.sub(r"<[^>]+>", " ", html)
        return re.sub(r"\s+", " ", html).strip()

    def _command_available(self, command: str) -> bool:
        try:
            subprocess.run([command, "--version"], capture_output=True, check=False)
            return True
        except FileNotFoundError:
            return False


class ChangeDetectionService:
    def evaluate(
        self,
        document: DocumentRecord,
        latest_version: DocumentVersionRecord | None,
        file_hash: str,
        metadata_hash: str,
        content_hash: str,
        etag: str | None,
        last_modified: str | None,
    ) -> ChangeDecision:
        if latest_version is None:
            return ChangeDecision(
                should_ingest=True,
                reasons=[IngestReason.new_url],
                next_version_number=1,
            )

        reasons: list[IngestReason] = []
        if latest_version.file_hash != file_hash:
            reasons.append(IngestReason.file_hash_changed)
        if latest_version.content_hash != content_hash:
            reasons.append(IngestReason.page_content_changed)
        if latest_version.metadata_hash != metadata_hash:
            reasons.append(IngestReason.metadata_changed)

        header_changed = (
            (etag and latest_version.etag and etag != latest_version.etag)
            or (last_modified and latest_version.last_modified and last_modified != latest_version.last_modified)
        )
        if header_changed and not reasons:
            reasons.append(IngestReason.metadata_changed)

        should_ingest = bool(reasons)
        return ChangeDecision(
            should_ingest=should_ingest,
            reasons=reasons,
            next_version_number=latest_version.version_number + 1 if should_ingest else latest_version.version_number,
        )


class ArtifactStorage:
    def __init__(self, root_dir: str = "./rfmo") -> None:
        self.root = Path(root_dir)
        self.root.mkdir(parents=True, exist_ok=True)

    def persist(
        self,
        document: DocumentRecord,
        version_number: int,
        raw: RawDocument,
        parsed: ParsedDocument,
        metadata: dict[str, Any],
    ) -> tuple[str, str, str | None, str, int]:
        year = (parsed.publication_date.year if parsed.publication_date else datetime.now().year)
        doc_root = self.root / document.rfmo.lower() / str(year) / document.id / f"v{version_number}"
        doc_root.mkdir(parents=True, exist_ok=True)

        raw_ext = self._guess_extension(raw)
        raw_path = doc_root / f"raw{raw_ext}"
        extracted_path = doc_root / "extracted.txt"
        metadata_path = doc_root / "metadata.json"
        snapshot_path = doc_root / "snapshot.html"

        raw_path.write_bytes(raw.body)
        extracted_path.write_text(parsed.extracted_text or "", encoding="utf-8")
        metadata_path.write_text(json.dumps(metadata, ensure_ascii=True, indent=2), encoding="utf-8")

        snapshot_value: str | None = None
        if parsed.snapshot_html:
            snapshot_path.write_text(parsed.snapshot_html, encoding="utf-8")
            snapshot_value = str(snapshot_path)

        bytes_written = raw_path.stat().st_size + extracted_path.stat().st_size + metadata_path.stat().st_size
        if snapshot_value:
            bytes_written += snapshot_path.stat().st_size

        return str(raw_path), str(extracted_path), snapshot_value, str(metadata_path), bytes_written

    def _guess_extension(self, raw: RawDocument) -> str:
        ctype = (raw.content_type or "").lower()
        if "pdf" in ctype:
            return ".pdf"
        if "html" in ctype:
            return ".html"
        if "word" in ctype or raw.source_url.lower().endswith(".docx"):
            return ".docx"
        if raw.source_url.lower().endswith(".pdf"):
            return ".pdf"
        if raw.source_url.lower().endswith(".html"):
            return ".html"
        if raw.source_url.lower().endswith(".docx"):
            return ".docx"
        return ".bin"


class MetricsRegistry:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._values: dict[str, float] = {
            "rfmo_documents_discovered_total": 0.0,
            "rfmo_documents_filtered_out_total": 0.0,
            "rfmo_documents_fetched_total": 0.0,
            "rfmo_documents_ingested_total": 0.0,
            "rfmo_documents_skipped_total": 0.0,
            "rfmo_failures_total": 0.0,
            "rfmo_parse_failures_total": 0.0,
            "rfmo_storage_bytes_total": 0.0,
            "rfmo_processing_seconds_total": 0.0,
        }

    def add(self, key: str, value: float) -> None:
        with self._lock:
            self._values[key] = self._values.get(key, 0.0) + value

    def set(self, key: str, value: float) -> None:
        with self._lock:
            self._values[key] = value

    def snapshot(self) -> dict[str, float]:
        with self._lock:
            return dict(self._values)

    def as_prometheus(self) -> str:
        values = self.snapshot()
        lines = [f"{k} {v}" for k, v in sorted(values.items())]
        return "\n".join(lines) + "\n"


class MetricsServer:
    def __init__(self, registry: MetricsRegistry, host: str = "0.0.0.0", port: int = 9108) -> None:
        self.registry = registry
        self.host = host
        self.port = port
        self._server: ThreadingHTTPServer | None = None
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._server is not None:
            return

        registry = self.registry

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):  # noqa: N802
                if self.path != "/metrics":
                    self.send_response(404)
                    self.end_headers()
                    return
                payload = registry.as_prometheus().encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; version=0.0.4")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            def log_message(self, format, *args):
                return

        self._server = ThreadingHTTPServer((self.host, self.port), Handler)
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        if self._server is None:
            return
        self._server.shutdown()
        self._server.server_close()
        self._server = None
        self._thread = None


def sha256_hex(data: bytes | str) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()
