from __future__ import annotations

import json
import sqlite3
import threading
from datetime import date, datetime, timezone
from typing import Any

from rfmo_ingest_pipeline.models import (
    DocumentCategory,
    DocumentRecord,
    DocumentRef,
    DocumentVersionRecord,
    IngestionRunResult,
    ProcessingStatus,
    SourceHealth,
)


class SQLiteStore:
    def __init__(self, db_path: str = "rfmo_ingestion.db") -> None:
        self.db_path = db_path
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        with self._lock:
            self._conn.executescript(
                """
                PRAGMA journal_mode=WAL;

                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    rfmo TEXT NOT NULL,
                    source_url TEXT NOT NULL,
                    document_type TEXT NOT NULL,
                    title TEXT,
                    publication_date TEXT,
                    latest_version INTEGER NOT NULL DEFAULT 0,
                    latest_file_hash TEXT,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(rfmo, source_url)
                );

                CREATE TABLE IF NOT EXISTS document_versions (
                    id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    version_number INTEGER NOT NULL,
                    file_hash TEXT NOT NULL,
                    etag TEXT,
                    last_modified TEXT,
                    metadata_hash TEXT,
                    content_hash TEXT,
                    status TEXT NOT NULL,
                    stored_path TEXT NOT NULL,
                    extracted_text_path TEXT NOT NULL,
                    snapshot_html_path TEXT,
                    metadata_path TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(document_id) REFERENCES documents(id),
                    UNIQUE(document_id, version_number)
                );

                CREATE TABLE IF NOT EXISTS source_health (
                    adapter_name TEXT PRIMARY KEY,
                    rfmo TEXT NOT NULL,
                    last_success_at TEXT,
                    consecutive_failures INTEGER NOT NULL DEFAULT 0,
                    last_error TEXT
                );

                CREATE TABLE IF NOT EXISTS ingestion_runs (
                    run_id TEXT PRIMARY KEY,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_documents_rfmo ON documents(rfmo);
                CREATE INDEX IF NOT EXISTS idx_versions_document ON document_versions(document_id, version_number DESC);
                """
            )
            self._conn.commit()

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    def get_document(self, rfmo: str, source_url: str) -> DocumentRecord | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM documents WHERE rfmo = ? AND source_url = ?",
                (rfmo, source_url),
            ).fetchone()
        if row is None:
            return None
        return self._row_to_document(row)

    def upsert_document_discovered(self, ref: DocumentRef) -> DocumentRecord:
        existing = self.get_document(ref.rfmo, ref.source_url)
        now = datetime.now(timezone.utc)
        if existing is not None:
            title = existing.title or ref.title_hint
            publication_date = existing.publication_date or ref.published_date
            with self._lock:
                self._conn.execute(
                    """
                    UPDATE documents
                    SET document_type = ?, title = ?, publication_date = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        ref.document_type.value,
                        title,
                        publication_date.isoformat() if publication_date else None,
                        now.isoformat(),
                        existing.id,
                    ),
                )
                self._conn.commit()
            existing.document_type = ref.document_type
            existing.title = title
            existing.publication_date = publication_date
            existing.updated_at = now
            return existing

        created = DocumentRecord(
            rfmo=ref.rfmo,
            source_url=ref.source_url,
            document_type=ref.document_type,
            title=ref.title_hint,
            publication_date=ref.published_date,
            status=ProcessingStatus.discovered,
        )
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO documents (
                    id, rfmo, source_url, document_type, title, publication_date,
                    latest_version, latest_file_hash, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    created.id,
                    created.rfmo,
                    created.source_url,
                    created.document_type.value,
                    created.title,
                    created.publication_date.isoformat() if created.publication_date else None,
                    created.latest_version,
                    created.latest_file_hash,
                    created.status.value,
                    created.created_at.isoformat(),
                    created.updated_at.isoformat(),
                ),
            )
            self._conn.commit()
        return created

    def list_document_versions(self, document_id: str) -> list[DocumentVersionRecord]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM document_versions WHERE document_id = ? ORDER BY version_number ASC",
                (document_id,),
            ).fetchall()
        return [self._row_to_version(r) for r in rows]

    def get_latest_version(self, document_id: str) -> DocumentVersionRecord | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM document_versions WHERE document_id = ? ORDER BY version_number DESC LIMIT 1",
                (document_id,),
            ).fetchone()
        if row is None:
            return None
        return self._row_to_version(row)

    def create_version(self, version: DocumentVersionRecord, document: DocumentRecord) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO document_versions (
                    id, document_id, version_number, file_hash, etag, last_modified,
                    metadata_hash, content_hash, status, stored_path, extracted_text_path,
                    snapshot_html_path, metadata_path, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    version.id,
                    version.document_id,
                    version.version_number,
                    version.file_hash,
                    version.etag,
                    version.last_modified,
                    version.metadata_hash,
                    version.content_hash,
                    version.status.value,
                    version.stored_path,
                    version.extracted_text_path,
                    version.snapshot_html_path,
                    version.metadata_path,
                    version.created_at.isoformat(),
                ),
            )
            self._conn.execute(
                """
                UPDATE documents
                SET latest_version = ?, latest_file_hash = ?, status = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    version.version_number,
                    version.file_hash,
                    document.status.value,
                    datetime.now(timezone.utc).isoformat(),
                    document.id,
                ),
            )
            self._conn.commit()

    def mark_document_status(self, document_id: str, status: ProcessingStatus) -> None:
        with self._lock:
            self._conn.execute(
                "UPDATE documents SET status = ?, updated_at = ? WHERE id = ?",
                (status.value, datetime.now(timezone.utc).isoformat(), document_id),
            )
            self._conn.commit()

    def upsert_source_health(self, health: SourceHealth) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO source_health (adapter_name, rfmo, last_success_at, consecutive_failures, last_error)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(adapter_name) DO UPDATE SET
                    rfmo = excluded.rfmo,
                    last_success_at = excluded.last_success_at,
                    consecutive_failures = excluded.consecutive_failures,
                    last_error = excluded.last_error
                """,
                (
                    health.adapter_name,
                    health.rfmo,
                    health.last_success_at.isoformat() if health.last_success_at else None,
                    health.consecutive_failures,
                    health.last_error,
                ),
            )
            self._conn.commit()

    def list_source_health(self) -> list[SourceHealth]:
        with self._lock:
            rows = self._conn.execute("SELECT * FROM source_health ORDER BY adapter_name ASC").fetchall()
        return [
            SourceHealth(
                rfmo=r["rfmo"],
                adapter_name=r["adapter_name"],
                last_success_at=self._parse_dt(r["last_success_at"]),
                consecutive_failures=r["consecutive_failures"],
                last_error=r["last_error"],
            )
            for r in rows
        ]

    def save_run_result(self, result: IngestionRunResult) -> None:
        payload = result.model_dump(mode="json")
        with self._lock:
            self._conn.execute(
                "INSERT INTO ingestion_runs (run_id, payload_json, created_at) VALUES (?, ?, ?)",
                (
                    result.run_id,
                    json.dumps(payload),
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
            self._conn.commit()

    def latest_run(self) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT payload_json FROM ingestion_runs ORDER BY created_at DESC LIMIT 1"
            ).fetchone()
        if row is None:
            return None
        return json.loads(row["payload_json"])

    def list_documents(self, rfmo: str | None = None) -> list[DocumentRecord]:
        with self._lock:
            if rfmo:
                rows = self._conn.execute(
                    "SELECT * FROM documents WHERE rfmo = ? ORDER BY updated_at DESC",
                    (rfmo,),
                ).fetchall()
            else:
                rows = self._conn.execute("SELECT * FROM documents ORDER BY updated_at DESC").fetchall()
        return [self._row_to_document(r) for r in rows]

    def _row_to_document(self, row: sqlite3.Row) -> DocumentRecord:
        return DocumentRecord(
            id=row["id"],
            rfmo=row["rfmo"],
            source_url=row["source_url"],
            document_type=DocumentCategory(row["document_type"]),
            title=row["title"],
            publication_date=self._parse_date(row["publication_date"]),
            latest_version=row["latest_version"],
            latest_file_hash=row["latest_file_hash"],
            status=ProcessingStatus(row["status"]),
            created_at=self._parse_dt(row["created_at"]) or datetime.now(timezone.utc),
            updated_at=self._parse_dt(row["updated_at"]) or datetime.now(timezone.utc),
        )

    def _row_to_version(self, row: sqlite3.Row) -> DocumentVersionRecord:
        return DocumentVersionRecord(
            id=row["id"],
            document_id=row["document_id"],
            version_number=row["version_number"],
            file_hash=row["file_hash"],
            etag=row["etag"],
            last_modified=row["last_modified"],
            metadata_hash=row["metadata_hash"],
            content_hash=row["content_hash"],
            status=ProcessingStatus(row["status"]),
            stored_path=row["stored_path"],
            extracted_text_path=row["extracted_text_path"],
            snapshot_html_path=row["snapshot_html_path"],
            metadata_path=row["metadata_path"],
            created_at=self._parse_dt(row["created_at"]) or datetime.now(timezone.utc),
        )

    def _parse_dt(self, value: str | None) -> datetime | None:
        if not value:
            return None
        return datetime.fromisoformat(value)

    def _parse_date(self, value: str | None) -> date | None:
        if not value:
            return None
        return date.fromisoformat(value)
