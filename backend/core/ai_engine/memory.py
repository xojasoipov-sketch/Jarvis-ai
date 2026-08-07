import json
import logging
from typing import Any

import redis.asyncio as aioredis

from backend.core.settings import settings

logger = logging.getLogger(__name__)

_CONV_TTL = 60 * 60 * 24 * 7       # 7 kun
_PROFILE_TTL = 60 * 60 * 24 * 365  # 1 yil


class MemoryManager:
    def __init__(self) -> None:
        self._redis: aioredis.Redis | None = None

    async def _conn(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = await aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._redis

    async def close(self) -> None:
        if self._redis is not None:
            await self._redis.aclose()
            self._redis = None

    # ── Qisqa xotira (short-term) ─────────────────────────────────────────────

    @staticmethod
    def _conv_key(user_id: int | str) -> str:
        return f"jarvis:conv:{user_id}"

    async def store_short_term(
        self, user_id: int | str, role: str, content: str
    ) -> None:
        try:
            r = await self._conn()
            key = self._conv_key(user_id)
            entry = json.dumps({"role": role, "content": content}, ensure_ascii=False)
            pipe = r.pipeline()
            pipe.rpush(key, entry)
            pipe.ltrim(key, -settings.short_term_limit, -1)
            pipe.expire(key, _CONV_TTL)
            await pipe.execute()
        except Exception as exc:
            logger.warning("store_short_term xatosi: %s", exc)

    async def get_short_term(
        self, user_id: int | str
    ) -> list[dict[str, str]]:
        try:
            r = await self._conn()
            key = self._conv_key(user_id)
            raw = await r.lrange(key, 0, -1)
            return [json.loads(item) for item in raw]
        except Exception as exc:
            logger.warning("get_short_term xatosi: %s", exc)
            return []

    async def clear_short_term(self, user_id: int | str) -> None:
        try:
            r = await self._conn()
            await r.delete(self._conv_key(user_id))
        except Exception as exc:
            logger.warning("clear_short_term xatosi: %s", exc)

    # ── Foydalanuvchi profili ─────────────────────────────────────────────────

    @staticmethod
    def _profile_key(user_id: int | str) -> str:
        return f"jarvis:profile:{user_id}"

    async def get_user_profile(
        self, user_id: int | str
    ) -> dict[str, Any]:
        try:
            r = await self._conn()
            raw = await r.get(self._profile_key(user_id))
            if raw:
                return json.loads(raw)
        except Exception as exc:
            logger.warning("get_user_profile xatosi: %s", exc)
        return {
            "user_id": str(user_id),
            "name": "",
            "language": "uz",
            "timezone": "Asia/Tashkent",
        }

    async def update_user_profile(
        self, user_id: int | str, data: dict[str, Any]
    ) -> dict[str, Any]:
        try:
            r = await self._conn()
            key = self._profile_key(user_id)
            current = await self.get_user_profile(user_id)
            current.update(data)
            await r.setex(key, _PROFILE_TTL, json.dumps(current, ensure_ascii=False))
            return current
        except Exception as exc:
            logger.warning("update_user_profile xatosi: %s", exc)
            return data

    # ── Uzoq xotira (PostgreSQL) ──────────────────────────────────────────────

    async def store_long_term(
        self,
        user_id: int | str,
        category: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> bool:
        if not settings.database_url:
            logger.debug("DATABASE_URL yo'q — uzoq xotira o'tkazib yuborildi")
            return False
        try:
            import asyncpg  # type: ignore[import-untyped]

            conn: asyncpg.Connection = await asyncpg.connect(settings.database_url)
            try:
                await conn.execute(
                    """
                    INSERT INTO jarvis_memory (user_id, category, content, metadata, created_at)
                    VALUES ($1, $2, $3, $4::jsonb, NOW())
                    """,
                    str(user_id),
                    category,
                    content,
                    json.dumps(metadata or {}, ensure_ascii=False),
                )
                return True
            finally:
                await conn.close()
        except Exception as exc:
            logger.error("store_long_term xatosi: %s", exc)
            return False

    async def search_long_term(
        self,
        user_id: int | str,
        query: str,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        if not settings.database_url:
            return []
        try:
            import asyncpg  # type: ignore[import-untyped]

            conn: asyncpg.Connection = await asyncpg.connect(settings.database_url)
            try:
                rows = await conn.fetch(
                    """
                    SELECT category, content, metadata, created_at
                    FROM jarvis_memory
                    WHERE user_id = $1
                      AND content ILIKE $2
                    ORDER BY created_at DESC
                    LIMIT $3
                    """,
                    str(user_id),
                    f"%{query}%",
                    limit,
                )
                return [dict(r) for r in rows]
            finally:
                await conn.close()
        except Exception as exc:
            logger.error("search_long_term xatosi: %s", exc)
            return []
