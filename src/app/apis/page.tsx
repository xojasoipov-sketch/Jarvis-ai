"use client";
import { useState } from "react";
import { Plug, CheckCircle2, XCircle, RefreshCw, ExternalLink, Mic, Volume2, KeyRound, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

type Status = "idle" | "checking" | "ok" | "error";

const VERCEL_ENV_URL = "https://vercel.com/xojasoipov-6117s-projects/pari-ai/settings/environment-variables";

const APIS = [
  { id: "pollinations", name: "Pollinations", desc: "Key shart emas — hoziroq ishlaydi", envKey: null, url: "https://pollinations.ai", cat: "AI Text" },
  { id: "groq", name: "Groq", desc: "LLaMA 3.3 70B — eng tez, tool-calling", envKey: "GROQ_API_KEY", url: "https://groq.com/keys", cat: "AI Text" },
  { id: "cerebras", name: "Cerebras", desc: "LLaMA 3.3 70B — 1M token/kun", envKey: "CEREBRAS_API_KEY", url: "https://inference.cerebras.ai", cat: "AI Text" },
  { id: "openrouter", name: "OpenRouter (Gemini)", desc: "Gemini 2.0 Flash — bepul model", envKey: "OPENROUTER_API_KEY", url: "https://openrouter.ai", cat: "AI Text" },
  { id: "deepseek", name: "DeepSeek", desc: "DeepSeek Chat", envKey: "DEEPSEEK_API_KEY", url: "https://platform.deepseek.com", cat: "AI Text" },
  { id: "kimi", name: "Kimi (Moonshot AI)", desc: "Moonshot v1 — kuchli matn", envKey: "MOONSHOT_API_KEY", url: "https://platform.moonshot.ai", cat: "AI Text" },
  { id: "qwen", name: "Qwen (Alibaba)", desc: "Qwen Plus — tez tahlil", envKey: "DASHSCOPE_API_KEY", url: "https://dashscope.console.aliyun.com", cat: "AI Text" },
  { id: "mistral", name: "Mistral AI", desc: "Mistral Large — $25 bepul kredit", envKey: "MISTRAL_API_KEY", url: "https://console.mistral.ai", cat: "AI Text" },
  { id: "elevenlabs", name: "ElevenLabs STT + TTS", desc: "Asosiy: ovoz → matn (Scribe v1) + matn → ovoz (Rachel)", envKey: "ELEVENLABS_API_KEY", url: "https://elevenlabs.io", cat: "Voice" },
  { id: "groq-stt", name: "Groq Whisper STT", desc: "ElevenLabs ishlamasa — zaxira STT", envKey: "GROQ_API_KEY", url: "https://groq.com/keys", cat: "Voice" },
  { id: "gemini-voice", name: "Gemini Audio", desc: "Oxirgi zaxira — STT+javob bitta so'rovda", envKey: "GEMINI_API_KEY", url: "https://aistudio.google.com", cat: "Voice" },
  { id: "telegram", name: "Telegram Bot", desc: "Bot integratsiyasi", envKey: "TELEGRAM_BOT_TOKEN", url: "https://t.me/BotFather", cat: "Messaging" },
  { id: "hermes", name: "Hermes — built-in vositalar", desc: "MCP tool executor", envKey: null, url: "", cat: "Tools" },
  { id: "supabase", name: "Supabase", desc: "Tasks/Projects ma'lumotlar bazasi", envKey: "SUPABASE_URL", url: "https://supabase.com", cat: "Database" },
];

const AI_IDS = new Set(APIS.filter((a) => a.cat === "AI Text").map((a) => a.id));
const VOICE_IDS = new Set(["gemini-voice", "groq-stt", "elevenlabs"]);

// Providers that can actually receive a key (skip keyless entries like Pollinations/Hermes)
const KEYABLE = APIS.filter((a) => a.envKey);

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${copied ? "text-green-500" : "text-gray-400 hover:text-indigo-600"}`}
    >
      {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.75} />}
    </button>
  );
}

function AddKeyPanel() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"single" | "bulk">("single");

  // Single mode
  const [providerId, setProviderId] = useState(KEYABLE[0]?.id || "");
  const [keyValue, setKeyValue] = useState("");

  // Bulk mode
  const [bulkText, setBulkText] = useState("");
  const [bulkParsed, setBulkParsed] = useState<{ line: string; known: boolean }[]>([]);

  const provider = KEYABLE.find((p) => p.id === providerId);
  const singleLine = provider && keyValue ? `${provider.envKey}=${keyValue}` : "";

  function parseBulk() {
    const knownEnvKeys = new Set(KEYABLE.map((p) => p.envKey));
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="));
    setBulkParsed(lines.map((line) => ({ line, known: knownEnvKeys.has(line.split("=")[0].trim()) })));
  }

  function copyAllBulk() {
    navigator.clipboard.writeText(bulkParsed.map((p) => p.line).join("\n"));
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <KeyRound size={18} strokeWidth={1.75} className="text-indigo-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">AI Key qo&apos;shish</p>
            <p className="text-xs text-gray-500">Bittalab yoki bulk (bir nechta birdan)</p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 py-4 border-t border-gray-50 space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
            Vercel ilova ichidan environment variable&apos;ni to&apos;g&apos;ridan-to&apos;g&apos;ri o&apos;zgartira olmaydi (xavfsizlik cheklovi).
            Shuning uchun bu yerda tayyor <code className="bg-white px-1 rounded">KEY=value</code> qatori generatsiya qilinadi —
            uni nusxalab, Vercel&apos;dagi Environment Variables sahifasiga qo&apos;shasiz.
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMode("single")}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${mode === "single" ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
            >
              Bittalab
            </button>
            <button
              onClick={() => setMode("bulk")}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${mode === "bulk" ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
            >
              Bulk (ko&apos;plab)
            </button>
          </div>

          {mode === "single" ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Provider</label>
                <select
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                >
                  {KEYABLE.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.envKey})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">API Key</label>
                <input
                  type="password"
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder="Kalitni shu yerga joylashtiring..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 font-mono"
                />
              </div>
              {singleLine && (
                <div className="flex items-center gap-2 font-mono text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <span className="flex-1 truncate">{provider?.envKey}=••••••••</span>
                  <CopyLine text={singleLine} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  KEY=value formatida, har birini yangi qatorga yozing
                </label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  onBlur={parseBulk}
                  rows={5}
                  placeholder={"GROQ_API_KEY=xxx\nCEREBRAS_API_KEY=yyy\nELEVENLABS_API_KEY=zzz"}
                  className="w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                />
              </div>
              <button
                onClick={parseBulk}
                className="text-xs px-3 py-1.5 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 text-gray-600 rounded-lg transition-all"
              >
                Tekshirish
              </button>
              {bulkParsed.length > 0 && (
                <div className="space-y-2">
                  {bulkParsed.map((p, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 font-mono text-xs rounded-lg px-3 py-2 border ${p.known ? "bg-gray-50 border-gray-100 text-gray-700" : "bg-red-50 border-red-100 text-red-600"}`}
                    >
                      <span className="flex-1 truncate">{p.line.split("=")[0]}=••••••••</span>
                      {!p.known && <span className="text-[10px] uppercase flex-shrink-0">noma&apos;lum key</span>}
                      <CopyLine text={p.line} />
                    </div>
                  ))}
                  <button
                    onClick={copyAllBulk}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all"
                  >
                    <Copy size={12} strokeWidth={2} /> Hammasini nusxalash
                  </button>
                </div>
              )}
            </div>
          )}

          <a
            href={VERCEL_ENV_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"
          >
            Vercel Environment Variables sahifasini ochish <ExternalLink size={11} />
          </a>
        </div>
      )}
    </div>
  );
}

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
      if (VOICE_IDS.has(id)) {
        const r = await fetch(`/api/voice/test?provider=${id}`, { signal: AbortSignal.timeout(12000) });
        const d = await r.json();
        setStatuses((s) => ({ ...s, [id]: d.ok ? "ok" : "error" }));
        if (d.ok && d.info) setErrors((e) => ({ ...e, [id]: d.info }));
        if (!d.ok) setErrors((e) => ({ ...e, [id]: d.error || "Key sozlanmagan yoki ishlamaydi" }));
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

  async function testAll() {
    for (const api of APIS) {
      testApi(api.id);
      await new Promise((r) => setTimeout(r, 200));
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connectors</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ulangan xizmatlar, API kalitlar holati va yangi ulanish qo&apos;shish</p>
        </div>
        <button
          onClick={testAll}
          className="flex items-center gap-1.5 text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex-shrink-0"
        >
          <RefreshCw size={13} strokeWidth={2} />
          Hammasini tekshir
        </button>
      </div>

      <AddKeyPanel />

      {cats.map((cat) => (
        <div key={cat}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{cat}</p>
          <div className="space-y-2">
            {APIS.filter((a) => a.cat === cat).map((api) => {
              const st = statuses[api.id];
              return (
                <div key={api.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                    {api.cat === "Voice" && api.id === "elevenlabs" ? (
                      <Volume2 size={16} strokeWidth={1.75} className="text-indigo-600" />
                    ) : api.cat === "Voice" ? (
                      <Mic size={16} strokeWidth={1.75} className="text-indigo-600" />
                    ) : (
                      <Plug size={16} strokeWidth={1.75} className="text-indigo-600" />
                    )}
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
                      <p className={`text-xs mt-1 truncate ${st === "ok" ? "text-green-600" : "text-red-500"}`}>{errors[api.id]}</p>
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
