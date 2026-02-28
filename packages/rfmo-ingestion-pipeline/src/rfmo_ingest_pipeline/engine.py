from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from rfmo_ingest_pipeline.connectors import AdapterRegistry, RFMOAdapter
from rfmo_ingest_pipeline.models import (
    DocumentRecord,
    DocumentVersionRecord,
    IngestionRunResult,
    ProcessingStatus,
    RunMetrics,
    SourceHealth,
)
from rfmo_ingest_pipeline.services import (
    ArtifactStorage,
    ChangeDetectionService,
    FetchService,
    MetricsRegistry,
    MetricsServer,
    ParseService,
    sha256_hex,
)
from rfmo_ingest_pipeline.store import SQLiteStore


class IngestionEngine:
    def __init__(
        self,
        db_path: str = "./rfmo_ingestion.db",
        storage_root: str = "./rfmo",
        adapters: AdapterRegistry | None = None,
    ) -> None:
        self.store = SQLiteStore(db_path=db_path)
        self.storage = ArtifactStorage(storage_root)
        self.adapters = adapters or AdapterRegistry()
        self.fetcher = FetchService()
        self.parser = ParseService()
        self.change_detector = ChangeDetectionService()
        self.metrics = MetricsRegistry()
        self.metrics_server = MetricsServer(self.metrics)

    def start_metrics_server(self, host: str = "0.0.0.0", port: int = 9108) -> None:
        self.metrics_server.host = host
        self.metrics_server.port = port
        self.metrics_server.start()

    def stop_metrics_server(self) -> None:
        self.metrics_server.stop()

    def run_once(self, adapter_names: list[str] | None = None) -> IngestionRunResult:
        metrics = RunMetrics()
        health_updates: list[SourceHealth] = []
        errors: list[str] = []

        if adapter_names:
            adapters = [self.adapters.get(name) for name in adapter_names]
        else:
            adapters = self.adapters.all()

        for adapter in adapters:
            health = self._run_adapter(adapter, metrics, errors)
            health_updates.append(health)
            self.store.upsert_source_health(health)

        metrics.finished_at = datetime.now(timezone.utc)
        metrics.duration_seconds = (metrics.finished_at - metrics.started_at).total_seconds()
        self._record_metrics(metrics)

        result = IngestionRunResult(metrics=metrics, source_health=health_updates, errors=errors)
        self.store.save_run_result(result)
        return result

    def _run_adapter(self, adapter: RFMOAdapter, metrics: RunMetrics, errors: list[str]) -> SourceHealth:
        try:
            refs = adapter.list_documents()
            metrics.documents_discovered += len(refs)
            self.metrics.add("rfmo_documents_discovered_total", float(len(refs)))
        except Exception as exc:  # noqa: BLE001
            metrics.failures += 1
            self.metrics.add("rfmo_failures_total", 1.0)
            err = f"{adapter.name}: list_documents failed: {exc}"
            errors.append(err)
            previous = self._source_health(adapter)
            return SourceHealth(
                rfmo=adapter.rfmo,
                adapter_name=adapter.name,
                last_success_at=previous.last_success_at,
                consecutive_failures=previous.consecutive_failures + 1,
                last_error=err,
            )

        seen: set[str] = set()
        for ref in refs:
            if ref.source_url in seen:
                continue
            seen.add(ref.source_url)
            self._process_document_ref(adapter, ref, metrics, errors)

        return SourceHealth(
            rfmo=adapter.rfmo,
            adapter_name=adapter.name,
            last_success_at=datetime.now(timezone.utc),
            consecutive_failures=0,
            last_error=None,
        )

    def _process_document_ref(self, adapter: RFMOAdapter, ref, metrics: RunMetrics, errors: list[str]) -> None:
        document = self.store.upsert_document_discovered(ref)

        try:
            raw = self.fetcher.fetch_with_retries(adapter.fetch_document, ref)
            metrics.documents_fetched += 1
            self.metrics.add("rfmo_documents_fetched_total", 1.0)

            base_meta = adapter.extract_metadata(raw, ref)
            parsed = self.parser.parse(raw, base_meta)

            file_hash = sha256_hex(raw.body)
            content_hash = sha256_hex(parsed.extracted_text)
            metadata_payload = self._metadata_payload(document, ref, raw, parsed, file_hash)
            metadata_hash = sha256_hex(str(self._stable_metadata_signature(ref, raw, parsed)))

            latest = self.store.get_latest_version(document.id)
            decision = self.change_detector.evaluate(
                document=document,
                latest_version=latest,
                file_hash=file_hash,
                metadata_hash=metadata_hash,
                content_hash=content_hash,
                etag=raw.headers.get("ETag") or raw.headers.get("Etag"),
                last_modified=raw.headers.get("Last-Modified"),
            )

            if not decision.should_ingest:
                self.store.mark_document_status(document.id, ProcessingStatus.skipped)
                metrics.documents_skipped += 1
                self.metrics.add("rfmo_documents_skipped_total", 1.0)
                return

            raw_path, extracted_path, snapshot_path, metadata_path, bytes_written = self.storage.persist(
                document=document,
                version_number=decision.next_version_number,
                raw=raw,
                parsed=parsed,
                metadata=metadata_payload,
            )

            document.status = ProcessingStatus.ingested
            version = DocumentVersionRecord(
                document_id=document.id,
                version_number=decision.next_version_number,
                file_hash=file_hash,
                etag=raw.headers.get("ETag") or raw.headers.get("Etag"),
                last_modified=raw.headers.get("Last-Modified"),
                metadata_hash=metadata_hash,
                content_hash=content_hash,
                status=ProcessingStatus.ingested,
                stored_path=raw_path,
                extracted_text_path=extracted_path,
                snapshot_html_path=snapshot_path,
                metadata_path=metadata_path,
            )
            self.store.create_version(version, document)

            metrics.documents_ingested += 1
            metrics.storage_bytes_written += bytes_written
            self.metrics.add("rfmo_documents_ingested_total", 1.0)
            self.metrics.add("rfmo_storage_bytes_total", float(bytes_written))
        except Exception as exc:  # noqa: BLE001
            self.store.mark_document_status(document.id, ProcessingStatus.failed)
            metrics.failures += 1
            self.metrics.add("rfmo_failures_total", 1.0)
            errors.append(f"{adapter.name}: {ref.source_url}: {exc}")

    def _metadata_payload(self, document: DocumentRecord, ref, raw, parsed, file_hash: str) -> dict:
        return {
            "source_url": ref.source_url,
            "rfmo": ref.rfmo,
            "document_type": ref.document_type.value,
            "published_date": parsed.publication_date.isoformat() if parsed.publication_date else None,
            "discovered_at": ref.discovered_at.isoformat(),
            "file_hash": file_hash,
            "status": ProcessingStatus.ingested.value,
            "title": parsed.title,
            "document_number": parsed.document_number,
            "meeting_reference": parsed.meeting_reference,
            "rfmo_region": parsed.rfmo_region,
            "headers": raw.headers,
            "content_type": raw.content_type,
            "parser_info": parsed.parser_info,
            "index_url": ref.index_url,
            "adapter_metadata": ref.metadata,
        }

    def _stable_metadata_signature(self, ref, raw, parsed) -> dict:
        return {
            "source_url": ref.source_url,
            "rfmo": ref.rfmo,
            "document_type": ref.document_type.value,
            "published_date": parsed.publication_date.isoformat() if parsed.publication_date else None,
            "title": parsed.title,
            "document_number": parsed.document_number,
            "meeting_reference": parsed.meeting_reference,
            "rfmo_region": parsed.rfmo_region,
            "etag": raw.headers.get("ETag") or raw.headers.get("Etag"),
            "last_modified": raw.headers.get("Last-Modified"),
            "content_type": raw.content_type,
        }

    def _record_metrics(self, metrics: RunMetrics) -> None:
        if metrics.duration_seconds is not None:
            self.metrics.add("rfmo_processing_seconds_total", metrics.duration_seconds)
        if metrics.parse_failures:
            self.metrics.add("rfmo_parse_failures_total", float(metrics.parse_failures))

    def _source_health(self, adapter: RFMOAdapter) -> SourceHealth:
        for row in self.store.list_source_health():
            if row.adapter_name == adapter.name:
                return row
        return SourceHealth(rfmo=adapter.rfmo, adapter_name=adapter.name)

    def run_adapter(self, adapter_name: str) -> IngestionRunResult:
        return self.run_once(adapter_names=[adapter_name])

    def list_documents(self, rfmo: str | None = None) -> list[DocumentRecord]:
        return self.store.list_documents(rfmo=rfmo)

    def list_versions(self, rfmo: str | None = None) -> list[DocumentVersionRecord]:
        versions: list[DocumentVersionRecord] = []
        for doc in self.list_documents(rfmo=rfmo):
            versions.extend(self.store.list_document_versions(doc.id))
        return versions

    def list_storage_paths(self, rfmo: str | None = None) -> list[str]:
        paths: list[str] = []
        for version in self.list_versions(rfmo=rfmo):
            paths.append(version.stored_path)
        return paths
