"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Send, Sparkles, Brain, ArrowRight, TrendingUp,
  ShoppingCart, Users, DollarSign, CheckCircle2,
  Clock, Zap, Bot, Bell, Plus, Play,
  MessageSquare, BarChart3, Briefcase, Clapperboard,
  type LucideIcon,
} from "lucide-react";

type Task = { id: number; title: string; status: "todo" | "progress" | "done"; agent?: string; created_at: string };
type Order = { id: number; service_id: number | null; client_name: string; status: string; created_at: string };
type Stats = { total: number; new: number; in_progress: number; paid: number; revenue: number };

const QUICK_ACTIONS: { label: string; icon: LucideIcon; href: string; color: string }[] = [
  { label: "Yangi chat",      icon: MessageSquare,  href: "/chat",       color: "bg-gray-900 text-white" },
  { label: "Buyurtma qo'sh",  icon: ShoppingCart,   href: "/orders",     color: "bg-blue-50 text-blue-700" },
  { label: "Mijoz qo'sh",     icon: Users,          href: "/clients",    color: "bg-teal-50 text-teal-700" },
  { label: "Agent ishga sol", icon: Bot,            href: "/agents",     color: "bg-violet-50 text-violet-700" },
  { label: "Kontent yarat",   icon: Sparkles,       href: "/smm",        color: "bg-orange-50 text-orange-700" },
  { label: "Analytics",       icon: BarChart3,      href: "/analytics",  color: "bg-emerald-50 text-emerald-700" },
];

const MODULES: { label: string; icon: LucideIcon; href: string; desc: string }[] = [
  { label: "Business",       icon: Briefcase,    href: "/services",    desc: "Xizmatlar, buyurtmalar, mijozlar" },
  { label: "AI Employees",   icon: Bot,          href: "/agents",      desc: "18 ta aktiv agent" },
  { label: "Content",        icon: Zap,          href: "/smm",         desc: "SMM, kontent fabrikasi" },
  { label: "Media Studio",   icon: Clapperboard, href: "/media",       desc: "Video, avatar, ovoz, rasm" },
  { label: "Analytics",      icon: BarChart3,    href: "/analytics",   desc: "Real-time tahlil" },
  { label: "Knowledge",      icon: Brain,        href: "/knowledge",   desc: "Second brain, bilim bazasi" },
];

const STATUS_COLOR: Record<string, string> = {
  new:         "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  delivered:   "bg-purple-50 text-purple-700",
  paid:        "bg-emerald-50 text-emerald-700",
  cancelled:   "bg-gray-100 text-gray-400",
};
const STATUS_LABEL: Record<string, string> = {
  new: "Yangi", in_progress: "Jarayonda", delivered: "Yetkazildi", paid: "To'landi", cancelled: "Bekor",
};

export default function Dashboard() {
  const [task, setTask] = useState("");
  const [smartMode, setSmartMode] = useState(true);
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tgOk, setTgOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, ordersRes, statsRes, tgRes] = await Promise.all([
        fetch("/api/tasks").then(r => r.json()).catch(() => ({ tasks: [] })),
        fetch("/api/services/orders").then(r => r.json()).catch(() => ({ orders: [] })),
        fetch("/api/services/stats").then(r => r.json()).catch(() => ({ stats: null })),
        fetch("/api/telegram/debug").then(r => r.json()).then(d => Boolean(d.ok)).catch(() => false),
      ]);
      setTasks(tasksRes.tasks || []);
      setOrders((ordersRes.orders || []).slice(0, 5));
      setStats(statsRes.stats || null);
      setTgOk(Boolean(tgRes));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const go = () => {
    if (!task.trim()) return;
    if (smartMode) router.push(`/agents?hermes=1&task=${encodeURIComponent(task)}`);
    else router.push(`/chat?q=${encodeURIComponent(task)}`);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Xayrli tong" : hour < 17 ? "Xayrli kun" : "Xayrli kech";

  const todayTasks = tasks.filter(t => t.status !== "done").slice(0, 5);
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const newOrders = orders.filter(o => o.status === "new").length;

  return (
    <div className="fade-in max-w-6xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, Sadi</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long" })}
            {newOrders > 0 && <span className="ml-2 text-orange-600 font-medium">· {newOrders} ta yangi buyurtma</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tgOk && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Telegram faol
            </span>
          )}
          <button onClick={load} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500">
            <TrendingUp size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Jami buyurtma",  value: stats?.total ?? "—",   sub: `${stats?.new ?? 0} yangi`,          icon: ShoppingCart, color: "text-blue-600" },
          { label: "Jarayondagi",    value: stats?.in_progress ?? "—", sub: "aktiv ish",                      icon: Clock,        color: "text-amber-600" },
          { label: "To'langan",      value: stats?.paid ?? "—",    sub: "muvaffaqiyatli",                     icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Daromad",        value: stats ? `${(stats.revenue / 1000000).toFixed(1)}M` : "—",
            sub: "UZS",  icon: DollarSign, color: "text-indigo-600" },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400">{c.label}</p>
                <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{c.sub}</p>
              </div>
              <c.icon size={18} strokeWidth={1.5} className={`${c.color} opacity-40 mt-0.5`} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* AI Input — spans 2 cols */}
        <div className="lg:col-span-2 space-y-4">

          {/* Command box */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">Nima qilish kerak?</p>
              <button
                onClick={() => setSmartMode(v => !v)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${
                  smartMode ? "text-gray-900 bg-gray-100" : "text-gray-400 bg-gray-50"
                }`}
              >
                <Sparkles size={12} strokeWidth={2} /> Smart {smartMode ? "ON" : "OFF"}
              </button>
            </div>
            <div className="relative">
              <textarea
                value={task}
                onChange={e => setTask(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), go())}
                placeholder="Telegram bot yoz, CRM qur, SEO maqola yoz, mijoz uchun taklif tuzib ber..."
                rows={2}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-gray-400 transition-all pr-12"
              />
              <button onClick={go} disabled={!task.trim()}
                className="absolute right-2.5 bottom-2.5 w-8 h-8 bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white rounded-lg flex items-center justify-center transition-all">
                <Send size={13} strokeWidth={2} />
              </button>
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {["Telegram bot yoz","SMM kontent","CRM tizimi","AI agent yarat","SEO maqola","Video skript"].map(q => (
                <button key={q} onClick={() => setTask(q)}
                  className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">So'nggi buyurtmalar</h2>
              <Link href="/orders" className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
                Barchasi <ArrowRight size={11} strokeWidth={2} />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />)}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400">Hali buyurtma yo'q</p>
                <Link href="/orders" className="text-xs text-gray-500 hover:text-gray-800 mt-1 inline-flex items-center gap-1">
                  <Plus size={11} strokeWidth={2} /> Buyurtma qo'shish
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                {orders.map(o => (
                  <div key={o.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{o.client_name}</p>
                      <p className="text-[10px] text-gray-400">{new Date(o.created_at).toLocaleDateString("uz-UZ")}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status] || "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                    <Link href={`/chat?q=${encodeURIComponent("Buyurtma #" + o.id + " — " + o.client_name + " uchun ish boshlaylik.")}`}
                      className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors">
                      <Play size={11} strokeWidth={2} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modules grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MODULES.map((m) => (
              <Link key={m.href} href={m.href}
                className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm hover:border-gray-300 hover:shadow-md transition-all group">
                <m.icon size={18} strokeWidth={1.75} className="text-gray-500 group-hover:text-gray-900 transition-colors mb-2" />
                <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-tight">{m.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Quick actions */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Tezkor harakatlar</h2>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((a) => (
                <Link key={a.href} href={a.href}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium text-center transition-all hover:opacity-80 ${a.color}`}>
                  <a.icon size={16} strokeWidth={1.75} />
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Today's tasks */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">Bugungi vazifalar</h2>
              <Link href="/tasks" className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
                <Plus size={11} strokeWidth={2} /> Qo'sh
              </Link>
            </div>
            {todayTasks.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Barcha vazifalar bajarildi</p>
            ) : (
              <div className="space-y-1.5">
                {todayTasks.map(t => (
                  <div key={t.id} className="flex items-start gap-2 px-1 py-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      t.status === "progress" ? "bg-amber-400" : "bg-gray-300"
                    }`} />
                    <p className="text-xs text-gray-700 leading-snug line-clamp-2">{t.title}</p>
                  </div>
                ))}
              </div>
            )}
            {tasks.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-50">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Bajarildi: {doneTasks}/{tasks.length}</span>
                  <span className="font-medium text-gray-600">
                    {tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0}%
                  </span>
                </div>
                <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-900 rounded-full transition-all"
                    style={{ width: `${tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* AI Recommendations */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={13} strokeWidth={1.75} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-800">AI tavsiyalari</h2>
            </div>
            <div className="space-y-2">
              {[
                { text: "Telegram botingizni yangilang — yangi funksiyalar qo'shing", href: "/chat?q=Telegram+bot+yangilash" },
                { text: "SMM strategiyangizni oy oxirigacha rejalang", href: "/smm" },
                { text: "Yangi mijozlar uchun avtomatik follow-up sozlang", href: "/automation" },
              ].map((r, i) => (
                <Link key={i} href={r.href}
                  className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                  <span className="text-[10px] font-bold text-gray-400 mt-0.5 flex-shrink-0">{i + 1}</span>
                  <p className="text-xs text-gray-600 group-hover:text-gray-900 leading-snug">{r.text}</p>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
