from rfmo_ingest_pipeline import IngestionEngine
from rfmo_ingest_pipeline.models import SourceDocumentCreate


def test_engine_ingest_document(tmp_path) -> None:
    engine = IngestionEngine(db_path=str(tmp_path / "engine.db"))

    res = engine.ingest_document(
        SourceDocumentCreate(
            rfmo="ICCAT",
            title="Recommendation 2026-01",
            published_at="2026-02-20T10:00:00Z",
            source_url="https://example.org/iccat/2026-01",
            content="Quota for BLUEFIN in EAST_ATLANTIC changed from 1000 to 850 tons effective 2026-03-01.",
        )
    )

    assert len(res["measures"]) == 1
    assert len(res["change_events"]) == 1


def test_sync_connector_smoke(tmp_path) -> None:
    engine = IngestionEngine(db_path=str(tmp_path / "engine.db"))

    result = engine.sync_connector("iotc_circulars", limit=1)

    assert result.connector == "iotc_circulars"
    assert result.fetched >= 1
