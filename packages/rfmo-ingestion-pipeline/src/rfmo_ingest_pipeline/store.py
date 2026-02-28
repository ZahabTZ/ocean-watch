from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime
from typing import List, Optional

from rfmo_ingest_pipeline.models import Alert, ChangeEvent, FleetProfile, NormalizedMeasure, SourceDocument


class SQLiteStore:
    def __init__(self, db_path: str = "rfmo.db") -> None:
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

                CREATE TABLE IF NOT EXISTS fleet_profiles (
                    id TEXT PRIMARY KEY,
                    org_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    rfmos TEXT NOT NULL,
                    species TEXT NOT NULL,
                    areas TEXT NOT NULL,
                    gears TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    rfmo TEXT NOT NULL,
                    title TEXT NOT NULL,
                    published_at TEXT NOT NULL,
                    content TEXT NOT NULL,
                    source_url TEXT,
                    external_id TEXT,
                    connector TEXT,
                    ingested_at TEXT NOT NULL,
                    external_key TEXT UNIQUE
                );

                CREATE TABLE IF NOT EXISTS measures (
                    id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    rfmo TEXT NOT NULL,
                    measure_type TEXT NOT NULL,
                    species TEXT,
                    area TEXT,
                    old_value TEXT,
                    new_value TEXT,
                    units TEXT,
                    effective_date TEXT,
                    due_date TEXT,
                    confidence REAL NOT NULL,
                    raw_excerpt TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS latest_measures (
                    key TEXT PRIMARY KEY,
                    measure_id TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS change_events (
                    id TEXT PRIMARY KEY,
                    rfmo TEXT NOT NULL,
                    measure_id TEXT NOT NULL,
                    change_type TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    published_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    org_id TEXT NOT NULL,
                    change_event_id TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    title TEXT NOT NULL,
                    what_changed TEXT NOT NULL,
                    action_required TEXT NOT NULL,
                    due_date TEXT,
                    source_document_id TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_alerts_org_id ON alerts(org_id);
                CREATE INDEX IF NOT EXISTS idx_change_events_published_at ON change_events(published_at);
                CREATE INDEX IF NOT EXISTS idx_documents_published_at ON documents(published_at);
                """
            )
            self._conn.commit()

    def _json_list(self, values: List[str]) -> str:
        return json.dumps(values)

    def _parse_list(self, value: str) -> List[str]:
        return json.loads(value)

    def _to_iso(self, value: Optional[datetime]) -> Optional[str]:
        if value is None:
            return None
        return value.isoformat()

    def _from_iso(self, value: Optional[str]) -> Optional[datetime]:
        if value is None:
            return None
        return datetime.fromisoformat(value)

    def upsert_fleet_profile(self, profile: FleetProfile) -> FleetProfile:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO fleet_profiles (id, org_id, name, rfmos, species, areas, gears)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    org_id = excluded.org_id,
                    name = excluded.name,
                    rfmos = excluded.rfmos,
                    species = excluded.species,
                    areas = excluded.areas,
                    gears = excluded.gears
                """,
                (
                    profile.id,
                    profile.org_id,
                    profile.name,
                    self._json_list(profile.rfmos),
                    self._json_list(profile.species),
                    self._json_list(profile.areas),
                    self._json_list(profile.gears),
                ),
            )
            self._conn.commit()
        return profile

    def list_fleet_profiles(self) -> List[FleetProfile]:
        with self._lock:
            rows = self._conn.execute("SELECT * FROM fleet_profiles ORDER BY name ASC").fetchall()

        return [
            FleetProfile(
                id=row["id"],
                org_id=row["org_id"],
                name=row["name"],
                rfmos=self._parse_list(row["rfmos"]),
                species=self._parse_list(row["species"]),
                areas=self._parse_list(row["areas"]),
                gears=self._parse_list(row["gears"]),
            )
            for row in rows
        ]

    def add_document(self, doc: SourceDocument) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO documents (
                    id, rfmo, title, published_at, content, source_url,
                    external_id, connector, ingested_at, external_key
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    doc.id,
                    doc.rfmo,
                    doc.title,
                    self._to_iso(doc.published_at),
                    doc.content,
                    doc.source_url,
                    doc.external_id,
                    doc.connector,
                    self._to_iso(doc.ingested_at),
                    self.document_key(doc),
                ),
            )
            self._conn.commit()

    def list_documents(self) -> List[SourceDocument]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM documents ORDER BY published_at DESC LIMIT 200"
            ).fetchall()

        return [self._row_to_document(row) for row in rows]

    def get_document_by_id(self, document_id: str) -> Optional[SourceDocument]:
        with self._lock:
            row = self._conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        if row is None:
            return None
        return self._row_to_document(row)

    def add_measure(self, measure: NormalizedMeasure) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO measures (
                    id, document_id, rfmo, measure_type, species, area,
                    old_value, new_value, units, effective_date, due_date,
                    confidence, raw_excerpt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    measure.id,
                    measure.document_id,
                    measure.rfmo,
                    measure.measure_type.value,
                    measure.species,
                    measure.area,
                    measure.old_value,
                    measure.new_value,
                    measure.units,
                    self._to_iso(measure.effective_date),
                    self._to_iso(measure.due_date),
                    measure.confidence,
                    measure.raw_excerpt,
                ),
            )
            self._conn.commit()

    def get_measure_by_id(self, measure_id: str) -> Optional[NormalizedMeasure]:
        with self._lock:
            row = self._conn.execute("SELECT * FROM measures WHERE id = ?", (measure_id,)).fetchone()
        if row is None:
            return None
        return self._row_to_measure(row)

    def add_change_event(self, event: ChangeEvent) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO change_events (id, rfmo, measure_id, change_type, summary, published_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    event.id,
                    event.rfmo,
                    event.measure_id,
                    event.change_type.value,
                    event.summary,
                    self._to_iso(event.published_at),
                ),
            )
            self._conn.commit()

    def add_alert(self, alert: Alert) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO alerts (
                    id, org_id, change_event_id, severity, title,
                    what_changed, action_required, due_date,
                    source_document_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    alert.id,
                    alert.org_id,
                    alert.change_event_id,
                    alert.severity.value,
                    alert.title,
                    alert.what_changed,
                    alert.action_required,
                    self._to_iso(alert.due_date),
                    alert.source_document_id,
                    self._to_iso(alert.created_at),
                ),
            )
            self._conn.commit()

    def list_change_events(self) -> List[ChangeEvent]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM change_events ORDER BY published_at DESC LIMIT 200"
            ).fetchall()

        return [
            ChangeEvent(
                id=row["id"],
                rfmo=row["rfmo"],
                measure_id=row["measure_id"],
                change_type=row["change_type"],
                summary=row["summary"],
                published_at=self._from_iso(row["published_at"]),
            )
            for row in rows
        ]

    def get_change_event_by_id(self, change_event_id: str) -> Optional[ChangeEvent]:
        with self._lock:
            row = self._conn.execute("SELECT * FROM change_events WHERE id = ?", (change_event_id,)).fetchone()
        if row is None:
            return None
        return ChangeEvent(
            id=row["id"],
            rfmo=row["rfmo"],
            measure_id=row["measure_id"],
            change_type=row["change_type"],
            summary=row["summary"],
            published_at=self._from_iso(row["published_at"]),
        )

    def list_alerts_for_org(self, org_id: str) -> List[Alert]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM alerts WHERE org_id = ? ORDER BY created_at DESC LIMIT 200", (org_id,)
            ).fetchall()

        return [
            Alert(
                id=row["id"],
                org_id=row["org_id"],
                change_event_id=row["change_event_id"],
                severity=row["severity"],
                title=row["title"],
                what_changed=row["what_changed"],
                action_required=row["action_required"],
                due_date=self._from_iso(row["due_date"]),
                source_document_id=row["source_document_id"],
                created_at=self._from_iso(row["created_at"]),
            )
            for row in rows
        ]

    def measure_key(self, measure: NormalizedMeasure) -> str:
        return "|".join(
            [
                measure.rfmo,
                measure.measure_type.value,
                (measure.species or "*"),
                (measure.area or "*"),
            ]
        )

    def get_latest_for_measure(self, measure: NormalizedMeasure) -> Optional[NormalizedMeasure]:
        key = self.measure_key(measure)
        with self._lock:
            row = self._conn.execute(
                """
                SELECT m.*
                FROM latest_measures lm
                JOIN measures m ON m.id = lm.measure_id
                WHERE lm.key = ?
                """,
                (key,),
            ).fetchone()

        if row is None:
            return None
        return self._row_to_measure(row)

    def set_latest_for_measure(self, measure: NormalizedMeasure) -> None:
        key = self.measure_key(measure)
        with self._lock:
            self._conn.execute(
                "INSERT INTO latest_measures (key, measure_id) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET measure_id = excluded.measure_id",
                (key, measure.id),
            )
            self._conn.commit()

    def document_key(self, doc: SourceDocument) -> Optional[str]:
        if doc.external_id:
            return f"{doc.rfmo}|{doc.external_id}"
        if doc.source_url:
            return f"{doc.rfmo}|url|{doc.source_url}"
        return None

    def is_duplicate_document(self, doc: SourceDocument) -> bool:
        key = self.document_key(doc)
        if key is None:
            return False
        with self._lock:
            row = self._conn.execute("SELECT 1 FROM documents WHERE external_key = ?", (key,)).fetchone()
        return row is not None

    def _row_to_document(self, row: sqlite3.Row) -> SourceDocument:
        return SourceDocument(
            id=row["id"],
            rfmo=row["rfmo"],
            title=row["title"],
            published_at=self._from_iso(row["published_at"]),
            content=row["content"],
            source_url=row["source_url"],
            external_id=row["external_id"],
            connector=row["connector"],
            ingested_at=self._from_iso(row["ingested_at"]),
        )

    def _row_to_measure(self, row: sqlite3.Row) -> NormalizedMeasure:
        return NormalizedMeasure(
            id=row["id"],
            document_id=row["document_id"],
            rfmo=row["rfmo"],
            measure_type=row["measure_type"],
            species=row["species"],
            area=row["area"],
            old_value=row["old_value"],
            new_value=row["new_value"],
            units=row["units"],
            effective_date=self._from_iso(row["effective_date"]),
            due_date=self._from_iso(row["due_date"]),
            confidence=row["confidence"],
            raw_excerpt=row["raw_excerpt"],
        )
