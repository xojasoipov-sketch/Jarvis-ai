"use client";

import { motion } from "framer-motion";
import { ArrowRight, MapPin, Clock, Sparkles } from "lucide-react";
import { GOLD, TEXT_DIM, BG_ALT, gold } from "../_components/theme";
import {
  Section, SectionHeading, PageHero, GlassCard, GhostButton, CtaBand,
  fadeUp, Reveal, Lift,
} from "../_components/ui";

const OPENINGS = [
  { role: "Frontend Developer", type: "To'liq stavka", place: "Andijon / Masofaviy", stack: "Next.js · TypeScript · Tailwind" },
  { role: "AI Engineer", type: "To'liq stavka", place: "Masofaviy", stack: "Python · LLM · RAG" },
  { role: "UI/UX Designer", type: "Loyiha asosida", place: "Masofaviy", stack: "Figma · Design systems" },
  { role: "SMM Manager", type: "Yarim stavka", place: "Andijon", stack: "Kontent · Target · Analitika" },
];

const PERKS = [
  { t: "Masofaviy ish", d: "Qayerdan ishlashingiz emas, natijangiz muhim" },
  { t: "Real loyihalar", d: "Birinchi kundan ishlab turgan mahsulotlar ustida" },
  { t: "O'quv byudjeti", d: "Kurs va sertifikatlar xarajatini qoplaymiz" },
  { t: "Moslashuvchan grafik", d: "Ish vaqtini o'zingiz rejalashtirasiz" },
];

export default function KaryeraPage() {
  return (
    <>
      <PageHero
        label="Karyera"
        title="Karyerangizni biz bilan boshlang"
        highlight="biz bilan boshlang"
        subtitle="Kichik jamoada katta loyihalar ustida ishlang. Biz tajribadan ko'ra o'rganishga tayyorlikni ko'proq qadrlaymiz."
      />

      {/* ── Perks ── */}
      <Section top={false}>
        <Reveal className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PERKS.map((p) => (
            <motion.div key={p.t} variants={fadeUp}>
              <GlassCard className="p-7 h-full">
                <div
                  className="w-2 h-2 rounded-full mb-6"
                  style={{ background: GOLD, boxShadow: `0 0 14px ${GOLD}` }}
                />
                <h2 className="font-semibold text-[16px] mb-2.5">{p.t}</h2>
                <p className="text-[13px] leading-relaxed" style={{ color: TEXT_DIM }}>{p.d}</p>
              </GlassCard>
            </motion.div>
          ))}
        </Reveal>
      </Section>

      {/* ── Openings ── */}
      <Section style={{ background: BG_ALT }}>
        <Reveal>
          <SectionHeading
            label="Vakansiyalar"
            title="Ochiq pozitsiyalar"
            highlight="pozitsiyalar"
            className="mb-12"
          />
          <div className="space-y-4">
            {OPENINGS.map((o) => (
              <motion.div key={o.role} variants={fadeUp}>
                <Lift>
                  <GlassCard className="p-7 md:p-8" interactive={false}>
                    <div className="flex flex-wrap items-center justify-between gap-6">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[17px] mb-3">{o.role}</h3>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]" style={{ color: TEXT_DIM }}>
                          <span className="flex items-center gap-1.5"><Clock size={12} /> {o.type}</span>
                          <span className="flex items-center gap-1.5"><MapPin size={12} /> {o.place}</span>
                          <span style={{ color: gold(0.85) }}>{o.stack}</span>
                        </div>
                      </div>
                      <GhostButton href="/portfolio/aloqa">
                        Ariza yuborish <ArrowRight size={13} />
                      </GhostButton>
                    </div>
                  </GlassCard>
                </Lift>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="mt-10">
            <div
              className="flex items-start gap-4 p-7"
              style={{ borderRadius: 24, background: gold(0.06), border: `1px solid ${gold(0.2)}` }}
            >
              <Sparkles size={18} style={{ color: GOLD }} strokeWidth={1.6} className="flex-shrink-0 mt-0.5" />
              <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                Ro{"'"}yxatda o{"'"}zingizga mos yo{"'"}nalish yo{"'"}qmi? Baribir yozing — kuchli
                nomzodlar uchun har doim joy topamiz.
              </p>
            </div>
          </motion.div>
        </Reveal>
      </Section>

      <CtaBand
        title="Jamoamizga qo'shilishni xohlaysizmi?"
        subtitle="CV va portfolioingizni yuboring — har bir arizani o'zimiz o'qib chiqamiz."
        primaryLabel="Ariza yuborish"
        secondaryHref="/portfolio/haqida"
        secondaryLabel="Biz haqimizda"
      />
    </>
  );
}
