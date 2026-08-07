import logging
from difflib import get_close_matches
from typing import Any

from backend.core.tool_engine.registry import registry
from backend.core.tool_engine.tool_log import tool_log

logger = logging.getLogger(__name__)


async def execute_tool(name: str, params: dict[str, Any]) -> Any:
    tool_def = registry.get(name)

    if tool_def is None:
        all_names = registry.names()
        suggestions = get_close_matches(name, all_names, n=3, cutoff=0.4)
        if suggestions:
            hint = ", ".join(f'"{s}"' for s in suggestions)
            raise ValueError(
                f'Tool topilmadi: "{name}". '
                f"Ehtimol shu tool'lardan birini nazarda tutdingizmi: {hint}"
            )
        raise ValueError(
            f'Tool topilmadi: "{name}". '
            f"Mavjud tool'lar: {', '.join(all_names) if all_names else '(hech biri yo\\'q)'}"
        )

    entry = tool_log.start(name, params)
    try:
        result = await tool_def.handler(params)
        tool_log.finish(entry, result)
        return result
    except Exception as exc:
        tool_log.fail(entry, str(exc))
        logger.error("execute_tool '%s' xatosi: %s", name, exc)
        raise
