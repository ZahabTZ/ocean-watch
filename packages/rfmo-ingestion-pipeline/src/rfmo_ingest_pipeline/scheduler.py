from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Callable, Optional


class SyncScheduler:
    def __init__(self, sync_fn: Callable[[str, int], dict]) -> None:
        self._sync_fn = sync_fn
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._interval_seconds = 0
        self._connector = ""
        self._limit = 0
        self._last_run_at: Optional[datetime] = None
        self._last_result: Optional[dict] = None

    def start(self, connector: str, interval_seconds: int, limit: int) -> None:
        self.stop()
        self._connector = connector
        self._interval_seconds = interval_seconds
        self._limit = limit
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        if self._thread and self._thread.is_alive():
            self._stop_event.set()
            self._thread.join(timeout=2)
        self._thread = None

    def status(self) -> dict:
        return {
            "running": bool(self._thread and self._thread.is_alive()),
            "connector": self._connector or None,
            "interval_seconds": self._interval_seconds or None,
            "limit": self._limit or None,
            "last_run_at": self._last_run_at,
            "last_result": self._last_result,
        }

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            self._last_result = self._sync_fn(self._connector, self._limit)
            self._last_run_at = datetime.now(timezone.utc)
            self._stop_event.wait(self._interval_seconds)
