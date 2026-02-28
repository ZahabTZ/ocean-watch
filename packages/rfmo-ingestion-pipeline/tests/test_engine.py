from __future__ import annotations

from datetime import date
from urllib.request import urlopen

from rfmo_ingest_pipeline.connectors import HtmlRFMOAdapter, RFMOAdapter
from rfmo_ingest_pipeline.engine import IngestionEngine
from rfmo_ingest_pipeline.models import DocumentCategory, DocumentRef, ParsedDocument, RawDocument


class _FakeAdapter(RFMOAdapter):
    name = "fake"
    rfmo = "ICCAT"

    def __init__(self, body: bytes, content_type: str = "text/html") -> None:
        self._body = body
        self._content_type = content_type

    def list_documents(self) -> list[DocumentRef]:
        return [
            DocumentRef(
                rfmo=self.rfmo,
                source_url="https://example.org/doc1",
                document_type=DocumentCategory.conservation_management_measures,
                index_url="https://example.org/index",
                title_hint="CMM 2024-01",
                published_date=date(2024, 1, 20),
                document_number="2024-01",
                meeting_reference="COM2024",
                rfmo_region="Atlantic Ocean",
            )
        ]

    def fetch_document(self, ref: DocumentRef) -> RawDocument:
        return RawDocument(
            source_url=ref.source_url,
            status_code=200,
            headers={"ETag": "etag-a", "Last-Modified": "Sat, 20 Jan 2024 12:00:00 GMT"},
            content_type=self._content_type,
            body=self._body,
        )

    def extract_metadata(self, raw: RawDocument, ref: DocumentRef) -> ParsedDocument:
        return ParsedDocument(
            title=ref.title_hint,
            publication_date=ref.published_date,
            document_category=ref.document_type,
            document_number=ref.document_number,
            meeting_reference=ref.meeting_reference,
            rfmo_region=ref.rfmo_region,
        )


class _Registry:
    def __init__(self, adapter: RFMOAdapter) -> None:
        self._adapter = adapter

    def all(self):
        return [self._adapter]

    def get(self, name: str):
        if name != self._adapter.name:
            raise KeyError(name)
        return self._adapter


def test_ingests_new_document_and_writes_artifacts(tmp_path) -> None:
    adapter = _FakeAdapter(body=b"<html><body>measure text</body></html>")
    engine = IngestionEngine(
        db_path=str(tmp_path / "ingest.db"),
        storage_root=str(tmp_path / "rfmo"),
        adapters=_Registry(adapter),  # type: ignore[arg-type]
    )

    result = engine.run_once()

    assert result.metrics.documents_discovered == 1
    assert result.metrics.documents_ingested == 1
    versions = engine.list_versions("ICCAT")
    assert len(versions) == 1
    assert (tmp_path / "rfmo").exists()


def test_second_run_is_idempotent_for_same_content(tmp_path) -> None:
    adapter = _FakeAdapter(body=b"<html><body>same body</body></html>")
    engine = IngestionEngine(
        db_path=str(tmp_path / "ingest.db"),
        storage_root=str(tmp_path / "rfmo"),
        adapters=_Registry(adapter),  # type: ignore[arg-type]
    )

    first = engine.run_once()
    second = engine.run_once()

    assert first.metrics.documents_ingested == 1
    assert second.metrics.documents_ingested == 0
    assert second.metrics.documents_skipped == 1
    versions = engine.list_versions("ICCAT")
    assert len(versions) == 1


def test_creates_new_version_when_file_changes(tmp_path) -> None:
    adapter = _FakeAdapter(body=b"<html><body>v1</body></html>")
    engine = IngestionEngine(
        db_path=str(tmp_path / "ingest.db"),
        storage_root=str(tmp_path / "rfmo"),
        adapters=_Registry(adapter),  # type: ignore[arg-type]
    )

    engine.run_once()
    adapter._body = b"<html><body>v2 changed</body></html>"
    engine.run_once()

    versions = engine.list_versions("ICCAT")
    assert len(versions) == 2
    assert [v.version_number for v in versions] == [1, 2]


def test_metrics_endpoint_exposes_counters(tmp_path) -> None:
    adapter = _FakeAdapter(body=b"<html><body>metrics</body></html>")
    engine = IngestionEngine(
        db_path=str(tmp_path / "ingest.db"),
        storage_root=str(tmp_path / "rfmo"),
        adapters=_Registry(adapter),  # type: ignore[arg-type]
    )

    engine.start_metrics_server(host="127.0.0.1", port=9918)
    try:
        engine.run_once()
        payload = urlopen("http://127.0.0.1:9918/metrics", timeout=5).read().decode("utf-8")
    finally:
        engine.stop_metrics_server()

    assert "rfmo_documents_ingested_total" in payload


def test_high_signal_filter_blocks_news_and_keeps_policy_documents() -> None:
    adapter = HtmlRFMOAdapter(
        name="test",
        rfmo="ICCAT",
        category_indexes={},
        user_agent="test-agent",
    )

    assert not adapter._is_document_candidate(  # type: ignore[attr-defined]
        "https://example.org/news/press-release",
        "Press release on workshop",
        "media update event",
    )
    assert adapter._is_document_candidate(  # type: ignore[attr-defined]
        "https://example.org/docs/CMM-2024-03.pdf",
        "CMM 2024-03 Tropical tuna measure",
        "shall enter into force on 2024-06-01",
    )
