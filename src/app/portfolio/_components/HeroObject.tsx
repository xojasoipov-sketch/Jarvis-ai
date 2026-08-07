"use client";

/**
 * Cinematic hero object — a cluster of black volcanic rock shot through with
 * molten gold, wrapped in gold orbit rings and suspended dust.
 *
 * Built from layered CSS and SVG rather than a WebGL scene: it renders on the
 * server, costs no extra bundle, stays sharp at any density, and cannot fail
 * to load. The whole assembly tilts toward the cursor.
 */

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { GOLD, GOLD_DEEP, gold } from "./theme";
import { Floating, PointerTilt } from "./motion";

/* A rock shard: irregular polygon, dark body, gold rim and a molten seam. */
function Shard({
  points,
  seam,
  depth,
}: {
  points: string;
  seam?: string;
  /** 0 = closest/lightest, 1 = furthest/darkest. */
  depth: number;
}) {
  const light = 34 - depth * 20;
  return (
    <g>
      <polygon
        points={points}
        fill={`url(#rockFace${depth < 0.4 ? "Near" : "Far"})`}
        stroke={gold(0.22 - depth * 0.12)}
        strokeWidth="0.35"
        style={{ filter: `brightness(${light / 24})` }}
      />
      {seam && (
        <path
          d={seam}
          stroke={GOLD}
          strokeWidth={0.9 - depth * 0.35}
          fill="none"
          strokeLinecap="round"
          opacity={0.9 - depth * 0.4}
          style={{ filter: "url(#seamGlow)" }}
        />
      )}
    </g>
  );
}

export default function HeroObject({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();

  // Deterministic dust, rounded to fixed precision. Full-precision floats
  // serialise differently on the server and the client (…288578 vs …28858),
  // which React reports as a hydration attribute mismatch.
  const dust = useMemo(() => {
    const round = (n: number) => Number(n.toFixed(3));
    return Array.from({ length: 34 }, (_, i) => {
      const a = (i * 137.508 * Math.PI) / 180; // golden angle
      const r = 26 + ((i * 7.3) % 26);
      return {
        x: round(50 + Math.cos(a) * r),
        y: round(50 + Math.sin(a) * r * 0.82),
        s: round(0.35 + ((i * 13) % 10) / 14),
        o: round(0.18 + ((i * 17) % 10) / 22),
        d: round((i % 7) * 0.55),
      };
    });
  }, []);

  return (
    <PointerTilt intensity={9} className={`relative w-full max-w-[560px] mx-auto ${className}`}>
      <div className="relative w-full aspect-square">
        {/* volumetric key light */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 58% 42%, ${gold(0.3)} 0%, ${gold(0.07)} 32%, transparent 62%)`,
            filter: "blur(28px)",
          }}
        />

        {/* orbit rings — tilted, counter-rotating */}
        {[
          { size: 92, rx: 68, dur: 34, dir: 1, op: 0.42 },
          { size: 78, rx: 74, dur: 26, dir: -1, op: 0.26 },
          { size: 104, rx: 80, dur: 46, dir: 1, op: 0.16 },
        ].map((ring, i) => (
          <motion.div
            key={i}
            aria-hidden="true"
            className="absolute left-1/2 top-1/2"
            style={{
              width: `${ring.size}%`,
              height: `${ring.size}%`,
              marginLeft: `-${ring.size / 2}%`,
              marginTop: `-${ring.size / 2}%`,
              borderRadius: "50%",
              border: `1px solid ${gold(ring.op)}`,
              transform: `rotateX(${ring.rx}deg)`,
              transformStyle: "preserve-3d",
            }}
            animate={reduce ? undefined : { rotateZ: ring.dir * 360 }}
            transition={{ duration: ring.dur, repeat: Infinity, ease: "linear" }}
          >
            {/* travelling node on the ring */}
            <span
              className="absolute rounded-full"
              style={{
                width: 6,
                height: 6,
                top: -3,
                left: "50%",
                marginLeft: -3,
                background: GOLD,
                boxShadow: `0 0 12px ${GOLD}, 0 0 24px ${gold(0.6)}`,
              }}
            />
          </motion.div>
        ))}

        {/* rock cluster */}
        <Floating amplitude={7} duration={9}>
          <svg viewBox="0 0 100 100" className="relative w-full h-full" role="img" aria-label="SADIPRIME belgisi">
            <defs>
              <linearGradient id="rockFaceNear" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2b2723" />
                <stop offset="55%" stopColor="#17140f" />
                <stop offset="100%" stopColor="#0a0908" />
              </linearGradient>
              <linearGradient id="rockFaceFar" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1a1815" />
                <stop offset="100%" stopColor="#070606" />
              </linearGradient>
              <linearGradient id="goldMetal" x1="0" y1="0" x2="0.4" y2="1">
                <stop offset="0%" stopColor="#F3D9AE" />
                <stop offset="38%" stopColor={GOLD} />
                <stop offset="70%" stopColor={GOLD_DEEP} />
                <stop offset="100%" stopColor="#8A6430" />
              </linearGradient>
              <filter id="seamGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="0.9" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="markGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="contactShadow" cx="0.5" cy="0.5">
                <stop offset="0%" stopColor="rgba(0,0,0,0.75)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            </defs>

            {/* ground contact shadow */}
            <ellipse cx="50" cy="83" rx="30" ry="6" fill="url(#contactShadow)" />

            {/* back shards */}
            <Shard depth={0.9} points="18,52 30,36 44,42 38,60 22,62" />
            <Shard depth={0.85} points="58,32 74,30 82,44 70,50 58,44" seam="M62,38 L72,42" />
            <Shard depth={0.75} points="36,30 50,24 58,34 46,42" />

            {/* mid shards */}
            <Shard depth={0.45} points="24,58 40,50 52,60 46,74 28,72" seam="M30,64 L42,58 L47,67" />
            <Shard depth={0.4} points="52,46 68,44 78,56 66,68 54,62" seam="M58,54 L68,50" />

            {/* front shards */}
            <Shard depth={0.1} points="34,62 50,56 62,66 54,80 38,78" seam="M40,70 L50,63 L58,71" />
            <Shard depth={0.15} points="60,60 74,58 80,70 68,76 60,70" seam="M64,66 L74,63" />

            {/* molten pool under the cluster */}
            <ellipse cx="52" cy="77" rx="19" ry="4" fill={gold(0.5)} style={{ filter: "url(#seamGlow)" }} />

            {/* gold metallic mark, seated in the rock */}
            <g style={{ filter: "url(#markGlow)" }}>
              <path
                d="M50 34 L70 66 L30 66 Z"
                fill="none"
                stroke="url(#goldMetal)"
                strokeWidth="3.2"
                strokeLinejoin="round"
              />
              <path d="M50 44 L60 61 L40 61 Z" fill="url(#goldMetal)" opacity="0.9" />
            </g>
          </svg>
        </Floating>

        {/* suspended dust */}
        <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none">
          {dust.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.s}
              fill={GOLD}
              opacity={p.o}
              animate={reduce ? undefined : { cy: [p.y, p.y - 3.5, p.y], opacity: [p.o, Number((p.o * 1.9).toFixed(3)), p.o] }}
              transition={{ duration: 5 + (i % 5), delay: p.d, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </svg>

        {/* floating spheres */}
        <div aria-hidden="true" className="absolute" style={{ top: "6%", left: "70%" }}>
          <Floating amplitude={11} duration={7}>
            <span
              className="block rounded-full"
              style={{
                width: 22,
                height: 22,
                background: "radial-gradient(circle at 32% 28%, #5b5550 0%, #2a2724 40%, #0b0a09 100%)",
                boxShadow: "0 10px 26px rgba(0,0,0,0.7), inset -3px -4px 8px rgba(0,0,0,0.6)",
              }}
            />
          </Floating>
        </div>
        <div aria-hidden="true" className="absolute" style={{ bottom: "16%", left: "12%" }}>
          <Floating amplitude={8} duration={9} delay={1.2}>
            <span
              className="block rounded-full"
              style={{
                width: 13,
                height: 13,
                background: "radial-gradient(circle at 34% 30%, #4a4540 0%, #211f1c 45%, #0a0908 100%)",
                boxShadow: "0 8px 20px rgba(0,0,0,0.7)",
              }}
            />
          </Floating>
        </div>
      </div>
    </PointerTilt>
  );
}
