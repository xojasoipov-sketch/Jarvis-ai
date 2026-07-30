"use client";
import { useEffect, useRef } from "react";
import type { JarvisState } from "@/hooks/useJarvisVoice";

// Butterfly curve (Fay, 1989): r = e^cos(θ) - 2cos(4θ) + sin(θ/12)^5
// Particles are sampled along this curve so the dot-cloud reads as a butterfly silhouette,
// each dot standing in for a fragment of memory — per the brief, "har bir nuqta 2-miyyamdagi ma'lumot".
function butterflyPoint(theta: number, scale: number) {
  const r = Math.exp(Math.cos(theta)) - 2 * Math.cos(4 * theta) + Math.pow(Math.sin(theta / 12), 5);
  return { x: Math.sin(theta) * r * scale, y: -Math.cos(theta) * r * scale };
}

type Particle = { baseX: number; baseY: number; phase: number; speed: number; size: number };

const STATE_COLOR: Record<JarvisState, string> = {
  asleep: "139, 123, 240",
  waking: "168, 130, 255",
  listening: "196, 140, 255",
  thinking: "150, 160, 255",
  speaking: "210, 150, 255",
};

export default function NeuralButterfly({ state }: { state: JarvisState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const stateRef = useRef(state);

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const COUNT = 260;
    const pts: Particle[] = [];
    for (let i = 0; i < COUNT; i++) {
      const theta = (i / COUNT) * Math.PI * 2 * 3; // 3 loops around the curve for density
      const jitterScale = 1;
      const p = butterflyPoint(theta, jitterScale);
      pts.push({
        baseX: p.x,
        baseY: p.y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 0.8,
        size: 1 + Math.random() * 1.8,
      });
    }
    particlesRef.current = pts;

    let raf = 0;
    let t = 0;

    function resize() {
      if (!canvas) return;
      const parent = canvas.parentElement;
      const size = Math.min(parent?.clientWidth || 480, parent?.clientHeight || 480, 480);
      canvas.width = size * window.devicePixelRatio;
      canvas.height = size * window.devicePixelRatio;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.width, h = canvas.height;
      const dpr = window.devicePixelRatio;
      const cx = w / 2, cy = h / 2 + 10 * dpr;
      const scale = (w / 2 / 3.2);

      ctx.clearRect(0, 0, w, h);

      const s = stateRef.current;
      const color = STATE_COLOR[s];
      const speedMul = s === "asleep" ? 0.5 : s === "listening" ? 1.6 : s === "speaking" ? 2.2 : 1.1;
      const breathe = 0.85 + 0.15 * Math.sin(t * 0.02 * speedMul);

      t += 1;

      const pts = particlesRef.current;
      const positions: { x: number; y: number }[] = [];

      for (const p of pts) {
        const wobble = Math.sin(t * 0.03 * p.speed + p.phase) * 3 * dpr;
        const x = cx + (p.baseX * scale) * breathe + wobble;
        const y = cy + (p.baseY * scale) * breathe + wobble * 0.6;
        positions.push({ x, y });
      }

      // faint neural connections between nearby particles
      ctx.lineWidth = 0.6 * dpr;
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dx = positions[i].x - positions[j].x;
          const dy = positions[i].y - positions[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 22 * dpr;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.12;
            ctx.strokeStyle = `rgba(${color}, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(positions[i].x, positions[i].y);
            ctx.lineTo(positions[j].x, positions[j].y);
            ctx.stroke();
          }
        }
      }

      // particles
      for (let i = 0; i < positions.length; i++) {
        const p = pts[i];
        const pos = positions[i];
        const flicker = 0.5 + 0.5 * Math.sin(t * 0.04 * p.speed + p.phase);
        const alpha = 0.35 + flicker * 0.55;
        const size = p.size * dpr * (0.8 + flicker * 0.6);

        const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size * 4);
        glow.addColorStop(0, `rgba(${color}, ${alpha})`);
        glow.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${color}, ${Math.min(1, alpha + 0.3)})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // core glow at the body
      const coreAlpha = s === "speaking" ? 0.5 : s === "listening" ? 0.4 : 0.25;
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 * dpr * breathe);
      core.addColorStop(0, `rgba(${color}, ${coreAlpha})`);
      core.addColorStop(1, `rgba(${color}, 0)`);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, 40 * dpr * breathe, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="mx-auto block" />;
}
