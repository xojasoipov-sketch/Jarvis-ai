import os
import yaml
from pathlib import Path
from typing import Any


class Settings:
    def __init__(self) -> None:
        self._cfg: dict[str, Any] = {}
        cfg_path = Path(os.environ.get("HERMES_CONFIG", Path.home() / ".hermes" / "config.yaml"))
        if cfg_path.exists():
            with open(cfg_path, "r", encoding="utf-8") as f:
                self._cfg = yaml.safe_load(f) or {}

    # ── LLM ───────────────────────────────────────────────────────────────────
    @property
    def openai_api_key(self) -> str:
        return os.environ.get("OPENAI_API_KEY", "")

    @property
    def anthropic_api_key(self) -> str:
        return os.environ.get("ANTHROPIC_API_KEY", "")

    @property
    def openrouter_api_key(self) -> str:
        return os.environ.get("OPENROUTER_API_KEY", "")

    @property
    def groq_api_key(self) -> str:
        return os.environ.get("GROQ_API_KEY", "")

    @property
    def default_model(self) -> str:
        return (
            self._cfg.get("model", {}).get("default")
            or os.environ.get("DEFAULT_MODEL", "gpt-4o-mini")
        )

    @property
    def llm_provider(self) -> str:
        return (
            self._cfg.get("model", {}).get("provider")
            or os.environ.get("LLM_PROVIDER", "openai")
        )

    @property
    def llm_base_url(self) -> str | None:
        provider = self.llm_provider
        urls = {
            "openrouter": "https://openrouter.ai/api/v1",
            "groq": "https://api.groq.com/openai/v1",
            "cerebras": "https://api.cerebras.ai/v1",
            "mistral": "https://api.mistral.ai/v1",
        }
        return urls.get(provider)

    @property
    def llm_api_key(self) -> str:
        provider = self.llm_provider
        mapping = {
            "openai": self.openai_api_key,
            "openrouter": self.openrouter_api_key,
            "groq": self.groq_api_key,
            "anthropic": self.anthropic_api_key,
            "cerebras": os.environ.get("CEREBRAS_API_KEY", ""),
            "mistral": os.environ.get("MISTRAL_API_KEY", ""),
        }
        return mapping.get(provider, self.openai_api_key)

    # ── Redis ─────────────────────────────────────────────────────────────────
    @property
    def redis_url(self) -> str:
        return os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # ── PostgreSQL ────────────────────────────────────────────────────────────
    @property
    def database_url(self) -> str:
        return os.environ.get("DATABASE_URL", "")

    # ── Telegram ──────────────────────────────────────────────────────────────
    @property
    def telegram_token(self) -> str:
        return os.environ.get("TELEGRAM_BOT_TOKEN", "")

    @property
    def telegram_allowed_users(self) -> list[int]:
        raw = os.environ.get("TELEGRAM_ALLOWED_USERS", "")
        result: list[int] = []
        for part in raw.split(","):
            part = part.strip()
            if part.lstrip("-").isdigit():
                result.append(int(part))
        return result

    # ── App ───────────────────────────────────────────────────────────────────
    @property
    def hermes_home(self) -> Path:
        return Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))

    @property
    def intent_temperature(self) -> float:
        return float(os.environ.get("INTENT_TEMPERATURE", "0.1"))

    @property
    def intent_max_tokens(self) -> int:
        return int(os.environ.get("INTENT_MAX_TOKENS", "512"))

    @property
    def short_term_limit(self) -> int:
        return int(os.environ.get("SHORT_TERM_LIMIT", "10"))


settings = Settings()
