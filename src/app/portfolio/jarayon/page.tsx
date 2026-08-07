"use client";

import { motion } from "framer-motion";
import {
  Search, Microscope, Palette, Code2, TestTube2, Rocket, Headphones, TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { GOLD, TEXT_DIM, BG_ALT, SURFACE, gold } from "../_components/theme";
import {
  Section, SectionHeading, PageHero, GlassCard, IconTile, CtaBand,
  fadeUp, Reveal,
} from "../_components/ui";
import { WORKFLOW } from "../_data";

const ICONS: LucideIcon[] = [Search, Microscope, Palette, Code2, TestTube2, Rocket, Headphones, TrendingUp];

const PRINCIPLES = [
  { k: "Shaffoflik", v: "Har hafta progress hisoboti va ishlaydigan demo — taxmin qilishingiz shart emas." },
  { k: "Moslashuvchanlik", v: "Talab o'zgarsa, reja ham moslashadi. Qat'iy shartnoma ijodni bo'g'masligi kerak." },
  { k: "Kafolat", v: "Topshirgandan keyin ham qo'llab-quvvatlaymiz — loyiha yakuni aloqaning oxiri emas." },
];

export default function JarayonPage() {
  return (
    <>
      <PageHero
        label="Jarayon"
        title="Bizning ish jarayonimiz"
        highlight="jarayonimiz"
        subtitle="Sakkiz bosqichli shaffof jarayon — har bir qadamda nima bo'layotganini aniq bilasiz."
      />

      {/* ── Timeline ── */}
      <Section top={false}>
        <Reveal>
          <div className="relative">
            {/* animated vertical spine (desktop) */}
            <motion.div
              aria-hidden="true"
              className="hidden lg:block absolute left-[27px] top-4 bottom-4 w-px origin-top"
              style={{ background: `linear-gradient(180deg, ${gold(0.5)}, ${gold(0.08)})` }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            />

            <div className="space-y-4">
              {WORKFLOW.map((s, i) => {
                const Icon = ICONS[i] ?? Search;
                return (
                  <motion.div key={s.n} variants={fadeUp} className="relative lg:pl-24">
                    {/* node on the spine */}
                    <div
                      className="hidden lg:flex absolute left-0 top-5 w-14 h-14 rounded-full items-center justify-center"
                      style={{ background: SURFACE, border: `1px solid ${gold(0.3)}`, boxShadow: `0 0 34px -8px ${gold(0.55)}` }}
                    >
                      <Icon size={19} style={{ color: GOLD }} strokeWidth={1.6} />
                    </div>

                    <GlassCard className="p-7 md:p-8">
                      <div className="flex items-start gap-5">
                        <div className="lg:hidden">
                          <IconTile><Icon size={19} style={{ color: GOLD }} strokeWidth={1.6} /></IconTile>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-3 mb-2">
                            <span className="text-xs font-semibold" style={{ color: GOLD }}>{s.n}</span>
                            <h2 className="font-semibold text-[17px]">{s.title}</h2>
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: TEXT_DIM }}>{s.desc}</p>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ── Principles ── */}
      <Section style={{ background: BG_ALT }}>
        <Reveal>
          <SectionHeading
            label="Prinsiplar"
            title="Jarayonni ushlab turadigan uch narsa"
            highlight="uch narsa"
            align="center"
            className="mb-14"
          />
          <div className="grid md:grid-cols-3 gap-5">
            {PRINCIPLES.map((p) => (
              <motion.div key={p.k} variants={fadeUp}>
                <GlassCard className="p-8 h-full">
                  <div
                    className="w-2 h-2 rounded-full mb-6"
                    style={{ background: GOLD, boxShadow: `0 0 16px ${GOLD}` }}
                  />
                  <h3 className="font-semibold text-[17px] mb-3">{p.k}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: TEXT_DIM }}>{p.v}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </Section>

      <CtaBand
        title="Jarayonni birinchi qadamdan boshlaymizmi?"
        subtitle="Birinchi konsultatsiya bepul — biznesingizni tushunib, aniq reja taklif qilamiz."
        primaryLabel="Loyihani boshlash"
      />
    </>
  );
}
