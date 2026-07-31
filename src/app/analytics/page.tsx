"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Code2, Microscope, Briefcase, PenLine, Megaphone, BarChart3,
  Settings2, Target, MessageSquare, Bot, CheckSquare, CheckCircle2, type LucideIcon,
} from "lucide-react";

const AGENT_META: Record<string, { icon: LucideIcon; color: string }> = {
  coder: { icon: Code2, color: "bg-green-500" },
  researcher: { icon: Microscope, color: "bg-purple-500" },
  ceo: { icon: Briefcase, color: "bg-blue-500" },
  writer: { icon: PenLine, color: "bg-pink-500" },
  marketing: { icon: Megaphone, color: "bg-yellow-500" },
  analyst: { icon: BarChart3, color: "bg-orange-500" },
  devops: { icon: Settings2, color: "bg-slate-500" },
  assistant: { icon: Target, color: "bg-cyan-500" },
};

type Run = { agent_id: string; agent_name: string; created_at: string };
type Task = { id: number; status: "todo" | "progress" | "done"; created_at: string };

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<7 | 14 | 30>(14);
  const [runs, setRuns] = useState<Run[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [runsRes, tasksRes] = await Promise.all([
        fetch("/api/agent?history=1").then((r) => r.json()).catch(() => ({ runs: [], configured: false })),
        fetch("/api/tasks").then((r) => r.json()).catch(() => ({ tasks: [] })),
      ]);
      setRuns(runsRes.runs || []);
      setTasks(tasksRes.tasks || []);
      setConfigured(Boolean(runsRes.configured));
    } catch { /* keep previous state */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const cutoff = Date.now() - period * 24 * 60 * 60 * 1000;
  const runsInPeriod = runs.filter((r) => new Date(r.created_at).getTime() >= cutoff);

  const days = lastNDays(period);
  const dailyCounts = days.map((day) =>
    runsInPeriod.filter((r) => r.created_at.slice(0, 10) === day).length
  );
  const maxDaily = Math.max(1, ...dailyCounts);

  const usageByAgent = new Map<string, { name: string; count: number }>();
  for (const r of runsInPeriod) {
    const cur = usageByAgent.get(r.agent_id) || { name: r.agent_name, count: 0 };
    cur.count += 1;
    usageByAgent.set(r.agent_id, cur);
  }
  const agentUsage = Array.from(usageByAgent.entries())
    .map(([id, v]) => ({ id, ...v, ...(AGENT_META[id] || { icon: Bot, color: "bg-gray-400" }) }))
    .sort((a, b) => b.count - a.count);
  const maxUsage = Math.max(1, ...agentUsage.map((a) => a.count));

  const done = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "progress").length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  const successRate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const kpis = [
    { label: "Jami agent chaqiriqlari", value: String(runsInPeriod.length), icon: MessageSquare },
    { label: "Faol agentlar", value: String(agentUsage.length), icon: Bot },
    { label: "Jami vazifalar", value: String(tasks.length), icon: CheckSquare },
    { label: "Bajarish darajasi", value: `${successRate}%`, icon: CheckCircle2 },
  ];

  return (
    <div className="fade-in max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {configured ? "Haqiqiy foydalanish statistikasi (Supabase-backed)" : "Supabase sozlanmagan — statistika bo'sh ko'rinadi"}
          </p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          {([7, 14, 30] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${period === p ? "bg-white shadow text-gray-900 font-medium" : "text-gray-500"}`}>
              {p} kun
            </button>
          ))}
        </div>
      </div>

      {!configured && !loading && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
          Supabase ulanmagan — agent ishlatilish tarixi saqlanmayapti. Connectors sahifasidan sozlang.
        </div>
      )}

      {/* KPI cards — all computed from real Supabase-backed data, no estimates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <k.icon size={20} strokeWidth={1.5} className="text-indigo-600 mb-3" />
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Daily chart — real agent-run counts per day */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-900 mb-5">Kunlik agent chaqiriqlari</p>
          {runsInPeriod.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Hali ma&apos;lumot yo&apos;q</p>
          ) : (
            <>
              <div className="flex items-end gap-1.5 h-32">
                {dailyCounts.map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-purple-500 transition-all hover:from-indigo-600"
                      style={{ height: `${(v / maxDaily) * 100}%`, minHeight: v > 0 ? 4 : 0 }}
                      title={`${v} chaqiriq`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>{period} kun oldin</span><span>Bugun</span>
              </div>
            </>
          )}
        </div>

        {/* Task status breakdown — real, from /api/tasks */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Vazifalar holati</p>
          <div className="space-y-3">
            {[
              { label: "Bajarilgan", n: done, color: "bg-green-500" },
              { label: "Jarayonda", n: inProgress, color: "bg-blue-500" },
              { label: "Kutilmoqda", n: todo, color: "bg-gray-400" },
            ].map((t) => (
              <div key={t.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{t.label}</span>
                  <span className="font-medium text-gray-900">{t.n}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${t.color} rounded-full`} style={{ width: tasks.length ? `${(t.n / tasks.length) * 100}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent usage — real counts from pari_agent_runs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-900 mb-5">Agent foydalanish statistikasi</p>
        {agentUsage.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Tanlangan davrda agent chaqirilmagan</p>
        ) : (
          <div className="space-y-3">
            {agentUsage.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <a.icon size={14} strokeWidth={1.75} className="w-6 text-center text-gray-600" />
                <span className="text-xs text-gray-700 w-36 flex-shrink-0 truncate">{a.name}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${a.color} rounded-full transition-all`} style={{ width: `${(a.count / maxUsage) * 100}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-900 w-8 text-right">{a.count}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4 text-right">Jami: {runsInPeriod.length} chaqiriq</p>
      </div>
    </div>
  );
}
