import logging
import time
from dataclasses import dataclass, field
from typing import Any


logger = logging.getLogger(__name__)


@dataclass
class ToolLogEntry:
    tool: str
    params: dict[str, Any]
    started_at: float = field(default_factory=time.time)
    finished_at: float | None = None
    result: Any = None
    error: str | None = None

    @property
    def elapsed_ms(self) -> float:
        if self.finished_at is None:
            return 0.0
        return (self.finished_at - self.started_at) * 1000


class ToolLog:
    def __init__(self) -> None:
        self._entries: list[ToolLogEntry] = []

    def start(self, tool: str, params: dict[str, Any]) -> ToolLogEntry:
        entry = ToolLogEntry(tool=tool, params=params)
        self._entries.append(entry)
        logger.info("[ToolLog] ▶ %s  params=%s", tool, params)
        return entry

    def finish(self, entry: ToolLogEntry, result: Any) -> None:
        entry.finished_at = time.time()
        entry.result = result
        logger.info("[ToolLog] ✓ %s  %.1fms", entry.tool, entry.elapsed_ms)

    def fail(self, entry: ToolLogEntry, error: str) -> None:
        entry.finished_at = time.time()
        entry.error = error
        logger.warning("[ToolLog] ✗ %s  error=%s  %.1fms", entry.tool, error, entry.elapsed_ms)

    def recent(self, n: int = 20) -> list[ToolLogEntry]:
        return self._entries[-n:]

    def clear(self) -> None:
        self._entries.clear()


tool_log = ToolLog()
