"use client";

import { useEffect, useState } from "react";
import { Camera, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Wifi, WifiOff, ArrowRight } from "lucide-react";
import Link from "next/link";

type ConnectStatus = {
  configured: boolean;
  env_configured: boolean;
  cameras_count: number;
  online: number;
  offline: number;
};

type SyncResult = {
  ok: boolean;
  error?: string;
  imported?: number;
  updated?: number;
  total?: number;
  cameras?: Array<{ id: string; name: string; status: string; serial: string }>;
  message?: string;
};

export default function EzvizConnectPage() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [appKey, setAppKey] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const loadStatus = async () => {
    const res = await fetch("/api/cameras/ezviz/connect");
    const d = await res.json() as ConnectStatus;
    setStatus(d);
  };

  useEffect(() => { void loadStatus(); }, []);

  const handleConnect = async () => {
    if (!appKey.trim() || !appSecret.trim()) {
      setResult({ ok: false, error: "appKey va appSecret kiriting" });
      return;
    }
    setConnecting(true);
    setResult(null);
    try {
      const res = await fetch("/api/cameras/ezviz/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_key: appKey.trim(), app_secret: appSecret.trim() }),
      });
      const d = await res.json() as SyncResult;
      setResult(d);
      if (d.ok) { setAppKey(""); setAppSecret(""); await loadStatus(); }
    } finally { setConnecting(false); }
  };

  const handleSync = async () => {
    setSyncing(true); setResult(null);
    try {
      const res = await fetch("/api/cameras/ezviz/sync", { method: "POST" });
      const d = await res.json() as SyncResult;
      setResult(d);
      if (d.ok) await loadStatus();
    } finally { setSyncing(false); }
  };

  const isConnected = status && status.cameras_count > 0;

  return (
    <div className="min-h-screen bg-[#080808] text-white px-4 py-12">
      <div className="max-w-xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#ff6a1a]/10 flex items-center justify-center">
            <Camera size={22} className="text-[#ff6a1a]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">EZVIZ Integration</h1>
            <p className="text-sm text-white/40">Real kameralarga ulanish</p>
          </div>
        </div>

        {/* Current Status */}
        {status && (
          <div className={`rounded-2xl border p-5 ${isConnected ? "border-green-500/20 bg-green-500/5" : "border-white/8 bg-white/2"}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isConnected
                  ? <CheckCircle2 size={16} className="text-green-400" />
                  : <AlertCircle size={16} className="text-white/30" />}
                <span className="text-sm font-medium">
                  {isConnected ? "EZVIZ ulangan" : "Hali ulanmagan"}
                </span>
              </div>
              {isConnected && (
                <button onClick={handleSync} disabled={syncing} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white disabled:opacity-40 transition">
                  <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
                  Yangilash
                </button>
              )}
            </div>

            {isConnected && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Jami kamera", value: status.cameras_count, color: "text-white" },
                  { label: "Online", value: status.online, color: "text-green-400" },
                  { label: "Offline", value: status.offline, color: "text-red-400" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl bg-white/3 border border-white/6 p-3 text-center">
                    <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {status.env_configured && (
              <p className="text-xs text-white/40 mt-3 flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-green-400" />
                EZVIZ_APP_KEY va EZVIZ_APP_SECRET environment'da topildi
              </p>
            )}
          </div>
        )}

        {/* Sync result */}
        {result && (
          <div className={`rounded-2xl border p-4 ${result.ok ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
            {result.ok ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <CheckCircle2 size={15} /> {result.message}
                </div>
                {result.cameras && result.cameras.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {result.cameras.map(c => (
                      <div key={c.id} className="flex items-center justify-between text-xs bg-white/3 rounded-lg px-3 py-2">
                        <span className="text-white/70">{c.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white/30">{c.serial.slice(-8)}</span>
                          {c.status === "online"
                            ? <Wifi size={11} className="text-green-400" />
                            : <WifiOff size={11} className="text-red-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2 text-red-400 text-sm">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <span>{result.error}</span>
              </div>
            )}
          </div>
        )}

        {/* Connect Form */}
        <div className="rounded-2xl border border-white/8 bg-white/2 p-6 space-y-5">
          <div>
            <h2 className="font-medium text-white mb-1">EZVIZ Developer Credentials</h2>
            <p className="text-sm text-white/40">
              EZVIZ Mobile App login/parol <span className="text-red-400">emas</span>.
              Developer portaldan olingan <strong className="text-white/70">appKey</strong> va <strong className="text-white/70">appSecret</strong> kerak.
            </p>
          </div>

          {/* Instructions */}
          <div className="rounded-xl bg-white/3 border border-white/6 p-4 space-y-2">
            <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Qanday olish:</p>
            <ol className="text-xs text-white/50 space-y-1.5 list-decimal list-inside">
              <li>
                <a href="https://open.ys7.com" target="_blank" rel="noreferrer" className="text-[#ff6a1a] underline underline-offset-2">
                  open.ys7.com
                </a>
                {" "}ga kiring (EZVIZ account bilan)
              </li>
              <li>{"Ilovalar → Yangi ilova yarating"}</li>
              <li>{"appKey va appSecret ni ko'chiring"}</li>
              <li>{"Qurilmalar bo'limida kameralaringizni appga qo'shing"}</li>
            </ol>
            <a
              href="https://open.ys7.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#ff6a1a] hover:underline mt-1"
            >
              open.ys7.com <ExternalLink size={10} />
            </a>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">App Key</label>
              <input
                type="text"
                placeholder="a1b2c3d4e5f6..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition"
                value={appKey}
                onChange={e => setAppKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">App Secret</label>
              <input
                type="password"
                placeholder="••••••••••••••••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition"
                value={appSecret}
                onChange={e => setAppSecret(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={connecting || !appKey.trim() || !appSecret.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ff6a1a] py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {connecting ? (
              <><RefreshCw size={14} className="animate-spin" /> Ulanmoqda...</>
            ) : (
              <>Ulash va kameralarni import qilish <ArrowRight size={14} /></>
            )}
          </button>

          <p className="text-xs text-white/30 text-center">
            Credentials faqat server'da saqlanadi. Frontendga, loglarga va GitHubga chiqmaydi.
          </p>
        </div>

        {/* ENV option */}
        <div className="rounded-2xl border border-white/6 p-5 space-y-3">
          <h3 className="text-sm font-medium text-white/60">Production: Environment Variables</h3>
          <p className="text-xs text-white/40">UI o'rniga environment'ga qo'shish xavfsizroq:</p>
          <div className="rounded-lg bg-black/40 border border-white/8 p-3 font-mono text-xs text-white/60 space-y-1">
            <p>EZVIZ_APP_KEY=<span className="text-[#ff6a1a]">sizning_app_key</span></p>
            <p>EZVIZ_APP_SECRET=<span className="text-[#ff6a1a]">sizning_app_secret</span></p>
          </div>
          <p className="text-xs text-white/30">Railway/Vercel → Variables bo'limida qo'shing, keyin qayta deploy qiling.</p>
        </div>

        {/* Link to cameras */}
        {isConnected && (
          <Link
            href="/cameras"
            className="flex items-center justify-between rounded-2xl border border-[#ff6a1a]/20 bg-[#ff6a1a]/5 px-6 py-4 hover:bg-[#ff6a1a]/10 transition"
          >
            <div className="flex items-center gap-3">
              <Camera size={16} className="text-[#ff6a1a]" />
              <span className="text-sm font-medium">Kameralarga o'tish</span>
            </div>
            <ArrowRight size={16} className="text-[#ff6a1a]" />
          </Link>
        )}
      </div>
    </div>
  );
}
