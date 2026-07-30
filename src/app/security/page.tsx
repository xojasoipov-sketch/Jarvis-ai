"use client";
import { ShieldCheck, Key, Lock, AlertTriangle, CheckCircle2, User } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="fade-in max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security</h1>
        <p className="text-sm text-gray-500 mt-0.5">Xavfsizlik sozlamalari va monitoring</p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={28} strokeWidth={1.75} className="text-white" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">87<span className="text-lg text-gray-500">/100</span></p>
            <p className="text-sm text-green-700 font-medium">Xavfsizlik bahosi — Yaxshi</p>
            <p className="text-xs text-gray-500 mt-1">3 ta yaxshilash mumkin</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-900 mb-4">Xavfsizlik tekshiruvi</p>
        <div className="space-y-3">
          {[
            { ok: true, label: "HTTPS / SSL ulangan", desc: "Railway avtomatik SSL beradi" },
            { ok: true, label: "API kalitlar Railway Variables'da", desc: "Kalitlar .env ga commitlanmagan" },
            { ok: true, label: "Bot token muhofazalangan", desc: "TELEGRAM_BOT_TOKEN Railway Variables'da" },
            { ok: false, label: "Rate limiting", desc: "Redis bilan konfiguratsiya kerak" },
            { ok: false, label: "MFA / Auth", desc: "JWT + OAuth2 hali ulanmagan" },
            { ok: false, label: "Audit logs", desc: "Log tizimi konfiguratsiya kerak" },
          ].map(({ ok, label, desc }) => (
            <div key={label} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              {ok
                ? <CheckCircle2 size={16} strokeWidth={1.75} className="text-green-500 flex-shrink-0" />
                : <AlertTriangle size={16} strokeWidth={1.75} className="text-yellow-500 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              {!ok && <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Sozlash</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Key size={15} strokeWidth={1.75} className="text-indigo-600" /> API Kalitlar
        </p>
        <div className="space-y-2">
          {[
            { name: "OPENROUTER_API_KEY", set: true },
            { name: "MISTRAL_API_KEY", set: true },
            { name: "GROQ_API_KEY", set: true },
            { name: "TELEGRAM_BOT_TOKEN", set: true },
            { name: "OBSIDIAN_URL", set: false },
            { name: "OBSIDIAN_KEY", set: false },
            { name: "HERMES_URL", set: false },
          ].map(({ name, set }) => (
            <div key={name} className="flex items-center gap-3 py-2">
              <code className="flex-1 text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">{name}</code>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${set ? "bg-green-500" : "bg-gray-300"}`} />
                <span className={`text-xs ${set ? "text-green-600" : "text-gray-400"}`}>{set ? "O'rnatilgan" : "O'rnatilmagan"}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5">
          <Lock size={11} strokeWidth={1.75} /> Kalitlarni Railway Variables'dan o'rnating.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User size={15} strokeWidth={1.75} className="text-indigo-600" /> Aktiv sessiyalar
        </p>
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">S</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Sadi Prime</p>
            <p className="text-xs text-gray-500">Railway · Hozir faol</p>
          </div>
          <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Joriy</span>
        </div>
      </div>
    </div>
  );
}
