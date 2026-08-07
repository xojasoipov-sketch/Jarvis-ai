"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search, Microscope, Palette, Code2, TestTube2, Rocket, Headphones, TrendingUp,
  ArrowRight, type LucideIcon,
} from "lucide-react";
import { GOLD, BORDER, goldButtonStyle } from "../_components/theme";
import { fadeUp, Reveal, PageHero, Card, IconTile } from "../_components/ui";
import { WORKFLOW } from "../_data";

const ICONS: LucideIcon[] = [Search, Microscope, Palette, Code2, TestTube2, Rocket, Headphones, TrendingUp];

export default function JarayonPage() {
  return (
    <>
      <PageHero
        label="Jarayon"
        titleTop="Bizning ish"
        titleGold="jarayonimiz"
        subtitle="Sakkiz bosqichli shaffof jarayon — har bir qadamda nima bo'layotganini aniq bilasiz."
      />

      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="relative">
            {/* Connecting arc behind the two rows, desktop only */}
            <svg
              className="hidden lg:block absolute inset-x-0 top-[86px] w-full h-40 pointer-events-none"
              viewBox="0 0 1000 160"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M60 10 H940 Q985 10 985 60 Q985 110 940 110 H60 Q15 110 15 60"
                stroke={GOLD}
                strokeWidth="1"
                strokeDasharray="4 6"
                opacity="0.28"
              />
            </svg>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
              {WORKFLOW.map((s, i) => {
                const Icon = ICONS[i] ?? Search;
                return (
                  <motion.div key={s.n} variants={fadeUp}>
                    <Card className="p-5 h-full">
                      <div className="flex items-center justify-between mb-4">
                        <IconTile><Icon size={18} style={{ color: GOLD }} strokeWidth={1.75} /></IconTile>
                        <span className="text-xs font-semibold" style={{ color: GOLD }}>{s.n}</span>
                      </div>
                      <h2 className="font-semibold text-white text-[15px] mb-1.5">{s.title}</h2>
                      <p className="text-[13px] text-white/40 leading-relaxed">{s.desc}</p>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="grid md:grid-cols-3 gap-4">
            {[
              { k: "Shaffoflik", v: "Har hafta progress hisoboti va demo" },
              { k: "Moslashuvchanlik", v: "Talab o'zgarsa — reja ham moslashadi" },
              { k: "Kafolat", v: "Topshirgandan keyin ham qo'llab-quvvatlaymiz" },
            ].map((item) => (
              <motion.div key={item.k} variants={fadeUp}>
                <Card className="p-6 h-full">
                  <div
                    className="w-1.5 h-1.5 rounded-full mb-4"
                    style={{ background: GOLD, boxShadow: `0 0 12px ${GOLD}` }}
                  />
                  <h3 className="font-semibold text-white mb-2">{item.k}</h3>
                  <p className="text-[13px] text-white/40 leading-relaxed">{item.v}</p>
                </Card>
              </motion.div>
            ))}
          </Reveal>

          <Reveal>
            <motion.div variants={fadeUp} className="mt-10 text-center">
              <Link
                href="/portfolio/aloqa"
                className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-full transition-opacity hover:opacity-90"
                style={goldButtonStyle}
              >
                Loyihani boshlash <ArrowRight size={16} />
              </Link>
              <p className="text-xs text-white/30 mt-4" style={{ borderColor: BORDER }}>
                Birinchi konsultatsiya bepul
              </p>
            </motion.div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
