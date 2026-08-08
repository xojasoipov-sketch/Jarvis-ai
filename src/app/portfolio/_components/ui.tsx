"use client";

import type { ReactNode, CSSProperties } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  GOLD, TEXT_DIM, BORDER, CONTAINER, RADIUS, SHADOW_LUXURY,
  gold, alpha, glass, goldButtonStyle, ghostButtonStyle,
} from "./theme";
import { fadeUp, Reveal, TextReveal, Magnetic, Spotlight, Lift } from "./motion";

export { fadeUp, stagger, Reveal, TextReveal, Counter, Magnetic, Spotlight, Lift, Parallax, Floating, PointerTilt } from "./motion";

/* ── Layout ───────────────────────────────────────────────────────────────── */

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${CONTAINER} ${className}`}>{children}</div>;
}

/**
 * Vertical rhythm wrapper — the brief calls for generous, consistent spacing.
 *
 * Top and bottom padding are props rather than something callers override via
 * className: a plain `pt-4` loses to this component's own `md:pt-28`, because a
 * media-query rule outranks an unqualified one. That silently left ~190px of
 * dead space under every page heading.
 */
export function Section({
  children,
  className = "",
  id,
  style,
  top = true,
  bottom = true,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
  /** Set false to butt this section against the one above it. */
  top?: boolean;
  /** Set false to butt this section against the one below it. */
  bottom?: boolean;
}) {
  const padTop = top ? "pt-20 md:pt-28" : "pt-0";
  const padBottom = bottom ? "pb-20 md:pb-28" : "pb-0";
  return (
    <section id={id} className={`${padTop} ${padBottom} ${className}`} style={style}>
      <Container>{children}</Container>
    </section>
  );
}

/* ── Eyebrow label ────────────────────────────────────────────────────────── */

export function SectionLabel({ children, color = GOLD }: { children: ReactNode; color?: string }) {
  return (
    <div
      className="inline-flex items-center gap-2 text-[11px] font-medium px-3.5 py-1.5 rounded-full uppercase tracking-[0.18em]"
      style={{ border: `1px solid ${alpha(color, 0.24)}`, color, background: alpha(color, 0.05) }}
    >
      <span className="w-1 h-1 rounded-full" style={{ background: color }} />
      {children}
    </div>
  );
}

/* ── Section heading ──────────────────────────────────────────────────────── */

export function SectionHeading({
  label,
  title,
  highlight,
  subtitle,
  align = "left",
  className = "",
}: {
  label?: string;
  title: string;
  /** Words inside `title` to render in gold. */
  highlight?: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div className={`${centered ? "text-center mx-auto max-w-2xl" : "max-w-2xl"} ${className}`}>
      {label && (
        <motion.div variants={fadeUp} className="mb-5">
          <SectionLabel>{label}</SectionLabel>
        </motion.div>
      )}
      <TextReveal
        as="h2"
        text={title}
        highlight={highlight}
        className="text-[2rem] md:text-[2.75rem] font-bold tracking-[-0.02em] leading-[1.12]"
      />
      {subtitle && (
        <motion.p
          variants={fadeUp}
          className="mt-5 text-[15px] leading-relaxed"
          style={{ color: TEXT_DIM }}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}

/* ── Page hero ────────────────────────────────────────────────────────────── */

export function PageHero({
  label,
  title,
  highlight,
  subtitle,
  children,
  accent = GOLD,
}: {
  label?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  children?: ReactNode;
  /** Defaults to gold; pages with a strong topical identity (AI, xizmatlar) can pass their own. */
  accent?: string;
}) {
  return (
    <section className="relative pt-40 pb-14 md:pt-48 md:pb-20 overflow-hidden">
      {/* volumetric wash behind the heading */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[460px] pointer-events-none"
        style={{ background: `radial-gradient(ellipse 55% 100% at 50% 0%, ${alpha(accent, 0.09)}, transparent 70%)` }}
      />
      <Container>
        <Reveal className="relative">
          {label && (
            <motion.div variants={fadeUp} className="mb-6">
              <SectionLabel color={accent}>{label}</SectionLabel>
            </motion.div>
          )}
          <TextReveal
            as="h1"
            text={title}
            highlight={highlight}
            className="text-[2.5rem] md:text-[4rem] font-bold tracking-[-0.03em] leading-[1.06] max-w-4xl"
          />
          {subtitle && (
            <motion.p
              variants={fadeUp}
              className="mt-6 text-base md:text-lg leading-relaxed max-w-xl"
              style={{ color: TEXT_DIM }}
            >
              {subtitle}
            </motion.p>
          )}
          {children}
        </Reveal>
      </Container>
    </section>
  );
}

/* ── Cards ────────────────────────────────────────────────────────────────── */

/** Frosted card with a cursor-tracking gold spotlight and hover lift. */
export function GlassCard({
  children,
  className = "",
  style,
  interactive = true,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  interactive?: boolean;
}) {
  const surface = (
    <div
      className={`h-full overflow-hidden ${className}`}
      style={{ ...glass, boxShadow: SHADOW_LUXURY, ...style }}
    >
      {children}
    </div>
  );

  if (!interactive) return surface;

  return (
    <Lift className="h-full">
      <Spotlight className="h-full" style={{ borderRadius: RADIUS }}>
        {surface}
      </Spotlight>
    </Lift>
  );
}

/* ── Icon tile ────────────────────────────────────────────────────────────── */

export function IconTile({
  children,
  size = 44,
  color = GOLD,
}: {
  children: ReactNode;
  size?: number;
  /** Defaults to gold; pass a category/service accent to break the monotone look. */
  color?: string;
}) {
  return (
    <div
      className="rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(150deg, ${alpha(color, 0.16)}, ${alpha(color, 0.04)})`,
        border: `1px solid ${alpha(color, 0.2)}`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Buttons ──────────────────────────────────────────────────────────────── */

export function GoldButton({
  href,
  children,
  className = "",
  size = "md",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  size?: "md" | "lg";
}) {
  const pad = size === "lg" ? "px-7 py-4 text-[15px]" : "px-6 py-3.5 text-sm";
  return (
    <Magnetic>
      <Link
        href={href}
        className={`inline-flex items-center gap-2 font-semibold rounded-full whitespace-nowrap transition-transform ${pad} ${className}`}
        style={goldButtonStyle}
      >
        {children}
      </Link>
    </Magnetic>
  );
}

export function GhostButton({
  href,
  children,
  className = "",
  size = "md",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  size?: "md" | "lg";
}) {
  const pad = size === "lg" ? "px-7 py-4 text-[15px]" : "px-6 py-3.5 text-sm";
  return (
    <Magnetic strength={0.25}>
      <Link
        href={href}
        className={`inline-flex items-center gap-2 font-medium rounded-full whitespace-nowrap transition-colors hover:border-white/20 ${pad} ${className}`}
        style={ghostButtonStyle}
      >
        {children}
      </Link>
    </Magnetic>
  );
}

/* ── Closing CTA band, reused at the foot of most pages ───────────────────── */

export function CtaBand({
  title,
  subtitle,
  primaryHref = "/portfolio/aloqa",
  primaryLabel = "Buyurtma berish",
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  subtitle: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <Section>
      <Reveal>
        <motion.div variants={fadeUp}>
          <div
            className="relative overflow-hidden px-8 py-14 md:px-16 md:py-20 text-center"
            style={{ ...glass, boxShadow: SHADOW_LUXURY }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse 60% 90% at 50% 0%, ${gold(0.13)}, transparent 70%)` }}
            />
            <div className="relative">
              <TextReveal
                as="h2"
                text={title}
                className="text-[1.9rem] md:text-[2.6rem] font-bold tracking-[-0.02em] leading-[1.12] max-w-2xl mx-auto"
              />
              <motion.p
                variants={fadeUp}
                className="mt-5 max-w-lg mx-auto leading-relaxed"
                style={{ color: TEXT_DIM }}
              >
                {subtitle}
              </motion.p>
              <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <GoldButton href={primaryHref} size="lg">
                  {primaryLabel} <ArrowRight size={16} />
                </GoldButton>
                {secondaryHref && secondaryLabel && (
                  <GhostButton href={secondaryHref} size="lg">
                    {secondaryLabel}
                  </GhostButton>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </Reveal>
    </Section>
  );
}
