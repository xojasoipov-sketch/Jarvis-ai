"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare, CheckCircle2, Paperclip, Search, Code2, FileText,
  Mic, Bot, Lightbulb, Send, type LucideIcon,
} from "lucide-react";

const stats = [
  { label: "Tasks Completed", value: "128", change: "+18.6% this week", color: "#6366f1" },
  { label: "Time Saved", value: "24.5h", change: "+32.4% this week", color: "#8b5cf6" },
  { label: "Success Rate", value: "98.7%", change: "+2.1% this week", color: "#10b981" },
  { label: "Active Agents", value: "12", change: "+3 new this week", color: "#f59e0b" },
];

const recentTasks = [
  { name: "Market research report", agent: "Web Research Agent", status: "Completed", time: "2m ago" },
  { name: "Competitor analysis", agent: "Data Analyst Agent", status: "Completed", time: "15m ago" },
  { name: "Landing page copy", agent: "Content Writer Agent", status: "Completed", time: "1h ago" },
  { name: "Sales dashboard", agent: "Data Analyst Agent", status: "Completed", time: "3h ago" },
  { name: "API integration setup", agent: "Developer Agent", status: "Running", time: "5h ago" },
];

const activeAgents = [
  { name: "Web Research Agent", desc: "Researching latest AI trends...", status: "Running" },
  { name: "Data Analyst Agent", desc: "Analyzing sales data...", status: "Running" },
  { name: "Content Writer Agent", desc: "Writing blog post...", status: "Running" },
  { name: "Developer Agent", desc: "Building API integration...", status: "Running" },
  { name: "Automation Agent", desc: "Monitoring workflows...", status: "Idle" },
];

const projects = [
  { name: "Pari AI OS Development", status: "In Progress", progress: 78 },
  { name: "Marketing Campaign", status: "In Progress", progress: 45 },
  { name: "Data Analysis Project", status: "In Progress", progress: 62 },
  { name: "Website Redesign", status: "Planning", progress: 15 },
];

const schedule = [
  { time: "10:00 AM", title: "Team Standup", rel: "in 30 min" },
  { time: "11:30 AM", title: "Project Review", rel: "in 2h" },
  { time: "02:00 PM", title: "Client Meeting", rel: "in 4h" },
  { time: "04:30 PM", title: "Report Generation", rel: "in 6h" },
];

const usageData = [
  { label: "AI Chat", pct: 34, hours: "8.5h", color: "#6366f1" },
  { label: "Research", pct: 25, hours: "6.2h", color: "#8b5cf6" },
  { label: "Data Analysis", pct: 20, hours: "4.8h", color: "#06b6d4" },
  { label: "Automation", pct: 13, hours: "3.1h", color: "#10b981" },
  { label: "Other", pct: 8, hours: "1.9h", color: "#d1d5db" },
];

const systemStatus = [
  "AI Models", "Web Search", "Automation", "Database", "Integrations",
];

const quickActions: { label: string; icon: LucideIcon }[] = [
  { label: "New Chat", icon: MessageSquare },
  { label: "Create Task", icon: CheckCircle2 },
  { label: "Upload File", icon: Paperclip },
  { label: "Web Search", icon: Search },
  { label: "Write Code", icon: Code2 },
  { label: "Create Report", icon: FileText },
];

function MiniSparkline({ color }: { color: string }) {
  const pts = [3,7,4,9,6,11,8,13,10,15].map((y,i) => `${i*11},${20-y}`).join(" ");
  return (
    <svg width="110" height="24" viewBox="0 0 110 24">
      <polyline points={pts} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

function DonutChart() {
  const r = 48, cx = 60, cy = 60;
  let offset = 0;
  const slices = usageData.map(d => {
    const angle = (d.pct / 100) * 360;
    const s = offset; offset += angle;
    return { ...d, start: s, angle };
  });
  function arc(s: number, e: number) {
    const toRad = (a: number) => (a - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(toRad(s)), y1 = cy + r * Math.sin(toRad(s));
    const x2 = cx + r * Math.cos(toRad(e)), y2 = cy + r * Math.sin(toRad(e));
    return `M ${x1} ${y1} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  }
  return (
    <div className="flex items-center gap-6">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {slices.map(s => (
          <path key={s.label} d={arc(s.start, s.start + s.angle)} stroke={s.color} strokeWidth="16" fill="none" />
        ))}
        <text x="60" y="57" textAnchor="middle" fontSize="15" fontWeight="700" fill="#111827">24.5h</text>
        <text x="60" y="70" textAnchor="middle" fontSize="9" fill="#6b7280">Total Time</text>
      </svg>
      <div className="space-y-1.5 flex-1">
        {usageData.map(d => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-[#a39d92] flex-1">{d.label}</span>
            <span className="font-medium text-[#f5f1ea]">{d.hours}</span>
            <span className="text-[#5c584f] w-8 text-right">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [task, setTask] = useState("");
  const router = useRouter();

  const go = () => {
    if (task.trim()) router.push(`/chat?q=${encodeURIComponent(task)}`);
  };

  return (
    <div className="fade-in space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-bold text-[#f5f1ea]">Good morning, Sadi</h1>
        <p className="text-sm text-[#7d7870] mt-0.5">Pari AI is ready to help you accomplish anything.</p>
      </div>

      {/* Input card */}
      <div className="bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-5">
        <p className="text-sm font-medium text-[#cfc9bd] mb-3">What would you like Pari AI to do?</p>
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), go())}
          placeholder="Describe your task in natural language..."
          rows={3}
          className="w-full p-4 text-sm bg-[#0a0a0c] border border-white/[0.12] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/30 focus:border-[#ff6a1a]/50 transition-all"
        />
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            {["Analyze Data","Web Research","Create Content","Automate","Code"].map(q => (
              <button key={q} onClick={() => setTask(q)}
                className="text-xs px-3 py-1.5 bg-[#1e1d21] hover:bg-[#ff6a1a]/10 hover:text-[#ff8a3d] text-[#a39d92] rounded-lg transition-all">
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-[#5c584f] hover:text-[#a39d92]"><Paperclip size={16} strokeWidth={1.75} /></button>
            <button className="p-2 text-[#5c584f] hover:text-[#a39d92]"><Mic size={16} strokeWidth={1.75} /></button>
            <button onClick={go} disabled={!task.trim()}
              className="w-10 h-10 bg-[#ff6a1a] hover:bg-[#e85a0f] disabled:opacity-40 text-white rounded-xl transition-all flex items-center justify-center">
              <Send size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-4">
            <p className="text-xs text-[#7d7870] mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-[#f5f1ea]">{s.value}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-green-600">{s.change}</p>
              <MiniSparkline color={s.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Middle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#f5f1ea]">Recent Tasks</h2>
            <Link href="/tasks" className="text-xs text-[#ff8a3d] hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recentTasks.map(t => (
              <div key={t.name} className="flex items-start gap-3">
                <FileText size={15} strokeWidth={1.75} className="text-[#454239] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#f5f1ea] truncate">{t.name}</p>
                  <p className="text-xs text-[#5c584f]">{t.agent}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.status==="Completed"?"bg-green-50 text-green-600":"bg-blue-50 text-blue-600"}`}>{t.status}</span>
                  <p className="text-xs text-[#5c584f] mt-0.5">{t.time}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/tasks" className="block mt-4 text-xs text-[#ff8a3d] hover:underline">View all tasks →</Link>
        </div>

        <div className="bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#f5f1ea]">Active Agents</h2>
            <Link href="/agents" className="text-xs text-[#ff8a3d] hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {activeAgents.map(a => (
              <div key={a.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff6a1a]/20 to-[#ff6a1a]/10 flex items-center justify-center"><Bot size={16} strokeWidth={1.75} className="text-[#ff8a3d]" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#f5f1ea] truncate">{a.name}</p>
                  <p className="text-xs text-[#5c584f] truncate">{a.desc}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${a.status==="Running"?"bg-green-50 text-green-600":"bg-[#1e1d21] text-[#7d7870]"}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-5">
            <h2 className="text-sm font-semibold text-[#f5f1ea] mb-2">System Status</h2>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="pulse-dot" />
              <span className="text-xs text-green-600 font-medium">All systems operational</span>
            </div>
            <div className="space-y-2">
              {systemStatus.map(s => (
                <div key={s} className="flex items-center justify-between">
                  <span className="text-xs text-[#a39d92]">{s}</span>
                  <span className="text-xs text-green-600 font-medium">Operational</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#f5f1ea]">Today&apos;s Schedule</h2>
              <Link href="/calendar" className="text-xs text-[#ff8a3d] hover:underline">View calendar</Link>
            </div>
            <div className="space-y-2.5">
              {schedule.map(s => (
                <div key={s.time} className="flex items-center gap-3 border-l-2 border-[#ff6a1a]/30 pl-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[#f5f1ea]">{s.time}</p>
                    <p className="text-xs text-[#7d7870]">{s.title}</p>
                  </div>
                  <span className="text-xs text-[#5c584f]">{s.rel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#f5f1ea]">Projects</h2>
            <Link href="/projects" className="text-xs text-[#ff8a3d] hover:underline">View all</Link>
          </div>
          <div className="space-y-4">
            {projects.map(p => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-[#f5f1ea]">{p.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.status==="In Progress"?"bg-blue-50 text-blue-600":"bg-[#1e1d21] text-[#7d7870]"}`}>{p.status}</span>
                </div>
                <div className="h-1.5 bg-[#1e1d21] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#ff6a1a] to-[#ff9a4d]" style={{ width: `${p.progress}%` }} />
                </div>
                <p className="text-xs text-[#5c584f] mt-0.5">{p.progress}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#f5f1ea]">Usage Overview</h2>
            <span className="text-xs text-[#7d7870]">This Week</span>
          </div>
          <DonutChart />
        </div>

        <div className="bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-5">
          <h2 className="text-sm font-semibold text-[#f5f1ea] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(a => (
              <button key={a.label} className="flex items-center gap-2 p-3 bg-[#0a0a0c] hover:bg-[#ff6a1a]/10 hover:text-[#ff8a3d] rounded-xl text-xs text-[#a39d92] transition-all">
                <a.icon size={14} strokeWidth={1.75} /> {a.label}
              </button>
            ))}
          </div>
          <div className="mt-4 p-3 bg-gradient-to-r from-[#ff6a1a]/10 to-transparent rounded-xl">
            <p className="text-xs font-semibold text-[#ff9a52] flex items-center gap-1.5"><Lightbulb size={13} strokeWidth={1.75} /> Tips & Suggestions</p>
            <p className="text-xs text-[#a39d92] mt-1">Automate repetitive tasks to save more time each week.</p>
            <button className="mt-2 text-xs text-[#ff8a3d] font-medium hover:underline">Create Automation →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
