// Shared free/cheap AI provider fallback chain, ordered per CLAUDE.md priority.
// Pollinations needs no key at all; everything else needs its own key(s) set in Railway Variables.
// Each provider supports multiple keys (KEY, KEY2, KEY3, ...) — when one is rate-limited or
// out of quota, the chat loop moves to the next key of the same provider, then the next provider.

export type Provider = {
  name: string;
  url: string;
  key: string;
  model: string;
  headers?: Record<string, string>;
  supportsTools: boolean;
};

// Collects BASE, BASE2, BASE3, ... env vars into an ordered list of keys.
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
  }));
}

export function getProviders(): Provider[] {
  const list: Provider[] = [];

  // 1. Pollinations — no API key required, works immediately
  list.push({ name: "pollinations", url: "https://text.pollinations.ai/openai", key: "dummy", model: "openai", supportsTools: false });

  // 2. Groq — fastest, and the only provider wired for real tool-calling
  list.push(...providerEntries("groq", "GROQ_API_KEY", "https://api.groq.com/openai/v1/chat/completions", "llama-3.3-70b-versatile", { supportsTools: true }));

  // 3. Cerebras — 1M token/kun free tier
  list.push(...providerEntries("cerebras", "CEREBRAS_API_KEY", "https://api.cerebras.ai/v1/chat/completions", "llama-3.3-70b"));

  // 4. Gemini via OpenRouter's free tier
  list.push(...providerEntries("openrouter", "OPENROUTER_API_KEY", "https://openrouter.ai/api/v1/chat/completions", "google/gemini-2.0-flash-exp:free", {
    headers: { "HTTP-Referer": "https://pari-ai.up.railway.app", "X-Title": "Pari AI" },
  }));

  // 5. DeepSeek — OpenAI-compatible API
  list.push(...providerEntries("deepseek", "DEEPSEEK_API_KEY", "https://api.deepseek.com/chat/completions", "deepseek-chat"));

  // 6. Kimi (Moonshot AI) — OpenAI-compatible API
  list.push(...providerEntries("kimi", "MOONSHOT_API_KEY", "https://api.moonshot.ai/v1/chat/completions", "moonshot-v1-8k"));

  // 7. Qwen (Alibaba DashScope) — OpenAI-compatible API
  list.push(...providerEntries("qwen", "DASHSCOPE_API_KEY", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", "qwen-plus"));

  // 8. Mistral — $25 free credit
  list.push(...providerEntries("mistral", "MISTRAL_API_KEY", "https://api.mistral.ai/v1/chat/completions", "mistral-large-latest"));

  // 9. OpenAI — paid, kept last since it's not free; gpt-4o-mini is the cheapest capable model
  list.push(...providerEntries("openai", "OPENAI_API_KEY", "https://api.openai.com/v1/chat/completions", "gpt-4o-mini", { supportsTools: true }));

  return list;
}
