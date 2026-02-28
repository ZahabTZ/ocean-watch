# RFMO Scraping & Ingestion Engine (Phase 1)

This package is focused on scraping and ingestion only.

It implements:
- Source monitoring for ICCAT, WCPFC, and IOTC
- Document discovery + change detection
- Download and versioned raw artifact storage
- Lightweight parsing (PDF, HTML, DOCX)
- Metadata persistence and idempotent ingestion
- Prometheus-style `/metrics` endpoint

## Quickstart

```python
from rfmo_ingest_pipeline import IngestionEngine

engine = IngestionEngine(
    db_path="./rfmo_ingestion.db",
    storage_root="./rfmo",
)

# Optional metrics server
engine.start_metrics_server(host="0.0.0.0", port=9108)

result = engine.run_once()
print(result.model_dump())
```

## Storage Layout

Artifacts are written under:

```text
/rfmo/{rfmo}/{year}/{document_id}/v{version_number}/
    raw.pdf|raw.html|raw.docx|raw.bin
    extracted.txt
    metadata.json
    snapshot.html   # for HTML pages
```

## Scheduling

```python
from rfmo_ingest_pipeline import SyncScheduler

scheduler = SyncScheduler(engine, interval_seconds=6 * 3600)
scheduler.start()  # unattended polling
```

## Notes

- Idempotent: unchanged documents are skipped.
- Historical versions are retained per source URL.
- Scope intentionally excludes alerts, compliance logic, and semantic normalization.
