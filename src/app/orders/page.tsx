"use client";
import { useState, useEffect } from "react";
import { ShoppingCart, Plus, Search, Play, Clock, CheckCircle2, XCircle, AlertCircle, User, Calendar, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";

type Order = {
  id: number;
  client_name: string;
  service_name?: string;
  status: string;
  price?: number;
  currency?: string;
  created_at: string;
  notes?: string;
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  new:         { label: "Yangi",     icon: AlertCircle,  color: "text-blue-600",   bg: "bg-blue-50" },
  in_progress: { label: "Jarayonda",icon: Clock,         color: "text-orange-600", bg: "bg-orange-50" },
  review:      { label: "Tekshiruv",icon: AlertCircle,  color: "text-purple-600", bg: "bg-purple-50" },
  done:        { label: "Tayyor",   icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50" },
  cancelled:   { label: "Bekor",    icon: XCircle,      color: "text-red-600",    bg: "bg-red-50" },
};

const FILTERS = ["Barchasi", "Yangi", "Jarayonda", "Tekshiruv", "Tayyor", "Bekor"];
const FILTER_MAP: Record<string, string | null> = {
  "Barchasi": null, "Yangi": "new", "Jarayonda": "in_progress",
  "Tekshiruv": "review", "Tayyor": "done", "Bekor": "cancelled",
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Barchasi");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/services/orders")
      .then(r => r.json())
      .then(d => { setOrders(d.orders || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o => {
    const statusMatch = !FILTER_MAP[filter] || o.status === FILTER_MAP[filter];
    const q = search.toLowerCase();
    const searchMatch = !q || o.client_name?.toLowerCase().includes(q) || o.service_name?.toLowerCase().includes(q);
    return statusMatch && searchMatch;
  });

  const done = orders.filter(o => o.status === "done");
  const stats = {
    total: orders.length,
    active: orders.filter(o => o.status === "in_progress").length,
    done: done.length,
    revenue: done.reduce((s, o) => s + (o.price || 0), 0),
  };

  function startWork(o: Order) {
    const label = o.service_name || "Xizmat";
    router.push(`/chat?q=${encodeURIComponent(`${label} — mijoz: ${o.client_name}. Buyurtma #${o.id}. Ishni davom ettiraylik.`)}`);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Buyurtmalar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Barcha loyiha va xizmat buyurtmalari</p>
        </div>
        <button onClick={() => router.push("/services")} className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
          <Plus size={14} /> Yangi buyurtma
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Jami", value: stats.total, sub: "buyurtma" },
          { label: "Faol", value: stats.active, sub: "jarayonda" },
          { label: "Bajarildi", value: stats.done, sub: "tugatildi" },
          { label: "Daromad", value: stats.revenue ? `${(stats.revenue/1000000).toFixed(1)} mln` : "—", sub: "UZS" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Mijoz yoki xizmat..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${filter === f ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShoppingCart size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Buyurtma topilmadi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(o => {
            const sc = STATUS_CONFIG[o.status] || STATUS_CONFIG["new"];
            const SIcon = sc.icon;
            return (
              <div key={o.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4 hover:border-gray-200 transition-colors">
                <div className={`p-2 rounded-lg ${sc.bg} flex-shrink-0`}>
                  <SIcon size={16} className={sc.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{o.service_name || "Xizmat"}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-400"><User size={11} />{o.client_name || "Noma'lum"}</span>
                    {o.price ? <span className="flex items-center gap-1 text-xs text-gray-400"><DollarSign size={11} />{o.price.toLocaleString()} {o.currency || "UZS"}</span> : null}
                    <span className="flex items-center gap-1 text-xs text-gray-400"><Calendar size={11} />{new Date(o.created_at).toLocaleDateString("uz-UZ")}</span>
                  </div>
                </div>
                {o.status !== "done" && o.status !== "cancelled" && (
                  <button onClick={() => startWork(o)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0">
                    <Play size={11} /> Ishlash
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
