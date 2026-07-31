"use client";
import { useState } from "react";
import {
  Brain, Code2, Briefcase, Megaphone, PenLine, Microscope, Settings2,
  Lock, Star, TrendingUp, Plus, Globe, Loader2, type LucideIcon,
} from "lucide-react";

type Skill = {
  id: string;
  name: string;
  icon: LucideIcon;
  level: number;
  xp: number;
  xpNeeded: number;
  unlocked: boolean;
  notes: string[];
};

const INIT_SKILLS: Skill[] = [
  { id: "coding", name: "Kod yozish", icon: Code2, level: 6, xp: 340, xpNeeded: 500, unlocked: true,
    notes: ["Next.js 16 arxitekturasi", "Railway deploy sirlari", "TypeScript generics"] },
  { id: "business", name: "Biznes strategiya", icon: Briefcase, level: 4, xp: 210, xpNeeded: 400, unlocked: true,
    notes: ["Business Model Canvas", "Pari AI monetizatsiya rejasi"] },
  { id: "research", name: "Tadqiqot", icon: Microscope, level: 5, xp: 280, xpNeeded: 450, unlocked: true,
    notes: ["Raqobatchilar tahlili", "AI provayderlar bozori"] },
  { id: "marketing", name: "Marketing", icon: Megaphone, level: 2, xp: 90, xpNeeded: 250, unlocked: true,
    notes: ["SMM strategiya asoslari"] },
  { id: "writing", name: "Kontent yaratish", icon: PenLine, level: 3, xp: 150, xpNeeded: 300, unlocked: true,
    notes: ["Copywriting texnikalari"] },
  { id: "devops", name: "DevOps", icon: Settings2, level: 3, xp: 120, xpNeeded: 300, unlocked: true,
    notes: [
      "Pari AI Vercel'da GitHub integratsiyasi orqali deploy bo'ladi — main branch'ga har push avtomatik production deploy'ni ishga tushiradi.",
      "Environment variable'lar hech qachon kodga hardcode qilinmaydi — faqat Vercel Dashboard > Settings > Environment Variables orqali qo'shiladi.",
    ] },
];

function XPBar({ xp, xpNeeded }: { xp: number; xpNeeded: number }) {
  const pct = Math.min(100, (xp / xpNeeded) * 100);
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SkillTreePage() {
  const [skills, setSkills] = useState<Skill[]>(INIT_SKILLS);
  const [selected, setSelected] = useState<Skill | null>(INIT_SKILLS[0]);
  const [newNote, setNewNote] = useState("");
  const [enriching, setEnriching] = useState(false);

  const totalLevel = skills.reduce((a, s) => a + s.level, 0);
  const totalXp = skills.reduce((a, s) => a + s.xp, 0);

  function applyNote(note: string, xpGain: number) {
    if (!selected) return;
    setSkills(prev => prev.map(s => s.id === selected.id
      ? { ...s, notes: [...s.notes, note], xp: Math.min(s.xpNeeded, s.xp + xpGain) }
      : s));
    setSelected(prev => prev ? { ...prev, notes: [...prev.notes, note], xp: Math.min(prev.xpNeeded, prev.xp + xpGain) } : prev);
  }

  function addNote() {
    if (!selected || !newNote.trim()) return;
    applyNote(newNote.trim(), 15);
    setNewNote("");
  }

  async function enrichFromWeb() {
    if (!selected || enriching) return;
    setEnriching(true);
    try {
      const res = await fetch("/api/skilltree/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: selected.name }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json();
      if (data.note) applyNote(data.note, data.grounded ? 25 : 15);
    } catch { /* ignore — user can retry */ }
    setEnriching(false);
  }

  return (
    <div className="fade-in max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain size={22} strokeWidth={1.75} className="text-indigo-600" /> Skill Tree — Second Brain
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Shaxsiy ko'nikmalar daraxti — bilim va tajribangizni kuzatib boring</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Umumiy daraja</p>
          <p className="text-2xl font-bold text-indigo-600">{totalLevel}</p>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <Star size={20} strokeWidth={1.5} className="text-indigo-600" />
          <div><p className="text-xl font-bold text-gray-900">{totalXp}</p><p className="text-xs text-gray-500">Jami XP</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <TrendingUp size={20} strokeWidth={1.5} className="text-indigo-600" />
          <div><p className="text-xl font-bold text-gray-900">{skills.filter(s => s.unlocked).length}/{skills.length}</p><p className="text-xs text-gray-500">Ochilgan ko'nikmalar</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <Brain size={20} strokeWidth={1.5} className="text-indigo-600" />
          <div><p className="text-xl font-bold text-gray-900">{skills.reduce((a, s) => a + s.notes.length, 0)}</p><p className="text-xs text-gray-500">Bilim yozuvlari</p></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Skill tree nodes */}
        <div className="col-span-1 space-y-2">
          {skills.map(s => (
            <button key={s.id} disabled={!s.unlocked} onClick={() => setSelected(s)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                !s.unlocked ? "border-gray-100 bg-white opacity-50 cursor-not-allowed" :
                selected?.id === s.id ? "border-indigo-300 bg-indigo-50" : "border-gray-100 bg-white hover:border-gray-200"
              }`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.unlocked ? "bg-gradient-to-br from-indigo-500 to-purple-600" : "bg-gray-100"}`}>
                  {s.unlocked ? <s.icon size={17} strokeWidth={1.75} className="text-white" /> : <Lock size={15} strokeWidth={1.75} className="text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500">Daraja {s.level}</p>
                </div>
              </div>
              {s.unlocked && (
                <>
                  <XPBar xp={s.xp} xpNeeded={s.xpNeeded} />
                  <p className="text-xs text-gray-400 mt-1">{s.xp}/{s.xpNeeded} XP</p>
                </>
              )}
            </button>
          ))}
        </div>

        {/* Selected skill detail */}
        <div className="col-span-2">
          {selected ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <selected.icon size={22} strokeWidth={1.75} className="text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                  <p className="text-xs text-gray-500">Daraja {selected.level} · {selected.xp}/{selected.xpNeeded} XP</p>
                </div>
                <button
                  onClick={enrichFromWeb}
                  disabled={enriching}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-600 text-xs font-medium rounded-xl transition-all flex-shrink-0"
                >
                  {enriching ? <Loader2 size={13} strokeWidth={2} className="animate-spin" /> : <Globe size={13} strokeWidth={1.75} />}
                  Internetdan bilim qo&apos;sh
                </button>
              </div>

              <p className="text-xs font-medium text-gray-700 mb-3">Bilim yozuvlari ({selected.notes.length})</p>
              <div className="space-y-2 mb-4">
                {selected.notes.length === 0 && (
                  <p className="text-sm text-gray-400">Bu ko'nikma bo'yicha hali yozuv yo'q</p>
                )}
                {selected.notes.map((n, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700">{n}</div>
                ))}
              </div>

              <div className="flex gap-2">
                <input value={newNote} onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addNote()}
                  placeholder="Yangi bilim/tajriba qo'shing... (+15 XP)"
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                <button onClick={addNote} disabled={!newNote.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all">
                  <Plus size={15} strokeWidth={2} /> Qo'shish
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 h-64 flex items-center justify-center text-gray-400 text-sm">
              Ko'nikma tanlang
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
