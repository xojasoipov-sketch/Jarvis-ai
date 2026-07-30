"use client";
import { useState } from "react";
import { Plug, CheckCircle2, XCircle, RefreshCw, ExternalLink } from "lucide-react";

type Status = "idle" | "checking" | "ok" | "error";

const APIS = [
  { id: "pollinations", name: "Pollinations", desc: "Key shart emas — hoziroq ishlaydi", envKey: null, url: "https://pollinations.ai", cat: "AI" },
  { id: "groq", name: "Groq", desc: "LLaMA 3.3 70B — eng tez, tool-calling", envKey: "GROQ_API_KEY", url: "https://groq.com/keys", cat: "AI" },
  { id: "cerebras", name: "Cerebras", desc: "LLaMA 3.3 70B — 1M token/kun", envKey: "CEREBRAS_API_KEY", url: "https://inference.cerebras.ai", cat: "AI" },
  { id: "openrouter", name: "OpenRouter (Gemini)", desc: "Gemini 2.0 Flash — bepul model", envKey: "OPENROUTER_API_KEY", url: "https://openrouter.ai", cat: "AI" },
  { id: "deepseek", name: "DeepSeek", desc: "DeepSeek Chat", envKey: "DEEPSEEK_API_KEY", url: "https://platform.deepseek.com", cat: "AI" },
  { id: "kimi", name: "Kimi (Moonshot AI)", desc: "Moonshot v1 — kuchli matn", envKey: "MOONSHOT_API_KEY", url: "https://platform.moonshot.ai", cat: "AI" },
  { id: "qwen", name: "Qwen (Alibaba)", desc: "Qwen Plus — tez tahlil", envKey: "DASHSCOPE_API_KEY", url: "https://dashscope.console.aliyun.com", cat: "AI" },
  { id: "mistral", name: "Mistral AI", desc: "Mistral Large — $25 bepul kredit", envKey: "MISTRAL_API_KEY", url: "https://console.mistral.ai", cat: "AI" },
  { id: "telegram", name: "Telegram Bot", desc: "Bot integratsiyasi", envKey: "TELEGRAM_BOT_TOKEN", url: "https://t.me/BotFather", cat: "Messaging" },
  { id: "obsidian", name: "Vault (GitHub-asosli)", desc: "Shaxsiy bilim bazasi", envKey: "GITHUB_TOKEN", url: "https://github.com/settings/tokens", cat: "Knowledge" },
  { id: "hermes", name: "Hermes — built-in vositalar", desc: "MCP tool executor (Railway'da)", envKey: null, url: "", cat: "Tools" },
  { id: "supabase", name: "Supabase", desc: "Tasks/Projects ma'lumotlar bazasi", envKey: "SUPABASE_URL", url: "https://supabase.com", cat: "Database" },
];

const AI_IDS = new Set(APIS.filter((a) => a.cat === "AI").map((a) => a.id));

export default function ApisPage() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function testApi(id: string) {
    setStatuses((s) => ({ ...s, [id]: "checking" }));
    setErrors((e) => ({ ...e, [id]: "" }));
    try {
      if (AI_IDS.has(id)) {
        const r = await fetch(`/api/providers/test?name=${id}`, { signal: AbortSignal.timeout(12000) });
        const d = await r.json();
        setStatuses((s) => ({ ...s, [id]: d.ok ? "ok" : "error" }));
        if (!d.ok) setErrors((e) => ({ ...e, [id]: d.error || "Key sozlanmagan" }));
        return;
      }
      const endpoint = endpoints[id] || "";
      const r = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
      const d = await r.json().catch(() => ({}));
      const ok = r.ok && d.configured !== false && !d.error;
      setStatuses((s) => ({ ...s, [id]: ok ? "ok" : "error" }));
      if (!ok) setErrors((e) => ({ ...e, [id]: d.error || "Sozlanmagan" }));
    } catch (err) {
      setStatuses((s) => ({ ...s, [id]: "error" }));
      setErrors((e) => ({ ...e, [id]: (err as Error).message }));
    }
  }

  const endpoints: Record<string, string> = {
    obsidian: "/api/obsidian",
    hermes: "/api/mcp",
    telegram: "/api/telegram/debug",
    supabase: "/api/tasks",
  };

  const cats = [...new Set(APIS.map((a) => a.cat))];

  return (
    <div className="fade-in max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">APIs & Integrations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ulangan xizmatlar va API kalitlar holati</p>
      </div>

      {cats.map((cat) => (
        <div key={cat}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{cat}</p>
          <div className="space-y-2">
            {APIS.filter((a) => a.cat === cat).map((api) => {
              const st = statuses[api.id];
              return (
                <div key={api.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Plug size={16} strokeWidth={1.75} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{api.name}</p>
                      {api.url && (
                        <a href={api.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-600">
                          <ExternalLink size={12} strokeWidth={1.75} />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{api.desc}</p>
                    {api.envKey && (
                      <code className="text-xs text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded mt-1 inline-block">{api.envKey}</code>
                    )}
                    {errors[api.id] && (
                      <p className="text-xs text-red-500 mt-1 truncate">{errors[api.id]}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {st === "ok" && <CheckCircle2 size={16} strokeWidth={1.75} className="text-green-500" />}
                    {st === "error" && <XCircle size={16} strokeWidth={1.75} className="text-red-400" />}
                    {st === "checking" && <RefreshCw size={16} strokeWidth={1.75} className="text-indigo-400 animate-spin" />}
                    <button
                      onClick={() => testApi(api.id)}
                      disabled={st === "checking"}
                      className="text-xs px-3 py-1.5 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 text-gray-600 rounded-lg transition-all"
                    >
                      Test
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
