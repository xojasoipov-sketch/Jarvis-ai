"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useJarvisVoice } from "@/hooks/useJarvisVoice";

// ── Node layout (viewBox 1100×1000) ─────────────────────────────────────────
const HUBS = [
  { id: "loyihalar", label: "Loyihalar", x: 278, y: 330, r: 28 },
  { id: "vazifalar", label: "Vazifalar",  x: 822, y: 330, r: 28 },
  { id: "bilimlar",  label: "Bilimlar",   x: 385, y: 668, r: 28 },
  { id: "menga",     label: "Menga",      x: 715, y: 668, r: 28 },
  { id: "chatlar",   label: "Chatlar",    x: 550, y: 808, r: 28 },
];

const LEAVES = [
  { id: "brend",     label: "Brend dizayn",     x: 140, y: 168, hub: "loyihalar" },
  { id: "second",    label: "Second Brine",      x: 298, y: 168, hub: "loyihalar" },
  { id: "vebsayt",   label: "Veb-sayt",          x: 112, y: 302, hub: "loyihalar" },
  { id: "marketing", label: "Marketing",          x: 368, y: 275, hub: "loyihalar" },
  { id: "mobil",     label: "Mobil ilova",        x: 148, y: 420, hub: "loyihalar" },
  { id: "mijozlar",  label: "Mijozlar",           x: 330, y: 450, hub: "loyihalar" },
  { id: "tadqiqot",  label: "Tadqiqot",           x: 962, y: 168, hub: "vazifalar" },
  { id: "reja",      label: "Reja tuzish",         x: 820, y: 175, hub: "vazifalar" },
  { id: "kontent",   label: "Kontent yaratish",    x: 958, y: 295, hub: "vazifalar" },
  { id: "tahlil",    label: "Tahlil",              x: 905, y: 410, hub: "vazifalar" },
  { id: "avto",      label: "Automatlashtirish",   x: 790, y: 450, hub: "vazifalar" },
  { id: "material",  label: "Materiallar",         x: 262, y: 568, hub: "bilimlar" },
  { id: "goya",      label: "G'oyalar",            x: 232, y: 648, hub: "bilimlar" },
  { id: "darslar",   label: "Darslar",             x: 248, y: 742, hub: "bilimlar" },
  { id: "manba",     label: "Manbalar",            x: 362, y: 785, hub: "bilimlar" },
  { id: "eslatma",   label: "Eslatmalar",          x: 800, y: 568, hub: "menga" },
  { id: "kunlik",    label: "Kunlik yozuvlar",     x: 862, y: 648, hub: "menga" },
  { id: "maqsad",    label: "Maqsadlar",           x: 848, y: 742, hub: "menga" },
  { id: "habits",    label: "Habits",              x: 742, y: 780, hub: "menga" },
  { id: "suhbat",    label: "Suhbatlar",           x: 428, y: 902, hub: "chatlar" },
  { id: "arxiv",     label: "Arxiv",               x: 660, y: 902, hub: "chatlar" },
  { id: "aixotira",  label: "AI xotira",           x: 548, y: 952, hub: "chatlar" },
];

const CENTER = { x: 550, y: 500, r: 42 };

const EDGES: [number, number, number, number][] = [
  ...HUBS.map(h => [CENTER.x, CENTER.y, h.x, h.y] as [number, number, number, number]),
  ...LEAVES.map(l => {
    const hub = HUBS.find(h => h.id === l.hub)!;
    return [hub.x, hub.y, l.x, l.y] as [number, number, number, number];
  }),
];

const STATE_LABEL: Record<string, string> = {
  asleep:    "Bosing va gapiring",
  waking:    "Eshityapman...",
  listening: "Tinglayapman...",
  thinking:  "O'ylayapman...",
  speaking:  "Javob beryapman...",
};

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; da: number };
    const pts: P[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.2 + 0.3,
      a: Math.random(), da: (Math.random() - 0.5) * 0.005,
    }));
    let raf = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.a = Math.max(0.05, Math.min(0.7, p.a + p.da));
        if (p.a <= 0.05 || p.a >= 0.7) p.da *= -1;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160,130,255,${p.a})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas ref={ref} width={1100} height={1000}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-40" />
  );
}

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
  const [typed, setTyped]       = useState("");
  const [busy, setBusy]         = useState(false);
  const [answer, setAnswer]     = useState("");
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
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(ellipse 120% 80% at 50% 40%, #100c2a 0%, #080b1a 70%)" }}>

      <ParticleCanvas />

      <div className="relative w-full" style={{ maxWidth: 720 }}>
        <svg viewBox="0 0 1100 1000" className="w-full h-auto select-none"
          style={{ filter: "drop-shadow(0 0 1px rgba(160,130,255,0.2))" }}>
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-strong" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="center-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
            </radialGradient>
            <radialGradient id="hub-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#5b21b6" stopOpacity="0.05" />
            </radialGradient>
          </defs>

          {EDGES.map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(160,130,255,0.18)" strokeWidth="0.8" />
          ))}

          {LEAVES.map(l => (
            <g key={l.id} filter="url(#glow)">
              <circle cx={l.x} cy={l.y} r={5} fill="#8b7cf8" opacity={0.7} />
              <circle cx={l.x} cy={l.y} r={2.5} fill="#d4c8ff" />
              <text
                x={l.x + (l.x < 550 ? -10 : 10)}
                y={l.y + 1}
                fontSize="13"
                fill="rgba(200,188,255,0.65)"
                textAnchor={l.x < 550 ? "end" : "start"}
                dominantBaseline="middle"
                style={{ fontFamily: "system-ui, sans-serif" }}
              >{l.label}</text>
            </g>
          ))}

          {HUBS.map(h => (
            <g key={h.id} filter="url(#glow)">
              <circle cx={h.x} cy={h.y} r={h.r + 8} fill="url(#hub-grad)" />
              <circle cx={h.x} cy={h.y} r={h.r} fill="rgba(100,80,200,0.18)"
                stroke="rgba(160,130,255,0.5)" strokeWidth="1" />
              <circle cx={h.x} cy={h.y} r={5} fill="#c4b5fd" />
              <text x={h.x} y={h.y + h.r + 14} fontSize="14" fill="rgba(210,198,255,0.85)"
                textAnchor="middle" style={{ fontFamily: "system-ui, sans-serif", fontWeight: 500 }}>
                {h.label}
              </text>
            </g>
          ))}

          <g filter="url(#glow-strong)"
            onClick={isBusy ? undefined : jarvis.toggle}
            style={{ cursor: isBusy ? "default" : "pointer" }}>
            {jarvis.state === "listening" && (
              <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.r + 22}
                fill="none" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5">
                <animate attributeName="r"
                  values={`${CENTER.r + 16};${CENTER.r + 32};${CENTER.r + 16}`}
                  dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.1;0.5"
                  dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.r + 18} fill="url(#center-grad)" />
            <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.r}
              fill="rgba(80,55,180,0.25)"
              stroke={jarvis.active ? "rgba(196,181,253,0.8)" : "rgba(160,130,255,0.5)"}
              strokeWidth={jarvis.active ? "1.5" : "1"} />
            <circle cx={CENTER.x} cy={CENTER.y} r={8} fill="#e9e0ff" />
            <text x={CENTER.x} y={CENTER.y + CENTER.r + 18} fontSize="17"
              fill="rgba(230,220,255,0.95)" textAnchor="middle"
              style={{ fontFamily: "system-ui, sans-serif", fontWeight: 700 }}>
              Pari
            </text>
          </g>
        </svg>
      </div>

      <p className={`mt-1 text-sm transition-colors duration-300 ${
        jarvis.active ? "text-purple-300/80" : "text-white/30"
      }`}>{STATE_LABEL[jarvis.state]}</p>

      {jarvis.error && (
        <p className="mt-1 text-xs text-red-400/70 text-center px-4">{jarvis.error}</p>
      )}

      {answer && (
        <div className="mt-3 max-w-sm mx-auto px-5 py-3 rounded-2xl text-sm text-white/80 leading-relaxed"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(160,130,255,0.12)" }}>
          {answer}
        </div>
      )}

      <div className="mt-4 max-w-sm w-full px-4">
        {!showInput ? (
          <button onClick={() => setShowInput(true)}
            className="w-full text-xs text-white/25 hover:text-white/45 transition-colors py-2">
            yoki yozing...
          </button>
        ) : (
          <div className="flex gap-2">
            <input autoFocus value={typed}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendTyped()}
              onBlur={() => !typed && setShowInput(false)}
              placeholder="Savol yozing..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/40 transition-colors"
            />
            <button onClick={sendTyped} disabled={!typed.trim() || busy}
              className="w-10 h-10 flex-shrink-0 rounded-xl bg-purple-600/70 hover:bg-purple-500/70 disabled:opacity-30 text-white flex items-center justify-center transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
