"use client";
import { CreditCard, TrendingUp, Zap, Calendar } from "lucide-react";

export default function BillingPage() {
  const used = 12450;
  const total = 20000;
  const pct = Math.round((used / total) * 100);

  return (
    <div className="fade-in max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usage & Billing</h1>
        <p className="text-sm text-gray-500 mt-0.5">Token sarfi va hisob holati</p>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Joriy Reja</p>
            <p className="text-2xl font-bold mt-1">Pro Plan</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Zap size={22} strokeWidth={1.75} className="text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-indigo-200">Tokenlar sarfi</span>
            <span className="font-semibold">{used.toLocaleString()} / {total.toLocaleString()}</span>
          </div>
          <div className="h-2 rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-indigo-200">{pct}% ishlatildi · {(total - used).toLocaleString()} token qoldi</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Bu oy so'rovlar", value: "1,247", icon: TrendingUp, delta: "+23%" },
          { label: "Agentlar ishlatildi", value: "89", icon: Zap, delta: "Oy davomida" },
          { label: "Keyingi yangilanish", value: "Aug 1", icon: Calendar, delta: "2026" },
        ].map(({ label, value, icon: Icon, delta }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <Icon size={16} strokeWidth={1.75} className="text-indigo-600" />
              <span className="text-xs text-gray-400">{delta}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-900 mb-4">Sarflanish taqsimoti</p>
        <div className="space-y-3">
          {[
            { name: "Chat API", tokens: 7200, color: "bg-indigo-500" },
            { name: "AI Agents", tokens: 3100, color: "bg-purple-500" },
            { name: "Knowledge Hub AI", tokens: 1500, color: "bg-blue-500" },
            { name: "Telegram Bot", tokens: 650, color: "bg-cyan-500" },
          ].map(({ name, tokens, color }) => (
            <div key={name} className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>{name}</span>
                <span className="font-medium">{tokens.toLocaleString()} token</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${(tokens / used) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard size={15} strokeWidth={1.75} className="text-indigo-600" /> To'lov usuli
        </p>
        <div className="p-4 border border-dashed border-gray-200 rounded-xl text-center text-gray-400">
          <CreditCard size={24} strokeWidth={1.25} className="mx-auto mb-2" />
          <p className="text-sm">Personal loyiha — to'lov yo'q</p>
          <p className="text-xs mt-1">Bepul provayderlar ishlatilmoqda</p>
        </div>
      </div>
    </div>
  );
}
