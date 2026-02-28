# RFMO Ingestion Pipeline Library

Standalone ingestion library extracted from the RFMO intelligence app.

## Includes

- RFMO connector framework (specialized + generic web listing connectors)
- Normalization service (quota/closure/reporting/gear extraction)
- Change detection service
- Impact and alert generation services
- SQLite persistence store
- Orchestrator (`IngestionEngine`) for sync/ingest workflows

## Install

```bash
cd /Users/npow/code/rfmo-ingestion-pipeline-lib-20260228
python3 -m pip install -e '.[dev]'
```

## Quickstart

```python
from rfmo_ingest_pipeline import IngestionEngine

engine = IngestionEngine(db_path="./rfmo_pipeline.db")
result = engine.sync_all(limit_per_connector=5)
print(result)
```
