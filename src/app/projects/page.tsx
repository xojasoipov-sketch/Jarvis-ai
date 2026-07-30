"use client";
import { useState } from "react";
import {
  Plus, LayoutGrid, List, Rocket, CheckCircle2, Trophy, Bot,
  ShoppingCart, BarChart3, Users, Zap, Target, Lightbulb, Flame,
  type LucideIcon,
} from "lucide-react";

type Project = {
  id: number;
  name: string;
  desc: string;
  status: "active" | "paused" | "done";
  progress: number;
  tasks: number;
  done: number;
  color: string;
  icon: LucideIcon;
  tags: string[];
  updated: string;
};

const INIT: Project[] = [
  { id: 1, name: "Pari AI Platform", desc: "Ko'p agentli AI yordamchi tizim", status: "active", progress: 68, tasks: 24, done: 16, color: "from-indigo-500 to-purple-600", icon: Bot, tags: ["Next.js", "AI", "SaaS"], updated: "Bugun" },
  { id: 2, name: "E-commerce Bot", desc: "Telegram orqali savdo avtomatlashtirish", status: "active", progress: 40, tasks: 18, done: 7, color: "from-green-500 to-teal-600", icon: ShoppingCart, tags: ["Telegram", "Python", "Bot"], updated: "Kecha" },
  { id: 3, name: "Analytics Dashboard", desc: "Real-time biznes ko'rsatkichlari", status: "paused", progress: 25, tasks: 12, done: 3, color: "from-orange-500 to-red-600", icon: BarChart3, tags: ["React", "Charts", "SQL"], updated: "3 kun oldin" },
  { id: 4, name: "CRM Tizimi", desc: "Mijozlarni boshqarish platformasi", status: "done", progress: 100, tasks: 30, done: 30, color: "from-blue-500 to-cyan-600", icon: Users, tags: ["CRM", "SaaS", "B2B"], updated: "1 hafta oldin" },
];

const STATUS_CONFIG = {
  active: { label: "Faol", color: "text-green-600 bg-green-50 border-green-200" },
  paused: { label: "To'xtatilgan", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  done: { label: "Yakunlandi", color: "text-blue-600 bg-blue-50 border-blue-200" },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(INIT);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  function addProject() {
    if (!newName.trim()) return;
    const colors = ["from-pink-500 to-rose-600", "from-violet-500 to-indigo-600", "from-amber-500 to-orange-600"];
    const icons = [Rocket, Zap, Target, Lightbulb, Flame];
    setProjects(prev => [...prev, {
      id: Date.now(), name: newName, desc: newDesc, status: "active", progress: 0,
      tasks: 0, done: 0, color: colors[Math.floor(Math.random() * colors.length)],
      icon: icons[Math.floor(Math.random() * icons.length)], tags: [], updated: "Hozir",
    }]);
    setNewName(""); setNewDesc(""); setShowNew(false);
  }

  return (
    <div className="fade-in max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} ta loyiha — {projects.filter(p => p.status === "active").length} ta faol</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button onClick={() => setView("grid")} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${view === "grid" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}><LayoutGrid size={13} strokeWidth={1.75} /> Grid</button>
            <button onClick={() => setView("list")} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${view === "list" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}><List size={13} strokeWidth={1.75} /> List</button>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all">
            <Plus size={15} strokeWidth={2} /> Yangi loyiha
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Faol loyihalar", value: projects.filter(p => p.status === "active").length, icon: Rocket, color: "text-green-600" },
          { label: "Umumiy vazifalar", value: projects.reduce((a, p) => a + p.tasks, 0), icon: CheckCircle2, color: "text-indigo-600" },
          { label: "Yakunlangan", value: projects.reduce((a, p) => a + p.done, 0), icon: Trophy, color: "text-orange-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <s.icon size={22} strokeWidth={1.5} className={s.color} />
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New project */}
      {showNew && (
        <div className="bg-white rounded-2xl border border-indigo-200 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Yangi loyiha</p>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Loyiha nomi..."
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Qisqa tavsif..."
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Bekor</button>
            <button onClick={addProject} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl">Yaratish</button>
          </div>
        </div>
      )}

      {/* Projects grid/list */}
      {view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-gray-200 transition-all">
              <div className={`h-2 bg-gradient-to-r ${p.color}`} style={{ width: `${p.progress}%` }} />
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center flex-shrink-0`}><p.icon size={19} strokeWidth={1.75} className="text-white" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CONFIG[p.status].color} flex-shrink-0`}>{STATUS_CONFIG[p.status].label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Progress</span><span className="font-medium text-gray-900">{p.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${p.color} rounded-full transition-all`} style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-1 flex-wrap">
                    {p.tags.map(t => <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{t}</span>)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{p.done}/{p.tasks} vazifa</span>
                    <span>{p.updated}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:border-gray-200 transition-all">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center flex-shrink-0`}><p.icon size={16} strokeWidth={1.75} className="text-white" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CONFIG[p.status].color}`}>{STATUS_CONFIG[p.status].label}</span>
                </div>
                <p className="text-xs text-gray-500">{p.desc}</p>
              </div>
              <div className="w-32 flex-shrink-0">
                <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{p.progress}%</span><span>{p.done}/{p.tasks}</span></div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${p.color} rounded-full`} style={{ width: `${p.progress}%` }} />
                </div>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{p.updated}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
