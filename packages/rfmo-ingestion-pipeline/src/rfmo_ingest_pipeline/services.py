from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional

from rfmo_ingest_pipeline.models import (
    Alert,
    ChangeEvent,
    ChangeType,
    FleetProfile,
    ImpactAssessment,
    MeasureType,
    NormalizedMeasure,
    Severity,
    SourceDocument,
)
from rfmo_ingest_pipeline.store import SQLiteStore

DATE_PATTERN = r"(\d{4}-\d{2}-\d{2})"
SPECIES_TERMS = [
    "BLUEFIN",
    "YELLOWFIN",
    "BIGEYE",
    "SKIPJACK",
    "ALBACORE",
    "SWORDFISH",
    "SHARK",
    "TROPICAL TUNA",
]
AREA_TERMS = [
    "INDIAN OCEAN",
    "ATLANTIC",
    "PACIFIC",
    "IOTC AREA",
]


class NormalizationService:
    def normalize(self, doc: SourceDocument) -> List[NormalizedMeasure]:
        content = doc.content
        measures: List[NormalizedMeasure] = []

        quota_pattern = re.compile(
            rf"quota for ([A-Z_]+) in ([A-Z_]+) changed from (\d+) to (\d+) (tons|kg)(?: effective {DATE_PATTERN})?",
            re.IGNORECASE,
        )
        for match in quota_pattern.finditer(content):
            effective = self._parse_date(match.group(6))
            measures.append(
                NormalizedMeasure(
                    document_id=doc.id,
                    rfmo=doc.rfmo,
                    measure_type=MeasureType.quota,
                    species=match.group(1).upper(),
                    area=match.group(2).upper(),
                    old_value=match.group(3),
                    new_value=match.group(4),
                    units=match.group(5).lower(),
                    effective_date=effective,
                    confidence=0.95,
                    raw_excerpt=match.group(0),
                )
            )

        closure_pattern = re.compile(
            rf"closure in ([A-Z_]+) from {DATE_PATTERN} to {DATE_PATTERN} for ([A-Z_]+)",
            re.IGNORECASE,
        )
        for match in closure_pattern.finditer(content):
            measures.append(
                NormalizedMeasure(
                    document_id=doc.id,
                    rfmo=doc.rfmo,
                    measure_type=MeasureType.closure,
                    area=match.group(1).upper(),
                    effective_date=self._parse_date(match.group(2)),
                    due_date=self._parse_date(match.group(3)),
                    species=match.group(4).upper(),
                    confidence=0.9,
                    raw_excerpt=match.group(0),
                )
            )

        reporting_pattern = re.compile(
            rf"reporting deadline(?: set)? to {DATE_PATTERN}",
            re.IGNORECASE,
        )
        for match in reporting_pattern.finditer(content):
            measures.append(
                NormalizedMeasure(
                    document_id=doc.id,
                    rfmo=doc.rfmo,
                    measure_type=MeasureType.reporting,
                    due_date=self._parse_date(match.group(1)),
                    confidence=0.85,
                    raw_excerpt=match.group(0),
                )
            )

        gear_pattern = re.compile(r"gear restriction: ([A-Z_ ]+)", re.IGNORECASE)
        for match in gear_pattern.finditer(content):
            measures.append(
                NormalizedMeasure(
                    document_id=doc.id,
                    rfmo=doc.rfmo,
                    measure_type=MeasureType.gear,
                    new_value=match.group(1).strip().upper(),
                    confidence=0.8,
                    raw_excerpt=match.group(0),
                )
            )

        if not measures:
            measures.extend(self._heuristic_measures(doc))

        return measures

    def _parse_date(self, value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        return datetime.fromisoformat(value)

    def _heuristic_measures(self, doc: SourceDocument) -> List[NormalizedMeasure]:
        text = f"{doc.title}. {doc.content}"
        normalized = text.upper()
        heuristics: List[NormalizedMeasure] = []
        species = self._extract_species(normalized)
        area = self._extract_area(normalized)
        quota_value, quota_units = self._extract_quota_value(text)

        if "CATCH LIMIT" in normalized or "QUOTA" in normalized:
            heuristics.append(
                NormalizedMeasure(
                    document_id=doc.id,
                    rfmo=doc.rfmo,
                    measure_type=MeasureType.quota,
                    species=species,
                    area=area,
                    new_value=quota_value,
                    units=quota_units,
                    confidence=0.6,
                    raw_excerpt=text[:300],
                )
            )

        if "CLOSURE" in normalized or "CLOSED" in normalized:
            heuristics.append(
                NormalizedMeasure(
                    document_id=doc.id,
                    rfmo=doc.rfmo,
                    measure_type=MeasureType.closure,
                    species=species,
                    area=area,
                    confidence=0.6,
                    raw_excerpt=text[:300],
                )
            )

        if "DEADLINE" in normalized or "REPORTING" in normalized:
            due = self._extract_any_date(text)
            heuristics.append(
                NormalizedMeasure(
                    document_id=doc.id,
                    rfmo=doc.rfmo,
                    measure_type=MeasureType.reporting,
                    due_date=due,
                    confidence=0.6 if due else 0.5,
                    raw_excerpt=text[:300],
                )
            )

        return heuristics

    def _extract_any_date(self, text: str) -> Optional[datetime]:
        iso_match = re.search(r"(20[0-9]{2}-[0-9]{2}-[0-9]{2})", text)
        if iso_match:
            return self._parse_date(iso_match.group(1))

        dmy_match = re.search(r"([0-3][0-9]/[0-1][0-9]/20[0-9]{2})", text)
        if dmy_match:
            return datetime.strptime(dmy_match.group(1), "%d/%m/%Y")
        return None

    def _extract_species(self, normalized_text: str) -> Optional[str]:
        for term in SPECIES_TERMS:
            if term in normalized_text:
                return term.replace(" ", "_")
        return None

    def _extract_area(self, normalized_text: str) -> Optional[str]:
        for term in AREA_TERMS:
            if term in normalized_text:
                return term.replace(" ", "_")
        return None

    def _extract_quota_value(self, text: str) -> tuple[Optional[str], Optional[str]]:
        patterns = [
            r"(?:quota|catch limits?|allocated catch limits?)[^\d]{0,80}(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?)\s*(tons?|t|kg)",
            r"(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?)\s*(tons?|t|kg)[^\.]{0,80}(?:quota|catch limits?)",
        ]
        lowered = text.lower()
        for pattern in patterns:
            match = re.search(pattern, lowered, flags=re.IGNORECASE)
            if match:
                value = re.sub(r"[,\s]", "", match.group(1))
                units = match.group(2).lower()
                return value, units
        return None, None


class ChangeDetectionService:
    def detect_change(
        self, store: SQLiteStore, doc: SourceDocument, measure: NormalizedMeasure
    ) -> ChangeEvent:
        prior = store.get_latest_for_measure(measure)
        if prior is None:
            change_type = ChangeType.new
            summary = self._summary_new(measure)
        elif prior.new_value != measure.new_value or prior.due_date != measure.due_date:
            change_type = ChangeType.amendment
            summary = self._summary_amendment(prior, measure)
        else:
            change_type = ChangeType.clarification
            summary = f"{measure.measure_type.value} reiterated with no numeric change"

        return ChangeEvent(
            rfmo=doc.rfmo,
            measure_id=measure.id,
            change_type=change_type,
            summary=summary,
            published_at=doc.published_at,
        )

    def _summary_new(self, measure: NormalizedMeasure) -> str:
        if measure.measure_type == MeasureType.quota:
            target = self._target_label(measure)
            if measure.new_value:
                return (
                    f"New quota for {target}: "
                    f"{measure.old_value or 'unspecified'} -> {measure.new_value} {measure.units or ''}".strip()
                )
            return (
                f"New quota/catch-limit notice for {target}. "
                f"Details: {self._short_excerpt(measure.raw_excerpt)}"
            )
        if measure.measure_type == MeasureType.closure:
            return f"New closure notice for {self._target_label(measure)}"
        if measure.measure_type == MeasureType.reporting:
            if measure.due_date:
                return f"New reporting deadline: {measure.due_date.date()}"
            return f"New reporting requirement. Details: {self._short_excerpt(measure.raw_excerpt)}"
        return "New gear restriction"

    def _summary_amendment(
        self, prior: NormalizedMeasure, current: NormalizedMeasure
    ) -> str:
        if current.measure_type == MeasureType.quota:
            target = self._target_label(current)
            if prior.new_value or current.new_value:
                return (
                    f"Quota amended for {target}: "
                    f"{prior.new_value or 'unspecified'} -> {current.new_value or 'unspecified'} {current.units or ''}"
                ).strip()
            return f"Quota/catch-limit guidance updated for {target}"
        return f"{current.measure_type.value} amended"

    def _target_label(self, measure: NormalizedMeasure) -> str:
        if measure.species and measure.area:
            return f"{measure.species} in {measure.area}"
        if measure.species:
            return measure.species
        if measure.area:
            return measure.area
        return "relevant fisheries"

    def _short_excerpt(self, text: str) -> str:
        compact = re.sub(r"\s+", " ", text or "").strip()
        return compact[:120] + ("..." if len(compact) > 120 else "")


class ImpactService:
    def assess(self, profile: FleetProfile, measure: NormalizedMeasure, event: ChangeEvent) -> ImpactAssessment:
        matches_rfmo = not profile.rfmos or measure.rfmo in profile.rfmos
        matches_species = not profile.species or (measure.species in profile.species)
        matches_area = not profile.areas or (measure.area in profile.areas)
        impacted = matches_rfmo and matches_species and matches_area

        reasons = []
        if matches_rfmo:
            reasons.append("rfmo")
        if matches_species:
            reasons.append("species")
        if matches_area:
            reasons.append("area")

        reason = "Matched " + ", ".join(reasons) if impacted else "No profile match"
        return ImpactAssessment(
            org_id=profile.org_id,
            fleet_profile_id=profile.id,
            change_event_id=event.id,
            impacted=impacted,
            reason=reason,
        )


class AlertService:
    def generate(
        self,
        profile: FleetProfile,
        doc: SourceDocument,
        measure: NormalizedMeasure,
        event: ChangeEvent,
    ) -> Alert:
        severity = self._severity(measure, event)
        action = self._action_required(measure)
        target = self._target_label(measure)
        return Alert(
            org_id=profile.org_id,
            change_event_id=event.id,
            severity=severity,
            title=f"{doc.rfmo} {measure.measure_type.value} update: {target}",
            what_changed=event.summary,
            action_required=action,
            due_date=measure.due_date or measure.effective_date,
            source_document_id=doc.id,
        )

    def _severity(self, measure: NormalizedMeasure, event: ChangeEvent) -> Severity:
        if measure.measure_type in (MeasureType.quota, MeasureType.closure):
            return Severity.high
        if event.change_type == ChangeType.amendment:
            return Severity.medium
        return Severity.low

    def _action_required(self, measure: NormalizedMeasure) -> str:
        target = self._target_label(measure)
        if measure.measure_type == MeasureType.quota:
            return f"Review updated quota/catch-limit guidance for {target}; adjust national allocation and notify impacted vessels."
        if measure.measure_type == MeasureType.closure:
            return f"Issue closure notice for {target} and update permit conditions."
        if measure.measure_type == MeasureType.reporting:
            return "Review reporting obligations, assign owner, and submit required reporting by deadline."
        return "Review gear restriction and update compliance guidance."

    def _target_label(self, measure: NormalizedMeasure) -> str:
        if measure.species and measure.area:
            return f"{measure.species} in {measure.area}"
        if measure.species:
            return measure.species
        if measure.area:
            return measure.area
        return "relevant fisheries"


class PipelineService:
    def __init__(
        self,
        store: SQLiteStore,
        normalizer: NormalizationService,
        change_detector: ChangeDetectionService,
        impact_service: ImpactService,
        alert_service: AlertService,
    ) -> None:
        self.store = store
        self.normalizer = normalizer
        self.change_detector = change_detector
        self.impact_service = impact_service
        self.alert_service = alert_service

    def ingest(self, doc: SourceDocument) -> tuple[List[NormalizedMeasure], List[ChangeEvent], List[Alert]]:
        if self.store.is_duplicate_document(doc):
            return [], [], []

        self.store.add_document(doc)
        measures = self.normalizer.normalize(doc)
        change_events: List[ChangeEvent] = []
        alerts: List[Alert] = []

        for measure in measures:
            self.store.add_measure(measure)
            event = self.change_detector.detect_change(self.store, doc, measure)
            self.store.add_change_event(event)
            change_events.append(event)

            for profile in self.store.list_fleet_profiles():
                assessment = self.impact_service.assess(profile, measure, event)
                if assessment.impacted:
                    alert = self.alert_service.generate(profile, doc, measure, event)
                    self.store.add_alert(alert)
                    alerts.append(alert)

            self.store.set_latest_for_measure(measure)

        return measures, change_events, alerts
