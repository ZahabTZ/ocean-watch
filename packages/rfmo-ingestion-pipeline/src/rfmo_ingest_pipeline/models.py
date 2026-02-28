from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class MeasureType(str, Enum):
    quota = "quota"
    closure = "closure"
    reporting = "reporting"
    gear = "gear"


class ChangeType(str, Enum):
    new = "new"
    amendment = "amendment"
    revocation = "revocation"
    clarification = "clarification"


class Severity(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class FleetProfileCreate(BaseModel):
    org_id: str
    name: str
    rfmos: List[str] = Field(default_factory=list)
    species: List[str] = Field(default_factory=list)
    areas: List[str] = Field(default_factory=list)
    gears: List[str] = Field(default_factory=list)


class FleetProfile(FleetProfileCreate):
    id: str = Field(default_factory=lambda: str(uuid4()))


class SourceDocumentCreate(BaseModel):
    rfmo: str
    title: str
    published_at: datetime
    content: str
    source_url: Optional[str] = None
    external_id: Optional[str] = None
    connector: Optional[str] = None


class SourceDocument(SourceDocumentCreate):
    id: str = Field(default_factory=lambda: str(uuid4()))
    ingested_at: datetime = Field(default_factory=datetime.utcnow)


class NormalizedMeasure(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    document_id: str
    rfmo: str
    measure_type: MeasureType
    species: Optional[str] = None
    area: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    units: Optional[str] = None
    effective_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    confidence: float
    raw_excerpt: str


class ChangeEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    rfmo: str
    measure_id: str
    change_type: ChangeType
    summary: str
    published_at: datetime


class ImpactAssessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    org_id: str
    fleet_profile_id: str
    change_event_id: str
    impacted: bool
    reason: str


class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    org_id: str
    change_event_id: str
    severity: Severity
    title: str
    what_changed: str
    action_required: str
    due_date: Optional[datetime] = None
    source_document_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class IngestResponse(BaseModel):
    document: SourceDocument
    measures: List[NormalizedMeasure]
    change_events: List[ChangeEvent]
    alerts: List[Alert]


class ConnectorSyncRequest(BaseModel):
    connector: str
    limit: int = 20


class ConnectorSyncResponse(BaseModel):
    connector: str
    fetched: int
    ingested: int
    skipped_duplicates: int
    measures: int
    change_events: int
    alerts: int


class SchedulerStartRequest(BaseModel):
    connector: str
    interval_seconds: int = 3600
    limit: int = 20


class ConnectorSyncAllRequest(BaseModel):
    limit_per_connector: int = 10


class ConnectorSyncAllResponse(BaseModel):
    connectors_total: int
    connectors_succeeded: int
    connectors_failed: int
    fetched: int
    ingested: int
    skipped_duplicates: int
    measures: int
    change_events: int
    alerts: int
    errors: List[str] = Field(default_factory=list)
