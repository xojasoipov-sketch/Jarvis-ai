"use client";
import { Store, Bot, Zap, FileText, Cpu, Star, Users, Lock } from "lucide-react";

const CATEGORIES = [
  { icon: Bot,      label: "AI Agentlar",    count: 0 },
  { icon: Zap,      label: "Avtomatizatsiya", count: 0 },
  { icon: FileText, label: "Promptlar",       count: 0 },
  { icon: Cpu,      label: "Shablonlar",      count: 0 },
];

const UPCOMING = [
  { title: "Telegram Bot Template", desc: "Tayyor Telegram bot kod va n8n workflow", price: "$29", rating: 4.9, sales: 0 },
  { title: "SMM Prompt Pack", desc: "50+ tayyor SMM prompt va kontent strategiya", price: "$19", rating: 5.0, sales: 0 },
  { title: "CRM Automation Kit", desc: "CRM + n8n + Telegram integratsiya", price: "$49", rating: 4.8, sales: 0 },
  { title: "AI Sales Script", desc: "AI yordamida sotuv skripti va pitch deck", price: "$39", rating: 4.7, sales: 0 },
];

export default function MarketplacePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI agentlar, avtomatizatsiyalar va shablonlar bozori</p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-orange-100 text-orange-600 rounded-full font-medium">Tez kunda</span>
      </div>

      {/* Coming soon banner */}
      <div className="bg-gray-900 rounded-xl p-6 text-white flex items-start gap-4">
        <div className="p-3 bg-white/10 rounded-xl flex-shrink-0">
          <Store size={24} />
        </div>
        <div>
          <p className="font-semibold">Marketplace ishga tushmoqda</p>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed">
            Tez orada: AI agentlar, tayyor automation workflow'lar, SMM promptlar, va kontent shablonlarini sotib oling yoki o'z mahsulotlaringizni soting.
            Har bir sotuvdan komissiya modeli — passiv daromad.
          </p>
          <div className="flex gap-4 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">0%</p>
              <p className="text-xs text-gray-400 mt-0.5">komissiya (launch)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">∞</p>
              <p className="text-xs text-gray-400 mt-0.5">mahsulot joylash</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">24/7</p>
              <p className="text-xs text-gray-400 mt-0.5">avtomatik sotuv</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-3">Kategoriyalar</p>
        <div className="grid grid-cols-4 gap-3">
          {CATEGORIES.map(c => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="bg-white border border-gray-100 rounded-xl p-4 text-center opacity-60">
                <div className="p-2.5 bg-gray-100 rounded-lg w-fit mx-auto mb-2">
                  <Icon size={18} className="text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">{c.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">Tez kunda</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview products */}
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-3">Preview mahsulotlar</p>
        <div className="grid grid-cols-2 gap-3">
          {UPCOMING.map(p => (
            <div key={p.title} className="bg-white border border-gray-100 rounded-xl p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                <div className="flex items-center gap-1.5 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-full">
                  <Lock size={11} />
                  Tez kunda
                </div>
              </div>
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900">{p.title}</p>
                <p className="text-sm font-bold text-gray-900">{p.price}</p>
              </div>
              <p className="text-xs text-gray-400">{p.desc}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Star size={11} className="text-yellow-400 fill-yellow-400" /> {p.rating}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Users size={11} /> {p.sales} sotuv
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
