"use client";
import { useState } from "react";
import {
  Brain, Code2, Briefcase, Megaphone, PenLine, Microscope, Settings2,
  Lock, Star, TrendingUp, Plus, type LucideIcon,
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
  { id: "devops", name: "DevOps", icon: Settings2, level: 1, xp: 40, xpNeeded: 200, unlocked: false,
    notes: [] },
];

function XPBar({ xp, xpNeeded }: { xp: number; xpNeeded: number }) {
  const pct = Math.min(100, (xp / xpNeeded) * 100);
  return (
    <div className="h-1.5 bg-[#1e1d21] rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-[#ff6a1a] to-[#ff9a52] rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SkillTreePage() {
  const [skills, setSkills] = useState<Skill[]>(INIT_SKILLS);
  const [selected, setSelected] = useState<Skill | null>(INIT_SKILLS[0]);
  const [newNote, setNewNote] = useState("");

  const totalLevel = skills.reduce((a, s) => a + s.level, 0);
  const totalXp = skills.reduce((a, s) => a + s.xp, 0);

  function addNote() {
    if (!selected || !newNote.trim()) return;
    setSkills(prev => prev.map(s => s.id === selected.id
      ? { ...s, notes: [...s.notes, newNote.trim()], xp: Math.min(s.xpNeeded, s.xp + 15) }
      : s));
    setSelected(prev => prev ? { ...prev, notes: [...prev.notes, newNote.trim()], xp: Math.min(prev.xpNeeded, prev.xp + 15) } : prev);
    setNewNote("");
  }

  return (
    <div className="fade-in max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f1ea] flex items-center gap-2">
            <Brain size={22} strokeWidth={1.75} className="text-[#ff8a3d]" /> Skill Tree — Second Brain
          </h1>
          <p className="text-sm text-[#7d7870] mt-0.5">Shaxsiy ko'nikmalar daraxti — bilim va tajribangizni kuzatib boring</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#7d7870]">Umumiy daraja</p>
          <p className="text-2xl font-bold text-[#ff8a3d]">{totalLevel}</p>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#141316] rounded-2xl border border-white/[0.08] p-4 flex items-center gap-3">
          <Star size={20} strokeWidth={1.5} className="text-[#ff8a3d]" />
          <div><p className="text-xl font-bold text-[#f5f1ea]">{totalXp}</p><p className="text-xs text-[#7d7870]">Jami XP</p></div>
        </div>
        <div className="bg-[#141316] rounded-2xl border border-white/[0.08] p-4 flex items-center gap-3">
          <TrendingUp size={20} strokeWidth={1.5} className="text-[#ff8a3d]" />
          <div><p className="text-xl font-bold text-[#f5f1ea]">{skills.filter(s => s.unlocked).length}/{skills.length}</p><p className="text-xs text-[#7d7870]">Ochilgan ko'nikmalar</p></div>
        </div>
        <div className="bg-[#141316] rounded-2xl border border-white/[0.08] p-4 flex items-center gap-3">
          <Brain size={20} strokeWidth={1.5} className="text-[#ff8a3d]" />
          <div><p className="text-xl font-bold text-[#f5f1ea]">{skills.reduce((a, s) => a + s.notes.length, 0)}</p><p className="text-xs text-[#7d7870]">Bilim yozuvlari</p></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Skill tree nodes */}
        <div className="col-span-1 space-y-2">
          {skills.map(s => (
            <button key={s.id} disabled={!s.unlocked} onClick={() => setSelected(s)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                !s.unlocked ? "border-white/[0.08] bg-[#141316] opacity-50 cursor-not-allowed" :
                selected?.id === s.id ? "border-[#ff6a1a]/40 bg-[#ff6a1a]/10" : "border-white/[0.08] bg-[#141316] hover:border-white/[0.12]"
              }`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.unlocked ? "bg-gradient-to-br from-[#ff6a1a] to-[#7a1f1f]" : "bg-[#1e1d21]"}`}>
                  {s.unlocked ? <s.icon size={17} strokeWidth={1.75} className="text-white" /> : <Lock size={15} strokeWidth={1.75} className="text-[#5c584f]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#f5f1ea] truncate">{s.name}</p>
                  <p className="text-xs text-[#7d7870]">Daraja {s.level}</p>
                </div>
              </div>
              {s.unlocked && (
                <>
                  <XPBar xp={s.xp} xpNeeded={s.xpNeeded} />
                  <p className="text-xs text-[#5c584f] mt-1">{s.xp}/{s.xpNeeded} XP</p>
                </>
              )}
            </button>
          ))}
        </div>

        {/* Selected skill detail */}
        <div className="col-span-2">
          {selected ? (
            <div className="bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-6">
              <div className="flex items-center gap-4 mb-5 pb-4 border-b border-white/[0.08]">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff6a1a] to-[#7a1f1f] flex items-center justify-center">
                  <selected.icon size={22} strokeWidth={1.75} className="text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-[#f5f1ea]">{selected.name}</h2>
                  <p className="text-xs text-[#7d7870]">Daraja {selected.level} · {selected.xp}/{selected.xpNeeded} XP</p>
                </div>
              </div>

              <p className="text-xs font-medium text-[#cfc9bd] mb-3">Bilim yozuvlari ({selected.notes.length})</p>
              <div className="space-y-2 mb-4">
                {selected.notes.length === 0 && (
                  <p className="text-sm text-[#5c584f]">Bu ko'nikma bo'yicha hali yozuv yo'q</p>
                )}
                {selected.notes.map((n, i) => (
                  <div key={i} className="p-3 bg-[#0a0a0c] rounded-xl text-sm text-[#cfc9bd]">{n}</div>
                ))}
              </div>

              <div className="flex gap-2">
                <input value={newNote} onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addNote()}
                  placeholder="Yangi bilim/tajriba qo'shing... (+15 XP)"
                  className="flex-1 px-4 py-2.5 bg-[#0a0a0c] border border-white/[0.12] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/30" />
                <button onClick={addNote} disabled={!newNote.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#ff6a1a] hover:bg-[#e85a0f] disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all">
                  <Plus size={15} strokeWidth={2} /> Qo'shish
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#141316] rounded-2xl border border-white/[0.08] h-64 flex items-center justify-center text-[#5c584f] text-sm">
              Ko'nikma tanlang
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
