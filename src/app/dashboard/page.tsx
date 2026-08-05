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
  { label: "Pari miya", icon: Sparkles, href: "/pari", color: "bg-violet-700 text-white" },
  { label: "Yangi chat", icon: MessageSquare, href: "/chat", color: "bg-gray-900 text-white" },
  { label: "Buyurtma", icon: ShoppingCart, href: "/orders", color: "bg-blue-50 text-blue-700" },
  { label: "Agent", icon: Bot, href: "/agents", color: "bg-violet-50 text-violet-700" },
  { label: "Kontent", icon: Sparkles, href: "/smm", color: "bg-orange-50 text-orange-700" },
  { label: "Analytics", icon: BarChart3, href: "/analytics", color: "bg-emerald-50 text-emerald-700" },
];

export default function DashboardPage() {
  const [task, setTask] = useState("");
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    try {
      const [tasksRes, ordersRes, statsRes] = await Promise.all([
        fetch("/api/tasks").then((r) => r.json()).catch(() => ({ tasks: [] })),
        fetch("/api/services/orders").then((r) => r.json()).catch(() => ({ orders: [] })),
        fetch("/api/services/stats").then((r) => r.json()).catch(() => ({ stats: null })),
      ]);
      setTasks(tasksRes.tasks || []);
      setOrders((ordersRes.orders || []).slice(0, 5));
      setStats(statsRes.stats || null);
    } catch {}
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const go = () => {
    if (!task.trim()) return;
    router.push(`/pari`);
  };

  return (
    <div className="fade-in max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Biznes ko‘rsatkichlari · asosiy miya: <Link href="/pari" className="text-violet-600">/pari</Link></p>
        </div>
        <Link href="/pari" className="text-sm px-4 py-2 bg-violet-700 text-white rounded-xl">Kapalak miya</Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Jami buyurtma", value: stats?.total ?? "—", icon: ShoppingCart, color: "text-blue-600" },
          { label: "Jarayonda", value: stats?.in_progress ?? "—", icon: Clock, color: "text-amber-600" },
          { label: "To'langan", value: stats?.paid ?? "—", icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Daromad", value: stats ? `${(stats.revenue / 1000000).toFixed(1)}M` : "—", icon: DollarSign, color: "text-indigo-600" },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-400">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href + a.label} href={a.href} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium ${a.color}`}>
            <a.icon size={16} />
            {a.label}
          </Link>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <p className="text-sm font-semibold mb-2">Tezkor buyruq</p>
        <div className="flex gap-2">
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            placeholder="Pari ga yozing..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl"
          />
          <button onClick={go} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm">
            <Send size={14} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <h2 className="text-sm font-semibold mb-2">Vazifalar</h2>
        {tasks.slice(0, 5).map((t) => (
          <p key={t.id} className="text-xs text-gray-600 py-1">• {t.title}</p>
        ))}
        {tasks.length === 0 && <p className="text-xs text-gray-400">Bo‘sh</p>}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <h2 className="text-sm font-semibold mb-2">Buyurtmalar</h2>
        {orders.map((o) => (
          <p key={o.id} className="text-xs text-gray-600 py-1">
            {o.client_name} — {o.status}
          </p>
        ))}
        {orders.length === 0 && <p className="text-xs text-gray-400">Bo‘sh</p>}
      </div>
    </div>
  );
}
