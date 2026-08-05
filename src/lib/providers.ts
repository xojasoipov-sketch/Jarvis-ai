// Provider chain: local-first → free cloud → paid.
import { envAll, envFirst, ENV } from "@/lib/env";

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
  gemini: 0,
};

// Cost per 1M tokens (input+output average, USD) — used by Cost Optimizer
export const PROVIDER_COSTS: Record<string, number> = {
  pollinations: 0,
  groq: 0.06,       // LLaMA 3.3 70B — $0.05 in + $0.08 out /1M
  cerebras: 0,       // free tier
  openrouter: 0,     // gemini-2.0-flash-exp:free
  deepseek: 0.35,    // deepseek-chat $0.27/$0.11 per 1M
  kimi: 0.20,
  qwen: 0.40,
  mistral: 2.0,      // mistral-large
  openai: 0.30,      // gpt-4o-mini $0.15/$0.60 per 1M
};

export type Provider = {
  name: string;
  url: string;
  key: string;
  model: string;
  headers?: Record<string, string>;
  supportsTools: boolean;
  costPer1M: number; // USD per 1M tokens (avg input+output)
};

/** BASE + BASE2… + case-insensitive */
function envKeys(base: string): string[] {
  return envAll(base, 12);
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

// Cost optimizer: given task complexity, pick the cheapest capable provider
// "simple" = short Q&A; "complex" = code/analysis; "tools" = must support tool-calling
export function getCheapestProvider(
  providers: Provider[],
  requirement: "free" | "tools" | "any" = "any"
): Provider | null {
  let candidates = providers.filter(p => p.key && p.key !== "dummy");
  if (requirement === "free") candidates = candidates.filter(p => p.costPer1M === 0);
  if (requirement === "tools") candidates = candidates.filter(p => p.supportsTools);
  if (!candidates.length) return null;
  return candidates.sort((a, b) => a.costPer1M - b.costPer1M)[0];
}

export function getProviders(): Provider[] {
  const list: Provider[] = [];
  const site = resolveSiteUrl();

  // 1. Pollinations — no API key required, works immediately
  list.push({ name: "pollinations", url: "https://text.pollinations.ai/openai", key: "dummy", model: "openai", supportsTools: false, costPer1M: 0 });

  list.push({
    name: "pollinations",
    url: "https://text.pollinations.ai/openai",
    key: "dummy",
    model: "openai",
    supportsTools: false,
    costPer1M: 0,
  });

  list.push(
    ...providerEntries(
      "groq",
      "GROQ_API_KEY",
      "https://api.groq.com/openai/v1/chat/completions",
      envFirst("GROQ_MODEL") || "llama-3.3-70b-versatile",
      { supportsTools: true }
    )
  );

  list.push(
    ...providerEntries(
      "openrouter",
      "OPENROUTER_API_KEY",
      "https://openrouter.ai/api/v1/chat/completions",
      envFirst("OPENROUTER_MODEL") || "openai/gpt-4o-mini",
      {
        supportsTools: true,
        headers: {
          "HTTP-Referer": site,
          "X-Title": "Pari AI",
        },
      }
    )
  );

  list.push(
    ...providerEntries(
      "cerebras",
      "CEREBRAS_API_KEY",
      "https://api.cerebras.ai/v1/chat/completions",
      envFirst("CEREBRAS_MODEL") || "llama3.1-8b"
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
      envFirst("MOONSHOT_MODEL") || "moonshot-v1-8k"
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
      "mistral-small-latest"
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

  // 9. OpenAI — paid, kept last since it's not free; gpt-4o-mini is the cheapest capable model
  list.push(...providerEntries("openai", "OPENAI_API_KEY", "https://api.openai.com/v1/chat/completions", "gpt-4o-mini", { supportsTools: true }));

  return list;
}

export function getLocalOnly(): Provider[] {
  return getLocalProviders();
}

/** Nechta provider key yuklangan (debug) */
export function providerKeyStats() {
  return {
    total_providers: getProviders().filter((p) => p.key && p.key !== "dummy").length,
    by_family: ENV.inventory(),
  };
}
