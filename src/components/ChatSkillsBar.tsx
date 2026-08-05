"use client";

const SKILLS = [
  { id: "plan", label: "Reja" },
  { id: "inbox", label: "Brifing" },
  { id: "metrics", label: "Holat" },
  { id: "reflect", label: "Yakun" },
  { id: "trends", label: "Trend" },
];

/** Chat ichidagi yengil skill chip'lar — alohida HUD emas */
export default function ChatSkillsBar({
  onPick,
  disabled,
}: {
  onPick: (skillId: string, label: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 px-0.5 scrollbar-none">
      {SKILLS.map((s) => (
        <button
          key={s.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(s.id, s.label)}
          className="flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] text-white/45 hover:text-white/80 transition-colors disabled:opacity-40"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(160,130,255,0.12)",
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
