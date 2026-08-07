"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { GOLD, BORDER, goldButtonStyle, outlineStyle } from "../../_components/theme";
import { fadeUp, Reveal, SectionLabel, Card } from "../../_components/ui";
import type { Project } from "../../_data";

/** Abstract phone mockups standing in for the project screenshots. */
function ProjectVisual({ gradient }: { gradient: string }) {
  return (
    <div className="relative w-full aspect-[4/3] max-w-[440px] mx-auto">
      <div
        className="absolute inset-[8%] rounded-3xl blur-3xl opacity-60"
        style={{ background: `radial-gradient(circle at 50% 50%, ${GOLD}44, transparent 65%)` }}
      />
      {[
        { left: "6%", top: "14%", rotate: -8, scale: 0.82, z: 1 },
        { left: "50%", top: "6%", rotate: 0, scale: 1, z: 3 },
        { left: "76%", top: "16%", rotate: 8, scale: 0.82, z: 2 },
      ].map((p, i) => (
        <div
          key={i}
          className="absolute rounded-[1.6rem] overflow-hidden"
          style={{
            left: p.left,
            top: p.top,
            width: "30%",
            aspectRatio: "9 / 19",
            transform: `translateX(-50%) rotate(${p.rotate}deg) scale(${p.scale})`,
            zIndex: p.z,
            background: gradient,
            border: `1px solid ${GOLD}33`,
            boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
          }}
        >
          <div className="absolute inset-x-0 top-0 h-6 flex items-center justify-center">
            <div className="w-8 h-1 rounded-full bg-white/20" />
          </div>
          <div className="absolute inset-x-3 top-10 space-y-2">
            <div className="h-1.5 rounded-full bg-white/25" style={{ width: "70%" }} />
            <div className="h-1.5 rounded-full bg-white/12" style={{ width: "50%" }} />
          </div>
          <div className="absolute inset-x-3 top-20 grid grid-cols-2 gap-1.5">
            {Array.from({ length: 4 }).map((_, k) => (
              <div key={k} className="rounded-md bg-white/8" style={{ aspectRatio: "1 / 1" }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProjectDetail({ project }: { project: Project }) {
  return (
    <>
      <section className="pt-32 pb-12 md:pt-36">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal>
            <motion.div variants={fadeUp} className="mb-6">
              <Link
                href="/portfolio/loyihalar"
                className="inline-flex items-center gap-2 text-[13px] text-white/45 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} /> Barcha loyihalar
              </Link>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <motion.div variants={fadeUp} className="mb-5">
                  <SectionLabel>{project.category}</SectionLabel>
                </motion.div>
                <motion.h1
                  variants={fadeUp}
                  className="text-3xl md:text-[2.7rem] font-bold tracking-tight leading-[1.12] text-white mb-4"
                >
                  <span style={{ color: GOLD }}>{project.title}</span>
                  <br />
                  {project.tagline}
                </motion.h1>
                <motion.p variants={fadeUp} className="text-white/40 leading-relaxed mb-6 max-w-md text-[15px]">
                  {project.summary}
                </motion.p>
                <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
                  {project.tech.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] font-medium px-3 py-1.5 rounded-full text-white/70"
                      style={outlineStyle}
                    >
                      {t}
                    </span>
                  ))}
                </motion.div>
              </div>

              <motion.div variants={fadeUp}>
                <ProjectVisual gradient={project.gradient} />
              </motion.div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-12">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal>
            <Card className="grid grid-cols-2 md:grid-cols-4 divide-x">
              {project.metrics.map((m) => (
                <motion.div key={m.label} variants={fadeUp} className="px-5 py-6" style={{ borderColor: BORDER }}>
                  <div className="text-2xl md:text-3xl font-bold leading-none" style={{ color: GOLD }}>
                    {m.value}
                  </div>
                  <div className="text-[12px] text-white/40 mt-2 leading-tight">{m.label}</div>
                </motion.div>
              ))}
            </Card>
          </Reveal>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal>
            <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-white mb-8">
              Loyiha haqida
            </motion.h2>
            <div className="grid md:grid-cols-2 gap-5">
              <motion.div variants={fadeUp}>
                <Card className="p-6 md:p-7 h-full">
                  <h3 className="font-semibold text-white mb-3">Muammo</h3>
                  <p className="text-[14px] text-white/45 leading-relaxed">{project.problem}</p>
                </Card>
              </motion.div>
              <motion.div variants={fadeUp}>
                <Card className="p-6 md:p-7 h-full">
                  <h3 className="font-semibold mb-3" style={{ color: GOLD }}>Yechimimiz</h3>
                  <p className="text-[14px] text-white/45 leading-relaxed">{project.solution}</p>
                </Card>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal>
            <motion.div variants={fadeUp}>
              <Card className="p-8 md:p-10 text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Shunga o{"'"}xshash loyiha kerakmi?</h2>
                <p className="text-white/40 max-w-lg mx-auto mb-7 leading-relaxed">
                  Bepul konsultatsiya oling — g{"'"}oyangizni birgalikda rejaga aylantiramiz.
                </p>
                <Link
                  href="/portfolio/aloqa"
                  className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-full transition-opacity hover:opacity-90"
                  style={goldButtonStyle}
                >
                  Buyurtma berish <ArrowRight size={16} />
                </Link>
              </Card>
            </motion.div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
