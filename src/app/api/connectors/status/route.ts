import { NextResponse } from "next/server";
import { ENV, envFirst, envAny } from "@/lib/env";

/** Env base + numbered aliases: GROQ_API_KEY, GROQ_API_KEY2, ... */
function hasKeyFamily(...bases: string[]): { present: boolean; found: string[]; count: number } {
  const found: string[] = [];
  for (const base of bases) {
    if (process.env[base]?.trim()) found.push(base);
    for (let i = 2; i <= 10; i++) {
      const k = `${base}${i}`;
      if (process.env[k]?.trim()) found.push(k);
    }
    const lower = base.toLowerCase();
    for (const [k, v] of Object.entries(process.env)) {
      if (!v?.trim()) continue;
      if (k.toLowerCase() === lower || k.toLowerCase().startsWith(lower)) {
        if (!found.includes(k)) found.push(k);
      }
    }
  }
  return { present: found.length > 0, found, count: found.length };
}

function mask(v: string): string {
  if (!v) return "";
  if (v.length <= 8) return "••••";
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
}

export async function GET() {
  const families = [
    { id: "pollinations", name: "Pollinations", cat: "AI Text", env: [] as string[], alwaysOn: true },
    { id: "groq", name: "Groq", cat: "AI Text", env: ["GROQ_API_KEY"] },
    { id: "cerebras", name: "Cerebras", cat: "AI Text", env: ["CEREBRAS_API_KEY"] },
    { id: "openrouter", name: "OpenRouter", cat: "AI Text", env: ["OPENROUTER_API_KEY"] },
    { id: "deepseek", name: "DeepSeek", cat: "AI Text", env: ["DEEPSEEK_API_KEY"] },
    { id: "kimi", name: "Kimi (Moonshot)", cat: "AI Text", env: ["MOONSHOT_API_KEY"] },
    { id: "qwen", name: "Qwen", cat: "AI Text", env: ["DASHSCOPE_API_KEY"] },
    { id: "mistral", name: "Mistral AI", cat: "AI Text", env: ["MISTRAL_API_KEY"] },
    { id: "openai", name: "OpenAI", cat: "AI Text", env: ["OPENAI_API_KEY"] },
    { id: "gemini", name: "Gemini", cat: "AI Text", env: ["GEMINI_API_KEY", "GOOGLE_API_KEY"] },
    {
      id: "elevenlabs",
      name: "ElevenLabs",
      cat: "Voice",
      env: ["ELEVENLABS_API_KEY"],
      extra: ["ELEVENLABS_VOICE_ID", "ELEVENLABS_MODEL_ID"],
    },
    { id: "groq-stt", name: "Groq Whisper STT", cat: "Voice", env: ["GROQ_API_KEY"] },
    { id: "gemini-voice", name: "Gemini Audio", cat: "Voice", env: ["GEMINI_API_KEY"] },
    {
      id: "telegram",
      name: "Telegram Bot",
      cat: "Messaging",
      env: ["TELEGRAM_BOT_TOKEN", "TG_BOT_TOKEN"],
      extra: ["TELEGRAM_ADMIN_ID", "TELEGRAM_CHAT_ID"],
    },
    {
      id: "github",
      name: "GitHub",
      cat: "Tools",
      env: ["GITHUB_TOKEN", "Github_token", "GH_TOKEN", "GITHUB_PERSONAL_ACCESS_TOKEN"],
      extra: ["GITHUB_VAULT_REPO", "GITHUB_VAULT_PATH", "GITHUB_VAULT_BRANCH"],
    },
    {
      id: "supabase",
      name: "Supabase",
      cat: "Database",
      env: ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"],
      keyEnv: [
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_SERVICE_ROLE_KEY2",
        "SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ],
    },
    { id: "hermes", name: "Hermes", cat: "Tools", env: [] as string[], alwaysOn: true },
    {
      id: "railway",
      name: "Railway",
      cat: "Infra",
      env: ["RAILWAY_PUBLIC_DOMAIN", "RAILWAY_ENVIRONMENT", "RAILWAY_PROJECT_ID"],
    },
    { id: "mcp", name: "MCP Servers", cat: "Tools", env: ["MCP_TOOLS_JSON", "MCP_SERVERS_JSON"] },
  ];

  const connectors = families.map((f) => {
    if ((f as { alwaysOn?: boolean }).alwaysOn) {
      return {
        id: f.id,
        name: f.name,
        cat: f.cat,
        present: true,
        alwaysOn: true,
        keys_found: [] as string[],
        detail: "Built-in",
      };
    }

    const primary = hasKeyFamily(...f.env);
    const keyEnv = (f as { keyEnv?: string[] }).keyEnv;
    const extra = (f as { extra?: string[] }).extra || [];

    let present = primary.present;
    let keys_found = [...primary.found];

    if (keyEnv) {
      const k = hasKeyFamily(...keyEnv);
      present = present && k.present;
      keys_found = [...keys_found, ...k.found];
    }

    for (const e of extra) {
      if (process.env[e]?.trim()) keys_found.push(e);
    }

    if (f.id === "supabase") present = Boolean(ENV.supabaseUrl() && ENV.supabaseKey());
    if (f.id === "telegram") present = Boolean(ENV.telegram());
    if (f.id === "github") present = Boolean(ENV.github());
    if (f.id === "groq" || f.id === "groq-stt") present = Boolean(ENV.groq());
    if (f.id === "gemini" || f.id === "gemini-voice") present = Boolean(ENV.gemini());
    if (f.id === "openai") present = Boolean(ENV.openai());
    if (f.id === "elevenlabs") present = Boolean(ENV.elevenlabs());
    if (f.id === "railway") {
      present = envAny("RAILWAY_ENVIRONMENT", "RAILWAY_PUBLIC_DOMAIN", "RAILWAY_PROJECT_ID");
    }

    return {
      id: f.id,
      name: f.name,
      cat: f.cat,
      present,
      alwaysOn: false,
      keys_found: [...new Set(keys_found)],
      key_count: keys_found.length,
      detail: present
        ? `Key topildi (${[...new Set(keys_found)].join(", ") || "alias"})`
        : `Yo'q — Railway: ${(f.env[0] || f.name)}`,
    };
  });

  const interestingPrefixes = [
    "GROQ", "OPENAI", "GEMINI", "GOOGLE", "MISTRAL", "DEEPSEEK", "MOONSHOT",
    "CEREBRAS", "OPENROUTER", "DASHSCOPE", "ELEVENLABS", "SUPABASE", "TELEGRAM",
    "TG_", "GITHUB", "GH_", "Github", "RAILWAY", "MCP_", "HERMES", "BRAVE",
    "SITE_URL", "NEXT_PUBLIC",
  ];

  const env_present: { name: string; masked: string }[] = [];
  for (const [k, v] of Object.entries(process.env)) {
    if (!v?.trim()) continue;
    if (interestingPrefixes.some((p) => k.toUpperCase().startsWith(p.toUpperCase()) || k.includes(p))) {
      env_present.push({ name: k, masked: mask(v) });
    }
  }
  env_present.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    ok: true,
    connected: connectors.filter((c) => c.present).map((c) => c.name),
    disconnected: connectors.filter((c) => !c.present).map((c) => c.name),
    connectors,
    env_keys_detected: env_present,
    env_key_count: env_present.length,
    note: "Faqat nom + mask — to'liq secret chiqarilmaydi",
  });
}
