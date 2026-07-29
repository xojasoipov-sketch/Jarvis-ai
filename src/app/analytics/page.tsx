"use client";
import { useState } from "react";

const DAILY = [12, 19, 8, 24, 31, 18, 42, 35, 27, 39, 45, 28, 52, 38];
const AGENTS_USAGE = [
  { id: "coder", name: "Coding Agent", icon: "💻", count: 142, color: "bg-green-500" },
  { id: "researcher", name: "Research Agent", icon: "🔬", count: 98, color: "bg-purple-500" },
  { id: "ceo", name: "CEO Agent", icon: "👔", count: 76, color: "bg-blue-500" },
  { id: "writer", name: "Content Writer", icon: "✍️", count: 64, color: "bg-pink-500" },
  { id: "marketing", name: "Marketing Agent", icon: "📣", count: 51, color: "bg-yellow-500" },
  { id: "analyst", name: "Data Analyst", icon: "📊", count: 43, color: "bg-orange-500" },
  { id: "devops", name: "DevOps Agent", icon: "⚙️", count: 38, color: "bg-slate-500" },
  { id: "assistant", name: "Personal Assistant", icon: "🎯", count: 29, color: "bg-cyan-500" },
];

const maxUsage = Math.max(...AGENTS_USAGE.map(a => a.count));
const maxDaily = Math.max(...DAILY);

const TOPICS = [
  { label: "Kod yozish", pct: 34, color: "bg-green-500" },
  { label: "Tadqiqot", pct: 23, color: "bg-purple-500" },
  { label: "Biznes strategiya", pct: 18, color: "bg-blue-500" },
  { label: "Kontent yaratish", pct: 15, color: "bg-pink-500" },
  { label: "Boshqa", pct: 10, color: "bg-gray-400" },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"7d" | "14d" | "30d">("14d");
  const totalMessages = AGENTS_USAGE.reduce((a, x) => a + x.count, 0);

  return (
    <div className="fade-in max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Foydalanish statistikasi va trendlar</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(["7d", "14d", "30d"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${period === p ? "bg-white shadow text-gray-900 font-medium" : "text-gray-500"}`}>
              {p === "7d" ? "7 kun" : p === "14d" ? "14 kun" : "30 kun"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Jami so'rovlar", value: totalMessages, icon: "💬", change: "+23%", up: true },
          { label: "Faol agentlar", value: 8, icon: "🤖", change: "Hammasi faol", up: true },
          { label: "O'rtacha javob", value: "1.8s", icon: "⚡", change: "-0.3s", up: true },
          { label: "Muvaffaqiyat", value: "99.2%", icon: "✅", change: "+0.4%", up: true },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{k.icon}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${k.up ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>{k.change}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Daily chart */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-900 mb-5">Kunlik so'rovlar</p>
          <div className="flex items-end gap-1.5 h-32">
            {DAILY.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-indigo-400 transition-all hover:from-indigo-600"
                  style={{ height: `${(v / maxDaily) * 100}%` }}
                  title={`${v} so'rov`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>14 kun oldin</span><span>Bugun</span>
          </div>
        </div>

        {/* Topics */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Mavzular bo'yicha</p>
          <div className="space-y-3">
            {TOPICS.map(t => (
              <div key={t.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{t.label}</span>
                  <span className="font-medium text-gray-900">{t.pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${t.color} rounded-full`} style={{ width: `${t.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent usage */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-900 mb-5">Agent foydalanish statistikasi</p>
        <div className="space-y-3">
          {AGENTS_USAGE.map(a => (
            <div key={a.id} className="flex items-center gap-3">
              <span className="w-6 text-center">{a.icon}</span>
              <span className="text-xs text-gray-700 w-36 flex-shrink-0">{a.name}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${a.color} rounded-full transition-all`} style={{ width: `${(a.count / maxUsage) * 100}%` }} />
              </div>
              <span className="text-xs font-medium text-gray-900 w-8 text-right">{a.count}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4 text-right">Jami: {totalMessages} so'rov</p>
      </div>
    </div>
  );
}
