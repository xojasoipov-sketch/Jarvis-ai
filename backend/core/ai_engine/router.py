import logging
from typing import Any

from backend.core.ai_engine.intent_engine import intent_engine
from backend.core.ai_engine.memory import MemoryManager
from backend.core.tool_engine.executor import execute_tool

logger = logging.getLogger(__name__)


async def process_user_request(
    user_id: int | str,
    message: str,
    memory: MemoryManager,
) -> str:
    # 1. Xotiradan kontekst olish
    history = await memory.get_short_term(user_id)
    profile = await memory.get_user_profile(user_id)

    logger.info(
        "So'rov qabul qilindi: user_id=%s message=%.60s...", user_id, message
    )

    # 2. Foydalanuvchi xabarini xotiraga yozish
    await memory.store_short_term(user_id, "user", message)

    # 3. NLU + Planning
    plan = await intent_engine.generate_smart_plan(
        user_message=message,
        conversation_history=history,
        user_profile=profile,
    )

    if not isinstance(plan, dict) or "intent" not in plan:
        logger.warning("Reja noto'g'ri format: %s", plan)
        reply = "Kechirasiz, so'rovingizni qayta ishlay olmadim."
        await memory.store_short_term(user_id, "assistant", reply)
        return reply

    intent = plan.get("intent", "")
    tools_to_run: list[dict[str, Any]] = plan.get("tools", [])
    base_response: str = plan.get("response", "")

    # 4. Tool'lar bo'lmasa — to'g'ridan-to'g'ri javob
    if not tools_to_run:
        reply = base_response or "Javob topilmadi."
        await memory.store_short_term(user_id, "assistant", reply)
        logger.info("Tool yo'q, to'g'ridan-to'g'ri javob: intent=%s", intent)
        return reply

    # 5. Tool'larni ketma-ket ishga tushirish
    tool_results: list[str] = []
    for tool_call in tools_to_run:
        tool_name = tool_call.get("tool", "")
        tool_params: dict[str, Any] = tool_call.get("params", {})

        if not tool_name:
            logger.warning("Bo'sh tool nomi, o'tkazib yuborildi")
            continue

        try:
            result = await execute_tool(tool_name, tool_params)
            serialized = _serialize(result)
            tool_results.append(f"[{tool_name}]: {serialized}")
            logger.info("Tool muvaffaqiyatli: %s", tool_name)
        except ValueError as exc:
            tool_results.append(f"[{tool_name}]: ⚠ {exc}")
            logger.warning("Tool topilmadi: %s — %s", tool_name, exc)
        except Exception as exc:
            tool_results.append(f"[{tool_name}]: ✗ Xato — {exc}")
            logger.error("Tool xatosi: %s — %s", tool_name, exc)

    # 6. Yakuniy javob
    if tool_results:
        combined = "\n".join(tool_results)
        reply = f"{base_response}\n\n{combined}".strip() if base_response else combined
    else:
        reply = base_response or "Amal bajarildi."

    # 7. Natijani xotiraga saqlash
    await memory.store_short_term(user_id, "assistant", reply)

    logger.info(
        "Javob tayyorlandi: intent=%s tools=%d results=%d chars",
        intent,
        len(tools_to_run),
        len(reply),
    )
    return reply


def _serialize(value: Any) -> str:
    if value is None:
        return "(natija yo'q)"
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)):
        return str(value)
    if isinstance(value, dict):
        lines: list[str] = []
        for k, v in value.items():
            lines.append(f"{k}: {_serialize(v)}")
        return "\n".join(lines)
    if isinstance(value, list):
        if not value:
            return "(bo'sh ro'yxat)"
        return "\n".join(f"• {_serialize(item)}" for item in value[:20])
    return str(value)
