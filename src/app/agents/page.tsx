"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { History } from "lucide-react";
import {
  Briefcase, Microscope, Code2, BarChart3, PenLine, Megaphone,
  Settings2, Target, Bot, Play, Zap, Building2, Bug, Shield, Database,
  Palette, Scale, FlaskConical, DollarSign, Handshake, Users, type LucideIcon,
} from "lucide-react";

const AGENTS: { id: string; name: string; icon: LucideIcon; desc: string; color: string; tags: string[] }[] = [
  { id: "ceo", name: "CEO Agent", icon: Briefcase, desc: "Strategiya va biznes qarorlari", color: "from-blue-500 to-indigo-600", tags: ["Strategiya", "Qarorlar", "Biznes"] },
  { id: "architect", name: "Architect Agent", icon: Building2, desc: "Tizim dizayni va arxitektura", color: "from-indigo-500 to-blue-700", tags: ["Dizayn", "Scalability", "Komponentlar"] },
  { id: "researcher", name: "Research Agent", icon: Microscope, desc: "Chuqur tadqiqot va tahlil", color: "from-purple-500 to-pink-600", tags: ["Tadqiqot", "Tahlil", "Ma'lumot"] },
  { id: "coder", name: "Coding Agent", icon: Code2, desc: "Kod yozish va debug", color: "from-green-500 to-teal-600", tags: ["Python", "JS", "TypeScript"] },
  { id: "debug", name: "Debug Agent", icon: Bug, desc: "Xatolarni topish va tuzatish", color: "from-red-500 to-rose-600", tags: ["Stack trace", "Root cause", "Fix"] },
  { id: "security", name: "Security Agent", icon: Shield, desc: "Xavfsizlik va zaifliklar", color: "from-slate-600 to-slate-800", tags: ["Audit", "Zaiflik", "Himoya"] },
  { id: "database", name: "Database Agent", icon: Database, desc: "Ma'lumotlar bazasi dizayni", color: "from-teal-500 to-cyan-700", tags: ["SQL", "Sxema", "Optimizatsiya"] },
  { id: "designer", name: "Designer Agent", icon: Palette, desc: "UI/UX dizayn", color: "from-fuchsia-500 to-pink-600", tags: ["UI", "UX", "Layout"] },
  { id: "analyst", name: "Data Analyst", icon: BarChart3, desc: "Ma'lumot tahlili va hisobot", color: "from-orange-500 to-red-600", tags: ["Excel", "SQL", "Vizual"] },
  { id: "writer", name: "Content Writer", icon: PenLine, desc: "Kontent va matn yaratish", color: "from-pink-500 to-rose-600", tags: ["Blog", "SEO", "Reklama"] },
  { id: "marketing", name: "Marketing Agent", icon: Megaphone, desc: "Marketing va reklama", color: "from-yellow-500 to-orange-600", tags: ["SMM", "Ads", "Brend"] },
  { id: "sales", name: "Sales Agent", icon: Handshake, desc: "Sotuv va muzokara", color: "from-emerald-500 to-green-700", tags: ["Pitch", "Voronka", "Mijoz"] },
  { id: "finance", name: "Finance Agent", icon: DollarSign, desc: "Moliyaviy tahlil", color: "from-lime-600 to-green-700", tags: ["Byudjet", "Prognoz", "Narxlash"] },
  { id: "legal", name: "Legal Agent", icon: Scale, desc: "Shartnoma va huquqiy yo'nalish", color: "from-amber-600 to-yellow-700", tags: ["Shartnoma", "Litsenziya"] },
  { id: "hr", name: "HR Agent", icon: Users, desc: "Jamoa va ishga olish", color: "from-sky-500 to-blue-600", tags: ["Vakansiya", "Intervyu", "Jamoa"] },
  { id: "testing", name: "Testing Agent", icon: FlaskConical, desc: "Test strategiyasi va QA", color: "from-violet-500 to-purple-700", tags: ["Test case", "QA", "Edge case"] },
  { id: "devops", name: "DevOps Agent", icon: Settings2, desc: "Deploy va infratuzilma", color: "from-slate-500 to-gray-600", tags: ["Docker", "Vercel", "CI/CD"] },
  { id: "assistant", name: "Personal Assistant", icon: Target, desc: "Kundalik vazifalar va rejalar", color: "from-cyan-500 to-blue-600", tags: ["Jadval", "Eslatma", "Tashkil"] },
];

type Result = { agent: string; icon: string; result: string };
type RunHistory = { id: number; agent_name: string; task: string; result: string; created_at: string };
type Mode = "manual" | "parallel" | "hermes";

function AgentsInner() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<typeof AGENTS[0] | null>(null);
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [mode, setMode] = useState<Mode>("manual");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [history, setHistory] = useState<RunHistory[]>([]);
  const [routingReason, setRoutingReason] = useState("");
  const multiMode = mode === "parallel";

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/agent?history=1");
      const d = await r.json();
      setHistory(d.runs || []);
    } catch {}
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    const fromDashboard = searchParams.get("task");
    if (searchParams.get("hermes") && fromDashboard) {
      setMode("hermes");
      setTask(fromDashboard);
      setLoading(true);
      setResults([]);
      setRoutingReason("");
      runHermes(fromDashboard).then((res) => { setResults(res); setLoading(false); loadHistory(); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAgent(agentId: string, taskText: string): Promise<Result> {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, task: taskText }),
    });
    return res.json();
  }

  async function runHermes(taskText: string): Promise<Result[]> {
    const res = await fetch("/api/hermes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: taskText }),
    });
    const data = await res.json();
    setRoutingReason(data.routing?.reason || "");
    return (data.results || []).map((r: { agent: string; icon: string; result: string }) => ({
      agent: r.agent, icon: r.icon, result: r.result,
    }));
  }

  async function handleRun() {
    if (!task.trim()) return;
    setLoading(true);
    setResults([]);
    setRoutingReason("");

    if (mode === "hermes") {
      setResults(await runHermes(task));
    } else if (mode === "parallel" && selectedIds.length > 0) {
      const promises = selectedIds.map(id => runAgent(id, task));
      const res = await Promise.all(promises);
      setResults(res);
    } else if (selected) {
      const res = await runAgent(selected.id, task);
      setResults([res]);
    }
    setLoading(false);
    loadHistory();
  }

  function toggleId(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function formatResult(text: string) {
    return text
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, __, code) =>
        `<pre class="bg-gray-900 text-green-400 rounded-xl p-3 text-xs overflow-x-auto my-2 font-mono">${code.trim()}</pre>`)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/^#{1,3} (.+)$/gm, '<p class="font-bold text-gray-900 mt-2">$1</p>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/\n/g, "<br/>");
  }

  return (
    <div className="fade-in max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ixtisoslashgan agentlar — har biri o'z sohasida mutaxassis</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { id: "manual", label: "Qo'lda" },
            { id: "parallel", label: "Parallel" },
            { id: "hermes", label: "Hermes" },
          ] as { id: Mode; label: string }[]).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                mode === m.id ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m.id === "hermes" && <Zap size={12} strokeWidth={2} />}
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "hermes" && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-700">
          Hermes rejimi — vazifangizni yozing, u qaysi agent(lar) mos kelishini avtomatik aniqlab, ularni ishga tushiradi.
        </div>
      )}

      {/* Agent cards — hidden in Hermes mode since selection is automatic */}
      {mode !== "hermes" && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {AGENTS.map(a => {
          const isActive = multiMode ? selectedIds.includes(a.id) : selected?.id === a.id;
          return (
            <button
              key={a.id}
              onClick={() => multiMode ? toggleId(a.id) : setSelected(a)}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                isActive ? "border-indigo-500 shadow-lg shadow-indigo-100" : "border-gray-100 bg-white hover:border-gray-200"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center mb-3`}>
                <a.icon size={19} strokeWidth={1.75} className="text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{a.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {a.tags.map(t => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t}</span>
                ))}
              </div>
              {isActive && (
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Tanlandi
                </span>
              )}
            </button>
          );
        })}
      </div>
      )}

      {/* Task input */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          {mode === "hermes" ? (
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Zap size={15} strokeWidth={1.75} className="text-indigo-600" /> Hermes vazifani tahlil qiladi
            </p>
          ) : multiMode ? (
            <p className="text-sm font-medium text-gray-700">
              {selectedIds.length > 0 ? `${selectedIds.length} ta agent parallel ishlaydi` : "Agentlarni tanlang"}
            </p>
          ) : (
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              {selected ? <><selected.icon size={15} strokeWidth={1.75} className="text-indigo-600" /> {selected.name} ga vazifa bering</> : "Agent tanlang"}
            </p>
          )}
        </div>
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleRun())}
          placeholder={
            (mode as string) === "research"
              ? "Masalan: O'zbekistonda AI startaplar bozori 2026..."
              : "Vazifani yozing... (masalan: 'Pari AI uchun marketing strategiyasini ishlab chiq')"
          }
          rows={3}
          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleRun}
            disabled={loading || !task.trim() || (mode !== "hermes" && !selected && selectedIds.length === 0)}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Ishlayapti...</>
            ) : (
              <><Play size={14} strokeWidth={1.75} fill="currentColor" /> Ishga tushir</>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
        {routingReason && (
          <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
            <Zap size={12} strokeWidth={2} className="flex-shrink-0" />
            <span><strong>Hermes yo&apos;naltirdi:</strong> {routingReason}</span>
          </div>
        )}
        <div className={`grid gap-4 ${results.length > 1 ? "md:grid-cols-2" : ""}`}>
          {results.map((r, i) => (
            <div key={i} className="fade-in bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} strokeWidth={1.75} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.agent}</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-xs text-green-600">Bajarildi</span>
                  </div>
                </div>
              </div>
              <div
                className="text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatResult(r.result) }}
              />
            </div>
          ))}
        </div>
        </>
      )}

      {/* Real run history — Supabase-backed */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <History size={15} strokeWidth={1.75} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">So'nggi ishga tushirishlar</h2>
          </div>
          <div className="space-y-3">
            {history.slice(0, 6).map((h) => (
              <div key={h.id} className="flex items-start gap-3 border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Bot size={13} strokeWidth={1.75} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900">{h.agent_name}</p>
                  <p className="text-xs text-gray-500 truncate">{h.task}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{new Date(h.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-400">Yuklanmoqda...</div>}>
      <AgentsInner />
    </Suspense>
  );
}
