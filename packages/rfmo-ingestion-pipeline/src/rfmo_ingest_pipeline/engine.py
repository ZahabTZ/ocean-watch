from __future__ import annotations

from typing import Optional

from rfmo_ingest_pipeline.connectors import ConnectorRegistry
from rfmo_ingest_pipeline.models import (
    ConnectorSyncAllResponse,
    ConnectorSyncResponse,
    SourceDocument,
    SourceDocumentCreate,
)
from rfmo_ingest_pipeline.services import (
    AlertService,
    ChangeDetectionService,
    ImpactService,
    NormalizationService,
    PipelineService,
)
from rfmo_ingest_pipeline.store import SQLiteStore


class IngestionEngine:
    """Reusable ingestion orchestrator independent of any web framework."""

    def __init__(self, db_path: str = "rfmo_pipeline.db", connector_registry: Optional[ConnectorRegistry] = None) -> None:
        self.store = SQLiteStore(db_path=db_path)
        self.normalizer = NormalizationService()
        self.change_detector = ChangeDetectionService()
        self.impact_service = ImpactService()
        self.alert_service = AlertService()
        self.pipeline = PipelineService(
            self.store,
            self.normalizer,
            self.change_detector,
            self.impact_service,
            self.alert_service,
        )
        self.connectors = connector_registry or ConnectorRegistry()

    def ingest_document(self, payload: SourceDocumentCreate):
        doc = SourceDocument(**payload.model_dump())
        measures, change_events, alerts = self.pipeline.ingest(doc)
        return {
            "document": doc,
            "measures": measures,
            "change_events": change_events,
            "alerts": alerts,
        }

    def sync_connector(self, connector: str, limit: int = 20) -> ConnectorSyncResponse:
        fetched_docs = self.connectors.fetch_documents(connector, limit=limit)

        ingested = 0
        skipped = 0
        measure_count = 0
        event_count = 0
        alert_count = 0

        for payload in fetched_docs:
            doc = SourceDocument(**payload.model_dump())
            if self.store.is_duplicate_document(doc):
                skipped += 1
                continue
            measures, events, alerts = self.pipeline.ingest(doc)
            ingested += 1
            measure_count += len(measures)
            event_count += len(events)
            alert_count += len(alerts)

        return ConnectorSyncResponse(
            connector=connector,
            fetched=len(fetched_docs),
            ingested=ingested,
            skipped_duplicates=skipped,
            measures=measure_count,
            change_events=event_count,
            alerts=alert_count,
        )

    def sync_all(self, limit_per_connector: int = 10) -> ConnectorSyncAllResponse:
        totals = {
            "connectors_total": 0,
            "connectors_succeeded": 0,
            "connectors_failed": 0,
            "fetched": 0,
            "ingested": 0,
            "skipped_duplicates": 0,
            "measures": 0,
            "change_events": 0,
            "alerts": 0,
        }
        errors: list[str] = []

        for connector_name in self.connectors.names():
            totals["connectors_total"] += 1
            try:
                result = self.sync_connector(connector_name, limit=limit_per_connector)
                totals["connectors_succeeded"] += 1
                totals["fetched"] += result.fetched
                totals["ingested"] += result.ingested
                totals["skipped_duplicates"] += result.skipped_duplicates
                totals["measures"] += result.measures
                totals["change_events"] += result.change_events
                totals["alerts"] += result.alerts
            except Exception as exc:  # noqa: BLE001
                totals["connectors_failed"] += 1
                errors.append(f"{connector_name}: {str(exc)}")

        return ConnectorSyncAllResponse(**totals, errors=errors)
