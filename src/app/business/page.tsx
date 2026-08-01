"use client";
import { useCallback, useEffect, useState } from "react";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Trash2, Send, Play, Pause, Lightbulb, TrendingUp } from "lucide-react";

type ModuleKey = "youtube" | "smm" | "courses" | "blogging" | "ai_tools";
type ModuleStatus = "idea" | "active" | "paused";
type BusinessModule = { module_key: ModuleKey; status: ModuleStatus; revenue: number; notes?: string; name: string; icon: string; tagline: string; description: string };
type Idea = { id: string; module_key: ModuleKey; title: string; content: string; status: "draft" | "used" | "archived"; created_at: string };

const STATUS_LABEL: Record<ModuleStatus, string> = { idea: "G'oya", active: "Faol", paused: "To'xtatilgan" };
const STATUS_COLOR: Record<ModuleStatus, string> = { idea: "bg-gray-100 text-gray-600", active: "bg-emerald-50 text-emerald-700", paused: "bg-amber-50 text-amber-700" };

function ModulePanel({ mod, onRefresh }: { mod: BusinessModule; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loadingIdeas, setLoadingIdeas] = useState(false);

  const loadIdeas = useCallback(async () => {
    setLoadingIdeas(true);
    try {
      const res = await fetch(`/api/business/ideas?module_key=${mod.module_key}`);
      const data = await res.json();
      setIdeas(data.ideas || []);
    } catch {} finally { setLoadingIdeas(false); }
  }, [mod.module_key]);

  useEffect(() => { if (expanded) loadIdeas(); }, [expanded, loadIdeas]);

  async function setStatus(status: ModuleStatus) {
    await fetch("/api/business", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module_key: mod.module_key, status }) });
    onRefresh();
  }

  async function generate() {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/business/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module_key: mod.module_key, topic }) });
      const data = await res.json();
      if (data.idea) { setIdeas((prev) => [data.idea, ...prev]); setTopic(""); }
    } catch {} finally { setGenerating(false); }
  }

  async function removeIdea(id: string) {
    await fetch(`/api/business/ideas?id=${id}`, { method: "DELETE" });
    setIdeas((prev) => prev.filter((i) => i.id !== id));
  }

  async function sendToSmm(idea: Idea) {
    const channelsRes = await fetch("/api/smm/channels");
    const channelsData = await channelsRes.json();
    const channels = channelsData.channels || [];
    if (!channels.length) { alert("Avval SMM bo'limida kanal ulang."); return; }
    await fetch("/api/smm/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel_id: channels[0].id, content: idea.content.slice(0, 1000), topic: idea.title, status: "draft" }) });
    await fetch("/api/business/ideas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: idea.id, status: "used" }) });
    setIdeas((prev) => prev.map((i) => (i.id === idea.id ? { ...i, status: "used" } : i)));
    alert("SMM postlar bo'limiga draft sifatida qo'shildi.");
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl flex-shrink-0">{mod.icon}</div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">{mod.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{mod.tagline}</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLOR[mod.status]}`}>{STATUS_LABEL[mod.status]}</span>
        </div>
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">{mod.description}</p>
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {mod.status !== "active" && <button onClick={() => setStatus("active")} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100"><Play size={12} /> Faollashtirish</button>}
          {mod.status === "active" && <button onClick={() => setStatus("paused")} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100"><Pause size={12} /> To'xtatish</button>}
          <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 ml-auto">
            <Lightbulb size={12} /> G'oyalar {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-4">
          <div className="flex gap-2">
            <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generate()} placeholder="Mavzu yozing..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400" />
            <button onClick={generate} disabled={generating || !topic.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
              <Sparkles size={13} className={generating ? "animate-pulse" : ""} /> {generating ? "Yaratyapman..." : "AI bilan yaratish"}
            </button>
          </div>
          {loadingIdeas && <p className="text-xs text-gray-400 text-center py-4">Yuklanmoqda...</p>}
          <div className="space-y-2">
            {ideas.length === 0 && !loadingIdeas && <p className="text-xs text-gray-400 text-center py-4">Hali g'oya yaratilmagan.</p>}
            {ideas.map((idea) => (
              <div key={idea.id} className="bg-white border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-medium text-gray-800">{idea.title}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {idea.status === "used" && <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded-full">SMM'ga yuborilgan</span>}
                    <button onClick={() => sendToSmm(idea)} className="p-1 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600"><Send size={12} /></button>
                    <button onClick={() => removeIdea(idea.id)} className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
                </div>
                <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed line-clamp-6">{idea.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BusinessPage() {
  const [modules, setModules] = useState<BusinessModule[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch("/api/business"); const data = await res.json(); setModules(data.modules || []); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const activeCount = modules.filter((m) => m.status === "active").length;
  const totalRevenue = modules.reduce((sum, m) => sum + (m.revenue || 0), 0);
  return (
    <div className="fade-in max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Biznes Modullari</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI yordamida daromad keltiradigan yo'nalishlarni boshqarish</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw size={15} className={`text-gray-500 ${loading ? "animate-spin" : ""}`} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><Play size={15} className="text-emerald-600" /></div>
          <div><p className="text-xs text-gray-400">Faol modullar</p><p className="text-lg font-bold text-gray-900">{activeCount} / {modules.length || 5}</p></div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center"><TrendingUp size={15} className="text-indigo-600" /></div>
          <div><p className="text-xs text-gray-400">Jami daromad</p><p className="text-lg font-bold text-gray-900">${totalRevenue.toLocaleString()}</p></div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{modules.map((mod) => <ModulePanel key={mod.module_key} mod={mod} onRefresh={load} />)}</div>
    </div>
  );
}
