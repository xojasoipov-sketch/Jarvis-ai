"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useJarvisVoice } from "@/hooks/useJarvisVoice";

const HermesOrb = dynamic(() => import("@/components/HermesOrb"), { ssr: false });

// ── Graph layout (butterfly, viewBox 1200×1080) ─────────────────────────────
const HUBS = [
  { id: "loyihalar", label: "Loyihalar", x: 285, y: 318, r: 14 },
  { id: "vazifalar", label: "Vazifalar",  x: 915, y: 318, r: 14 },
  { id: "bilimlar",  label: "Bilimlar",   x: 365, y: 695, r: 14 },
  { id: "menga",     label: "Menga",      x: 835, y: 695, r: 14 },
  { id: "chatlar",   label: "Chatlar",    x: 600, y: 840, r: 14 },
];

const LEAVES: { id: string; label: string; x: number; y: number; hub: string }[] = [
  { id: "brend",       label: "Brend dizayn",    x: 110, y: 145, hub: "loyihalar" },
  { id: "secondbrine", label: "Second Brine",     x: 270, y: 130, hub: "loyihalar" },
  { id: "vebsayt",     label: "Veb-sayt",         x: 85,  y: 265, hub: "loyihalar" },
  { id: "marketing",   label: "Marketing",        x: 380, y: 215, hub: "loyihalar" },
  { id: "mobil",       label: "Mobil ilova",      x: 118, y: 382, hub: "loyihalar" },
  { id: "mijozlar",    label: "Mijozlar",         x: 332, y: 430, hub: "loyihalar" },
  { id: "strategy",    label: "Strategiya",       x: 195, y: 185, hub: "loyihalar" },
  { id: "pitchdeck",   label: "Pitch deck",       x: 155, y: 320, hub: "loyihalar" },
  { id: "smm",         label: "SMM",              x: 430, y: 355, hub: "loyihalar" },
  { id: "logo",        label: "Logo",             x: 60,  y: 185, hub: "loyihalar" },
  { id: "tadqiqot",    label: "Tadqiqot",         x: 1090,y: 145, hub: "vazifalar" },
  { id: "reja",        label: "Reja tuzish",      x: 930, y: 130, hub: "vazifalar" },
  { id: "kontent",     label: "Kontent yaratish", x: 1115,y: 265, hub: "vazifalar" },
  { id: "tahlil",      label: "Tahlil",           x: 1082,y: 382, hub: "vazifalar" },
  { id: "avto",        label: "Automatlashtirish",x: 868, y: 430, hub: "vazifalar" },
  { id: "sprint",      label: "Sprint",           x: 1005,y: 185, hub: "vazifalar" },
  { id: "deadline",    label: "Deadline",         x: 1085,y: 320, hub: "vazifalar" },
  { id: "ai",          label: "AI integratsiya",  x: 770, y: 355, hub: "vazifalar" },
  { id: "kpi",         label: "KPI",              x: 1140,y: 185, hub: "vazifalar" },
  { id: "review",      label: "Review",           x: 770, y: 248, hub: "vazifalar" },
  { id: "material",    label: "Materiallar",      x: 220, y: 620, hub: "bilimlar" },
  { id: "goya",        label: "G'oyalar",         x: 178, y: 700, hub: "bilimlar" },
  { id: "darslar",     label: "Darslar",          x: 205, y: 790, hub: "bilimlar" },
  { id: "manba",       label: "Manbalar",         x: 328, y: 830, hub: "bilimlar" },
  { id: "kitoblar",    label: "Kitoblar",         x: 128, y: 615, hub: "bilimlar" },
  { id: "kurslar",     label: "Kurslar",          x: 120, y: 750, hub: "bilimlar" },
  { id: "notes",       label: "Yozuvlar",         x: 295, y: 755, hub: "bilimlar" },
  { id: "podcast",     label: "Podcast",          x: 238, y: 870, hub: "bilimlar" },
  { id: "eslatma",     label: "Eslatmalar",       x: 980, y: 620, hub: "menga" },
  { id: "kunlik",      label: "Kunlik yozuvlar",  x: 1022,y: 700, hub: "menga" },
  { id: "maqsad",      label: "Maqsadlar",        x: 995, y: 790, hub: "menga" },
  { id: "habits",      label: "Habits",           x: 872, y: 830, hub: "menga" },
  { id: "salomatlik",  label: "Salomatlik",       x: 1072,y: 615, hub: "menga" },
  { id: "moliya",      label: "Moliya",           x: 1080,y: 750, hub: "menga" },
  { id: "refleksiya",  label: "Refleksiya",       x: 905, y: 755, hub: "menga" },
  { id: "kayfiyat",    label: "Kayfiyat",         x: 962, y: 870, hub: "menga" },
  { id: "suhbat",      label: "Suhbatlar",        x: 438, y: 942, hub: "chatlar" },
  { id: "arxiv",       label: "Arxiv",            x: 762, y: 942, hub: "chatlar" },
  { id: "aixotira",    label: "AI xotira",        x: 600, y: 998, hub: "chatlar" },
  { id: "telegram",    label: "Telegram",         x: 510, y: 905, hub: "chatlar" },
  { id: "ovozli",      label: "Ovozli chat",      x: 695, y: 905, hub: "chatlar" },
];

const CENTER = { id: "center", x: 600, y: 520, r: 20 };

// All nodes as physics objects
type NodeDef = { id: string; x: number; y: number; isHub?: boolean; isCenter?: boolean };
const ALL_NODES: NodeDef[] = [
  { ...CENTER, isCenter: true },
  ...HUBS.map(h => ({ ...h, isHub: true })),
  ...LEAVES,
];

// Edges: center→hubs, hubs→leaves
type EdgeDef = { from: string; to: string };
const ALL_EDGES: EdgeDef[] = [
  ...HUBS.map(h => ({ from: "center", to: h.id })),
  ...LEAVES.map(l => ({ from: l.hub, to: l.id })),
];

// Scholar reactions shown on node click
const SCHOLAR_REACTIONS = [
  "💡 G'oya", "🔬 Tadqiqot", "⚡ Avto", "🧠 Xotira",
  "📡 Signal", "🎯 Maqsad", "✨ Yangi", "🔗 Bog'liq",
  "📊 Tahlil", "🚀 Start",
];

const STATE_LABEL: Record<string, string> = {
  asleep:    "Bosing va gapiring",
  waking:    "Eshityapman...",
  listening: "Tinglayapman...",
  thinking:  "O'ylayapman...",
  speaking:  "Javob beryapman...",
};

// ── Physics node state (kept in ref, mutated each frame) ───────────────────
type PhysState = { x: number; y: number; vx: number; vy: number; hx: number; hy: number };

function buildPhysMap(): Map<string, PhysState> {
  const m = new Map<string, PhysState>();
  for (const n of ALL_NODES) {
    m.set(n.id, { x: n.x, y: n.y, hx: n.x, hy: n.y, vx: 0, vy: 0 });
  }
  return m;
}

// ── Floating particles ──────────────────────────────────────────────────────
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
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 0.9 + 0.15,
      a: Math.random() * 0.4, da: (Math.random() - 0.5) * 0.003,
    }));
    let raf = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.a = Math.max(0.03, Math.min(0.45, p.a + p.da));
        if (p.a <= 0.03 || p.a >= 0.45) p.da *= -1;
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
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ── Voice API ───────────────────────────────────────────────────────────────
const PARI_VOICE_SYSTEM = `Sen Pari — Sadining shaxsiy AI yordamchisi.
QOIDA: Hech qachon "Nima qilmoqchisiz?" dema. Buyruq kelsa — darhol bajar.
Javob: qisqa, o'zbek tilida, 1-3 gap. Markdown yo'q.`;

async function askPariText(text: string): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: PARI_VOICE_SYSTEM,
      messages: [{ role: "user", content: text }],
    }),
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

// ── Main component ──────────────────────────────────────────────────────────
export default function PariPage() {
  const [typed, setTyped]         = useState("");
  const [busy, setBusy]           = useState(false);
  const [answer, setAnswer]       = useState("");
  const [showInput, setShowInput] = useState(false);
  const [view, setView]           = useState<"graph" | "orb">("graph");
  const jarvis = useJarvisVoice();

  // Hover / active node
  const [hoveredId, setHoveredId]   = useState<string | null>(null);
  const [activeEdges, setActiveEdges] = useState<Set<number>>(new Set());

  // Scholar reactions: { id, text, x, y, t (start timestamp) }[]
  const [reactions, setReactions] = useState<{ id: number; text: string; x: number; y: number; t: number }[]>([]);
  const reactionCounter = useRef(0);

  // Physics state (not in React state — mutated directly for performance)
  const physRef = useRef<Map<string, PhysState>>(buildPhysMap());
  // Per-node SVG <g> refs for direct DOM updates during drag
  const gRefs = useRef<Map<string, SVGGElement>>(new Map());
  // Edge refs
  const edgeRefs = useRef<(SVGLineElement | null)[]>([]);

  // Drag state
  const dragRef = useRef<{
    nodeId: string;
    svgEl: SVGSVGElement;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // RAF loop — spring physics + update DOM
  const rafRef = useRef<number>(0);

  const updateEdgeDOM = useCallback(() => {
    ALL_EDGES.forEach((e, i) => {
      const lineEl = edgeRefs.current[i];
      if (!lineEl) return;
      const from = physRef.current.get(e.from);
      const to = physRef.current.get(e.to);
      if (!from || !to) return;
      lineEl.setAttribute("x1", String(from.x));
      lineEl.setAttribute("y1", String(from.y));
      lineEl.setAttribute("x2", String(to.x));
      lineEl.setAttribute("y2", String(to.y));
    });
  }, []);

  const physTick = useCallback(() => {
    let anyMoving = false;
    physRef.current.forEach((s, id) => {
      if (dragRef.current?.nodeId === id) return;
      const dx = s.hx - s.x;
      const dy = s.hy - s.y;
      s.vx = (s.vx + dx * 0.07) * 0.80;
      s.vy = (s.vy + dy * 0.07) * 0.80;
      s.x += s.vx;
      s.y += s.vy;
      if (Math.abs(s.vx) > 0.01 || Math.abs(s.vy) > 0.01) anyMoving = true;
      // Update DOM
      const g = gRefs.current.get(id);
      if (g) g.setAttribute("transform", `translate(${s.x - s.hx},${s.y - s.hy})`);
    });
    updateEdgeDOM();
    if (anyMoving) rafRef.current = requestAnimationFrame(physTick);
  }, [updateEdgeDOM]);

  const startPhys = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(physTick);
  }, [physTick]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Convert SVG coordinates from pointer event
  function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    return pt.matrixTransform(ctm.inverse());
  }

  function handlePointerDown(nodeId: string, e: React.PointerEvent) {
    if (!svgRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
    const s = physRef.current.get(nodeId)!;
    const pt = svgPoint(svgRef.current, e.clientX, e.clientY);
    dragRef.current = {
      nodeId,
      svgEl: svgRef.current,
      offsetX: pt.x - s.x,
      offsetY: pt.y - s.y,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    e.preventDefault();
    const pt = svgPoint(d.svgEl, e.clientX, e.clientY);
    const s = physRef.current.get(d.nodeId)!;
    s.x = pt.x - d.offsetX;
    s.y = pt.y - d.offsetY;
    s.vx = 0; s.vy = 0;
    // Update DOM directly
    const g = gRefs.current.get(d.nodeId);
    if (g) g.setAttribute("transform", `translate(${s.x - s.hx},${s.y - s.hy})`);
    updateEdgeDOM();
  }

  function handlePointerUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    startPhys();
  }

  // Click → scholar reaction
  function handleNodeClick(nodeId: string, e: React.MouseEvent) {
    if (!svgRef.current) return;
    const s = physRef.current.get(nodeId);
    if (!s) return;
    const text = SCHOLAR_REACTIONS[Math.floor(Math.random() * SCHOLAR_REACTIONS.length)];
    const id = ++reactionCounter.current;
    // Convert SVG coords to screen %
    const svgEl = svgRef.current;
    const bbox = svgEl.getBoundingClientRect();
    const vb = { w: 1200, h: 1080 };
    const screenX = (s.x / vb.w) * bbox.width + bbox.left;
    const screenY = (s.y / vb.h) * bbox.height + bbox.top;
    setReactions(prev => [...prev, { id, text, x: screenX, y: screenY, t: Date.now() }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 1600);

    // Highlight connected edges
    const connected = new Set<number>();
    ALL_EDGES.forEach((edge, i) => {
      if (edge.from === nodeId || edge.to === nodeId) connected.add(i);
    });
    setActiveEdges(connected);
    setTimeout(() => setActiveEdges(new Set()), 1200);
    e.stopPropagation();
  }

  // Hovered node → find connected edge indices
  const hoveredEdges = new Set<number>();
  if (hoveredId) {
    ALL_EDGES.forEach((edge, i) => {
      if (edge.from === hoveredId || edge.to === hoveredId) hoveredEdges.add(i);
    });
  }

  const isBusy = jarvis.state === "thinking" || jarvis.state === "speaking";

  const sendTyped = useCallback(async () => {
    const msg = typed.trim();
    if (!msg || busy) return;
    setTyped(""); setBusy(true); setAnswer("");
    const rep = await askPariText(msg);
    setAnswer(rep); setBusy(false);
  }, [typed, busy]);

  // Set gRefs
  function setGRef(id: string) {
    return (el: SVGGElement | null) => {
      if (el) gRefs.current.set(id, el);
    };
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: "#0b0d14" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* View toggle */}
      <div style={{
        position: "fixed", top: 14, right: 16, zIndex: 100,
        display: "flex", gap: 4,
        background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 6, padding: 3,
      }}>
        {(["graph", "orb"] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "4px 12px", borderRadius: 4, fontSize: 11, fontWeight: 600,
            cursor: "pointer", border: "none",
            background: view === v ? "rgba(139,92,246,0.25)" : "transparent",
            color: view === v ? "#c4b5fd" : "rgba(255,255,255,0.3)",
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            {v === "graph" ? "🕸 Miya" : "🔮 Orb"}
          </button>
        ))}
      </div>

      {/* Orb view */}
      {view === "orb" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
          <HermesOrb showControls />
        </div>
      )}

      <ParticleCanvas />

      {/* Scholar reactions (fixed position overlays) */}
      {reactions.map(r => (
        <div
          key={r.id}
          className="fixed pointer-events-none z-50 text-xs font-semibold text-violet-300"
          style={{
            left: r.x,
            top: r.y,
            transform: "translate(-50%,-50%)",
            animation: "scholar-float 1.6s ease-out forwards",
          }}
        >
          {r.text}
        </div>
      ))}

      <style>{`
        @keyframes scholar-float {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
          15%  { opacity: 1; transform: translate(-50%, -70%) scale(1.05); }
          60%  { opacity: 0.9; transform: translate(-50%, -120%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -160%) scale(0.9); }
        }
        @keyframes edge-flow {
          0%   { stroke-dashoffset: 200; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pulse-ring {
          0%   { r: 24; opacity: 0.4; }
          100% { r: 44; opacity: 0; }
        }
      `}</style>

      {/* Graph SVG */}
      <div className="relative w-full" style={{ maxWidth: 780 }}>
        <svg
          ref={svgRef}
          viewBox="0 0 1200 1080"
          className="w-full h-auto"
          style={{ cursor: "default" }}
        >
          <defs>
            <filter id="glow-sm" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-md" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-lg" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-node" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {ALL_EDGES.map((edge, i) => {
            const from = physRef.current.get(edge.from)!;
            const to   = physRef.current.get(edge.to)!;
            const isHovered = hoveredEdges.has(i);
            const isActive  = activeEdges.has(i);
            const isVoice   = jarvis.active && edge.from === "center";

            return (
              <g key={i}>
                {/* Base edge */}
                <line
                  ref={el => { edgeRefs.current[i] = el; }}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={
                    isActive  ? "rgba(196,181,253,0.55)" :
                    isHovered ? "rgba(167,139,250,0.40)" :
                    isVoice   ? "rgba(139,92,246,0.22)" :
                                "rgba(139,92,246,0.11)"
                  }
                  strokeWidth={isActive ? 1.2 : isHovered ? 0.9 : 0.65}
                  style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
                />
                {/* Animated flow dash (voice active) */}
                {isVoice && (
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke="rgba(196,181,253,0.55)"
                    strokeWidth="1"
                    strokeDasharray="8 16"
                    style={{
                      animation: `edge-flow ${1.8 + (i % 5) * 0.25}s linear infinite`,
                      animationDelay: `${(i % 7) * 0.12}s`,
                    }}
                  />
                )}
                {/* Active pulse dash */}
                {isActive && (
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke="rgba(221,214,254,0.8)"
                    strokeWidth="1.2"
                    strokeDasharray="6 12"
                    style={{ animation: "edge-flow 0.6s linear 1" }}
                  />
                )}
              </g>
            );
          })}

          {/* Leaf nodes */}
          {LEAVES.map(l => (
            <g
              key={l.id}
              ref={setGRef(l.id)}
              filter="url(#glow-sm)"
              style={{ cursor: "grab" }}
              onPointerDown={e => handlePointerDown(l.id, e)}
              onClick={e => handleNodeClick(l.id, e)}
              onPointerEnter={() => setHoveredId(l.id)}
              onPointerLeave={() => setHoveredId(null)}
            >
              <circle cx={l.x} cy={l.y} r={hoveredId === l.id ? 7 : 4.5}
                fill={hoveredId === l.id ? "#a78bfa" : "#7c3aed"}
                opacity={hoveredId === l.id ? 0.85 : 0.55}
                style={{ transition: "r 0.2s, fill 0.2s, opacity 0.2s" }}
              />
              <circle cx={l.x} cy={l.y} r={hoveredId === l.id ? 3 : 2}
                fill="#ddd6fe" opacity={0.95}
                style={{ transition: "r 0.2s" }}
              />
              <text
                x={l.x + (l.x < 600 ? -9 : 9)}
                y={l.y}
                fontSize={hoveredId === l.id ? "12.5" : "11"}
                fill={hoveredId === l.id ? "rgba(221,214,254,0.85)" : "rgba(196,181,253,0.48)"}
                textAnchor={l.x < 600 ? "end" : "start"}
                dominantBaseline="middle"
                style={{ fontFamily: "system-ui, sans-serif", transition: "font-size 0.2s, fill 0.2s", pointerEvents: "none" }}
              >{l.label}</text>
            </g>
          ))}

          {/* Hub nodes */}
          {HUBS.map(h => (
            <g
              key={h.id}
              ref={setGRef(h.id)}
              filter="url(#glow-md)"
              style={{ cursor: "grab" }}
              onPointerDown={e => handlePointerDown(h.id, e)}
              onClick={e => handleNodeClick(h.id, e)}
              onPointerEnter={() => setHoveredId(h.id)}
              onPointerLeave={() => setHoveredId(null)}
            >
              <circle cx={h.x} cy={h.y} r={h.r + (hoveredId === h.id ? 9 : 6)}
                fill="rgba(109,40,217,0.15)"
                style={{ transition: "r 0.25s" }}
              />
              <circle cx={h.x} cy={h.y} r={h.r}
                fill={hoveredId === h.id ? "rgba(109,40,217,0.55)" : "rgba(91,33,182,0.3)"}
                stroke={hoveredId === h.id ? "rgba(196,181,253,0.9)" : "rgba(167,139,250,0.65)"}
                strokeWidth={hoveredId === h.id ? "1.5" : "1"}
                style={{ transition: "fill 0.2s, stroke 0.2s, stroke-width 0.2s" }}
              />
              <circle cx={h.x} cy={h.y} r={4.5} fill="#c4b5fd" />
              <text x={h.x} y={h.y + h.r + 14} fontSize="13"
                fill={hoveredId === h.id ? "rgba(237,233,254,1)" : "rgba(221,214,254,0.85)"}
                textAnchor="middle"
                style={{ fontFamily: "system-ui, sans-serif", fontWeight: 600, pointerEvents: "none", transition: "fill 0.2s" }}>
                {h.label}
              </text>
            </g>
          ))}

          {/* Center — Pari */}
          <g
            ref={setGRef("center")}
            filter="url(#glow-lg)"
            onClick={isBusy ? undefined : jarvis.toggle}
            style={{ cursor: isBusy ? "default" : "pointer" }}
          >
            {/* Listening rings */}
            {jarvis.state === "listening" && (
              <>
                <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.r + 18}
                  fill="none" stroke="rgba(167,139,250,0.18)" strokeWidth="1">
                  <animate attributeName="r"
                    values={`${CENTER.r + 14};${CENTER.r + 32};${CENTER.r + 14}`}
                    dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.r + 8}
                  fill="none" stroke="rgba(167,139,250,0.25)" strokeWidth="0.8">
                  <animate attributeName="r"
                    values={`${CENTER.r + 6};${CENTER.r + 20};${CENTER.r + 6}`}
                    dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </>
            )}
            {/* Speaking rings */}
            {jarvis.state === "speaking" && (
              <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.r + 10}
                fill="none" stroke="rgba(196,181,253,0.3)" strokeWidth="1.2">
                <animate attributeName="r"
                  values={`${CENTER.r + 8};${CENTER.r + 26};${CENTER.r + 8}`}
                  dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="1s" repeatCount="indefinite" />
              </circle>
            )}
            {/* Thinking ring */}
            {jarvis.state === "thinking" && (
              <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.r + 12}
                fill="none" stroke="rgba(251,191,36,0.25)" strokeWidth="0.8"
                strokeDasharray="6 8">
                <animateTransform attributeName="transform" type="rotate"
                  from={`0 ${CENTER.x} ${CENTER.y}`} to={`360 ${CENTER.x} ${CENTER.y}`}
                  dur="3s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.r + 10}
              fill="rgba(109,40,217,0.18)" />
            <circle cx={CENTER.x} cy={CENTER.y} r={CENTER.r}
              fill="rgba(91,33,182,0.42)"
              stroke={jarvis.active ? "rgba(196,181,253,0.95)" : "rgba(167,139,250,0.6)"}
              strokeWidth={jarvis.active ? "1.8" : "1"}
              style={{ transition: "stroke 0.4s, stroke-width 0.4s" }}
            />
            <circle cx={CENTER.x} cy={CENTER.y} r={6.5} fill="#ede9fe" />
            <text x={CENTER.x} y={CENTER.y + CENTER.r + 17} fontSize="15"
              fill="rgba(237,233,254,0.95)" textAnchor="middle"
              style={{ fontFamily: "system-ui, sans-serif", fontWeight: 700, pointerEvents: "none" }}>
              Pari
            </text>
          </g>
        </svg>
      </div>

      {/* State label */}
      <p className={`mt-0 text-xs tracking-widest uppercase transition-all duration-300 ${
        jarvis.active ? "text-violet-300/60" : "text-white/20"
      }`}>{STATE_LABEL[jarvis.state]}</p>

      {jarvis.error && (
        <p className="mt-1 text-xs text-red-400/55 text-center max-w-xs px-4">{jarvis.error}</p>
      )}

      {answer && (
        <div className="mt-3 max-w-xs mx-auto px-4 py-3 rounded-xl text-sm text-white/70 leading-relaxed"
          style={{ background: "rgba(109,40,217,0.07)", border: "1px solid rgba(139,92,246,0.13)" }}>
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
              style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)" }}
            />
            <button onClick={sendTyped} disabled={!typed.trim() || busy}
              className="w-9 h-9 rounded-lg bg-violet-700/55 hover:bg-violet-600/70 disabled:opacity-30 text-white flex items-center justify-center transition-colors">
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
