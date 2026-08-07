import logging
import os
import shutil
from pathlib import Path
from typing import Any

import httpx

from backend.core.settings import settings
from backend.core.tool_engine.registry import registry

logger = logging.getLogger(__name__)


# ── SYSTEM: kompyuter holati ──────────────────────────────────────────────────

@registry.register(
    "cpu_usage",
    "Protsessor (CPU) yuklanish foizini qaytaradi",
    {},
)
async def cpu_usage(params: dict[str, Any]) -> dict[str, Any]:
    try:
        import psutil
    except ImportError:
        return {"error": "psutil o'rnatilmagan"}
    percent = psutil.cpu_percent(interval=0.5)
    return {"cpu_percent": percent, "cores": psutil.cpu_count()}


@registry.register(
    "ram_usage",
    "Operativ xotira (RAM) foydalanish holatini qaytaradi",
    {},
)
async def ram_usage(params: dict[str, Any]) -> dict[str, Any]:
    try:
        import psutil
    except ImportError:
        return {"error": "psutil o'rnatilmagan"}
    mem = psutil.virtual_memory()
    return {
        "total_gb": round(mem.total / (1024**3), 2),
        "used_gb": round(mem.used / (1024**3), 2),
        "percent": mem.percent,
    }


@registry.register(
    "disk_usage",
    "Disk maydoni holatini qaytaradi (path: ixtiyoriy, default /)",
    {"path": "str (ixtiyoriy)"},
)
async def disk_usage(params: dict[str, Any]) -> dict[str, Any]:
    path = params.get("path", "/")
    try:
        total, used, free = shutil.disk_usage(path)
    except FileNotFoundError:
        return {"error": f"Yo'l topilmadi: {path}"}
    return {
        "path": path,
        "total_gb": round(total / (1024**3), 2),
        "used_gb": round(used / (1024**3), 2),
        "free_gb": round(free / (1024**3), 2),
        "percent": round(used / total * 100, 1) if total else 0,
    }


# ── FAYL: qidirish ────────────────────────────────────────────────────────────

@registry.register(
    "file_largest",
    "Ko'rsatilgan papkadagi eng katta fayllarni topadi",
    {"directory": "str", "top": "int (ixtiyoriy, default 5)"},
)
async def file_largest(params: dict[str, Any]) -> dict[str, Any]:
    directory = params.get("directory", str(Path.home()))
    top = int(params.get("top", 5))

    root = Path(directory)
    if not root.exists():
        return {"error": f"Papka topilmadi: {directory}"}

    files: list[tuple[int, str]] = []
    try:
        for p in root.rglob("*"):
            try:
                if p.is_file():
                    files.append((p.stat().st_size, str(p)))
            except (PermissionError, OSError):
                continue
    except (PermissionError, OSError) as exc:
        return {"error": f"O'qishda xato: {exc}"}

    files.sort(key=lambda x: x[0], reverse=True)
    top_files = files[:top]
    return {
        "directory": directory,
        "files": [
            {"path": path, "size_mb": round(size / (1024**2), 2)}
            for size, path in top_files
        ],
    }


# ── TELEGRAM ──────────────────────────────────────────────────────────────────

@registry.register(
    "telegram_send",
    "Telegram orqali xabar yuboradi",
    {"chat_id": "str", "text": "str"},
)
async def telegram_send(params: dict[str, Any]) -> dict[str, Any]:
    chat_id = params.get("chat_id", "")
    text = params.get("text", "")
    token = settings.telegram_token

    if not token:
        return {"error": "TELEGRAM_BOT_TOKEN sozlanmagan"}
    if not chat_id or not text:
        return {"error": "chat_id va text kerak"}

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json={"chat_id": chat_id, "text": text})
        if resp.status_code != 200:
            return {"error": f"Telegram xatosi: {resp.status_code} — {resp.text}"}
        return {"sent": True, "chat_id": chat_id}
    except httpx.HTTPError as exc:
        logger.error("telegram_send xatosi: %s", exc)
        return {"error": f"Telegram ulanish xatosi: {exc}"}


# ── OB-HAVO ───────────────────────────────────────────────────────────────────

@registry.register(
    "weather_get",
    "Ko'rsatilgan shahar uchun joriy ob-havoni qaytaradi",
    {"city": "str"},
)
async def weather_get(params: dict[str, Any]) -> dict[str, Any]:
    city = params.get("city", "")
    if not city:
        return {"error": "city kerak"}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            geo_resp = await client.get(
                "https://geocoding-api.open-meteo.com/v1/search",
                params={"name": city, "count": 1, "language": "ru"},
            )
            geo_data = geo_resp.json()
            results = geo_data.get("results") or []
            if not results:
                return {"error": f"Shahar topilmadi: {city}"}

            lat = results[0]["latitude"]
            lon = results[0]["longitude"]
            found_name = results[0].get("name", city)

            weather_resp = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,relative_humidity_2m,wind_speed_10m",
                },
            )
            weather_data = weather_resp.json()
            current = weather_data.get("current", {})

        return {
            "city": found_name,
            "temperature_c": current.get("temperature_2m"),
            "humidity_percent": current.get("relative_humidity_2m"),
            "wind_speed_kmh": current.get("wind_speed_10m"),
        }
    except httpx.HTTPError as exc:
        logger.error("weather_get xatosi: %s", exc)
        return {"error": f"Ob-havo xizmati bilan bog'liq xato: {exc}"}


# ── POCHTA ────────────────────────────────────────────────────────────────────

@registry.register(
    "email_list",
    "IMAP orqali oxirgi xabarlarni ro'yxatlaydi",
    {"limit": "int (ixtiyoriy, default 10)", "unread": "bool (ixtiyoriy)"},
)
async def email_list(params: dict[str, Any]) -> dict[str, Any]:
    imap_host = os.environ.get("IMAP_HOST", "")
    imap_user = os.environ.get("IMAP_USER", "")
    imap_pass = os.environ.get("IMAP_PASSWORD", "")

    if not (imap_host and imap_user and imap_pass):
        return {"error": "IMAP_HOST / IMAP_USER / IMAP_PASSWORD sozlanmagan"}

    limit = int(params.get("limit", 10))
    unread_only = bool(params.get("unread", False))

    import asyncio
    import imaplib
    import email as email_lib
    from email.header import decode_header

    def _fetch() -> list[dict[str, str]]:
        conn = imaplib.IMAP4_SSL(imap_host)
        try:
            conn.login(imap_user, imap_pass)
            conn.select("INBOX")
            criteria = "UNSEEN" if unread_only else "ALL"
            _, data = conn.search(None, criteria)
            ids = data[0].split()[-limit:]
            messages: list[dict[str, str]] = []
            for msg_id in reversed(ids):
                _, msg_data = conn.fetch(msg_id, "(RFC822)")
                raw = msg_data[0][1]
                msg = email_lib.message_from_bytes(raw)
                subject, encoding = decode_header(msg.get("Subject", ""))[0]
                if isinstance(subject, bytes):
                    subject = subject.decode(encoding or "utf-8", errors="ignore")
                messages.append({
                    "from": msg.get("From", ""),
                    "subject": subject or "(mavzu yo'q)",
                    "date": msg.get("Date", ""),
                })
            return messages
        finally:
            conn.logout()

    try:
        loop = asyncio.get_running_loop()
        messages = await loop.run_in_executor(None, _fetch)
        return {"count": len(messages), "messages": messages}
    except Exception as exc:
        logger.error("email_list xatosi: %s", exc)
        return {"error": f"Pochta o'qishda xato: {exc}"}


# ── XARAJAT TAHLILI ────────────────────────────────────────────────────────────

@registry.register(
    "expense_analyze",
    "Berilgan davr uchun xarajatlarni tahlil qiladi (period: today/yesterday/week/month)",
    {"period": "str"},
)
async def expense_analyze(params: dict[str, Any]) -> dict[str, Any]:
    period = params.get("period", "today")

    if not settings.database_url:
        return {"error": "DATABASE_URL sozlanmagan — xarajat ma'lumotlariga ulanib bo'lmadi"}

    period_map = {
        "today": "CURRENT_DATE",
        "yesterday": "CURRENT_DATE - INTERVAL '1 day'",
        "week": "CURRENT_DATE - INTERVAL '7 days'",
        "month": "CURRENT_DATE - INTERVAL '1 month'",
    }
    date_from = period_map.get(period, "CURRENT_DATE")

    try:
        import asyncpg  # type: ignore[import-untyped]

        conn: asyncpg.Connection = await asyncpg.connect(settings.database_url)
        try:
            rows = await conn.fetch(
                f"""
                SELECT category, SUM(amount) AS total
                FROM pari_finance_transactions
                WHERE type = 'expense' AND date >= ({date_from})::text
                GROUP BY category
                ORDER BY total DESC
                """
            )
            total_row = await conn.fetchval(
                f"""
                SELECT COALESCE(SUM(amount), 0)
                FROM pari_finance_transactions
                WHERE type = 'expense' AND date >= ({date_from})::text
                """
            )
        finally:
            await conn.close()

        return {
            "period": period,
            "total": float(total_row or 0),
            "by_category": [
                {"category": r["category"], "amount": float(r["total"])} for r in rows
            ],
        }
    except Exception as exc:
        logger.error("expense_analyze xatosi: %s", exc)
        return {"error": f"Xarajat tahlilida xato: {exc}"}


def register_all() -> None:
    """Modul import qilinganda decorator'lar orqali avtomatik ro'yxatga olinadi.
    Bu funksiya faqat aniq import ishlatilishini kafolatlash uchun."""
    logger.info("Builtin tool'lar ro'yxatga olindi: %s", ", ".join(registry.names()))
