"use client";
import { useState, useEffect } from "react";
import {
  Settings, Brain, Zap, Bot, CheckCircle2, XCircle,
  ExternalLink, RefreshCw, Copy, Eye, EyeOff, Save,
} from "lucide-react";

type Status = "idle" | "checking" | "ok" | "error";

function StatusBadge({ s }: { s: Status }) {
  if (s === "checking") return <span className="flex items-center gap-1 text-xs text-blue-600"><RefreshCw size={11} className="animate-spin" />Tekshirilmoqda...</span>;
  if (s === "ok") return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 size={11} />Ulangan</span>;
  if (s === "error") return <span className="flex items-center gap-1 text-xs text-red-500"><XCircle size={11} />Ulanmadi</span>;
  return <span className="text-xs text-gray-400">Tekshirilmagan</span>;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={`p-1.5 transition-colors ${copied ? "text-green-500" : "text-gray-400 hover:text-gray-600"}`}>
      <Copy size={13} strokeWidth={1.75} />
    </button>
  );
}

export default function SettingsPage() {
  const [obsStatus, setObsStatus] = useState<Status>("idle");
  const [hermesStatus, setHermesStatus] = useState<Status>("idle");
  const [telegramStatus, setTelegramStatus] = useState<Status>("idle");
  const [memoryItems, setMemoryItems] = useState<{ title: string; content: string }[]>([]);
  const [mcpTools, setMcpTools] = useState<{ name: string; description?: string }[]>([]);
  const [showVault, setShowVault] = useState(false);
  const [vaultFiles, setVaultFiles] = useState<string[]>([]);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
    checkAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkAll() {
    checkObsidian();
    checkHermes();
    checkTelegram();
    loadMemory();
  }

  async function checkObsidian() {
    setObsStatus("checking");
    try {
      const r = await fetch("/api/obsidian", { signal: AbortSignal.timeout(5000) });
      const data = await r.json();
      if (r.ok && data.configured && !data.error) {
        setObsStatus("ok");
        setVaultFiles((data.files || []).slice(0, 20).map((f: { path: string }) => f.path));
      } else setObsStatus("error");
    } catch { setObsStatus("error"); }
  }

  async function checkHermes() {
    setHermesStatus("checking");
    try {
      const r = await fetch("/api/mcp", { signal: AbortSignal.timeout(5000) });
      const data = await r.json();
      if (r.ok && data.configured && !data.error) {
        setHermesStatus("ok");
        setMcpTools(data.tools || []);
      } else setHermesStatus("error");
    } catch { setHermesStatus("error"); }
  }

  async function checkTelegram() {
    setTelegramStatus("checking");
    try {
      const r = await fetch("/api/telegram/debug", { signal: AbortSignal.timeout(5000) });
      setTelegramStatus(r.ok ? "ok" : "error");
    } catch { setTelegramStatus("error"); }
  }

  async function loadMemory() {
    try {
      const r = await fetch("/api/memory");
      const data = await r.json();
      setMemoryItems((data.items || []).slice(0, 5));
    } catch {}
  }

  async function setupTelegramWebhook() {
    try {
      const r = await fetch("/api/telegram/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: baseUrl }),
      });
      const d = await r.json();
      if (d.ok) { alert("Webhook o'rnatildi!"); checkTelegram(); }
      else alert("Xato: " + (d.error || "Noma'lum"));
    } catch { alert("Ulanishda xato"); }
  }

  return (
    <div className="fade-in max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings & Integrations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Hermes, Obsidian va boshqa tizimlarni sozlash</p>
      </div>

      {/* Obsidian */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <Brain size={18} strokeWidth={1.75} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Vault (Xotira)</p>
              <p className="text-xs text-gray-500">Pari AI xotirasi — GitHub-asosli bilim bazasi</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge s={obsStatus} />
            <button onClick={checkObsidian} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-xs space-y-2">
            <p className="font-semibold text-gray-700">Railway Variables&apos;da o&apos;rnating (bulutli vault, lokal server shart emas):</p>
            <div className="flex items-center gap-2 font-mono text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
              <span className="flex-1 truncate">GITHUB_TOKEN=ghp_...</span>
              <CopyBtn text="GITHUB_TOKEN=ghp_..." />
            </div>
            <div className="flex items-center gap-2 font-mono text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
              <span className="flex-1 truncate">GITHUB_VAULT_REPO=owner/repo</span>
              <CopyBtn text="GITHUB_VAULT_REPO=owner/repo" />
            </div>
            <p className="text-gray-500">Eslatmalar shu repo&apos;dagi <strong>/vault</strong> papkasida saqlanadi. Obsidian ilovasida ko&apos;rish uchun (ixtiyoriy) <strong>Obsidian Git</strong> plagini bilan sync qiling.</p>
            <a href="https://github.com/Vinzent03/obsidian-git" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
              Obsidian Git plagini <ExternalLink size={11} />
            </a>
          </div>
          {obsStatus === "ok" && (
            <div>
              <button onClick={() => setShowVault(!showVault)}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline mb-2">
                {showVault ? <EyeOff size={12} /> : <Eye size={12} />}
                {showVault ? "Yopish" : `Vault fayllarini ko'rish (${vaultFiles.length})`}
              </button>
              {showVault && vaultFiles.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {vaultFiles.map(f => (
                    <p key={f} className="text-xs text-gray-600 font-mono px-3 py-1 bg-gray-50 rounded-lg truncate">{f}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hermes MCP */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <Zap size={18} strokeWidth={1.75} className="text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Hermes — MCP Vositalar</p>
              <p className="text-xs text-gray-500">Built-in vositalar — Railway serverida ishlaydi</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge s={hermesStatus} />
            <button onClick={checkHermes} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-xs space-y-2">
            <p className="font-semibold text-gray-700">Doim yoqilgan, sozlash shart emas:</p>
            <p className="text-gray-500">calculator, datetime, web_fetch va vault_read/write/search/list vositalari to&apos;g&apos;ridan-to&apos;g&apos;ri Railway serverida ishlaydi.</p>
            <p className="font-semibold text-gray-700 pt-1">Ixtiyoriy — tashqi Hermes gateway&apos;ga ulanish:</p>
            <div className="flex items-center gap-2 font-mono text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
              <span className="flex-1 truncate">HERMES_URL=https://your-hermes-host</span>
              <CopyBtn text="HERMES_URL=https://your-hermes-host" />
            </div>
            <div className="flex items-center gap-2 font-mono text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
              <span className="flex-1 truncate">HERMES_KEY=your-hermes-secret</span>
              <CopyBtn text="HERMES_KEY=your-hermes-secret" />
            </div>
          </div>
          {hermesStatus === "ok" && mcpTools.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Mavjud vositalar ({mcpTools.length}):</p>
              <div className="space-y-1">
                {mcpTools.map(t => (
                  <div key={t.name} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <Zap size={12} strokeWidth={1.75} className="text-orange-500 flex-shrink-0" />
                    <span className="text-xs font-mono text-gray-700">{t.name}</span>
                    {t.description && <span className="text-xs text-gray-400 truncate">{t.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Telegram */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Bot size={18} strokeWidth={1.75} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Telegram Bot</p>
              <p className="text-xs text-gray-500">Mobil kirish kanali</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge s={telegramStatus} />
            <button onClick={checkTelegram} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-xs space-y-2">
            <p className="font-semibold text-gray-700">Railway Variables'da o'rnating:</p>
            <div className="flex items-center gap-2 font-mono text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
              <span className="flex-1 truncate">TELEGRAM_BOT_TOKEN=your-bot-token</span>
              <CopyBtn text="TELEGRAM_BOT_TOKEN=your-bot-token" />
            </div>
            <div className="flex items-center gap-2 font-mono text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
              <span className="flex-1 truncate">TELEGRAM_CHAT_ID=your-chat-id</span>
              <CopyBtn text="TELEGRAM_CHAT_ID=your-chat-id" />
            </div>
          </div>
          {baseUrl && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Webhook URL:</p>
              <div className="flex items-center gap-2 font-mono text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <span className="flex-1 truncate">{baseUrl}/api/telegram</span>
                <CopyBtn text={`${baseUrl}/api/telegram`} />
              </div>
              <button onClick={setupTelegramWebhook}
                className="mt-3 flex items-center gap-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all">
                <Save size={13} strokeWidth={1.75} /> Webhook o'rnatish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Memory preview */}
      {memoryItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-900">Faol xotira</p>
            <p className="text-xs text-gray-500">Obsidian yoki lokal xotiradan olingan</p>
          </div>
          <div className="divide-y divide-gray-50">
            {memoryItems.map((m, i) => (
              <div key={i} className="px-5 py-3">
                <p className="text-xs font-semibold text-gray-900">{m.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API endpoints */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Settings size={16} strokeWidth={1.75} className="text-gray-400" />
          <p className="text-sm font-semibold text-gray-900">API Endpointlar</p>
        </div>
        <div className="space-y-2">
          {[
            { path: "/api/chat", desc: "AI chat (streaming)" },
            { path: "/api/agent", desc: "Agent tizimi (8 agent)" },
            { path: "/api/memory", desc: "Unified xotira (Obsidian + local)" },
            { path: "/api/conversations", desc: "Suhbat tarixi" },
            { path: "/api/obsidian", desc: "Obsidian vault proxy" },
            { path: "/api/mcp", desc: "Hermes MCP gateway" },
            { path: "/api/telegram", desc: "Telegram bot webhook" },
          ].map(e => (
            <div key={e.path} className="flex items-center gap-3 text-xs flex-wrap">
              <code className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{e.path}</code>
              <span className="text-gray-500">{e.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
