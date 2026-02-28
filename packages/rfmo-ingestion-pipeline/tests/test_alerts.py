from __future__ import annotations

import json

from rfmo_ingest_pipeline.alerts import AlertGenerator


def _write_artifacts(tmp_path, rel_dir: str, metadata: dict, extracted: str, raw_ext: str = ".html") -> None:
    target = tmp_path / rel_dir
    target.mkdir(parents=True, exist_ok=True)
    (target / "metadata.json").write_text(json.dumps(metadata), encoding="utf-8")
    (target / "extracted.txt").write_text(extracted, encoding="utf-8")
    (target / f"raw{raw_ext}").write_text("raw", encoding="utf-8")


def test_reporting_deadline_alert(tmp_path) -> None:
    _write_artifacts(
        tmp_path,
        "iotc/2026/doc1/v1",
        {
            "rfmo": "IOTC",
            "document_type": "circular_letters",
            "title": "Mandatory reporting notice",
            "document_number": None,
            "published_date": "2026-02-10",
            "source_url": "https://iotc.org/documents/x",
        },
        "Members shall submit reports by 12/03/2026.",
    )
    alerts = AlertGenerator(storage_root=str(tmp_path)).generate(days=0)
    assert len(alerts) == 1
    assert alerts[0]["alert_type"] == "REPORTING_DEADLINE"
    assert alerts[0]["due_date"] == "2026-03-12"


def test_quota_allocation_alert(tmp_path) -> None:
    _write_artifacts(
        tmp_path,
        "iotc/2026/doc2/v1",
        {
            "rfmo": "IOTC",
            "document_type": "circular_letters",
            "title": "Allocated catch limits for 2026",
            "document_number": None,
            "published_date": "2026-01-20",
            "source_url": "https://iotc.org/documents/y",
        },
        "This communication updates allocated catch limits.",
    )
    alerts = AlertGenerator(storage_root=str(tmp_path)).generate(days=0)
    assert len(alerts) == 1
    assert alerts[0]["alert_type"] == "QUOTA_OR_ALLOCATION_NOTICE"


def test_meeting_decision_alert(tmp_path) -> None:
    _write_artifacts(
        tmp_path,
        "wcpfc/2026/doc3/v1",
        {
            "rfmo": "WCPFC",
            "document_type": "meeting_decisions",
            "title": "Intersessional meeting review of CMM",
            "document_number": "2018-04",
            "published_date": "2026-04-08",
            "source_url": "https://meetings.wcpfc.int/meetings/x",
        },
        "Meeting notes.",
    )
    alerts = AlertGenerator(storage_root=str(tmp_path)).generate(days=0)
    assert len(alerts) == 1
    assert alerts[0]["alert_type"] == "MEETING_DECISION_OR_PROCESS_UPDATE"
