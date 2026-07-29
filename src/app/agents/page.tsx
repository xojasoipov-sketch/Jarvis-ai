"use client";
import { useState } from "react";
import {
  Briefcase, Microscope, Code2, BarChart3, PenLine, Megaphone,
  Settings2, Target, Bot, Play, type LucideIcon,
} from "lucide-react";

const AGENTS: { id: string; name: string; icon: LucideIcon; desc: string; color: string; tags: string[] }[] = [
  { id: "ceo", name: "CEO Agent", icon: Briefcase, desc: "Strategiya va biznes qarorlari", color: "from-blue-500 to-indigo-600", tags: ["Strategiya", "Qarorlar", "Biznes"] },
  { id: "researcher", name: "Research Agent", icon: Microscope, desc: "Chuqur tadqiqot va tahlil", color: "from-purple-500 to-pink-600", tags: ["Tadqiqot", "Tahlil", "Ma'lumot"] },
  { id: "coder", name: "Coding Agent", icon: Code2, desc: "Kod yozish va debug", color: "from-green-500 to-teal-600", tags: ["Python", "JS", "TypeScript"] },
  { id: "analyst", name: "Data Analyst", icon: BarChart3, desc: "Ma'lumot tahlili va hisobot", color: "from-orange-500 to-red-600", tags: ["Excel", "SQL", "Vizual"] },
  { id: "writer", name: "Content Writer", icon: PenLine, desc: "Kontent va matn yaratish", color: "from-pink-500 to-rose-600", tags: ["Blog", "SEO", "Reklama"] },
  { id: "marketing", name: "Marketing Agent", icon: Megaphone, desc: "Marketing va reklama", color: "from-yellow-500 to-orange-600", tags: ["SMM", "Ads", "Brend"] },
  { id: "devops", name: "DevOps Agent", icon: Settings2, desc: "Deploy va infratuzilma", color: "from-slate-500 to-gray-600", tags: ["Docker", "Railway", "CI/CD"] },
  { id: "assistant", name: "Personal Assistant", icon: Target, desc: "Kundalik vazifalar va rejalar", color: "from-cyan-500 to-blue-600", tags: ["Jadval", "Eslatma", "Tashkil"] },
];

type Result = { agent: string; icon: string; result: string };

export default function AgentsPage() {
  const [selected, setSelected] = useState<typeof AGENTS[0] | null>(null);
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [multiMode, setMultiMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  async function runAgent(agentId: string, taskText: string): Promise<Result> {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, task: taskText }),
    });
    return res.json();
  }

  async function handleRun() {
    if (!task.trim()) return;
    setLoading(true);
    setResults([]);

    if (multiMode && selectedIds.length > 0) {
      const promises = selectedIds.map(id => runAgent(id, task));
      const res = await Promise.all(promises);
      setResults(res);
    } else if (selected) {
      const res = await runAgent(selected.id, task);
      setResults([res]);
    }
    setLoading(false);
  }

  function toggleId(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function formatResult(text: string) {
    return text
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, __, code) =>
        `<pre class="bg-gray-900 text-green-400 rounded-xl p-3 text-xs overflow-x-auto my-2 font-mono">${code.trim()}</pre>`)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/^#{1,3} (.+)$/gm, '<p class="font-bold text-[#f5f1ea] mt-2">$1</p>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/\n/g, "<br/>");
  }

  return (
    <div className="fade-in max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f1ea]">AI Agents</h1>
          <p className="text-sm text-[#7d7870] mt-0.5">Ixtisoslashgan agentlar — har biri o'z sohasida mutaxassis</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-[#a39d92] cursor-pointer">
          <div
            onClick={() => setMultiMode(!multiMode)}
            className={`w-10 h-6 rounded-full transition-all ${multiMode ? "bg-[#ff6a1a]" : "bg-[#2a292d]"} relative`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-[#141316] shadow transition-all ${multiMode ? "left-5" : "left-1"}`} />
          </div>
          Parallel rejim
        </label>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {AGENTS.map(a => {
          const isActive = multiMode ? selectedIds.includes(a.id) : selected?.id === a.id;
          return (
            <button
              key={a.id}
              onClick={() => multiMode ? toggleId(a.id) : setSelected(a)}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                isActive ? "border-indigo-500 shadow-lg shadow-indigo-100" : "border-white/[0.08] bg-[#141316] hover:border-white/[0.12]"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center mb-3`}>
                <a.icon size={19} strokeWidth={1.75} className="text-white" />
              </div>
              <p className="text-sm font-semibold text-[#f5f1ea]">{a.name}</p>
              <p className="text-xs text-[#7d7870] mt-0.5">{a.desc}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {a.tags.map(t => (
                  <span key={t} className="text-xs bg-[#1e1d21] text-[#7d7870] px-1.5 py-0.5 rounded">{t}</span>
                ))}
              </div>
              {isActive && (
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-[#ff8a3d] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff6a1a]" /> Tanlandi
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Task input */}
      <div className="bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          {multiMode ? (
            <p className="text-sm font-medium text-[#cfc9bd]">
              {selectedIds.length > 0 ? `${selectedIds.length} ta agent parallel ishlaydi` : "Agentlarni tanlang"}
            </p>
          ) : (
            <p className="text-sm font-medium text-[#cfc9bd] flex items-center gap-2">
              {selected ? <><selected.icon size={15} strokeWidth={1.75} className="text-[#ff8a3d]" /> {selected.name} ga vazifa bering</> : "Agent tanlang"}
            </p>
          )}
        </div>
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleRun())}
          placeholder="Vazifani yozing... (masalan: 'Pari AI uchun marketing strategiyasini ishlab chiq')"
          rows={3}
          className="w-full p-4 bg-[#0a0a0c] border border-white/[0.12] rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/30 focus:border-[#ff6a1a]/50 transition-all"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleRun}
            disabled={loading || !task.trim() || (!selected && selectedIds.length === 0)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#ff6a1a] hover:bg-[#e85a0f] disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all"
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
        <div className={`grid gap-4 ${results.length > 1 ? "md:grid-cols-2" : ""}`}>
          {results.map((r, i) => (
            <div key={i} className="fade-in bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.08]">
                <div className="w-8 h-8 rounded-lg bg-[#ff6a1a]/10 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} strokeWidth={1.75} className="text-[#ff8a3d]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#f5f1ea]">{r.agent}</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-xs text-green-600">Bajarildi</span>
                  </div>
                </div>
              </div>
              <div
                className="text-sm text-[#cfc9bd] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatResult(r.result) }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
