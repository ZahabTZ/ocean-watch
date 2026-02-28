from __future__ import annotations

from datetime import date, datetime, timezone
from enum import Enum
from typing import Any, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class DocumentCategory(str, Enum):
    conservation_management_measures = "conservation_management_measures"
    recommendations_resolutions = "recommendations_resolutions"
    circular_letters = "circular_letters"
    iuu_vessel_lists = "iuu_vessel_lists"
    quota_allocation_tables = "quota_allocation_tables"
    meeting_decisions = "meeting_decisions"
    other = "other"


class ProcessingStatus(str, Enum):
    discovered = "discovered"
    ingested = "ingested"
    failed = "failed"
    skipped = "skipped"


class IngestReason(str, Enum):
    new_url = "new_url"
    file_hash_changed = "file_hash_changed"
    page_content_changed = "page_content_changed"
    metadata_changed = "metadata_changed"


class DocumentRef(BaseModel):
    rfmo: str
    source_url: str
    document_type: DocumentCategory
    index_url: Optional[str] = None
    title_hint: Optional[str] = None
    published_date: Optional[date] = None
    document_number: Optional[str] = None
    meeting_reference: Optional[str] = None
    rfmo_region: Optional[str] = None
    language: Optional[str] = None
    discovered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = Field(default_factory=dict)


class RawDocument(BaseModel):
    source_url: str
    status_code: int
    headers: dict[str, str] = Field(default_factory=dict)
    content_type: Optional[str] = None
    body: bytes
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ParsedDocument(BaseModel):
    title: Optional[str] = None
    publication_date: Optional[date] = None
    document_category: Optional[DocumentCategory] = None
    document_number: Optional[str] = None
    meeting_reference: Optional[str] = None
    rfmo_region: Optional[str] = None
    extracted_text: str = ""
    snapshot_html: Optional[str] = None
    parser_info: dict[str, Any] = Field(default_factory=dict)


class ChangeDecision(BaseModel):
    should_ingest: bool
    reasons: list[IngestReason] = Field(default_factory=list)
    next_version_number: int


class DocumentRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    rfmo: str
    source_url: str
    document_type: DocumentCategory
    title: Optional[str] = None
    publication_date: Optional[date] = None
    latest_version: int = 0
    latest_file_hash: Optional[str] = None
    status: ProcessingStatus = ProcessingStatus.discovered
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DocumentVersionRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    document_id: str
    version_number: int
    file_hash: str
    etag: Optional[str] = None
    last_modified: Optional[str] = None
    metadata_hash: Optional[str] = None
    content_hash: Optional[str] = None
    status: ProcessingStatus = ProcessingStatus.ingested
    stored_path: str
    extracted_text_path: str
    snapshot_html_path: Optional[str] = None
    metadata_path: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RunMetrics(BaseModel):
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    documents_discovered: int = 0
    documents_fetched: int = 0
    documents_ingested: int = 0
    documents_skipped: int = 0
    failures: int = 0
    parse_failures: int = 0
    storage_bytes_written: int = 0


class SourceHealth(BaseModel):
    rfmo: str
    adapter_name: str
    last_success_at: Optional[datetime] = None
    consecutive_failures: int = 0
    last_error: Optional[str] = None


class IngestionRunResult(BaseModel):
    run_id: str = Field(default_factory=lambda: str(uuid4()))
    metrics: RunMetrics
    source_health: list[SourceHealth] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
