#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from rfmo_ingest_pipeline import IngestionEngine


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run RFMO scrape/ingestion and output raw file paths.")
    parser.add_argument("--db-path", default=str(ROOT / "rfmo_ingestion.db"))
    parser.add_argument("--storage-root", default=str(ROOT / "rfmo"))
    parser.add_argument("--output", default=str(ROOT / "raw_file_paths.json"))
    parser.add_argument(
        "--adapters",
        default="iccat,wcpfc,iotc",
        help="Comma-separated adapter names",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    adapter_names = [a.strip() for a in args.adapters.split(",") if a.strip()]

    engine = IngestionEngine(db_path=args.db_path, storage_root=args.storage_root)
    result = engine.run_once(adapter_names=adapter_names)

    payload = {
        "run": result.model_dump(mode="json"),
        "raw_paths": engine.list_storage_paths(),
    }

    out = Path(args.output)
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"saved={out}")
    print(f"ingested={result.metrics.documents_ingested}")
    print(f"skipped={result.metrics.documents_skipped}")
    print(f"failures={result.metrics.failures}")


if __name__ == "__main__":
    main()
