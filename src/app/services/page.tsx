"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, RefreshCw, Package, Users, DollarSign, CheckCircle2, Clock, XCircle, Circle, Edit2, X, Flame, Filter, Play } from "lucide-react";

type ServiceCategory = "smm" | "content" | "dev" | "design" | "consulting" | "automation" | "general";
type BillingCycle = "one_time" | "monthly" | "weekly";
type OrderStatus = "new" | "in_progress" | "delivered" | "paid" | "cancelled";
type Service = { id: number; category: ServiceCategory; name: string; description: string; price: number; price_display?: string; currency: string; billing_cycle: BillingCycle; delivery_days: number; features: string[]; active: boolean; is_trending?: boolean; demand_score?: number; created_at: string };
type Order = { id: number; service_id: number | null; client_name: string; client_contact?: string; status: OrderStatus; price?: number; created_at: string };
type Stats = { total: number; new: number; in_progress: number; delivered: number; paid: number; revenue: number };

const CATEGORIES: { key: ServiceCategory | "all"; label: string }[] = [
  { key: "all", label: "Barchasi" }, { key: "automation", label: "AI & Avtomat" }, { key: "dev", label: "Dasturlash" },
  { key: "smm", label: "SMM" }, { key: "content", label: "Kontent" }, { key: "consulting", label: "Konsultatsiya" }, { key: "design", label: "Dizayn" },
];

const STATUS_META: Record<OrderStatus, { label: string; color: string }> = {
  new: { label: "Yangi", color: "bg-blue-50 text-blue-700" },
  in_progress: { label: "Jarayonda", color: "bg-amber-50 text-amber-700" },
  delivered: { label: "Yetkazildi", color: "bg-purple-50 text-purple-700" },
  paid: { label: "To'landi", color: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Bekor", color: "bg-gray-100 text-gray-500" },
};

export default function ServicesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"catalog" | "orders">("catalog");
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [catFilter, setCatFilter] = useState<ServiceCategory | "all">("all");
  const [fCategory, setFCategory] = useState<ServiceCategory>("smm");
  const [fName, setFName] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fPrice, setFPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [orderingFor, setOrderingFor] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [svcRes, ordRes, statRes] = await Promise.all([fetch("/api/services"), fetch("/api/services/orders"), fetch("/api/services/stats")]);
      setServices((await svcRes.json()).services || []);
      setOrders((await ordRes.json()).orders || []);
      setStats((await statRes.json()).stats || null);
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveService() {
    if (!fName || !fDesc || !fPrice) return;
    setSaving(true);
    await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: fCategory, name: fName, description: fDesc, price: Number(fPrice), features: [] }) });
    setSaving(false); setShowForm(false); setFName(""); setFDesc(""); setFPrice(""); load();
  }

  async function submitOrder(serviceId: number) {
    if (!clientName.trim()) return;
    await fetch("/api/services/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service_id: serviceId, client_name: clientName }) });
    setClientName(""); setOrderingFor(null); setTab("orders"); load();
  }

  async function setOrderStatus(id: number, status: OrderStatus) {
    await fetch("/api/services/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  }

  const filtered = services.filter(s => catFilter === "all" || s.category === catFilter);
  const serviceMap = Object.fromEntries(services.map(s => [s.id, s]));

  return (
    <div className="fade-in max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Xizmatlar</h1><p className="text-sm text-gray-500 mt-0.5">Katalog va buyurtmalar</p></div>
        <button onClick={load} className="p-2 rounded-lg border border-gray-200"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[{"label": "Jami", "value": stats.total}, {"label": "Jarayonda", "value": stats.in_progress}, {"label": "To'langan", "value": stats.paid}, {"label": "Daromad", "value": `${stats.revenue.toLocaleString()} UZS`}].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4"><p className="text-xs text-gray-400">{s.label}</p><p className="text-xl font-bold mt-0.5">{s.value}</p></div>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["catalog", "orders"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab === t ? "bg-white shadow-sm" : "text-gray-500"}`}>
            {t === "catalog" ? `Katalog (${services.length})` : `Buyurtmalar (${orders.length})`}
          </button>
        ))}
      </div>

      {tab === "catalog" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setCatFilter(c.key)} className={`px-3 py-1 rounded-full text-xs font-medium ${catFilter === c.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>{c.label}</button>
            ))}
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">{showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Bekor" : "Yangi xizmat"}</button>
          {showForm && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={fCategory} onChange={e => setFCategory(e.target.value as ServiceCategory)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">{CATEGORIES.filter(c => c.key !== "all").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
                <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Xizmat nomi" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <textarea value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Tavsif" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input value={fPrice} onChange={e => setFPrice(e.target.value)} type="number" placeholder="Narx (UZS)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <button onClick={saveService} disabled={saving || !fName || !fDesc || !fPrice} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-40">{saving ? "Saqlanmoqda..." : "Saqlash"}</button>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(s => (
              <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">{s.name}</h3>
                <p className="text-xs text-gray-500 mt-1.5">{s.description}</p>
                <p className="text-base font-bold text-gray-900 mt-3">{s.price_display || `${s.price.toLocaleString()} ${s.currency}`}</p>
                <button onClick={() => setOrderingFor(orderingFor === s.id ? null : s.id)} className="mt-3 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs">Buyurtma</button>
                {orderingFor === s.id && (
                  <div className="mt-3 space-y-2">
                    <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Mijoz ismi" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs" />
                    <button onClick={() => submitOrder(s.id)} disabled={!clientName.trim()} className="w-full px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs disabled:opacity-40">Yaratish</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-3">
          {orders.length === 0 && !loading && <p className="text-sm text-gray-400 text-center py-8">Hali buyurtma yo'q.</p>}
          {orders.map(o => (
            <div key={o.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-start justify-between gap-3">
              <div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_META[o.status].color}`}>{STATUS_META[o.status].label}</span>
                <p className="text-sm font-medium text-gray-900 mt-1 flex items-center gap-1.5"><Users size={13} className="text-gray-400" /> {o.client_name}</p>
                {o.service_id && serviceMap[o.service_id] && <p className="text-xs text-gray-500 mt-0.5"><Package size={11} className="inline" /> {serviceMap[o.service_id].name}</p>}
                {o.price != null && <p className="text-sm font-semibold text-indigo-600 mt-1">{o.price.toLocaleString()} UZS</p>}
              </div>
              <div className="flex flex-col gap-1.5 items-end">
                <button onClick={() => router.push(`/chat?q=${encodeURIComponent(`Buyurtma #${o.id} — ${o.client_name}`)}`)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs"><Play size={10} /> Ishlash</button>
                <select value={o.status} onChange={e => setOrderStatus(o.id, e.target.value as OrderStatus)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs">
                  {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
