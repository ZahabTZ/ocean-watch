from __future__ import annotations

import json
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from rfmo_ingest_pipeline.models import DocumentCategory


DEADLINE_RE = re.compile(
    r"\b(?:deadline|due(?:\s+date)?|submit(?:\s+\w+){0,4}\s+by)\D{0,16}([0-3]?\d/[0-1]?\d/20\d{2}|20\d{2}-\d{2}-\d{2})\b",
    re.IGNORECASE,
)


class AlertGenerator:
    def __init__(self, storage_root: str = "./rfmo") -> None:
        self.storage_root = Path(storage_root)

    def generate(self, days: int = 7) -> list[dict[str, Any]]:
        alerts: list[dict[str, Any]] = []
        metadata_files = sorted(self.storage_root.glob("**/metadata.json"))
        since_date: Optional[date] = None
        if days > 0:
            since_date = (datetime.now(timezone.utc) - timedelta(days=days)).date()

        for meta_path in metadata_files:
            metadata = self._safe_load_json(meta_path)
            if metadata is None:
                continue

            published = self._safe_date(metadata.get("published_date"))
            if since_date and published and published < since_date:
                continue

            extracted_path = meta_path.with_name("extracted.txt")
            extracted_text = ""
            if extracted_path.exists():
                extracted_text = extracted_path.read_text(encoding="utf-8", errors="ignore")

            alert = self._build_alert(metadata, extracted_text, str(extracted_path), meta_path.parent)
            if alert:
                alerts.append(alert)

        alerts.sort(key=lambda a: a.get("published_date") or "", reverse=True)
        return alerts

    def _build_alert(
        self,
        metadata: dict[str, Any],
        extracted_text: str,
        extracted_path: str,
        artifact_dir: Path,
    ) -> Optional[dict[str, Any]]:
        title = (metadata.get("title") or "").strip()
        body = extracted_text or ""
        lowered = f"{title}\n{body}".lower()
        doc_type = metadata.get("document_type") or DocumentCategory.other.value
        published_date = metadata.get("published_date")
        document_number = metadata.get("document_number")
        source_url = metadata.get("source_url")
        rfmo = metadata.get("rfmo")
        stored_path = self._raw_path_for_artifact_dir(artifact_dir)

        alert_type = "NEW_MEASURE_PUBLISHED"
        severity = "medium"
        due_date = self._extract_due_date(title, body)

        if due_date or ("mandatory reporting" in lowered) or ("reporting" in lowered and "deadline" in lowered):
            alert_type = "REPORTING_DEADLINE"
            severity = "high"
        elif any(t in lowered for t in ["quota", "allocated catch limits", "allocation", "catch limit", "tac"]):
            alert_type = "QUOTA_OR_ALLOCATION_NOTICE"
            severity = "high"
        elif doc_type == DocumentCategory.meeting_decisions.value or any(t in lowered for t in ["meeting", "session", "intersessional", "review of cmm"]):
            alert_type = "MEETING_DECISION_OR_PROCESS_UPDATE"
            severity = "medium"
        elif any(t in lowered for t in ["dfad register", "vms", "observer", "transshipment", "compliance monitoring", "labour standards"]):
            alert_type = "COMPLIANCE_SYSTEM_CHANGE"
            severity = "medium"
        elif doc_type in {
            DocumentCategory.conservation_management_measures.value,
            DocumentCategory.recommendations_resolutions.value,
            DocumentCategory.circular_letters.value,
            DocumentCategory.iuu_vessel_lists.value,
            DocumentCategory.quota_allocation_tables.value,
        }:
            alert_type = "NEW_MEASURE_PUBLISHED"
            severity = "medium"
        else:
            return None

        what_changed = self._what_changed(alert_type, title, document_number, due_date)
        action_required = self._action_required(alert_type, due_date)

        return {
            "rfmo": rfmo,
            "alert_type": alert_type,
            "severity": severity,
            "document_type": doc_type,
            "title": title,
            "document_number": document_number,
            "published_date": published_date,
            "due_date": due_date,
            "what_changed": what_changed,
            "action_required": action_required,
            "source_url": source_url,
            "stored_path": stored_path,
            "extracted_text_path": extracted_path,
        }

    def _what_changed(self, alert_type: str, title: str, document_number: Optional[str], due_date: Optional[str]) -> str:
        if alert_type == "REPORTING_DEADLINE":
            deadline_text = f" Deadline: {due_date}." if due_date else ""
            return f"Reporting obligation update detected in '{title}'.{deadline_text}".strip()
        if alert_type == "QUOTA_OR_ALLOCATION_NOTICE":
            return f"Quota/allocation update detected in '{title}'."
        if alert_type == "COMPLIANCE_SYSTEM_CHANGE":
            return f"Compliance process/system update detected in '{title}'."
        if alert_type == "MEETING_DECISION_OR_PROCESS_UPDATE":
            return f"Meeting decision/process update detected in '{title}'."
        num = f" ({document_number})" if document_number else ""
        return f"New or revised RFMO measure detected{num}: '{title}'."

    def _action_required(self, alert_type: str, due_date: Optional[str]) -> str:
        if alert_type == "REPORTING_DEADLINE":
            if due_date:
                return f"Assign owner and submit required reporting package before {due_date}."
            return "Assign owner, confirm reporting scope, and submit required reporting package by deadline."
        if alert_type == "QUOTA_OR_ALLOCATION_NOTICE":
            return "Update national allocation tables and notify fleet operators of updated catch limits."
        if alert_type == "COMPLIANCE_SYSTEM_CHANGE":
            return "Update compliance SOPs and onboard operations/monitoring teams to the new requirement."
        if alert_type == "MEETING_DECISION_OR_PROCESS_UPDATE":
            return "Prepare policy brief and track follow-on amendments or implementation decisions."
        return "Review legal text, map impacted fleets/species/areas, and issue implementation guidance."

    def _extract_due_date(self, title: str, body: str) -> Optional[str]:
        combined = f"{title}\n{body}"
        match = DEADLINE_RE.search(combined)
        if not match:
            return None
        raw = match.group(1)
        if "/" in raw:
            try:
                d, m, y = raw.split("/")
                return date(int(y), int(m), int(d)).isoformat()
            except Exception:
                return None
        return raw

    def _safe_date(self, value: Any) -> Optional[date]:
        if not value or not isinstance(value, str):
            return None
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None

    def _safe_load_json(self, path: Path) -> Optional[dict[str, Any]]:
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return None

    def _raw_path_for_artifact_dir(self, artifact_dir: Path) -> Optional[str]:
        candidates = [".pdf", ".html", ".docx", ".bin"]
        for ext in candidates:
            candidate = artifact_dir / f"raw{ext}"
            if candidate.exists():
                return str(candidate)
        return None
