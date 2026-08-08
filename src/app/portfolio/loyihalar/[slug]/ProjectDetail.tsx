"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import {
  GOLD, TEXT_DIM, BORDER, BG_ALT, SURFACE, gold, alpha, SHADOW_LUXURY, goldButtonStyle,
  CATEGORY_ACCENT, type ProjectCategoryName,
} from "../../_components/theme";
import {
  Container, Section, SectionLabel, SectionHeading, GlassCard, CtaBand,
  fadeUp, Reveal, TextReveal, Counter, Lift, PointerTilt, Floating,
} from "../../_components/ui";
import type { Project } from "@/lib/portfolio-store";

function categoryAccent(cat: string): string {
  return CATEGORY_ACCENT[cat as ProjectCategoryName] ?? GOLD;
}

/** Device mockups standing in for project screenshots — no image assets needed. */
function ProjectShowcase({ project }: { project: Project }) {
  const accent = categoryAccent(project.category);

  // Haqiqiy mavzuga mos grafika bo'lsa shuni ko'rsatamiz — bo'lmasa pastdagi
  // abstrakt telefon-mockup fallback ishlaydi.
  if (project.cover_url) {
    return (
      <PointerTilt intensity={5} className="relative w-full max-w-[560px] mx-auto">
        <div
          className="relative overflow-hidden aspect-[16/10]"
          style={{ borderRadius: 28, border: `1px solid ${alpha(accent, 0.24)}`, boxShadow: SHADOW_LUXURY }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={project.cover_url} alt={project.title} className="h-full w-full object-cover" />
        </div>
      </PointerTilt>
    );
  }

  return (
    <PointerTilt intensity={7} className="relative w-full aspect-[4/3] max-w-[520px] mx-auto">
      <div
        aria-hidden="true"
        className="absolute inset-[6%] blur-3xl"
        style={{ background: `radial-gradient(circle at 50% 45%, ${alpha(accent, 0.28)}, transparent 66%)` }}
      />
      {[
        { left: "8%", top: "16%", rot: -9, scale: 0.84, z: 1, delay: 0.4 },
        { left: "50%", top: "6%", rot: 0, scale: 1, z: 3, delay: 0 },
        { left: "78%", top: "18%", rot: 9, scale: 0.84, z: 2, delay: 0.8 },
      ].map((p, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: p.left,
            top: p.top,
            width: "30%",
            transform: `translateX(-50%) rotate(${p.rot}deg) scale(${p.scale})`,
            zIndex: p.z,
          }}
        >
          <Floating amplitude={6} duration={7 + i} delay={p.delay}>
            <div
              className="relative w-full overflow-hidden"
              style={{
                aspectRatio: "9 / 19",
                borderRadius: 26,
                background: project.gradient,
                border: `1px solid ${alpha(accent, 0.22)}`,
                boxShadow: "0 30px 70px -18px rgba(0,0,0,0.85)",
              }}
            >
              <div className="absolute inset-x-0 top-0 h-7 flex items-center justify-center">
                <div className="w-9 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.22)" }} />
              </div>
              <div className="absolute inset-x-4 top-12 space-y-2.5">
                <div className="h-2 rounded-full" style={{ width: "72%", background: alpha(accent, 0.5) }} />
                <div className="h-1.5 rounded-full" style={{ width: "48%", background: "rgba(255,255,255,0.16)" }} />
              </div>
              <div className="absolute inset-x-4 top-28 grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, k) => (
                  <div
                    key={k}
                    className="rounded-lg"
                    style={{ aspectRatio: "1 / 1", background: "rgba(255,255,255,0.07)" }}
                  />
                ))}
              </div>
            </div>
          </Floating>
        </div>
      ))}
    </PointerTilt>
  );
}

export default function ProjectDetail({
  project,
  next,
}: {
  project: Project;
  next: Project;
}) {
  const accent = categoryAccent(project.category);
  const nextAccent = categoryAccent(next.category);
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative pt-36 pb-16 md:pt-44 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[560px] pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 100% at 60% 5%, ${alpha(accent, 0.1)}, transparent 68%)` }}
        />
        <Container className="relative">
          <Reveal>
            <motion.div variants={fadeUp} className="mb-8">
              <Link
                href="/portfolio/loyihalar"
                className="inline-flex items-center gap-2 text-[13px] transition-colors hover:text-white"
                style={{ color: TEXT_DIM }}
              >
                <ArrowLeft size={14} /> Barcha loyihalar
              </Link>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <motion.div variants={fadeUp} className="mb-6">
                  <SectionLabel color={accent}>{project.category}</SectionLabel>
                </motion.div>
                <TextReveal
                  as="h1"
                  text={project.title}
                  highlight={project.title}
                  className="text-[2.5rem] md:text-[3.5rem] font-bold tracking-[-0.03em] leading-[1.06]"
                />
                <motion.p
                  variants={fadeUp}
                  className="mt-6 text-base md:text-lg leading-relaxed max-w-md"
                  style={{ color: TEXT_DIM }}
                >
                  {project.summary}
                </motion.p>
                <motion.div variants={fadeUp} className="flex flex-wrap gap-2.5 mt-8">
                  {project.tech.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] font-medium px-3.5 py-2 rounded-full"
                      style={{ border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.03)" }}
                    >
                      {t}
                    </span>
                  ))}
                </motion.div>

                {/* Loyiha ochiq bo'lsa — to'g'ridan-to'g'ri havola */}
                {project.link && (
                  <motion.div variants={fadeUp} className="mt-8">
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[13px] font-semibold transition hover:brightness-110"
                      style={goldButtonStyle}
                    >
                      Loyihani ko{"'"}rish
                      <ExternalLink size={14} />
                    </a>
                  </motion.div>
                )}
              </div>

              <motion.div variants={fadeUp}>
                <ProjectShowcase project={project} />
              </motion.div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Results — faqat haqiqiy o'lchangan raqamlar bo'lsa ── */}
      {project.metrics.length > 0 && (
      <Section top={false}>
        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {project.metrics.map((m) => (
              <motion.div key={m.label} variants={fadeUp}>
                <GlassCard className="p-7">
                  <Counter
                    value={m.value}
                    className="block text-[2.25rem] font-bold leading-none tracking-[-0.02em]"
                    style={{ color: GOLD }}
                  />
                  <span className="block text-[12px] mt-3" style={{ color: TEXT_DIM }}>{m.label}</span>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </Section>
      )}

      {/* ── Problem / Solution — ikkalasi ham yozilgan bo'lsa ── */}
      {project.problem && project.solution && (
      <Section style={{ background: BG_ALT }}>
        <Reveal>
          <SectionHeading label="Loyiha haqida" title="Muammo va yechim" highlight="yechim" className="mb-12" />
          <div className="grid md:grid-cols-2 gap-5">
            <motion.div variants={fadeUp}>
              <GlassCard className="p-8 md:p-10 h-full">
                <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: TEXT_DIM }}>Muammo</span>
                <p className="text-[15px] leading-relaxed mt-5" style={{ color: "rgba(255,255,255,0.72)" }}>
                  {project.problem}
                </p>
              </GlassCard>
            </motion.div>
            <motion.div variants={fadeUp}>
              <div
                className="p-8 md:p-10 h-full"
                style={{
                  borderRadius: 24,
                  background: `linear-gradient(165deg, ${alpha(accent, 0.12)}, rgba(18,18,18,0.85))`,
                  border: `1px solid ${alpha(accent, 0.26)}`,
                  boxShadow: SHADOW_LUXURY,
                }}
              >
                <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: accent }}>Yechimimiz</span>
                <p className="text-[15px] leading-relaxed mt-5" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {project.solution}
                </p>
              </div>
            </motion.div>
          </div>
        </Reveal>
      </Section>
      )}

      {/* ── Next project ── */}
      <Section>
        <Reveal>
          <motion.div variants={fadeUp}>
            <Link href={`/portfolio/loyihalar/${next.slug}`} className="block">
              <Lift>
                <div
                  className="relative overflow-hidden group px-8 py-14 md:px-14 md:py-16"
                  style={{ borderRadius: 24, border: `1px solid ${BORDER}`, background: SURFACE }}
                >
                  <div
                    className="absolute inset-0 opacity-40 transition-transform duration-700 group-hover:scale-105"
                    style={{ background: next.gradient }}
                  />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.9), rgba(0,0,0,0.55))" }} />
                  <div className="relative flex flex-wrap items-center justify-between gap-6">
                    <div>
                      <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: TEXT_DIM }}>
                        Keyingi loyiha
                      </span>
                      <h2 className="text-2xl md:text-3xl font-bold mt-3">{next.title}</h2>
                      <span className="text-[13px] mt-2 block" style={{ color: nextAccent }}>{next.tagline}</span>
                    </div>
                    <span
                      className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:translate-x-1"
                      style={{ border: `1px solid ${alpha(nextAccent, 0.3)}`, background: alpha(nextAccent, 0.1) }}
                    >
                      <ArrowRight size={18} style={{ color: nextAccent }} />
                    </span>
                  </div>
                </div>
              </Lift>
            </Link>
          </motion.div>
        </Reveal>
      </Section>

      <CtaBand
        title="Shunga o'xshash loyiha kerakmi?"
        subtitle="Bepul konsultatsiya oling — g'oyangizni birgalikda rejaga aylantiramiz."
      />
    </>
  );
}
