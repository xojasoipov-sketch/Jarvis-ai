"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, Trash2, Clock, ChevronRight, Search } from "lucide-react";

type ConvSummary = { id: string; title: string; updatedAt: number; count: number };

export default function HistoryPage() {
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/conversations")
      .then(r => r.json())
      .then(data => { setConversations(data.conversations || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function deleteConv(id: string) {
    await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
    setConversations(prev => prev.filter(c => c.id !== id));
  }

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  function relativeTime(ts: number): string {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Hozir";
    if (m < 60) return `${m} daqiqa oldin`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} soat oldin`;
    return `${Math.floor(h / 24)} kun oldin`;
  }

  return (
    <div className="fade-in max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chat History</h1>
        <p className="text-sm text-gray-500 mt-0.5">Barcha saqlangan suhbatlar</p>
      </div>

      <div className="relative">
        <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Suhbatlarni qidiring..."
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Yuklanmoqda...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare size={40} strokeWidth={1.25} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">
            {search ? "Hech narsa topilmadi" : "Hali suhbat yo'q"}
          </p>
          {!search && (
            <Link href="/chat" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">
              Yangi suhbat boshlash
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="group flex items-center gap-3 bg-white border border-gray-100 hover:border-indigo-200 rounded-xl px-4 py-3.5 transition-all shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <MessageSquare size={16} strokeWidth={1.75} className="text-indigo-600" />
              </div>
              <Link href={`/chat?id=${c.id}`} className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Clock size={11} strokeWidth={1.75} className="text-gray-400" />
                  <span className="text-xs text-gray-400">{relativeTime(c.updatedAt)}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{c.count} xabar</span>
                </div>
              </Link>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => deleteConv(c.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
                <Link href={`/chat?id=${c.id}`} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                  <ChevronRight size={14} strokeWidth={1.75} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
