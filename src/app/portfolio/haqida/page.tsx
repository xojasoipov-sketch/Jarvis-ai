"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Lightbulb, Handshake, Target, ArrowRight, type LucideIcon } from "lucide-react";
import { SADIPRIME, STATS } from "@/lib/sadiprime";
import { GOLD, BORDER, goldButtonStyle } from "../_components/theme";
import { fadeUp, Reveal, PageHero, Card, IconTile } from "../_components/ui";
import { VALUES } from "../_data";

const VALUE_ICONS: LucideIcon[] = [ShieldCheck, Lightbulb, Handshake, Target];

function StudioVisual() {
  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      <div style={{ background: "linear-gradient(155deg,#1a1613 0%,#0d0b09 60%,#080706 100%)" }} className="absolute inset-0" />
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse 55% 45% at 50% 55%, ${GOLD}26, transparent 68%)` }}
      />
      {/* stylised desk silhouette */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" fill="none" aria-hidden="true">
        <rect x="70" y="150" width="260" height="6" rx="3" fill={GOLD} opacity="0.28" />
        <rect x="120" y="96" width="70" height="46" rx="4" stroke={GOLD} strokeWidth="1.2" opacity="0.5" />
        <rect x="210" y="104" width="58" height="38" rx="4" stroke={GOLD} strokeWidth="1.2" opacity="0.35" />
        <circle cx="200" cy="66" r="26" stroke={GOLD} strokeWidth="1" opacity="0.22" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 p-6 text-center">
        <span className="text-[13px] font-semibold tracking-[0.35em] text-white/70">SADIPRIME</span>
      </div>
    </div>
  );
}

export default function HaqidaPage() {
  return (
    <>
      <PageHero label="Biz haqimizda" titleTop="Biz" titleGold="haqimizda" />

      <section className="pb-16">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div variants={fadeUp}>
              <p className="text-white/45 leading-relaxed text-[15px] mb-4">{SADIPRIME.description}</p>
              <p className="text-white/45 leading-relaxed text-[15px]">
                Biz kichik, lekin tajribali jamoamiz. Har bir loyihaga to{"'"}liq berilib ishlaymiz — shuning
                uchun bir vaqtning o{"'"}zida ko{"'"}p loyiha olmaymiz. Natija: chuqur o{"'"}ylangan mahsulot va
                aniq muddat.
              </p>
            </motion.div>
            <motion.div variants={fadeUp}>
              <StudioVisual />
            </motion.div>
          </Reveal>
        </div>
      </section>

      <section className="pb-16">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal>
            <Card className="grid grid-cols-2 md:grid-cols-5 divide-x">
              {STATS.map((s) => (
                <motion.div key={s.label} variants={fadeUp} className="px-5 py-6" style={{ borderColor: BORDER }}>
                  <div className="text-2xl font-bold text-white leading-none">{s.value}</div>
                  <div className="text-[11px] text-white/40 mt-2 leading-tight">{s.label}</div>
                </motion.div>
              ))}
            </Card>
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal>
            <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-white mb-8">
              Bizning qadriyatlarimiz
            </motion.h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {VALUES.map((v, i) => {
                const Icon = VALUE_ICONS[i] ?? Target;
                return (
                  <motion.div key={v.title} variants={fadeUp}>
                    <Card className="p-6 h-full">
                      <IconTile><Icon size={18} style={{ color: GOLD }} strokeWidth={1.75} /></IconTile>
                      <h3 className="font-semibold text-white mt-4 mb-2">{v.title}</h3>
                      <p className="text-[13px] text-white/40 leading-relaxed">{v.desc}</p>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <motion.div variants={fadeUp} className="text-center mt-12">
              <Link
                href="/portfolio/karyera"
                className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-full transition-opacity hover:opacity-90"
                style={goldButtonStyle}
              >
                Jamoamizga qo{"'"}shiling <ArrowRight size={16} />
              </Link>
            </motion.div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
