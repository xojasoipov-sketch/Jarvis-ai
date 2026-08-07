import json
import logging
from typing import Any

from openai import AsyncOpenAI

from backend.core.settings import settings
from backend.core.tool_engine.registry import registry

logger = logging.getLogger(__name__)

# ── Few-shot misollar ─────────────────────────────────────────────────────────

FEW_SHOT_EXAMPLES = """
MISOLLAR (o'zbek va rus tillarida):

[O'zbekcha]
1. "kompyuterim sekin ishlayapti"
   → {"intent":"system_check","tools":[{"tool":"cpu_usage","params":{}},{"tool":"ram_usage","params":{}},{"tool":"disk_usage","params":{}}],"response":"Kompyuteringiz holatini tekshiryapman..."}

2. "katta fayllarni top"
   → {"intent":"find_large_files","tools":[{"tool":"file_largest","params":{"directory":"/","top":5}}],"response":"Eng katta fayllarni qidiryapman..."}

3. "Telegramda Aliga yoz, ertaga uchrashamiz de"
   → {"intent":"send_telegram","tools":[{"tool":"telegram_send","params":{"chat_id":"ali","text":"Ertaga uchrashamiz"}}],"response":"Aliga xabar jo'natildi."}

4. "Toshkentda ob-havo qanaqa?"
   → {"intent":"weather","tools":[{"tool":"weather_get","params":{"city":"Toshkent"}}],"response":"Toshkent ob-havosini ko'rsatyapman."}

5. "Kecha qancha pul sarfladim?"
   → {"intent":"expense_analysis","tools":[{"tool":"expense_analyze","params":{"period":"yesterday"}}],"response":"Kechagi xarajatlaringizni hisoblayapman."}

6. "Salom, isming nima?"
   → {"intent":"greeting","tools":[],"response":"Assalomu alaykum! Men Jarvis AI yordamchisiman. Sizga qanday yordam bera olaman?"}

[Ruscha]
7. "компьютер тормозит"
   → {"intent":"system_check","tools":[{"tool":"cpu_usage","params":{}},{"tool":"ram_usage","params":{}},{"tool":"disk_usage","params":{}}],"response":"Проверяю состояние компьютера..."}

8. "найди большие файлы"
   → {"intent":"find_large_files","tools":[{"tool":"file_largest","params":{"directory":"/","top":5}}],"response":"Ищу самые большие файлы..."}

9. "напиши Алишеру в телеграм"
   → {"intent":"send_telegram","tools":[{"tool":"telegram_send","params":{"chat_id":"alisher","text":""}}],"response":"Какое сообщение отправить Алишеру?"}

10. "сколько я потратил за неделю?"
    → {"intent":"expense_analysis","tools":[{"tool":"expense_analyze","params":{"period":"week"}}],"response":"Считаю ваши расходы за неделю..."}

11. "проверь почту"
    → {"intent":"check_email","tools":[{"tool":"email_list","params":{"limit":10,"unread":true}}],"response":"Проверяю вашу почту..."}

12. "погода в москве"
    → {"intent":"weather","tools":[{"tool":"weather_get","params":{"city":"Москва"}}],"response":"Показываю погоду в Москве."}
"""

SYSTEM_TEMPLATE = """\
Siz Jarvis AI yordamchisisiz. Vazifangiz — foydalanuvchi so'rovini tahlil qilib, \
quyidagi tool'lardan birini (yoki bir nechtasini) aniq parametrlar bilan ishga \
tushirishdir. O'zbek va rus tillarida so'zlashuvchilarga xizmat qilasiz.

MUHIM QOIDALAR:
1. Hech qachon javobni o'zingiz o'ylab topmang. Faqat tool natijasiga yoki aniq \
factlarga asoslaning.
2. Agar tool kerak bo'lsa, JSON formatida reja tuzing:
   {{"intent":"qisqa_niyat","tools":[{{"tool":"tool_nomi","params":{{}}}}],"response":"foydalanuvchiga izoh"}}
3. Agar hech qanday tool kerak bo'lmasa (masalan, oddiy suhbat), "tools" \
ro'yxatini bo'sh qoldirib, "response" da javob bering.
4. Noaniq so'rovda parametrlarni so'rash uchun "response" orqali qayta so'rang.
5. Agar bir nechta tool kerak bo'lsa, ularni ketma-ket ishlatish tartibida yozing.
6. Foydalanuvchi tiliga mos javob bering (o'zbekcha → o'zbekcha, ruscha → ruscha).
7. Javob qisqa, lekin samimiy va tushunarli bo'lsin.
8. Faqat sof JSON qaytaring — hech qanday markdown yoki qo'shimcha matn yo'q.

MAVJUD TOOLLAR RO'YXATI:
{tools_list}

FOYDALANUVCHI PROFILI:
{user_profile}

OXIRGI SUHBAT TARIXI:
{conversation_history}

{few_shot}
"""


def _format_history(history: list[dict[str, str]]) -> str:
    if not history:
        return "(bo'sh)"
    lines: list[str] = []
    for msg in history[-6:]:
        role = "Foydalanuvchi" if msg.get("role") == "user" else "Jarvis"
        lines.append(f"{role}: {msg.get('content', '')}")
    return "\n".join(lines)


def _format_profile(profile: dict[str, Any]) -> str:
    if not profile:
        return "(ma'lumot yo'q)"
    parts: list[str] = []
    if profile.get("name"):
        parts.append(f"Ism: {profile['name']}")
    if profile.get("language"):
        parts.append(f"Til: {profile['language']}")
    if profile.get("timezone"):
        parts.append(f"Vaqt mintaqasi: {profile['timezone']}")
    return ", ".join(parts) if parts else str(profile)


class IntentEngine:
    def __init__(self) -> None:
        self._client: AsyncOpenAI | None = None

    def _get_client(self) -> AsyncOpenAI:
        if self._client is None:
            kwargs: dict[str, Any] = {"api_key": settings.llm_api_key}
            base_url = settings.llm_base_url
            if base_url:
                kwargs["base_url"] = base_url
            self._client = AsyncOpenAI(**kwargs)
        return self._client

    async def generate_smart_plan(
        self,
        user_message: str,
        conversation_history: list[dict[str, str]] | None = None,
        user_profile: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        history = conversation_history or []
        profile = user_profile or {}

        system_prompt = SYSTEM_TEMPLATE.format(
            tools_list=registry.tools_description(),
            user_profile=_format_profile(profile),
            conversation_history=_format_history(history),
            few_shot=FEW_SHOT_EXAMPLES,
        )

        try:
            client = self._get_client()
            response = await client.chat.completions.create(
                model=settings.default_model,
                temperature=settings.intent_temperature,
                max_tokens=settings.intent_max_tokens,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
            )
            raw = response.choices[0].message.content or "{}"
            plan = json.loads(raw)
            logger.info(
                "Plan tuzildi: intent=%s tools=%s",
                plan.get("intent"),
                [t.get("tool") for t in plan.get("tools", [])],
            )
            return plan
        except json.JSONDecodeError as exc:
            logger.error("Plan JSON xatosi: %s", exc)
            return {
                "intent": "error",
                "tools": [],
                "response": "Kechirasiz, so'rovingizni tushunmadim. Iltimos, boshqacharoq yozing.",
            }
        except Exception as exc:
            logger.error("IntentEngine xatosi: %s", exc)
            return {
                "intent": "error",
                "tools": [],
                "response": f"AI xizmati bilan bog'liq xato: {exc}",
            }

    async def is_available(self) -> bool:
        return bool(settings.llm_api_key)


intent_engine = IntentEngine()
