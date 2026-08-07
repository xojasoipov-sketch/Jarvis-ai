"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { GOLD, BORDER, cardStyle } from "./theme";

/* ── Animation ────────────────────────────────────────────────────────────── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

/** Standard scroll-in wrapper used by every section. */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Section label pill (PORTFOLIO / JARAYON / …) ─────────────────────────── */

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      className="inline-flex items-center text-[11px] font-medium px-3 py-1 rounded-full uppercase tracking-wider"
      style={{ border: `1px solid ${BORDER}`, color: GOLD }}
    >
      {children}
    </div>
  );
}

/* ── Page hero — title where the second line is gold ──────────────────────── */

export function PageHero({
  label,
  titleTop,
  titleGold,
  subtitle,
  children,
}: {
  label?: string;
  titleTop: string;
  titleGold?: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="pt-32 pb-10 md:pt-36">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          {label && (
            <motion.div variants={fadeUp} className="mb-5">
              <SectionLabel>{label}</SectionLabel>
            </motion.div>
          )}
          <motion.h1
            variants={fadeUp}
            className="text-3xl md:text-[2.9rem] font-bold tracking-tight leading-[1.12] text-white"
          >
            {titleTop}
            {titleGold && (
              <>
                <br />
                <span style={{ color: GOLD }}>{titleGold}</span>
              </>
            )}
          </motion.h1>
          {subtitle && (
            <motion.p variants={fadeUp} className="text-white/40 leading-relaxed mt-4 max-w-xl text-[15px]">
              {subtitle}
            </motion.p>
          )}
          {children}
        </Reveal>
      </div>
    </section>
  );
}

/* ── Card ─────────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
}) {
  return (
    <Tag className={`rounded-2xl ${className}`} style={cardStyle}>
      {children}
    </Tag>
  );
}

/* ── Gold-tinted icon tile ────────────────────────────────────────────────── */

export function IconTile({ children, size = 40 }: { children: ReactNode; size?: number }) {
  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: `${GOLD}1a` }}
    >
      {children}
    </div>
  );
}
