"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useJarvisVoice } from "@/hooks/useJarvisVoice";

// ── Obsidian graph – kapalak shakli (viewBox 1200×1080) ─────────────────────
// Hub nodes (ko'zga ko'rinadigan katta nodelar)
const HUBS = [
  { id: "loyihalar", label: "Loyihalar", x: 285, y: 318, r: 14 },
  { id: "vazifalar", label: "Vazifalar",  x: 915, y: 318, r: 14 },
  { id: "bilimlar",  label: "Bilimlar",   x: 365, y: 695, r: 14 },
  { id: "menga",     label: "Menga",      x: 835, y: 695, r: 14 },
  { id: "chatlar",   label: "Chatlar",    x: 600, y: 840, r: 14 },
];

// Leaf nodes — ko'p, wing bo'ylab tarqalgan
const LEAVES: { id: string; label: string; x: number; y: number; hub: string; r?: number }[] = [
  // Loyihalar (yuqori chap qanot)
  { id: "brend",       label: "Brend dizayn",      x: 110, y: 145, hub: "loyihalar" },
  { id: "secondbrine", label: "Second Brine",       x: 270, y: 130, hub: "loyihalar" },
  { id: "vebsayt",     label: "Veb-sayt",           x: 85,  y: 265, hub: "loyihalar" },
  { id: "marketing",   label: "Marketing",           x: 380, y: 215, hub: "loyihalar" },
  { id: "mobil",       label: "Mobil ilova",         x: 118, y: 382, hub: "loyihalar" },
  { id: "mijozlar",    label: "Mijozlar",            x: 332, y: 430, hub: "loyihalar" },
  { id: "strategy",    label: "Strategiya",          x: 195, y: 185, hub: "loyihalar" },
  { id: "pitchdeck",   label: "Pitch deck",          x: 155, y: 320, hub: "loyihalar" },
  { id: "smm",         label: "SMM",                 x: 430, y: 355, hub: "loyihalar" },
  { id: "logo",        label: "Logo",                x: 60,  y: 185, hub: "loyihalar" },
  // Vazifalar (yuqori o'ng qanot)
  { id: "tadqiqot",    label: "Tadqiqot",            x: 1090,y: 145, hub: "vazifalar" },
  { id: "reja",        label: "Reja tuzish",          x: 930, y: 130, hub: "vazifalar" },
  { id: "kontent",     label: "Kontent yaratish",     x: 1115,y: 265, hub: "vazifalar" },
  { id: "tahlil",      label: "Tahlil",               x: 1082,y: 382, hub: "vazifalar" },
  { id: "avto",        label: "Automatlashtirish",    x: 868, y: 430, hub: "vazifalar" },
  { id: "sprint",      label: "Sprint",               x: 1005,y: 185, hub: "vazifalar" },
  { id: "deadline",    label: "Deadline",             x: 1085,y: 320, hub: "vazifalar" },
  { id: "ai",          label: "AI integratsiya",      x: 770, y: 355, hub: "vazifalar" },
  { id: "kpi",         label: "KPI",                  x: 1140,y: 185, hub: "vazifalar" },
  { id: "review",      label: "Review",               x: 770, y: 248, hub: "vazifalar" },
  // Bilimlar (pastki chap qanot)
  { id: "material",    label: "Materiallar",          x: 220, y: 620, hub: "bilimlar" },
  { id: "goya",        label: "G'oyalar",             x: 178, y: 700, hub: "bilimlar" },
  { id: "darslar",     label: "Darslar",              x: 205, y: 790, hub: "bilimlar" },
  { id: "manba",       label: "Manbalar",             x: 328, y: 830, hub: "bilimlar" },
  { id: "kitoblar",    label: "Kitoblar",             x: 128, y: 615, hub: "bilimlar" },
  { id: "kurslar",     label: "Kurslar",              x: 120, y: 750, hub: "bilimlar" },
  { id: "notes",       label: "Yozuvlar",             x: 295, y: 755, hub: "bilimlar" },
  { id: "podcast",     label: "Podcast",              x: 238, y: 870, hub: "bilimlar" },
  // Menga (pastki o'ng qanot)
  { id: "eslatma",     label: "Eslatmalar",           x: 980, y: 620, hub: "menga" },
  { id: "kunlik",      label: "Kunlik yozuvlar",      x: 1022,y: 700, hub: "menga" },
  { id: "maqsad",      label: "Maqsadlar",            x: 995, y: 790, hub: "menga" },
  { id: "habits",      label: "Habits",               x: 872, y: 830, hub: "menga" },
  { id: "salomatlik",  label: "Salomatlik",           x: 1072,y: 615, hub: "menga" },
  { id: "moliya",      label: "Moliya",               x: 1080,y: 750, hub: "menga" },
  { id: "refleksiya",  label: "Refleksiya",           x: 905, y: 755, hub: "menga" },
  { id: "kayfiyat",    label: "Kayfiyat",             x: 962, y: 870, hub: "menga" },
  // Chatlar (pastki markaz)
  { id: "suhbat",      label: "Suhbatlar",            x: 438, y: 942, hub: "chatlar" },
  { id: "arxiv",       label: "Arxiv",                x: 762, y: 942, hub: "chatlar" },
  { id: "aixotira",    label: "AI xotira",            x: 600, y: 998, hub: "chatlar" },
  { id: "telegram",    label: "Telegram",             x: 510, y: 905, hub: "chatlar" },
  { id: "ovozli",      label: "Ovozli chat",          x: 695, y: 905, hub: "chatlar" },
];

const CENTER = { x: 600, y: 520, r: 20 };

// Edges: center → hubs, hubs → leaves
type Edge = [number, number, number, number];
const EDGES: Edge[] = [
  ...HUBS.map(h => [CENTER.x, CENTER.y, h.x, h.y] as Edge),
  ...LEAVES.map(l => {
    const hub = HUBS.find(h => h.id === l.hub)!;
    return [hub.x, hub.y, l.x, l.y] as Edge;
  }),
];

const STATE_LABEL: Record<string, string> = {
  asleep:    "Bosing va gapiring",
  waking:    "Eshityapman...",
  listening: "Tinglayapman...",
  thinking:  "O'ylayapman...",
  speaking:  "Javob beryapman...",
};

// ── Floating particles ───────────────────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; da: number };
    const pts: P[] = Array.from({ length: 70 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.0 + 0.2,
      a: Math.random() * 0.5, da: (Math.random() - 0.5) * 0.004,
    }));
    let raf = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.a = Math.max(0.04, Math.min(0.55, p.a + p.da));
        if (p.a <= 0.04 || p.a >= 0.55) p.da *= -1;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${p.a})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={1200} height={1080}
    className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ── Chat + voice ─────────────────────────────────────────────────────────────
async function askPariText(text: string): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
  });
  if (!res.ok) return "Kechirasiz, xato yuz berdi.";
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  return out.trim() || "Javob bo'sh qaytdi.";
}

export default function PariPage() {
  const [typed, setTyped]         = useState("");
  const [busy, setBusy]           = useState(false);
  const [answer, setAnswer]       = useState("");
  const [showInput, setShowInput] = useState(false);
  const jarvis = useJarvisVoice();

  const sendTyped = useCallback(async () => {
    const msg = typed.trim();
    if (!msg || busy) return;
    setTyped(""); setBusy(true); setAnswer("");
    const rep = await askPariText(msg);
    setAnswer(rep); setBusy(false);
  }, [typed, busy]);

  const isBusy = jarvis.state === "thinking" || jarvis.state === "speaking";

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#0b0d14" }}
    >
      {/* Background particles */}
      <ParticleCanvas />

      {/* Butterfly SVG graph */}
      <div className="relative w-full" style={{ maxWidth: 760 }}>
        <svg
          viewBox="0 0 1200 1080"
          className="w-full h-auto select-none"
        >
          <defs>
            {/* Obsidian-style subtle glow */}
            <filter id="glow-sm" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-md" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-lg" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Edges — Obsidian style: very faint lines */}
          {EDGES.map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(139,92,246,0.12)" strokeWidth="0.7" />
          ))}

          {/* Leaf nodes */}
          {LEAVES.map(l => (
            <g key={l.id} filter="url(#glow-sm)">
              <circle cx={l.x} cy={l.y} r={l.r ?? 4} fill="#7c3aed" opacity={0.55} />
              <circle cx={l.x} cy={l.y} r={(l.r ?? 4) * 0.45} fill="#ddd6fe" opacity={0.9} />
              <text
                x={l.x + (l.x < 600 ? -8 : 8)}
                y={l.y}
                fontSize="11"
                fill="rgba(196,181,253,0.55)"
                textAnchor={l.x < 600 ? "end" : "start"}
                dominantBaseline="middle"
                style={{ fontFamily: "system-ui, sans-serif" }}
              >{l.label}</text>
            </g>
          ))}

          {/* Hub nodes */}
          {HUBS.map(h => (
            <g key={h.id} filter="url(#glow-md)">
              <circle cx={h.x} cy={h.y} r={h.r + 6} fill="rgba(109,40,217,0.12)" />
              <circle cx={h.x} cy={h.y} r={h.r}
                fill="rgba(91,33,182,0.3)"
                stroke="rgba(167,139,250,0.65)" strokeWidth="1" />
              <circle cx={h.x} cy={h.y} r={4} fill="#c4b5fd" />
              <text x={h.x} y={h.y + h.r + 13} fontSize="13"
                fill="rgba(221,214,254,0.9)" textAnchor="middle"
                style={{ fontFamily: "system-ui, sans-serif", fontWeight: 600 }}>
                {h.label}
              </text>
            </g>
          ))}

          {/* Center — Pari */}
          <g filter="url(#glow-lg)"
            onClick={isBusy ? undefined : jarvis.toggle}
            style={{ cursor: isBusy ? "default" : "pointer" }}>

            {/* Listening pulse */}
            {jarvis.state === "listening" && (
              <>
                <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.r + 18}
                  fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth="1">
                  <animate attributeName="r"
                    values={`${CENTER.r + 14};${CENTER.r + 30};${CENTER.r + 14}`}
                    dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4"
                    dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.r + 8}
                  fill="none" stroke="rgba(167,139,250,0.3)" strokeWidth="0.8">
                  <animate attributeName="r"
                    values={`${CENTER.r + 6};${CENTER.r + 18};${CENTER.r + 6}`}
                    dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5"
                    dur="1.4s" repeatCount="indefinite" />
                </circle>
              </>
            )}

            <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.r + 10}
              fill="rgba(109,40,217,0.18)" />
            <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.r}
              fill="rgba(91,33,182,0.4)"
              stroke={jarvis.active ? "rgba(196,181,253,0.9)" : "rgba(167,139,250,0.6)"}
              strokeWidth={jarvis.active ? "1.5" : "1"} />
            <circle cx={CENTER.x} cy={CENTER.y} r={6} fill="#ede9fe" />

            <text x={CENTER.x} y={CENTER.y + CENTER.r + 16} fontSize="15"
              fill="rgba(237,233,254,0.95)" textAnchor="middle"
              style={{ fontFamily: "system-ui, sans-serif", fontWeight: 700 }}>
              Pari
            </text>
          </g>
        </svg>
      </div>

      {/* State label */}
      <p className={`mt-0 text-xs tracking-wide transition-colors duration-300 ${
        jarvis.active ? "text-violet-300/70" : "text-white/20"
      }`}>{STATE_LABEL[jarvis.state]}</p>

      {jarvis.error && (
        <p className="mt-1 text-xs text-red-400/60 text-center max-w-xs px-4">{jarvis.error}</p>
      )}

      {answer && (
        <div className="mt-3 max-w-xs mx-auto px-4 py-3 rounded-xl text-sm text-white/75 leading-relaxed"
          style={{ background: "rgba(109,40,217,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
          {answer}
        </div>
      )}

      {/* Text input */}
      <div className="mt-3 max-w-xs w-full px-4">
        {!showInput ? (
          <button onClick={() => setShowInput(true)}
            className="w-full text-xs text-white/20 hover:text-white/40 transition-colors py-2">
            yoki yozing...
          </button>
        ) : (
          <div className="flex gap-2">
            <input autoFocus value={typed}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendTyped()}
              onBlur={() => !typed && setShowInput(false)}
              placeholder="Savol yozing..."
              className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40 transition-colors"
              style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
            />
            <button onClick={sendTyped} disabled={!typed.trim() || busy}
              className="w-9 h-9 rounded-lg bg-violet-700/60 hover:bg-violet-600/70 disabled:opacity-30 text-white flex items-center justify-center transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
