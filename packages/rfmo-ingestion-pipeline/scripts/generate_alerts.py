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

from rfmo_ingest_pipeline import AlertGenerator


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate structured actionable alerts from scraped RFMO artifacts.")
    parser.add_argument("--storage-root", default=str(ROOT / "rfmo"))
    parser.add_argument("--output", default=str(ROOT / "alerts.json"))
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="Only include documents with published_date in the last N days. Use 0 for all.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    generator = AlertGenerator(storage_root=args.storage_root)
    alerts = generator.generate(days=args.days)

    out = Path(args.output)
    out.write_text(json.dumps({"alerts": alerts}, indent=2), encoding="utf-8")

    print(f"saved={out}")
    print(f"alerts={len(alerts)}")


if __name__ == "__main__":
    main()
