"use client";
import { useEffect, useRef, useState } from "react";
import type { JarvisState } from "@/hooks/useJarvisVoice";
import type { MemoryNode } from "@/app/api/pari/nodes/route";

// Butterfly curve (Fay, 1989)
function butterflyPoint(theta: number, scale: number) {
  const r = Math.exp(Math.cos(theta)) - 2 * Math.cos(4 * theta) + Math.pow(Math.sin(theta / 12), 5);
  return { x: Math.sin(theta) * r * scale, y: -Math.cos(theta) * r * scale };
}

type Particle = { baseX: number; baseY: number; phase: number; speed: number; size: number; node: MemoryNode };

// Obsidian graph view palette — crisp, no glow
const STATE_ACCENT: Record<JarvisState, [number, number, number]> = {
  asleep:    [99,  82, 191],
  waking:    [124, 101, 230],
  listening: [139, 92,  246],
  thinking:  [99,  150, 246],
  speaking:  [168, 85,  247],
};

const TYPE_RGB: Record<MemoryNode["type"], [number, number, number]> = {
  vault:   [139, 92,  246],
  task:    [96,  165, 250],
  project: [244, 114, 182],
  agent:   [52,  211, 153],
  tool:    [251, 191, 36],
};

const MIN_PARTICLES = 28;
const MAX_PARTICLES = 300;

export default function NeuralButterfly({
  state,
  nodes,
  level = 0,
}: {
  state: JarvisState;
  nodes: MemoryNode[];
  level?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const positionsRef = useRef<{ x: number; y: number }[]>([]);
  const stateRef = useRef(state);
  const levelRef = useRef(level);
  const [hover, setHover] = useState<{ label: string; x: number; y: number } | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { levelRef.current = level; }, [level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const count = Math.max(MIN_PARTICLES, Math.min(MAX_PARTICLES, nodes.length || MIN_PARTICLES));
    const source: MemoryNode[] = nodes.length
      ? nodes
      : Array.from({ length: MIN_PARTICLES }, (_, i) => ({
          label: "",
          type: (["vault", "tool", "task", "project", "agent"] as MemoryNode["type"][])[i % 5],
        }));
    const loops = count > 120 ? 3 : count > 50 ? 2 : 1.4;

    const pts: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2 * loops;
      const p = butterflyPoint(theta, 1);
      pts.push({
        baseX: p.x,
        baseY: p.y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.7,
        size: 1.4 + Math.random() * 1.4,
        node: source[i % source.length],
      });
    }
    particlesRef.current = pts;

    let raf = 0;
    let t = 0;

    function resize() {
      if (!canvas) return;
      let el: HTMLElement | null = canvas.parentElement;
      let size = 0;
      while (el && size === 0) {
        size = Math.min(el.clientWidth, el.clientHeight);
        if (size === 0) size = el.clientWidth;
        el = el.parentElement;
      }
      size = Math.min(size || 420, 480);
      canvas.width = size * window.devicePixelRatio;
      canvas.height = size * window.devicePixelRatio;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }
    resize();
    const rafResize = requestAnimationFrame(resize);
    window.addEventListener("resize", resize);

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.width, h = canvas.height;
      const dpr = window.devicePixelRatio;
      const cx = w / 2, cy = h / 2 + 8 * dpr;
      const scale = w / 2 / 3.2;

      ctx.clearRect(0, 0, w, h);
      t += 1;

      const s = stateRef.current;
      const mic = levelRef.current;
      const [ar, ag, ab] = STATE_ACCENT[s];
      const speedMul = s === "asleep" ? 0.4 : s === "listening" ? 1.5 : s === "speaking" ? 2.0 : 1.0;
      const breathe = 0.88 + (0.12 + mic * 0.08) * Math.sin(t * 0.018 * speedMul);

      const pts = particlesRef.current;
      const positions: { x: number; y: number }[] = [];

      for (const p of pts) {
        const wobble = Math.sin(t * 0.025 * p.speed + p.phase) * 2.5 * dpr;
        const x = cx + p.baseX * scale * breathe + wobble;
        const y = cy + p.baseY * scale * breathe + wobble * 0.5;
        positions.push({ x, y });
      }
      positionsRef.current = positions;

      // Edges — thin, low-alpha (Obsidian style)
      const edgeAlpha = s === "asleep" ? 0.10 : 0.18;
      const maxDist = 28 * dpr;
      ctx.lineWidth = 0.5 * dpr;
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dx = positions[i].x - positions[j].x;
          const dy = positions[i].y - positions[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < maxDist * maxDist) {
            const t2 = 1 - Math.sqrt(d2) / maxDist;
            ctx.strokeStyle = `rgba(${ar},${ag},${ab},${t2 * edgeAlpha})`;
            ctx.beginPath();
            ctx.moveTo(positions[i].x, positions[i].y);
            ctx.lineTo(positions[j].x, positions[j].y);
            ctx.stroke();
          }
        }
      }

      // Nodes — crisp solid circles (Obsidian graph style)
      for (let i = 0; i < positions.length; i++) {
        const p = pts[i];
        const pos = positions[i];
        const [r, g, b] = TYPE_RGB[p.node.type];
        const flicker = 0.65 + 0.35 * Math.sin(t * 0.035 * p.speed + p.phase);
        const alpha = s === "asleep" ? flicker * 0.55 : flicker * 0.90;
        const sz = p.size * dpr;

        // Tiny soft halo — anti-aliased edge only, not a glow
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, sz + 1.5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.18})`;
        ctx.fill();

        // Crisp solid core dot
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      }

      // Center core — dim, only when active
      if (s !== "asleep") {
        const coreR = (18 + mic * 12) * dpr * breathe;
        const coreAlpha = s === "speaking" ? 0.22 : s === "listening" ? 0.16 : 0.10;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        grad.addColorStop(0, `rgba(${ar},${ag},${ab},${coreAlpha})`);
        grad.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(rafResize);
      window.removeEventListener("resize", resize);
    };
  }, [nodes]);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    const mx = (e.clientX - rect.left) * dpr;
    const my = (e.clientY - rect.top) * dpr;

    let nearest = -1;
    let nearestDist = 16 * dpr;
    const positions = positionsRef.current;
    for (let i = 0; i < positions.length; i++) {
      const dx = positions[i].x - mx, dy = positions[i].y - my;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < nearestDist) { nearestDist = d; nearest = i; }
    }

    if (nearest >= 0) {
      const node = particlesRef.current[nearest]?.node;
      if (node?.label) {
        setHover({ label: node.label, x: e.clientX - rect.left, y: e.clientY - rect.top });
        return;
      }
    }
    setHover(null);
  }

  return (
    <div className="relative" onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
      <canvas ref={canvasRef} className="mx-auto block" />
      {hover && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-md bg-[#1a1730] border border-[#3d3560] px-2.5 py-1.5 text-xs text-[#c4b5fd] shadow-lg max-w-[220px] truncate"
          style={{ left: hover.x, top: hover.y - 8 }}
        >
          {hover.label}
        </div>
      )}
    </div>
  );
}
