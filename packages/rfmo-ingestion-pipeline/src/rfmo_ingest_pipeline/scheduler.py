from __future__ import annotations

import threading
from datetime import datetime, timezone

from rfmo_ingest_pipeline.engine import IngestionEngine
from rfmo_ingest_pipeline.models import IngestionRunResult


class SyncScheduler:
    def __init__(self, engine: IngestionEngine, interval_seconds: int = 6 * 3600) -> None:
        self.engine = engine
        self.interval_seconds = interval_seconds
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._last_run_at: datetime | None = None
        self._last_result: IngestionRunResult | None = None

    def start(self, adapter_names: list[str] | None = None) -> None:
        self.stop()
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, args=(adapter_names,), daemon=True)
        self._thread.start()

    def stop(self) -> None:
        if self._thread and self._thread.is_alive():
            self._stop_event.set()
            self._thread.join(timeout=5)
        self._thread = None

    def status(self) -> dict:
        return {
            "running": bool(self._thread and self._thread.is_alive()),
            "interval_seconds": self.interval_seconds,
            "last_run_at": self._last_run_at,
            "last_result": self._last_result.model_dump(mode="json") if self._last_result else None,
        }

    def _run_loop(self, adapter_names: list[str] | None) -> None:
        while not self._stop_event.is_set():
            self._last_result = self.engine.run_once(adapter_names=adapter_names)
            self._last_run_at = datetime.now(timezone.utc)
            self._stop_event.wait(self.interval_seconds)
