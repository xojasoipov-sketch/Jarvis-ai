"use client";
import { useState, useEffect } from "react";
import { ShieldCheck, Key, Lock, AlertTriangle, CheckCircle2, Info } from "lucide-react";

type KeyStatus = { name: string; set: boolean };
type Checks = {
  httpsEnforced: boolean;
  secretsNotHardcoded: boolean;
  botProtected: boolean;
  rateLimiting: boolean;
  authSystem: boolean;
  auditLogs: boolean | "partial";
};

const CHECK_LABELS: Record<keyof Checks, { label: string; desc: string }> = {
  httpsEnforced: { label: "HTTPS / TLS ulangan", desc: "Vercel har bir deploy uchun avtomatik SSL beradi" },
  secretsNotHardcoded: { label: "Sirlar kodga hardcode qilinmagan", desc: "Barcha API kalitlar faqat environment variable orqali o'qiladi" },
  botProtected: { label: "Telegram bot token muhofazalangan", desc: "TELEGRAM_BOT_TOKEN Vercel Environment Variables'da" },
  rateLimiting: { label: "Rate limiting", desc: "Hali ulanmagan — Redis yoki Vercel Edge Config kerak" },
  authSystem: { label: "Login / autentifikatsiya tizimi", desc: "Yo'q — bu bitta foydalanuvchi uchun ilova, URL'ni bilgan har kim to'liq kirish huquqiga ega" },
  auditLogs: { label: "Audit loglar", desc: "Mavjud, lekin faqat xotirada (in-memory) — server qayta ishga tushsa yo'qoladi" },
};

export default function SecurityPage() {
  const [keys, setKeys] = useState<KeyStatus[]>([]);
  const [checks, setChecks] = useState<Checks | null>(null);

  useEffect(() => {
    fetch("/api/security/status")
      .then((r) => r.json())
      .then((d) => { setKeys(d.keys || []); setChecks(d.checks || null); })
      .catch(() => {});
  }, []);

  const checkEntries = checks
    ? (Object.keys(CHECK_LABELS) as (keyof Checks)[]).map((k) => ({ key: k, value: checks[k], ...CHECK_LABELS[k] }))
    : [];
  const passCount = checkEntries.filter((c) => c.value === true).length;
  const score = checkEntries.length ? Math.round((passCount / checkEntries.length) * 100) : 0;

  return (
    <div className="fade-in max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security</h1>
        <p className="text-sm text-gray-500 mt-0.5">Xavfsizlik holati — kodni va konfiguratsiyani real tekshiruv asosida</p>
      </div>

      <div className={`bg-gradient-to-br rounded-2xl border p-6 ${score >= 70 ? "from-green-50 to-emerald-50 border-green-100" : "from-amber-50 to-orange-50 border-amber-100"}`}>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${score >= 70 ? "bg-green-500" : "bg-amber-500"}`}>
            <ShieldCheck size={28} strokeWidth={1.75} className="text-white" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{score}<span className="text-lg text-gray-500">/100</span></p>
            <p className={`text-sm font-medium ${score >= 70 ? "text-green-700" : "text-amber-700"}`}>
              {passCount}/{checkEntries.length} tekshiruv o&apos;tdi
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-900 mb-4">Xavfsizlik tekshiruvi</p>
        <div className="space-y-3">
          {checkEntries.map(({ key, value, label, desc }) => (
            <div key={key} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              {value === true ? (
                <CheckCircle2 size={16} strokeWidth={1.75} className="text-green-500 flex-shrink-0" />
              ) : value === "partial" ? (
                <Info size={16} strokeWidth={1.75} className="text-blue-500 flex-shrink-0" />
              ) : (
                <AlertTriangle size={16} strokeWidth={1.75} className="text-yellow-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              {value === false && <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Yo&apos;q</span>}
              {value === "partial" && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Qisman</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Key size={15} strokeWidth={1.75} className="text-indigo-600" /> API Kalitlar holati
        </p>
        <div className="space-y-2">
          {keys.map(({ name, set }) => (
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
          <Lock size={11} strokeWidth={1.75} /> Faqat mavjudligi tekshiriladi — qiymatlar hech qachon frontendga qaytarilmaydi.
        </p>
      </div>
    </div>
  );
}
