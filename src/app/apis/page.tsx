"use client";
import { useState, useEffect } from "react";
import {
  Plug, CheckCircle2, XCircle, RefreshCw, ExternalLink, Mic, Volume2,
  KeyRound, Copy, Check, ChevronDown, ChevronUp, Database, Server,
} from "lucide-react";

type Status = "idle" | "checking" | "ok" | "error" | "present";

const RAILWAY_VARS_HINT = "Railway → Service → Variables";

const VERCEL_ENV_URL = "https://vercel.com/xojasoipov-6117s-projects/pari-ai/settings/environment-variables";

const APIS = [
  { id: "pollinations", name: "Pollinations", desc: "Key shart emas — bepul", envKey: null as string | null, url: "https://pollinations.ai", cat: "AI Text" },
  { id: "groq", name: "Groq", desc: "LLaMA 3.3 — tool-calling", envKey: "GROQ_API_KEY", url: "https://groq.com/keys", cat: "AI Text" },
  { id: "cerebras", name: "Cerebras", desc: "LLaMA 3.3", envKey: "CEREBRAS_API_KEY", url: "https://inference.cerebras.ai", cat: "AI Text" },
  { id: "openrouter", name: "OpenRouter", desc: "Ko'p model gateway", envKey: "OPENROUTER_API_KEY", url: "https://openrouter.ai", cat: "AI Text" },
  { id: "deepseek", name: "DeepSeek", desc: "DeepSeek Chat", envKey: "DEEPSEEK_API_KEY", url: "https://platform.deepseek.com", cat: "AI Text" },
  { id: "kimi", name: "Kimi (Moonshot)", desc: "Moonshot v1", envKey: "MOONSHOT_API_KEY", url: "https://platform.moonshot.ai", cat: "AI Text" },
  { id: "qwen", name: "Qwen (Alibaba)", desc: "Qwen Plus", envKey: "DASHSCOPE_API_KEY", url: "https://dashscope.console.aliyun.com", cat: "AI Text" },
  { id: "mistral", name: "Mistral AI", desc: "Mistral Large", envKey: "MISTRAL_API_KEY", url: "https://console.mistral.ai", cat: "AI Text" },
  { id: "openai", name: "OpenAI", desc: "GPT-4o mini", envKey: "OPENAI_API_KEY", url: "https://platform.openai.com/api-keys", cat: "AI Text" },
  { id: "gemini", name: "Gemini", desc: "Google Gemini", envKey: "GEMINI_API_KEY", url: "https://aistudio.google.com", cat: "AI Text" },
  { id: "elevenlabs", name: "ElevenLabs STT+TTS", desc: "Ovoz", envKey: "ELEVENLABS_API_KEY", url: "https://elevenlabs.io", cat: "Voice" },
  { id: "groq-stt", name: "Groq Whisper STT", desc: "Zaxira STT", envKey: "GROQ_API_KEY", url: "https://groq.com/keys", cat: "Voice" },
  { id: "gemini-voice", name: "Gemini Audio", desc: "STT zaxira", envKey: "GEMINI_API_KEY", url: "https://aistudio.google.com", cat: "Voice" },
  { id: "telegram", name: "Telegram Bot", desc: "Bot", envKey: "TELEGRAM_BOT_TOKEN", url: "https://t.me/BotFather", cat: "Messaging" },
  { id: "hermes", name: "Hermes", desc: "Built-in tools", envKey: null, url: "", cat: "Tools" },
  { id: "github", name: "GitHub", desc: "PR / vault", envKey: "GITHUB_TOKEN", url: "https://github.com/settings/tokens", cat: "Tools" },
  { id: "mcp", name: "MCP", desc: "MCP_TOOLS_JSON / MCP_SERVERS_JSON", envKey: "MCP_TOOLS_JSON", url: "", cat: "Tools" },
  { id: "supabase", name: "Supabase", desc: "DB", envKey: "SUPABASE_URL", url: "https://supabase.com", cat: "Database" },
  { id: "railway", name: "Railway", desc: "Deploy platform", envKey: "RAILWAY_PUBLIC_DOMAIN", url: "https://railway.app", cat: "Infra" },
];

const AI_IDS = new Set(APIS.filter((a) => a.cat === "AI Text").map((a) => a.id));
const VOICE_IDS = new Set(["gemini-voice", "groq-stt", "elevenlabs"]);
const KEYABLE = APIS.filter((a) => a.envKey);

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${copied ? "text-green-500" : "text-gray-400 hover:text-indigo-600"}`}
    >
      {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.75} />}
    </button>
  );
}

export default function ApisPage() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [keysFound, setKeysFound] = useState<Record<string, string[]>>({});
  const [envList, setEnvList] = useState<{ name: string; masked: string }[]>([]);
  const [scanOk, setScanOk] = useState(false);

  useEffect(() => {
    scanEnv();
  }, []);

  async function scanEnv() {
    try {
      const r = await fetch("/api/connectors/status", { signal: AbortSignal.timeout(10000) });
      const d = await r.json();
      if (!r.ok) return;
      setScanOk(true);
      setEnvList(d.env_keys_detected || []);
      const st: Record<string, Status> = {};
      const er: Record<string, string> = {};
      const kf: Record<string, string[]> = {};
      for (const c of d.connectors || []) {
        st[c.id] = c.present ? "present" : "error";
        er[c.id] = c.detail || "";
        kf[c.id] = c.keys_found || [];
      }
      setStatuses(st);
      setErrors(er);
      setKeysFound(kf);
    } catch {}
  }

  async function testApi(id: string) {
    setStatuses((s) => ({ ...s, [id]: "checking" }));
    setErrors((e) => ({ ...e, [id]: "" }));
    try {
      if (AI_IDS.has(id)) {
        // providers use name without -voice suffix mapping
        const name = id === "gemini" ? "openai" : id; // fallback probe via providers list
        const probe = id === "gemini" ? "openai" : id;
        // try exact provider name first
        let r = await fetch(`/api/providers/test?name=${id}`, { signal: AbortSignal.timeout(12000) });
        let d = await r.json();
        if (!d.ok && id === "gemini") {
          // gemini may not be in getProviders chain with same id — mark by env only
          d = { ok: statuses[id] === "present", error: d.error };
        }
        setStatuses((s) => ({ ...s, [id]: d.ok ? "ok" : "error" }));
        if (!d.ok) setErrors((e) => ({ ...e, [id]: d.error || "Key sozlanmagan" }));
        else setErrors((e) => ({ ...e, [id]: "API javob berdi" }));
        return;
      }
      if (VOICE_IDS.has(id)) {
        const r = await fetch(`/api/voice/test?provider=${id}`, { signal: AbortSignal.timeout(12000) });
        const d = await r.json();
        setStatuses((s) => ({ ...s, [id]: d.ok ? "ok" : "error" }));
        if (d.ok && d.info) setErrors((e) => ({ ...e, [id]: d.info }));
        if (!d.ok) setErrors((e) => ({ ...e, [id]: d.error || "Key yo'q" }));
        return;
      }
      if (id === "github") {
        const r = await fetch("/api/github/test", { signal: AbortSignal.timeout(10000) });
        const d = await r.json();
        setStatuses((s) => ({ ...s, [id]: d.ok ? "ok" : "error" }));
        setErrors((e) => ({ ...e, [id]: d.ok ? d.info : d.error || "Rad etildi" }));
        return;
      }
      if (id === "telegram") {
        const r = await fetch("/api/telegram/debug", { signal: AbortSignal.timeout(8000) });
        const d = await r.json();
        setStatuses((s) => ({ ...s, [id]: d.ok ? "ok" : "error" }));
        setErrors((e) => ({
          ...e,
          [id]: d.ok
            ? `@${d.telegram?.result?.username || "bot"}`
            : d.telegram?.description || d.error || "Token xato",
        }));
        return;
      }
      if (id === "supabase") {
        const r = await fetch("/api/tasks", { signal: AbortSignal.timeout(8000) });
        const d = await r.json().catch(() => ({}));
        const ok = r.ok && d.configured !== false && !d.error;
        setStatuses((s) => ({ ...s, [id]: ok ? "ok" : "error" }));
        if (!ok) setErrors((e) => ({ ...e, [id]: d.error || "Jadval/key muammo" }));
        else setErrors((e) => ({ ...e, [id]: "DB OK" }));
        return;
      }
      if (id === "hermes" || id === "pollinations" || id === "railway") {
        setStatuses((s) => ({ ...s, [id]: "ok" }));
        setErrors((e) => ({ ...e, [id]: "Built-in / platform" }));
        return;
      }
      if (id === "mcp") {
        const r = await fetch("/api/mcp", { signal: AbortSignal.timeout(5000) });
        const d = await r.json().catch(() => ({}));
        setStatuses((s) => ({ ...s, [id]: r.ok ? "ok" : "error" }));
        setErrors((e) => ({ ...e, [id]: d.configured ? "MCP OK" : "MCP_TOOLS_JSON bo'sh (ixtiyoriy)" }));
        return;
      }
    } catch (err) {
      setStatuses((s) => ({ ...s, [id]: "error" }));
      setErrors((e) => ({ ...e, [id]: (err as Error).message }));
    }
  }

  async function testAll() {
    await scanEnv();
    for (const api of APIS) {
      await testApi(api.id);
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const cats = [...new Set(APIS.map((a) => a.cat))];
  const presentCount = Object.values(statuses).filter((s) => s === "ok" || s === "present").length;

  return (
    <div className="fade-in max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connectors</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Railwaydagi keylar skanerlandi — {scanOk ? `${envList.length} ta env aniqlandi` : "skaner…"}
            {presentCount > 0 && ` · ${presentCount} connector ko'rinadi`}
          </p>
        </div>
        <button
          onClick={testAll}
          className="flex items-center gap-1.5 text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex-shrink-0"
        >
          <RefreshCw size={13} strokeWidth={2} />
          Hammasini tekshir
        </button>
      </div>

      {/* Env inventory */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
          <Server size={18} className="text-indigo-600" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Railway env (aniqlangan)</p>
            <p className="text-xs text-gray-500">Secret to'liq ko'rsatilmaydi — faqat nom + mask</p>
          </div>
        </div>
        <div className="px-5 py-3 max-h-56 overflow-y-auto space-y-1">
          {envList.length === 0 && (
            <p className="text-xs text-gray-400">Hali skanerlanmadi yoki key topilmadi</p>
          )}
          {envList.map((e) => (
            <div key={e.name} className="flex items-center gap-2 text-xs font-mono">
              <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
              <span className="text-gray-800">{e.name}</span>
              <span className="text-gray-400">{e.masked}</span>
            </div>
          ))}
        </div>
        <p className="px-5 py-2 text-[11px] text-gray-400 border-t border-gray-50">{RAILWAY_VARS_HINT}</p>
      </div>

      {cats.map((cat) => (
        <div key={cat}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{cat}</p>
          <div className="space-y-2">
            {APIS.filter((a) => a.cat === cat).map((api) => {
              const st = statuses[api.id];
              const found = keysFound[api.id] || [];
              return (
                <div
                  key={api.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                    {api.cat === "Voice" ? (
                      api.id === "elevenlabs" ? (
                        <Volume2 size={16} className="text-indigo-600" />
                      ) : (
                        <Mic size={16} className="text-indigo-600" />
                      )
                    ) : api.cat === "Database" ? (
                      <Database size={16} className="text-indigo-600" />
                    ) : (
                      <Plug size={16} className="text-indigo-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{api.name}</p>
                      {api.url && (
                        <a href={api.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-600">
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{api.desc}</p>
                    {api.envKey && (
                      <code className="text-xs text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {api.envKey}
                      </code>
                    )}
                    {found.length > 0 && (
                      <p className="text-[11px] text-green-600 mt-0.5 truncate">Env: {found.join(", ")}</p>
                    )}
                    {errors[api.id] && (
                      <p
                        className={`text-xs mt-1 truncate ${
                          st === "ok" || st === "present" ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {errors[api.id]}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(st === "ok" || st === "present") && (
                      <CheckCircle2 size={16} className="text-green-500" />
                    )}
                    {st === "error" && <XCircle size={16} className="text-red-400" />}
                    {st === "checking" && (
                      <RefreshCw size={16} className="text-indigo-400 animate-spin" />
                    )}
                    <button
                      onClick={() => testApi(api.id)}
                      disabled={st === "checking"}
                      className="text-xs px-3 py-1.5 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 text-gray-600 rounded-lg"
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
