"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Plus, Trash2, RefreshCw, Package, Users, DollarSign,
  CheckCircle2, Clock, XCircle, Circle, Edit2, X, TrendingUp, Flame,
  Filter, Handshake,
} from "lucide-react";

type ServiceCategory = "smm" | "content" | "dev" | "design" | "consulting" | "automation" | "general";
type BillingCycle = "one_time" | "monthly" | "weekly";
type OrderStatus = "new" | "in_progress" | "delivered" | "paid" | "cancelled";

type Service = {
  id: number; category: ServiceCategory; name: string; description: string;
  price: number; price_display?: string; price_negotiable?: boolean;
  currency: string; billing_cycle: BillingCycle; delivery_days: number;
  features: string[]; active: boolean; is_trending?: boolean; demand_score?: number;
  sort_order?: number; created_at: string;
};

type Order = {
  id: number; service_id: number | null; client_name: string; client_contact?: string;
  status: OrderStatus; price?: number; notes?: string; created_at: string; updated_at: string;
};

type Stats = { total: number; new: number; in_progress: number; delivered: number; paid: number; revenue: number };

const CATEGORIES: { key: ServiceCategory | "all"; label: string }[] = [
  { key: "all", label: "Barchasi" },
  { key: "automation", label: "AI & Avtomat" },
  { key: "dev", label: "Dasturlash" },
  { key: "smm", label: "SMM & Marketing" },
  { key: "content", label: "Kontent" },
  { key: "consulting", label: "Konsultatsiya" },
  { key: "design", label: "Dizayn & Media" },
];

const CAT_COLORS: Record<string, string> = {
  smm: "bg-pink-50 text-pink-700",
  content: "bg-amber-50 text-amber-700",
  automation: "bg-violet-50 text-violet-700",
  dev: "bg-blue-50 text-blue-700",
  consulting: "bg-teal-50 text-teal-700",
  design: "bg-rose-50 text-rose-700",
  general: "bg-gray-50 text-gray-700",
};

const CYCLE_LABEL: Record<BillingCycle, string> = { one_time: "bir martalik", monthly: "oylik", weekly: "haftalik" };

const STATUS_META: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  new: { label: "Yangi", color: "bg-blue-50 text-blue-700", icon: <Circle size={12} /> },
  in_progress: { label: "Jarayonda", color: "bg-amber-50 text-amber-700", icon: <Clock size={12} /> },
  delivered: { label: "Yetkazildi", color: "bg-purple-50 text-purple-700", icon: <CheckCircle2 size={12} /> },
  paid: { label: "To'landi", color: "bg-emerald-50 text-emerald-700", icon: <DollarSign size={12} /> },
  cancelled: { label: "Bekor qilindi", color: "bg-gray-100 text-gray-500", icon: <XCircle size={12} /> },
};

function fmtPrice(price: number, currency: string) {
  return `${price.toLocaleString()} ${currency}`;
}

function ServiceCard({
  s, onEdit, onRemove, onToggle, orderingFor, setOrderingFor,
  clientName, setClientName, clientContact, setClientContact, onOrder,
}: {
  s: Service;
  onEdit: (s: Service) => void;
  onRemove: (id: number) => void;
  onToggle: (s: Service) => void;
  orderingFor: number | null;
  setOrderingFor: (id: number | null) => void;
  clientName: string;
  setClientName: (v: string) => void;
  clientContact: string;
  setClientContact: (v: string) => void;
  onOrder: (id: number) => void;
}) {
  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm flex flex-col ${s.active ? "border-gray-100" : "border-gray-100 opacity-50"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium uppercase tracking-wide ${CAT_COLORS[s.category] || "bg-gray-50 text-gray-700"}`}>
            {CATEGORIES.find((c) => c.key === s.category)?.label || s.category}
          </span>
          {s.is_trending && (
            <span className="flex items-center gap-0.5 px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] rounded-full font-semibold">
              <Flame size={9} strokeWidth={2.5} /> Trend
            </span>
          )}
        </div>
        <div className="flex gap-0.5 flex-shrink-0">
          <button onClick={() => onEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <Edit2 size={13} strokeWidth={1.75} />
          </button>
          <button onClick={() => onRemove(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={13} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 mt-2 leading-snug">{s.name}</h3>
      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{s.description}</p>

      {s.features.length > 0 && (
        <ul className="mt-3 space-y-1 flex-1">
          {s.features.slice(0, 5).map((f, i) => (
            <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
              <CheckCircle2 size={10} strokeWidth={2.5} className="text-emerald-500 flex-shrink-0" /> {f}
            </li>
          ))}
          {s.features.length > 5 && (
            <li className="text-xs text-gray-400">+{s.features.length - 5} ta xususiyat</li>
          )}
        </ul>
      )}

      {s.demand_score && s.demand_score > 0 ? (
        <div className="mt-3 flex items-center gap-1.5">
          <TrendingUp size={11} strokeWidth={2} className="text-orange-500" />
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full" style={{ width: `${s.demand_score}%` }} />
          </div>
          <span className="text-[10px] text-gray-400">{s.demand_score}%</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
        <div>
          <p className="text-base font-bold text-gray-900">
            {s.price_display || fmtPrice(s.price, s.currency)}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[10px] text-gray-400">{CYCLE_LABEL[s.billing_cycle]} · {s.delivery_days} kunda</p>
            {s.price_negotiable && (
              <span className="flex items-center gap-0.5 text-[10px] text-teal-600 font-medium">
                <Handshake size={9} strokeWidth={2.5} /> kelishiladi
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(s)}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${s.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
          >
            {s.active ? "Faol" : "Yashirilgan"}
          </button>
          <button
            onClick={() => setOrderingFor(orderingFor === s.id ? null : s.id)}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors"
          >
            Buyurtma
          </button>
        </div>
      </div>

      {orderingFor === s.id && (
        <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
          <input
            value={clientName} onChange={(e) => setClientName(e.target.value)}
            placeholder="Mijoz ismi"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-gray-400"
          />
          <input
            value={clientContact} onChange={(e) => setClientContact(e.target.value)}
            placeholder="Telefon / Telegram (ixtiyoriy)"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-gray-400"
          />
          <button
            onClick={() => onOrder(s.id)}
            disabled={!clientName.trim()}
            className="w-full px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            Buyurtmani yaratish
          </button>
        </div>
      )}
    </div>
  );
}

export default function ServicesPage() {
  const [tab, setTab] = useState<"catalog" | "orders">("catalog");
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [catFilter, setCatFilter] = useState<ServiceCategory | "all">("all");
  const [showTrendingOnly, setShowTrendingOnly] = useState(false);

  const [fCategory, setFCategory] = useState<ServiceCategory>("smm");
  const [fName, setFName] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fPrice, setFPrice] = useState("");
  const [fCycle, setFCycle] = useState<BillingCycle>("one_time");
  const [fDays, setFDays] = useState("3");
  const [fFeatures, setFFeatures] = useState("");
  const [saving, setSaving] = useState(false);

  const [orderingFor, setOrderingFor] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [svcRes, ordRes, statRes] = await Promise.all([
        fetch("/api/services"),
        fetch("/api/services/orders"),
        fetch("/api/services/stats"),
      ]);
      setServices((await svcRes.json()).services || []);
      setOrders((await ordRes.json()).orders || []);
      setStats((await statRes.json()).stats || null);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setFCategory("smm"); setFName(""); setFDesc(""); setFPrice(""); setFCycle("one_time"); setFDays("3"); setFFeatures("");
    setEditingId(null); setShowForm(false);
  }

  function startEdit(s: Service) {
    setEditingId(s.id);
    setFCategory(s.category); setFName(s.name); setFDesc(s.description);
    setFPrice(String(s.price)); setFCycle(s.billing_cycle); setFDays(String(s.delivery_days));
    setFFeatures(s.features.join("\n"));
    setShowForm(true);
  }

  async function saveService() {
    if (!fName || !fDesc || !fPrice) return;
    setSaving(true);
    const payload = {
      category: fCategory, name: fName, description: fDesc, price: Number(fPrice),
      billing_cycle: fCycle, delivery_days: Number(fDays) || 3,
      features: fFeatures.split("\n").map((f) => f.trim()).filter(Boolean),
    };
    await fetch("/api/services", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    setSaving(false); resetForm(); load();
  }

  async function toggleActive(s: Service) {
    await fetch("/api/services", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, active: !s.active }),
    });
    load();
  }

  async function removeService(id: number) {
    await fetch(`/api/services?id=${id}`, { method: "DELETE" });
    load();
  }

  async function submitOrder(serviceId: number) {
    if (!clientName.trim()) return;
    await fetch("/api/services/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: serviceId, client_name: clientName, client_contact: clientContact }),
    });
    setClientName(""); setClientContact(""); setOrderingFor(null);
    setTab("orders"); load();
  }

  async function setOrderStatus(id: number, status: OrderStatus) {
    await fetch("/api/services/orders", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function removeOrder(id: number) {
    await fetch(`/api/services/orders?id=${id}`, { method: "DELETE" });
    load();
  }

  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));

  const trendingServices = services.filter((s) => s.is_trending && s.active)
    .sort((a, b) => (b.demand_score || 0) - (a.demand_score || 0));

  const filteredServices = services
    .filter((s) => {
      if (catFilter !== "all" && s.category !== catFilter) return false;
      if (showTrendingOnly && !s.is_trending) return false;
      return true;
    })
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

  const cardProps = { orderingFor, setOrderingFor, clientName, setClientName, clientContact, setClientContact };

  return (
    <div className="fade-in max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Xizmatlar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sotiladigan xizmatlar katalogi va buyurtmalar boshqaruvi</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw size={15} strokeWidth={1.75} className={`text-gray-500 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Jami buyurtma", value: stats.total, color: "text-gray-900" },
            { label: "Jarayonda", value: stats.in_progress, color: "text-amber-600" },
            { label: "To'langan", value: stats.paid, color: "text-emerald-600" },
            { label: "Jami daromad", value: `${stats.revenue.toLocaleString()} UZS`, color: "text-indigo-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["catalog", "orders"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "catalog" ? `Katalog (${services.length})` : `Buyurtmalar (${orders.length})`}
          </button>
        ))}
      </div>

      {/* ──── CATALOG TAB ──── */}
      {tab === "catalog" && (
        <div className="space-y-6">

          {/* Trending section */}
          {trendingServices.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Flame size={15} strokeWidth={2} className="text-orange-500" />
                <h2 className="text-sm font-semibold text-gray-800">Hozir eng talabgir xizmatlar</h2>
                <span className="text-xs text-gray-400">— {trendingServices.length} ta</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {trendingServices.slice(0, 3).map((s) => (
                  <ServiceCard key={s.id} s={s} onEdit={startEdit} onRemove={removeService}
                    onToggle={toggleActive} onOrder={submitOrder} {...cardProps} />
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={13} strokeWidth={1.75} className="text-gray-400" />
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button key={c.key} onClick={() => setCatFilter(c.key as ServiceCategory | "all")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${catFilter === c.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTrendingOnly(!showTrendingOnly)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${showTrendingOnly ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-600 hover:bg-orange-100"}`}>
              <Flame size={10} strokeWidth={2.5} /> Trend
            </button>
          </div>

          {/* Add button */}
          <button
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            {showForm ? <X size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
            {showForm ? "Bekor qilish" : "Yangi xizmat qo'shish"}
          </button>

          {/* New/Edit form */}
          {showForm && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={fCategory} onChange={(e) => setFCategory(e.target.value as ServiceCategory)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400">
                  {CATEGORIES.filter((c) => c.key !== "all").map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Xizmat nomi"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
              </div>
              <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="Tavsif" rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none" />
              <div className="grid gap-3 sm:grid-cols-3">
                <input value={fPrice} onChange={(e) => setFPrice(e.target.value)} type="number" placeholder="Narx (UZS)"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
                <select value={fCycle} onChange={(e) => setFCycle(e.target.value as BillingCycle)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400">
                  <option value="one_time">Bir martalik</option>
                  <option value="monthly">Oylik</option>
                  <option value="weekly">Haftalik</option>
                </select>
                <input value={fDays} onChange={(e) => setFDays(e.target.value)} type="number" placeholder="Yetkazish (kun)"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
              </div>
              <textarea value={fFeatures} onChange={(e) => setFFeatures(e.target.value)}
                placeholder={"Xususiyatlar (har birini yangi qatorga)"} rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none" />
              <button onClick={saveService} disabled={saving || !fName || !fDesc || !fPrice}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors">
                {saving ? "Saqlanmoqda..." : editingId ? "Yangilash" : "Saqlash"}
              </button>
            </div>
          )}

          {/* All services grid */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              {catFilter === "all" ? "Barcha xizmatlar" : CATEGORIES.find((c) => c.key === catFilter)?.label}
              {" "}
              <span className="text-gray-400 font-normal">({filteredServices.length})</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredServices.length === 0 && !loading && (
                <p className="text-sm text-gray-400 col-span-full text-center py-8">Hali xizmat qo'shilmagan.</p>
              )}
              {filteredServices.map((s) => (
                <ServiceCard key={s.id} s={s} onEdit={startEdit} onRemove={removeService}
                  onToggle={toggleActive} onOrder={submitOrder} {...cardProps} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──── ORDERS TAB ──── */}
      {tab === "orders" && (
        <div className="space-y-3">
          {orders.length === 0 && !loading && (
            <p className="text-sm text-gray-400 text-center py-8">Hali buyurtma yo'q.</p>
          )}
          {orders.map((o) => (
            <div key={o.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_META[o.status].color}`}>
                      {STATUS_META[o.status].icon} {STATUS_META[o.status].label}
                    </span>
                    {o.service_id && serviceMap[o.service_id] && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Package size={11} strokeWidth={1.75} /> {serviceMap[o.service_id].name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    <Users size={13} strokeWidth={1.75} className="text-gray-400" /> {o.client_name}
                  </p>
                  {o.client_contact && <p className="text-xs text-gray-400 mt-0.5">{o.client_contact}</p>}
                  {o.price !== undefined && o.price !== null && (
                    <p className="text-sm font-semibold text-indigo-600 mt-1">{o.price.toLocaleString()} UZS</p>
                  )}
                  <p className="text-[10px] text-gray-300 mt-1.5">{new Date(o.created_at).toLocaleString("uz-UZ")}</p>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <select value={o.status} onChange={(e) => setOrderStatus(o.id, e.target.value as OrderStatus)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-gray-400">
                    {Object.entries(STATUS_META).map(([key, meta]) => (
                      <option key={key} value={key}>{meta.label}</option>
                    ))}
                  </select>
                  <button onClick={() => removeOrder(o.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors self-end">
                    <Trash2 size={13} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
