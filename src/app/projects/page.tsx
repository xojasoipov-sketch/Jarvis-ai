"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, LayoutGrid, List, Rocket, CheckCircle2, Trophy, Bot,
  ShoppingCart, BarChart3, Users, Zap, Target, Lightbulb, Flame,
  type LucideIcon,
} from "lucide-react";

type Project = {
  id: number;
  name: string;
  status: "planning" | "progress" | "done";
  progress: number;
  created_at: string;
  updated_at: string;
};

const STATUS_CONFIG = {
  planning: { label: "Rejalashtirilmoqda", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  progress: { label: "Jarayonda", color: "text-green-600 bg-green-50 border-green-200" },
  done: { label: "Yakunlandi", color: "text-blue-600 bg-blue-50 border-blue-200" },
};

const COLORS = ["from-indigo-500 to-purple-600", "from-green-500 to-teal-600", "from-orange-500 to-red-600", "from-blue-500 to-cyan-600", "from-pink-500 to-rose-600", "from-violet-500 to-indigo-600"];
const ICONS: LucideIcon[] = [Bot, ShoppingCart, BarChart3, Users, Rocket, Zap, Target, Lightbulb, Flame];

function styleFor(id: number) {
  return { color: COLORS[id % COLORS.length], icon: ICONS[id % ICONS.length] };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/projects");
      const d = await r.json();
      setConfigured(d.configured !== false);
      setProjects(d.projects || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addProject() {
    if (!newName.trim()) return;
    const r = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (r.ok) {
      const { project } = await r.json();
      setProjects(prev => [project, ...prev]);
    }
    setNewName(""); setShowNew(false);
  }

  return (
    <div className="fade-in max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} ta loyiha — {projects.filter(p => p.status === "progress").length} ta faol</p>
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

      {!configured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-700">
          Baza sozlanmagan — Railway&apos;da <code className="bg-yellow-100 px-1 rounded">SUPABASE_URL</code> va <code className="bg-yellow-100 px-1 rounded">SUPABASE_ANON_KEY</code> o&apos;rnating
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Faol loyihalar", value: projects.filter(p => p.status === "progress").length, icon: Rocket, color: "text-green-600" },
          { label: "Rejadagi loyihalar", value: projects.filter(p => p.status === "planning").length, icon: CheckCircle2, color: "text-indigo-600" },
          { label: "Yakunlangan", value: projects.filter(p => p.status === "done").length, icon: Trophy, color: "text-orange-600" },
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
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Bekor</button>
            <button onClick={addProject} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl">Yaratish</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Yuklanmoqda...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Rocket size={36} strokeWidth={1.25} className="mx-auto mb-3" />
          <p className="text-sm">Hali loyiha yo&apos;q</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(p => {
            const { color, icon: Icon } = styleFor(p.id);
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-gray-200 transition-all">
                <div className={`h-2 bg-gradient-to-r ${color}`} style={{ width: `${p.progress}%` }} />
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}><Icon size={19} strokeWidth={1.75} className="text-white" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CONFIG[p.status].color} flex-shrink-0`}>{STATUS_CONFIG[p.status].label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Progress</span><span className="font-medium text-gray-900">{p.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all`} style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">Yangilangan: {new Date(p.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map(p => {
            const { color, icon: Icon } = styleFor(p.id);
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:border-gray-200 transition-all">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}><Icon size={16} strokeWidth={1.75} className="text-white" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CONFIG[p.status].color}`}>{STATUS_CONFIG[p.status].label}</span>
                  </div>
                </div>
                <div className="w-32 flex-shrink-0">
                  <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{p.progress}%</span></div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${color} rounded-full`} style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{new Date(p.updated_at).toLocaleDateString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
