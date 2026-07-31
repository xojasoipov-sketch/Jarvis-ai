"use client";
import { useState, useEffect } from "react";
import { CreditCard, TrendingUp, Zap, ExternalLink } from "lucide-react";

const PROVIDER_DASHBOARDS: { key: string; name: string; url: string }[] = [
  { key: "GROQ_API_KEY", name: "Groq Console", url: "https://console.groq.com/settings/billing" },
  { key: "CEREBRAS_API_KEY", name: "Cerebras", url: "https://cloud.cerebras.ai" },
  { key: "OPENROUTER_API_KEY", name: "OpenRouter", url: "https://openrouter.ai/credits" },
  { key: "DEEPSEEK_API_KEY", name: "DeepSeek", url: "https://platform.deepseek.com/usage" },
  { key: "MISTRAL_API_KEY", name: "Mistral", url: "https://console.mistral.ai/billing" },
  { key: "OPENAI_API_KEY", name: "OpenAI", url: "https://platform.openai.com/usage" },
  { key: "ELEVENLABS_API_KEY", name: "ElevenLabs", url: "https://elevenlabs.io/app/usage" },
];

type KeyStatus = { name: string; set: boolean };

export default function BillingPage() {
  const [keys, setKeys] = useState<KeyStatus[]>([]);
  const [runCount, setRunCount] = useState<number | null>(null);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    fetch("/api/security/status").then((r) => r.json()).then((d) => setKeys(d.keys || [])).catch(() => {});
    fetch("/api/agent?history=1").then((r) => r.json()).then((d) => {
      setConfigured(Boolean(d.configured));
      setRunCount((d.runs || []).length);
    }).catch(() => setRunCount(null));
  }, []);

  const activeProviders = PROVIDER_DASHBOARDS.filter((p) => keys.find((k) => k.name === p.key)?.set);

  return (
    <div className="fade-in max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usage & Billing</h1>
        <p className="text-sm text-gray-500 mt-0.5">Har bir provider o&apos;z hisobini o&apos;zi yuritadi — bu yerda faqat sizda bor haqiqiy ma&apos;lumot</p>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">To&apos;lov modeli</p>
            <p className="text-2xl font-bold mt-1">Bepul-birinchi (BYO-key)</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Zap size={22} strokeWidth={1.75} className="text-white" />
          </div>
        </div>
        <p className="text-sm text-indigo-100 mt-2">
          Pari AI markazlashgan billing yuritmaydi — har bir AI provider (Groq, Mistral va h.k.) o&apos;z API kaliti orqali
          to&apos;g&apos;ridan-to&apos;g'ri ishlaydi. Sarf-xarajat har bir provider&apos;ning o&apos;z dashboard&apos;ida ko&apos;rinadi.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp size={16} strokeWidth={1.75} className="text-indigo-600" />
          <p className="text-sm font-semibold text-gray-900">Agent chaqiriqlari (barcha vaqt)</p>
        </div>
        {!configured ? (
          <p className="text-xs text-amber-600 mt-2">Supabase ulanmagan — chaqiriqlar hisobga olinmayapti</p>
        ) : (
          <p className="text-2xl font-bold text-gray-900 mt-2">{runCount ?? "—"}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Bu — nechta agent-chaqiriq bajarilgani (haqiqiy son). Token darajasidagi sarfni hisoblash hali qo&apos;shilmagan.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard size={15} strokeWidth={1.75} className="text-indigo-600" /> Ulangan provayderlar — sarfni ko&apos;rish
        </p>
        {activeProviders.length === 0 ? (
          <p className="text-sm text-gray-400">Hali birorta pullik/kvota-asosli provider ulanmagan</p>
        ) : (
          <div className="space-y-2">
            {activeProviders.map((p) => (
              <a key={p.key} href={p.url} target="_blank" rel="noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all">
                <span className="text-sm text-gray-700">{p.name}</span>
                <ExternalLink size={13} strokeWidth={1.75} className="text-gray-400" />
              </a>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4">
          Aniq token/dollar sarfi uchun har bir provider&apos;ning o&apos;z dashboard&apos;iga o&apos;ting — Pari AI bu ma&apos;lumotni
          hozircha yig&apos;may saqlamaydi.
        </p>
      </div>
    </div>
  );
}
