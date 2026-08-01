// Provider chain: local-first (Railway Ollama / LM Studio) → free cloud → paid.
// Railway: Ollama service + private network → LOCAL_LLM_URL=http://ollama.railway.internal:11434/v1/chat/completions

export const PROVIDER_COSTS: Record<string, number> = {
  local: 0,
  pollinations: 0,
  groq: 0.06,
  cerebras: 0,
  openrouter: 0,
  deepseek: 0.35,
  kimi: 0.2,
  qwen: 0.4,
  mistral: 2.0,
  openai: 0.3,
};

export type Provider = {
  name: string;
  url: string;
  key: string;
  model: string;
  headers?: Record<string, string>;
  supportsTools: boolean;
  costPer1M: number;
  local?: boolean;
};

function envKeys(base: string): string[] {
  const keys: string[] = [];
  if (process.env[base]) keys.push(process.env[base]!);
  for (let i = 2; i <= 10; i++) {
    const v = process.env[`${base}${i}`];
    if (v) keys.push(v);
  }
  return keys;
}

function providerEntries(
  name: string,
  envBase: string,
  url: string,
  model: string,
  opts: { supportsTools?: boolean; headers?: Record<string, string> } = {}
): Provider[] {
  return envKeys(envBase).map((key, i) => ({
    name: i === 0 ? name : `${name}${i + 1}`,
    url,
    key,
    model,
    headers: opts.headers,
    supportsTools: opts.supportsTools ?? false,
    costPer1M: PROVIDER_COSTS[name] ?? 0,
  }));
}

export function getCheapestProvider(
  providers: Provider[],
  requirement: "free" | "tools" | "any" = "any"
): Provider | null {
  let candidates = providers.filter((p) => p.key && p.key !== "dummy");
  if (requirement === "free") candidates = candidates.filter((p) => p.costPer1M === 0);
  if (requirement === "tools") candidates = candidates.filter((p) => p.supportsTools);
  if (!candidates.length) return null;
  return candidates.sort((a, b) => a.costPer1M - b.costPer1M)[0];
}

/** Local OpenAI-compatible URL (Ollama / LM Studio / vLLM) */
function resolveLocalChatUrl(): string {
  // 1) To'liq URL (tavsiya)
  if (process.env.LOCAL_LLM_URL) return process.env.LOCAL_LLM_URL.replace(/\/$/, "");

  // 2) OLLAMA_BASE_URL = http://host:11434  →  .../v1/chat/completions
  const base = (process.env.OLLAMA_BASE_URL || "").replace(/\/$/, "");
  if (base) {
    if (base.includes("/v1/chat/completions")) return base;
    if (base.endsWith("/v1")) return `${base}/chat/completions`;
    return `${base}/v1/chat/completions`;
  }

  // 3) Railway private DNS qisqa yozuv: OLLAMA_SERVICE=ollama → http://ollama.railway.internal:11434/...
  const svc = process.env.OLLAMA_SERVICE || process.env.RAILWAY_OLLAMA_SERVICE;
  if (svc) {
    const host = svc.includes(".") ? svc : `${svc}.railway.internal`;
    const port = process.env.OLLAMA_PORT || "11434";
    return `http://${host}:${port}/v1/chat/completions`;
  }

  return "";
}

function getLocalProviders(): Provider[] {
  const url = resolveLocalChatUrl();
  if (!url) return [];
  return [
    {
      name: "local",
      url,
      key: process.env.LOCAL_LLM_KEY || "ollama",
      model: process.env.LOCAL_LLM_MODEL || process.env.OLLAMA_MODEL || "llama3.2",
      supportsTools: process.env.LOCAL_LLM_TOOLS === "1",
      costPer1M: 0,
      local: true,
    },
  ];
}

export function getProviders(): Provider[] {
  const list: Provider[] = [];

  // 0. Local-first (Railway Ollama yoki boshqa)
  list.push(...getLocalProviders());

  // 1. Pollinations
  list.push({
    name: "pollinations",
    url: "https://text.pollinations.ai/openai",
    key: "dummy",
    model: "openai",
    supportsTools: false,
    costPer1M: 0,
  });

  // 2. Groq
  list.push(
    ...providerEntries(
      "groq",
      "GROQ_API_KEY",
      "https://api.groq.com/openai/v1/chat/completions",
      "llama-3.3-70b-versatile",
      { supportsTools: true }
    )
  );

  // 3. Cerebras
  list.push(
    ...providerEntries(
      "cerebras",
      "CEREBRAS_API_KEY",
      "https://api.cerebras.ai/v1/chat/completions",
      "llama-3.3-70b"
    )
  );

  // 4. OpenRouter
  const site = process.env.SITE_URL || process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "https://pari-ai.up.railway.app";
  list.push(
    ...providerEntries(
      "openrouter",
      "OPENROUTER_API_KEY",
      "https://openrouter.ai/api/v1/chat/completions",
      "google/gemini-2.0-flash-exp:free",
      {
        headers: {
          "HTTP-Referer": site,
          "X-Title": "Pari AI",
        },
      }
    )
  );

  list.push(
    ...providerEntries(
      "deepseek",
      "DEEPSEEK_API_KEY",
      "https://api.deepseek.com/chat/completions",
      "deepseek-chat"
    )
  );
  list.push(
    ...providerEntries(
      "kimi",
      "MOONSHOT_API_KEY",
      "https://api.moonshot.ai/v1/chat/completions",
      "moonshot-v1-8k"
    )
  );
  list.push(
    ...providerEntries(
      "qwen",
      "DASHSCOPE_API_KEY",
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
      "qwen-plus"
    )
  );
  list.push(
    ...providerEntries(
      "mistral",
      "MISTRAL_API_KEY",
      "https://api.mistral.ai/v1/chat/completions",
      "mistral-large-latest"
    )
  );
  list.push(
    ...providerEntries(
      "openai",
      "OPENAI_API_KEY",
      "https://api.openai.com/v1/chat/completions",
      "gpt-4o-mini",
      { supportsTools: true }
    )
  );

  return list;
}

export function getLocalOnly(): Provider[] {
  return getLocalProviders();
}
