"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare, CheckCircle2, Paperclip, Search, Code2, FileText,
  Bot, Lightbulb, Send, Sparkles, ChevronDown, Brain, ArrowRight, type LucideIcon,
} from "lucide-react";

const quickActions: { label: string; icon: LucideIcon; href: string }[] = [
  { label: "New Chat", icon: MessageSquare, href: "/chat" },
  { label: "Create Task", icon: CheckCircle2, href: "/tasks" },
  { label: "Upload File", icon: Paperclip, href: "/files" },
  { label: "Web Search", icon: Search, href: "/chat?q=web+search" },
  { label: "Write Code", icon: Code2, href: "/code" },
  { label: "Create Report", icon: FileText, href: "/agents" },
];

function MiniSparkline({ color }: { color: string }) {
  const pts = [3,7,4,9,6,11,8,13,10,15].map((y,i) => `${i*11},${20-y}`).join(" ");
  return (
    <svg width="110" height="24" viewBox="0 0 110 24">
      <polyline points={pts} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

type LiveStatus = { vault: boolean; hermes: boolean; telegram: boolean; db: boolean };
type Task = { id: number; title: string; status: "todo" | "progress" | "done"; agent?: string; created_at: string };
type Project = { id: number; name: string; status: "planning" | "progress" | "done"; progress: number };
type AgentInfo = { id: string; name: string; icon: string };

export default function Dashboard() {
  const [task, setTask] = useState("");
  const router = useRouter();
  const [live, setLive] = useState<LiveStatus | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [vaultCount, setVaultCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [obs, mcp, tg, tasksRes, projectsRes, agentsRes] = await Promise.all([
        fetch("/api/obsidian").then(r => r.json()).catch(() => ({ configured: false })),
        fetch("/api/mcp").then(r => r.json()).catch(() => ({ configured: false })),
        fetch("/api/telegram/debug").then(r => r.ok).catch(() => false),
        fetch("/api/tasks").then(r => r.json()).catch(() => ({ tasks: [], configured: false })),
        fetch("/api/projects").then(r => r.json()).catch(() => ({ projects: [], configured: false })),
        fetch("/api/agent").then(r => r.json()).catch(() => ({ agents: [] })),
      ]);
      setLive({
        vault: Boolean(obs.configured && !obs.error),
        hermes: Boolean(mcp.configured),
        telegram: Boolean(tg),
        db: Boolean(tasksRes.configured),
      });
      setTasks(tasksRes.tasks || []);
      setProjects(projectsRes.projects || []);
      setAgents(agentsRes.agents || []);
      if (obs.configured && !obs.error) setVaultCount((obs.files || []).length);
    })();
  }, []);

  const go = () => {
    if (task.trim()) router.push(`/chat?q=${encodeURIComponent(task)}`);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const done = tasks.filter(t => t.status === "done").length;
  const successRate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const stats = [
    { label: "Jami vazifalar", value: String(tasks.length), color: "#6366f1" },
    { label: "Bajarilgan", value: String(done), color: "#8b5cf6" },
    { label: "Bajarish darajasi", value: `${successRate}%`, color: "#10b981" },
    { label: "AI Agentlar", value: String(agents.length), color: "#f59e0b" },
  ];

  return (
    <div className="fade-in space-y-4 max-w-[1400px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, Sadi</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pari AI is ready to help you accomplish anything.</p>
        </div>
        {/* Mobile quick nav */}
        <div className="flex lg:hidden items-center gap-2">
          <Link href="/chat" className="p-2.5 bg-indigo-600 text-white rounded-xl">
            <MessageSquare size={16} strokeWidth={1.75} />
          </Link>
          <Link href="/tasks" className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl">
            <CheckCircle2 size={16} strokeWidth={1.75} />
          </Link>
        </div>
      </div>

      {/* Input card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 lg:p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">What would you like Pari AI to do?</p>
          <button className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all">
            <Sparkles size={13} strokeWidth={1.75} /> Smart Mode <ChevronDown size={13} strokeWidth={1.75} />
          </button>
        </div>
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), go())}
          placeholder="Describe your task in natural language..."
          rows={2}
          className="w-full p-3 lg:p-4 text-sm bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
        />
        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {["Analyze Data","Web Research","Create Content","Code"].map(q => (
              <button key={q} onClick={() => setTask(q)}
                className="text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 rounded-lg transition-all">
                {q}
              </button>
            ))}
          </div>
          <button onClick={go} disabled={!task.trim()}
            className="w-9 h-9 flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-all flex items-center justify-center">
            <Send size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Stats — real, computed from Supabase-backed tasks/agents */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <div className="flex items-center justify-end mt-2">
              <MiniSparkline color={s.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Middle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Tasks</h2>
            <Link href="/tasks" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {tasks.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-start gap-3">
                <FileText size={15} strokeWidth={1.75} className="text-gray-300 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.agent || "—"}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.status==="done"?"bg-green-50 text-green-600":t.status==="progress"?"bg-blue-50 text-blue-600":"bg-gray-100 text-gray-500"}`}>
                    {t.status === "done" ? "Bajarildi" : t.status === "progress" ? "Jarayonda" : "Kutmoqda"}
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Hali vazifa yo&apos;q</p>}
          </div>
          <Link href="/tasks" className="block mt-4 text-xs text-indigo-600 hover:underline">View all tasks →</Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">AI Agentlar</h2>
            <Link href="/agents" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {agents.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center"><Bot size={16} strokeWidth={1.75} className="text-indigo-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{a.name}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-green-50 text-green-600">Mavjud</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">System Status</h2>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="pulse-dot" />
              <span className="text-xs text-green-600 font-medium">{live === null ? "Tekshirilmoqda..." : "Tizim ishlamoqda"}</span>
            </div>
            <div className="space-y-2">
              {[
                { label: "Vault (Obsidian)", ok: live?.vault },
                { label: "Hermes Vositalar", ok: live?.hermes },
                { label: "Ma'lumotlar bazasi", ok: live?.db },
                { label: "Telegram Bot", ok: live?.telegram },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{s.label}</span>
                  <span className={`text-xs font-medium ${s.ok ? "text-green-600" : "text-yellow-600"}`}>{s.ok ? "Faol" : "Sozlanmagan"}</span>
                </div>
              ))}
            </div>
          </div>

          <Link href="/skilltree" className="block p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-sm hover:opacity-95 transition-opacity">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Brain size={18} strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold">Second Brain — Vault</p>
                <span className="text-xs text-indigo-100 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${live?.vault ? "bg-emerald-400" : "bg-yellow-300"}`} /> {live?.vault ? "Ulangan" : "Sozlanmagan"}
                </span>
              </div>
            </div>
            <p className="text-xs text-indigo-100 mb-3">
              {vaultCount !== null ? `GitHub-asosli vaultda ${vaultCount} ta fayl.` : "Obsidian eslatmalari va xotira bazasi."}
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-all">
              Vaultni ochish <ArrowRight size={12} strokeWidth={2} />
            </span>
          </Link>
        </div>
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Projects</h2>
            <Link href="/projects" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-4">
            {projects.slice(0, 4).map(p => (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-gray-900">{p.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.status==="progress"?"bg-blue-50 text-blue-600":"bg-gray-100 text-gray-500"}`}>
                    {p.status === "progress" ? "Jarayonda" : p.status === "done" ? "Yakunlandi" : "Rejalashtirilmoqda"}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${p.progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{p.progress}%</p>
              </div>
            ))}
            {projects.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Hali loyiha yo&apos;q</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Vazifalar taqsimoti</h2>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "Kutmoqda", count: tasks.filter(t => t.status === "todo").length, color: "#d1d5db" },
              { label: "Jarayonda", count: tasks.filter(t => t.status === "progress").length, color: "#6366f1" },
              { label: "Bajarildi", count: tasks.filter(t => t.status === "done").length, color: "#10b981" },
            ].map(d => (
              <div key={d.label} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-gray-600 flex-1">{d.label}</span>
                <span className="font-medium text-gray-900">{d.count}</span>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Ma&apos;lumot yo&apos;q</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(a => (
              <Link key={a.label} href={a.href} className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-xs text-gray-600 transition-all">
                <a.icon size={14} strokeWidth={1.75} /> {a.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
            <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5"><Lightbulb size={13} strokeWidth={1.75} /> Tips & Suggestions</p>
            <p className="text-xs text-gray-600 mt-1">Automate repetitive tasks to save more time each week.</p>
            <Link href="/automation" className="mt-2 inline-block text-xs text-indigo-600 font-medium hover:underline">Create Automation →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
