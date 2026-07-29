"use client";
import { useState, useEffect } from "react";

type BotInfo = { ok: boolean; result?: { id: number; first_name: string; username: string } };
type WebhookInfo = { ok: boolean; result?: { url: string; pending_update_count: number; last_error_message?: string } };

export default function SettingsPage() {
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [appUrl, setAppUrl] = useState("https://pari-ai-production.up.railway.app");

  async function fetchInfo() {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "info" }),
      });
      const data = await res.json();
      if (data.tokenMissing) {
        setStatus("⚠️ TELEGRAM_BOT_TOKEN Railway Variables'ga qo'shilmagan");
        setLoading(false); return;
      }
      if (data.error) { setStatus(`❌ ${data.error}`); setLoading(false); return; }
      setBotInfo(data.bot);
      setWebhookInfo(data.webhook);
      setStatus("");
    } catch { setStatus("❌ Server bilan bog'lanishda xato"); }
    setLoading(false);
  }

  async function setupWebhook() {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/telegram/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", appUrl }),
      });
      const data = await res.json();
      if (data.tokenMissing) {
        setStatus("⚠️ TELEGRAM_BOT_TOKEN Railway Variables'ga qo'shilmagan. Qo'shib qayta deploy qiling.");
        setLoading(false); return;
      }
      if (data.error) { setStatus(`❌ ${data.error}`); setLoading(false); return; }
      if (data.webhook?.ok) {
        setStatus("✅ Webhook o'rnatildi! Mini App ham ulandi. Bot tayyor!");
        fetchInfo();
      } else {
        setStatus(`❌ Telegram xato: ${data.webhook?.description || JSON.stringify(data.webhook)}`);
      }
    } catch { setStatus("❌ Webhook o'rnatishda xato"); }
    setLoading(false);
  }

  async function removeWebhook() {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      });
      const data = await res.json();
      if (data.ok) { setStatus("✅ Webhook o'chirildi"); fetchInfo(); }
    } catch { setStatus("❌ Xato"); }
    setLoading(false);
  }

  useEffect(() => { fetchInfo(); }, []);

  const bot = botInfo?.result;
  const webhook = webhookInfo?.result;
  const isConnected = bot && webhook?.url?.includes("/api/telegram");

  return (
    <div className="fade-in max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tizim sozlamalari va integratsiyalar</p>
      </div>

      {/* Telegram Integration */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xl">
            ✈️
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Telegram Bot</p>
            <p className="text-xs text-gray-500">Telegram orqali Pari AI bilan muloqot</p>
          </div>
          <div className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            isConnected ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
            {loading ? "Tekshirilmoqda..." : isConnected ? "Ulangan" : "Ulanmagan"}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Bot info */}
          {bot && (
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-bold">
                {bot.first_name?.[0] || "P"}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{bot.first_name}</p>
                <a href={`https://t.me/${bot.username}`} target="_blank" rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline">@{bot.username}</a>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">Bot ID</p>
                <p className="text-sm font-mono text-gray-700">{bot.id}</p>
              </div>
            </div>
          )}

          {/* Webhook info */}
          {webhook && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Webhook holati</p>
              <div className="p-3 bg-gray-50 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">URL</span>
                  <span className="font-mono text-gray-700 truncate max-w-48">{webhook.url || "O'rnatilmagan"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Kutayotgan xabarlar</span>
                  <span className="text-gray-700">{webhook.pending_update_count || 0}</span>
                </div>
                {webhook.last_error_message && (
                  <div className="flex justify-between text-xs">
                    <span className="text-red-500">Xato</span>
                    <span className="text-red-600 text-right max-w-48">{webhook.last_error_message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* App URL */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Ilova URL manzili</label>
            <input value={appUrl} onChange={e => setAppUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200" />
            <p className="text-xs text-gray-400">Webhook shu URL ga o'rnatiladi: {appUrl}/api/telegram</p>
          </div>

          {/* Status */}
          {status && (
            <div className={`px-4 py-3 rounded-xl text-sm ${status.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {status}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={setupWebhook} disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all">
              {loading ? "Yuklanmoqda..." : "🔗 Webhook o'rnatish"}
            </button>
            <button onClick={fetchInfo} disabled={loading}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-all">
              🔄
            </button>
            {isConnected && (
              <button onClick={removeWebhook} disabled={loading}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-xl transition-all">
                O'chirish
              </button>
            )}
          </div>

          {/* Quick link */}
          {bot?.username && (
            <div className="flex items-center gap-3 p-4 border border-dashed border-blue-200 rounded-xl">
              <span className="text-2xl">📱</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Bot bilan ishlash</p>
                <a href={`https://t.me/${bot.username}`} target="_blank" rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline">t.me/{bot.username} → ochish</a>
              </div>
              <a href={`https://t.me/${bot.username}`} target="_blank" rel="noreferrer"
                className="ml-auto px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-all">
                Ochish →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Bot commands guide */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-900 mb-4">Bot buyruqlari</p>
        <div className="space-y-2">
          {[
            { cmd: "/start", desc: "Botni ishga tushirish va bosh menyu" },
            { cmd: "/agents", desc: "Ixtisoslashgan agent tanlash" },
            { cmd: "/chat", desc: "Oddiy chat rejimiga o'tish" },
            { cmd: "/clear", desc: "Suhbat tarixini tozalash" },
            { cmd: "/status", desc: "Bot va tizim holati" },
            { cmd: "/help", desc: "Barcha buyruqlar ro'yxati" },
          ].map(({ cmd, desc }) => (
            <div key={cmd} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <code className="text-xs bg-gray-100 text-indigo-600 px-2 py-1 rounded font-mono">{cmd}</code>
              <span className="text-xs text-gray-600">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* API Keys status */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-900 mb-4">AI Provayderlar</p>
        <div className="space-y-2">
          {[
            { name: "OpenRouter", env: "OPENROUTER_API_KEY", model: "Gemini 2.0 Flash" },
            { name: "Mistral AI", env: "MISTRAL_API_KEY", model: "Mistral Large" },
            { name: "Groq", env: "GROQ_API_KEY", model: "LLaMA 3.3 70B" },
            { name: "Cerebras", env: "CEREBRAS_API_KEY", model: "LLaMA 3.3 70B" },
          ].map(p => (
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
