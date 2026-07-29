"use client";
import { useState } from "react";
import {
  Plus, Clock, KeyRound, Play, Bot, MessageSquare, Bell,
  Zap, CheckCircle2, Loader2, X, type LucideIcon,
} from "lucide-react";

type Trigger = "schedule" | "keyword" | "manual";
type Action = "agent" | "chat" | "notify";

type Flow = {
  id: number;
  name: string;
  trigger: Trigger;
  triggerValue: string;
  action: Action;
  actionValue: string;
  active: boolean;
  runs: number;
  lastRun?: string;
};

const INIT_FLOWS: Flow[] = [
  { id: 1, name: "Kunlik hisobot", trigger: "schedule", triggerValue: "Har kuni 09:00", action: "agent", actionValue: "analyst", active: true, runs: 14, lastRun: "Bugun 09:00" },
  { id: 2, name: "Yangi loyiha tahlili", trigger: "keyword", triggerValue: "yangi loyiha", action: "agent", actionValue: "ceo", active: true, runs: 6, lastRun: "Kecha" },
  { id: 3, name: "Haftalik strategiya", trigger: "schedule", triggerValue: "Har dushanba 08:00", action: "agent", actionValue: "ceo", active: false, runs: 3, lastRun: "5 kun oldin" },
];

const TRIGGER_ICONS: Record<Trigger, LucideIcon> = { schedule: Clock, keyword: KeyRound, manual: Play };
const ACTION_ICONS: Record<Action, LucideIcon> = { agent: Bot, chat: MessageSquare, notify: Bell };
const AGENT_NAMES: Record<string, string> = {
  ceo: "CEO Agent", researcher: "Research Agent", coder: "Coding Agent",
  analyst: "Data Analyst", writer: "Content Writer", marketing: "Marketing Agent",
  devops: "DevOps Agent", assistant: "Personal Assistant",
};

export default function AutomationPage() {
  const [flows, setFlows] = useState<Flow[]>(INIT_FLOWS);
  const [showNew, setShowNew] = useState(false);
  const [running, setRunning] = useState<number | null>(null);
  const [newFlow, setNewFlow] = useState({
    name: "", trigger: "manual" as Trigger, triggerValue: "",
    action: "agent" as Action, actionValue: "assistant",
  });
  const [result, setResult] = useState<{ id: number; text: string } | null>(null);

  function toggleFlow(id: number) {
    setFlows(p => p.map(f => f.id === id ? { ...f, active: !f.active } : f));
  }

  async function runFlow(flow: Flow) {
    setRunning(flow.id);
    setResult(null);
    try {
      const task = flow.triggerValue || flow.name;
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: flow.actionValue, task }),
      });
      const data = await res.json();
      setFlows(p => p.map(f => f.id === flow.id ? { ...f, runs: f.runs + 1, lastRun: "Hozir" } : f));
      setResult({ id: flow.id, text: data.result });
    } catch { setResult({ id: flow.id, text: "Xato yuz berdi." }); }
    setRunning(null);
  }

  function addFlow() {
    if (!newFlow.name.trim()) return;
    setFlows(p => [...p, { ...newFlow, id: Date.now(), active: true, runs: 0 }]);
    setNewFlow({ name: "", trigger: "manual", triggerValue: "", action: "agent", actionValue: "assistant" });
    setShowNew(false);
  }

  function deleteFlow(id: number) {
    setFlows(p => p.filter(f => f.id !== id));
  }

  return (
    <div className="fade-in max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f1ea]">Automation</h1>
          <p className="text-sm text-[#7d7870] mt-0.5">Avtomatik ish oqimlari — bir marta sozla, doim ishlaydi</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-[#ff6a1a] hover:bg-[#e85a0f] text-white text-sm font-medium rounded-xl transition-all">
          <Plus size={15} strokeWidth={2} /> Yangi flow
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Jami flowlar", value: flows.length, icon: Zap },
          { label: "Faol", value: flows.filter(f => f.active).length, icon: CheckCircle2 },
          { label: "Jami ishga tushirildi", value: flows.reduce((a, f) => a + f.runs, 0), icon: Play },
        ].map(s => (
          <div key={s.label} className="bg-[#141316] rounded-2xl border border-white/[0.08] p-4 flex items-center gap-3">
            <s.icon size={20} strokeWidth={1.5} className="text-[#ff8a3d]" />
            <div><p className="text-xl font-bold text-[#f5f1ea]">{s.value}</p><p className="text-xs text-[#7d7870]">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* New flow */}
      {showNew && (
        <div className="bg-[#141316] rounded-2xl border border-[#ff6a1a]/30 shadow-sm p-5 space-y-4">
          <p className="text-sm font-semibold text-[#f5f1ea]">Yangi automation flow</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#7d7870] mb-1 block">Nomi</label>
              <input value={newFlow.name} onChange={e => setNewFlow(p => ({ ...p, name: e.target.value }))}
                placeholder="Flow nomi..." className="w-full px-3 py-2 bg-[#0a0a0c] border border-white/[0.12] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/30" />
            </div>
            <div>
              <label className="text-xs text-[#7d7870] mb-1 block">Trigger</label>
              <select value={newFlow.trigger} onChange={e => setNewFlow(p => ({ ...p, trigger: e.target.value as Trigger }))}
                className="w-full px-3 py-2 bg-[#0a0a0c] border border-white/[0.12] rounded-xl text-sm focus:outline-none">
                <option value="manual">Qo'lda</option>
                <option value="schedule">Jadval</option>
                <option value="keyword">Kalit so'z</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#7d7870] mb-1 block">Trigger qiymati</label>
              <input value={newFlow.triggerValue} onChange={e => setNewFlow(p => ({ ...p, triggerValue: e.target.value }))}
                placeholder={newFlow.trigger === "schedule" ? "Har kuni 09:00" : newFlow.trigger === "keyword" ? "kalit so'z..." : "vazifa matni..."}
                className="w-full px-3 py-2 bg-[#0a0a0c] border border-white/[0.12] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/30" />
            </div>
            <div>
              <label className="text-xs text-[#7d7870] mb-1 block">Agent</label>
              <select value={newFlow.actionValue} onChange={e => setNewFlow(p => ({ ...p, actionValue: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0a0a0c] border border-white/[0.12] rounded-xl text-sm focus:outline-none">
                {Object.entries(AGENT_NAMES).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-[#a39d92] hover:bg-[#1e1d21] rounded-xl">Bekor</button>
            <button onClick={addFlow} className="px-4 py-2 bg-[#ff6a1a] hover:bg-[#e85a0f] text-white text-sm rounded-xl">Yaratish</button>
          </div>
        </div>
      )}

      {/* Flows */}
      <div className="space-y-3">
        {flows.map(flow => (
          <div key={flow.id} className={`bg-[#141316] rounded-2xl border shadow-sm p-5 transition-all ${flow.active ? "border-white/[0.08]" : "border-white/[0.08] opacity-60"}`}>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-[#f5f1ea]">{flow.name}</p>
                  {flow.active && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                </div>
                <div className="flex items-center gap-4 text-xs text-[#7d7870]">
                  <span className="flex items-center gap-1.5">
                    {(() => { const Icon = TRIGGER_ICONS[flow.trigger]; return <Icon size={12} strokeWidth={1.75} />; })()} {flow.triggerValue || "Qo'lda"}
                  </span>
                  <span className="text-[#454239]">→</span>
                  <span className="flex items-center gap-1.5">
                    {(() => { const Icon = ACTION_ICONS[flow.action]; return <Icon size={12} strokeWidth={1.75} />; })()} {AGENT_NAMES[flow.actionValue] || flow.actionValue}
                  </span>
                  {flow.lastRun && <span className="text-[#5c584f]">· Oxirgi: {flow.lastRun}</span>}
                  <span className="text-[#5c584f]">· {flow.runs} marta</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => runFlow(flow)} disabled={running === flow.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6a1a]/10 hover:bg-[#ff6a1a]/20 text-[#ff8a3d] text-xs font-medium rounded-lg transition-all disabled:opacity-40">
                  {running === flow.id ? <Loader2 size={13} strokeWidth={2} className="animate-spin" /> : <Play size={12} strokeWidth={1.75} fill="currentColor" />} Ishga tushir
                </button>
                <button onClick={() => toggleFlow(flow.id)}
                  className={`w-10 h-6 rounded-full transition-all relative flex-shrink-0 ${flow.active ? "bg-[#ff6a1a]" : "bg-[#2a292d]"}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-[#141316] shadow transition-all ${flow.active ? "left-5" : "left-1"}`} />
                </button>
                <button onClick={() => deleteFlow(flow.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><X size={13} strokeWidth={1.75} /></button>
              </div>
            </div>

            {result?.id === flow.id && (
              <div className="mt-4 p-3 bg-[#0a0a0c] rounded-xl text-xs text-[#cfc9bd] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                {result.text}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
