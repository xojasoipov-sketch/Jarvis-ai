// Shared free/cheap AI provider fallback chain, ordered per CLAUDE.md priority.
// Pollinations needs no key at all; everything else needs its own key set in Railway Variables.

export type Provider = {
  name: string;
  url: string;
  key: string;
  model: string;
  headers?: Record<string, string>;
  supportsTools: boolean;
};

export function getProviders(): Provider[] {
  const list: Provider[] = [];

  // 1. Pollinations — no API key required, works immediately
  list.push({
    name: "pollinations",
    url: "https://text.pollinations.ai/openai",
    key: "dummy",
    model: "openai",
    supportsTools: false,
  });

  // 2. Groq — fastest, and the only provider wired for real tool-calling
  if (process.env.GROQ_API_KEY) {
    list.push({ name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", key: process.env.GROQ_API_KEY, model: "llama-3.3-70b-versatile", supportsTools: true });
  }

  // 3. Cerebras — 1M token/kun free tier
  if (process.env.CEREBRAS_API_KEY) {
    list.push({ name: "cerebras", url: "https://api.cerebras.ai/v1/chat/completions", key: process.env.CEREBRAS_API_KEY, model: "llama-3.3-70b", supportsTools: false });
  }

  // 4. Gemini via OpenRouter's free tier
  if (process.env.OPENROUTER_API_KEY) {
    list.push({
      name: "openrouter-gemini",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
      model: "google/gemini-2.0-flash-exp:free",
      headers: { "HTTP-Referer": "https://pari-ai.up.railway.app", "X-Title": "Pari AI" },
      supportsTools: false,
    });
  }

  // 5. DeepSeek — OpenAI-compatible API
  if (process.env.DEEPSEEK_API_KEY) {
    list.push({ name: "deepseek", url: "https://api.deepseek.com/chat/completions", key: process.env.DEEPSEEK_API_KEY, model: "deepseek-chat", supportsTools: false });
  }

  // 6. Kimi (Moonshot AI) — OpenAI-compatible API
  if (process.env.MOONSHOT_API_KEY) {
    list.push({ name: "kimi", url: "https://api.moonshot.ai/v1/chat/completions", key: process.env.MOONSHOT_API_KEY, model: "moonshot-v1-8k", supportsTools: false });
  }

  // 7. Qwen (Alibaba DashScope) — OpenAI-compatible API
  if (process.env.DASHSCOPE_API_KEY) {
    list.push({ name: "qwen", url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", key: process.env.DASHSCOPE_API_KEY, model: "qwen-plus", supportsTools: false });
  }

  // 8. Mistral — $25 free credit
  if (process.env.MISTRAL_API_KEY) {
    list.push({ name: "mistral", url: "https://api.mistral.ai/v1/chat/completions", key: process.env.MISTRAL_API_KEY, model: "mistral-large-latest", supportsTools: false });
  }

  return list;
}
