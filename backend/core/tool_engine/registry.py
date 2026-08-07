import logging
from typing import Any, Callable, Awaitable

logger = logging.getLogger(__name__)


ToolHandler = Callable[[dict[str, Any]], Awaitable[Any]]


class ToolDefinition:
    __slots__ = ("name", "description", "params_schema", "handler")

    def __init__(
        self,
        name: str,
        description: str,
        params_schema: dict[str, Any],
        handler: ToolHandler,
    ) -> None:
        self.name = name
        self.description = description
        self.params_schema = params_schema
        self.handler = handler

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "params": self.params_schema,
        }


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolDefinition] = {}

    def register(
        self,
        name: str,
        description: str,
        params_schema: dict[str, Any] | None = None,
    ) -> Callable[[ToolHandler], ToolHandler]:
        def decorator(fn: ToolHandler) -> ToolHandler:
            self._tools[name] = ToolDefinition(
                name=name,
                description=description,
                params_schema=params_schema or {},
                handler=fn,
            )
            logger.debug("Tool ro'yxatga olindi: %s", name)
            return fn
        return decorator

    def get(self, name: str) -> ToolDefinition | None:
        return self._tools.get(name)

    def names(self) -> list[str]:
        return list(self._tools.keys())

    def all_tools(self) -> list[ToolDefinition]:
        return list(self._tools.values())

    def tools_description(self) -> str:
        lines: list[str] = []
        for td in self._tools.values():
            param_str = ", ".join(
                f"{k}: {v}" for k, v in td.params_schema.items()
            )
            lines.append(f"• {td.name}({param_str}) — {td.description}")
        return "\n".join(lines) if lines else "(hech qanday tool yo'q)"


registry = ToolRegistry()
