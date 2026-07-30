"use client";
import { useState, useEffect } from "react";
import { Send, Link2, RefreshCw, Smartphone, AlertTriangle, CheckCircle2, XCircle, FolderOpen, Wrench, ExternalLink } from "lucide-react";

type BotInfo = { ok: boolean; result?: { id: number; first_name: string; username: string } };
type WebhookInfo = { ok: boolean; result?: { url: string; pending_update_count: number; last_error_message?: string } };
type StatusMsg = { level: "success" | "error" | "warning"; text: string } | null;

export default function SettingsPage() {
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusMsg>(null);
  const [appUrl, setAppUrl] = useState("https://pari-ai-production.up.railway.app");
  const [obsidianStatus, setObsidianStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [hermesStatus, setHermesStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [mcpTools, setMcpTools] = useState<{name: string}[]>([]);

  async function fetchInfo() {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "info" }) });
      const data = await res.json();
      if (data.tokenMissing) { setStatus({ level: "warning", text: "TELEGRAM_BOT_TOKEN Railway Variables'ga qo'shilmagan" }); setLoading(false); return; }
      if (data.error) { setStatus({ level: "error", text: data.error }); setLoading(false); return; }
      setBotInfo(data.bot);
      setWebhookInfo(data.webhook);
      setStatus(null);
    } catch { setStatus({ level: "error", text: "Server bilan bog'lanishda xato" }); }
    setLoading(false);
  }

  async function setupWebhook() {
    setLoading(true); setStatus(null);
    try {
      const res = await fetch("/api/telegram/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set", appUrl }) });
      const data = await res.json();
      if (data.tokenMissing) { setStatus({ level: "warning", text: "TELEGRAM_BOT_TOKEN Railway Variables'ga qo'shilmagan." }); setLoading(false); return; }
      if (data.error) { setStatus({ level: "error", text: data.error }); setLoading(false); return; }
      if (data.webhook?.ok) { setStatus({ level: "success", text: "Webhook o'rnatildi! Bot tayyor!" }); fetchInfo(); }
      else setStatus({ level: "error", text: `Telegram xato: ${data.webhook?.description || JSON.stringify(data.webhook)}` });
    } catch { setStatus({ level: "error", text: "Webhook o'rnatishda xato" }); }
    setLoading(false);
  }

  async function removeWebhook() {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete" }) });
      const data = await res.json();
      if (data.ok) { setStatus({ level: "success", text: "Webhook o'chirildi" }); fetchInfo(); }
    } catch { setStatus({ level: "error", text: "Xato" }); }
    setLoading(false);
  }

  async function checkObsidian() {
    setObsidianStatus("checking");
    const res = await fetch("/api/obsidian?path=/");
    const data = await res.json();
    setObsidianStatus(data.configured === false ? "error" : data.error ? "error" : "ok");
  }

  async function checkHermes() {
    setHermesStatus("checking");
    const res = await fetch("/api/mcp");
    const data = await res.json();
    if (!data.configured) { setHermesStatus("error"); return; }
    if (data.error) { setHermesStatus("error"); return; }
    setHermesStatus("ok");
    setMcpTools(data.tools || []);
  }

  useEffect(() => { fetchInfo(); }, []);

  const bot = botInfo?.result;
  const webhook = webhookInfo?.result;
  const isConnected = bot && webhook?.url?.includes("/api/telegram");

  const StatusIcon = ({ s }: { s: typeof obsidianStatus }) =>
    s === "ok" ? <CheckCircle2 size={16} strokeWidth={1.75} className="text-green-500" /> :
    s === "error" ? <XCircle size={16} strokeWidth={1.75} className="text-red-400" /> :
    s === "checking" ? <RefreshCw size={16} strokeWidth={1.75} className="text-indigo-400 animate-spin" /> : null;

  return (
    <div className="fade-in max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tizim sozlamalari va integratsiyalar</p>
      </div>

      {/* Telegram */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
            <Send size={18} strokeWidth={1.75} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Telegram Bot</p>
            <p className="text-xs text-gray-500">Telegram orqali Pari AI bilan muloqot</p>
          </div>
          <div className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isConnected ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
            {loading ? "Tekshirilmoqda..." : isConnected ? "Ulangan" : "Ulanmagan"}
          </div>
        </div>
        <div className="p-6 space-y-5">
          {bot && (
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-bold">{bot.first_name?.[0] || "P"}</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{bot.first_name}</p>
                <a href={`https://t.me/${bot.username}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">@{bot.username}</a>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">Bot ID</p>
                <p className="text-sm font-mono text-gray-700">{bot.id}</p>
              </div>
            </div>
          )}
          {webhook && (
            <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">URL</span><span className="font-mono text-gray-700 truncate max-w-48">{webhook.url || "O'rnatilmagan"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Kutayotgan xabarlar</span><span>{webhook.pending_update_count || 0}</span></div>
              {webhook.last_error_message && <div className="flex justify-between"><span className="text-red-500">Xato</span><span className="text-red-600 max-w-48 text-right">{webhook.last_error_message}</span></div>}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Ilova URL</label>
            <input value={appUrl} onChange={(e) => setAppUrl(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          {status && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
              status.level === "success" ? "bg-green-500/10 text-green-600" : status.level === "warning" ? "bg-yellow-500/10 text-yellow-600" : "bg-red-500/10 text-red-500"
            }`}>
              {status.level === "success" ? <CheckCircle2 size={15} strokeWidth={1.75} /> : status.level === "warning" ? <AlertTriangle size={15} strokeWidth={1.75} /> : <XCircle size={15} strokeWidth={1.75} />}
              {status.text}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={setupWebhook} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all">
              {loading ? "Yuklanmoqda..." : <><Link2 size={15} strokeWidth={1.75} /> Webhook o'rnatish</>}
            </button>
            <button onClick={fetchInfo} disabled={loading} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-all">
              <RefreshCw size={15} strokeWidth={1.75} />
            </button>
            {isConnected && (
              <button onClick={removeWebhook} disabled={loading} className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-xl transition-all">O'chirish</button>
            )}
          </div>
          {bot?.username && (
            <div className="flex items-center gap-3 p-4 border border-dashed border-blue-200 rounded-xl">
              <Smartphone size={24} strokeWidth={1.5} className="text-indigo-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Bot bilan ishlash</p>
                <a href={`https://t.me/${bot.username}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">t.me/{bot.username}</a>
              </div>
              <a href={`https://t.me/${bot.username}`} target="_blank" rel="noreferrer" className="ml-auto px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-all">Ochish →</a>
            </div>
          )}
        </div>
      </div>

      {/* Obsidian */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <FolderOpen size={18} strokeWidth={1.75} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Obsidian Vault</p>
            <p className="text-xs text-gray-500">PARI AI xotirasi — bilim bazasi sifatida</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <StatusIcon s={obsidianStatus} />
            <button onClick={checkObsidian} disabled={obsidianStatus === "checking"}
              className="text-xs px-3 py-1.5 border border-gray-200 hover:border-indigo-300 text-gray-600 hover:text-indigo-600 rounded-lg transition-all">
              Test
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50 rounded-xl p-4">
            <div><p className="font-semibold text-gray-700 mb-1">OBSIDIAN_URL</p><p className="text-gray-500">Vault server URL (ngrok / Cloudflare Tunnel)</p></div>
            <div><p className="font-semibold text-gray-700 mb-1">OBSIDIAN_KEY</p><p className="text-gray-500">Local REST API plugin kaliti</p></div>
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            <p className="font-semibold text-gray-900">Qanday ulash:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Obsidian → Community Plugins → <strong>Local REST API</strong> o'rnating va yoqing</li>
              <li>Plugin sozlamalaridan API Token oling</li>
              <li>Vault ni internet orqali expose qiling: <code className="bg-gray-100 px-1 rounded">ngrok http 27123</code></li>
              <li>Railway Variables ga qo'shing: <code className="bg-gray-100 px-1 rounded">OBSIDIAN_URL=https://xxx.ngrok.io</code> va <code className="bg-gray-100 px-1 rounded">OBSIDIAN_KEY=...</code></li>
            </ol>
          </div>
          <a href="https://github.com/coddingtonbear/obsidian-local-rest-api" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline">
            <ExternalLink size={12} strokeWidth={1.75} /> Local REST API plugin
          </a>
        </div>
      </div>

      {/* Hermes MCP */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
            <Wrench size={18} strokeWidth={1.75} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Hermes MCP Gateway</p>
            <p className="text-xs text-gray-500">MCP serverlarni boshqaruvchi lokal gateway</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <StatusIcon s={hermesStatus} />
            <button onClick={checkHermes} disabled={hermesStatus === "checking"}
              className="text-xs px-3 py-1.5 border border-gray-200 hover:border-indigo-300 text-gray-600 hover:text-indigo-600 rounded-lg transition-all">
              Test
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
            <p className="font-semibold text-gray-900 mb-2">Arxitekturadagi roli:</p>
            <p>• <strong>Obsidian</strong> — bilim vault (PARI AI xotirasi)</p>
            <p>• <strong>Hermes</strong> — MCP serverlarni birlashtiruvchi gateway. Claude yoki PARI AI orqali Obsidian, fayl tizimi, terminal va boshqa toollarni chaqiradi</p>
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            <p className="font-semibold text-gray-900">Qanday ulash:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Hermes ni lokal o'rnating: <code className="bg-gray-100 px-1 rounded">npm install -g hermes-mcp</code></li>
              <li>Obsidian MCP serverini Hermes ga qo'shing</li>
              <li>Hermes ni internet orqali expose qiling: <code className="bg-gray-100 px-1 rounded">ngrok http 3001</code></li>
              <li>Railway Variables ga qo'shing: <code className="bg-gray-100 px-1 rounded">HERMES_URL=https://xxx.ngrok.io</code></li>
            </ol>
          </div>
          {hermesStatus === "ok" && mcpTools.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-900">{mcpTools.length} ta tool topildi:</p>
              {mcpTools.slice(0, 5).map((t) => (
                <span key={t.name} className="inline-block text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded mr-1 mb-1 font-mono">{t.name}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Providers */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-900 mb-4">AI Provayderlar</p>
        <div className="space-y-2">
          {[
            { name: "OpenRouter", model: "Gemini 2.0 Flash" },
            { name: "Mistral AI", model: "Mistral Large" },
            { name: "Groq", model: "LLaMA 3.3 70B" },
            { name: "Cerebras", model: "LLaMA 3.3 70B" },
          ].map((p) => (
            <div key={p.name} className="flex items-center gap-3 py-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm text-gray-900 flex-1">{p.name}</span>
              <span className="text-xs text-gray-500">{p.model}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
