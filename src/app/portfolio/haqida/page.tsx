"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lightbulb, Handshake, Target, Compass, Eye, type LucideIcon } from "lucide-react";
import { SADIPRIME } from "@/lib/sadiprime";
import { GOLD, TEXT_DIM, BORDER, BG_ALT, SURFACE, gold } from "../_components/theme";
import {
  Section, SectionHeading, PageHero, GlassCard, IconTile, CtaBand,
  fadeUp, Reveal, Counter, PointerTilt,
} from "../_components/ui";
import { VALUES } from "../_data";

const VALUE_ICONS: LucideIcon[] = [ShieldCheck, Lightbulb, Handshake, Target];

const TIMELINE = [
  { year: "2019", title: "Boshlanish", desc: "Birinchi freelance loyihalar — landing va oddiy veb-saytlar" },
  { year: "2021", title: "Jamoa", desc: "Doimiy jamoa shakllandi, murakkab platformalarga o'tdik" },
  { year: "2023", title: "Telegram", desc: "Mini App yo'nalishiga ixtisoslashdik — birinchi do'kon ishga tushdi" },
  { year: "2025", title: "AI", desc: "AI agentlar va avtomatlashtirish asosiy yo'nalishga aylandi" },
];

function StudioVisual() {
  return (
    <PointerTilt intensity={6}>
      <div
        className="relative w-full aspect-[4/3] overflow-hidden"
        style={{ borderRadius: 24, border: `1px solid ${BORDER}` }}
      >
        <div className="absolute inset-0" style={{ background: "linear-gradient(155deg,#1a1613 0%,#0d0b09 60%,#070606 100%)" }} />
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse 55% 45% at 50% 52%, ${gold(0.2)}, transparent 68%)` }}
        />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" fill="none" aria-hidden="true">
          <rect x="64" y="152" width="272" height="5" rx="2.5" fill={GOLD} opacity="0.3" />
          <rect x="116" y="92" width="76" height="52" rx="5" stroke={GOLD} strokeWidth="1.2" opacity="0.5" />
          <rect x="208" y="102" width="62" height="42" rx="5" stroke={GOLD} strokeWidth="1.2" opacity="0.34" />
          <circle cx="200" cy="60" r="30" stroke={GOLD} strokeWidth="1" opacity="0.2" />
          <circle cx="200" cy="60" r="44" stroke={GOLD} strokeWidth="0.6" opacity="0.12" />
        </svg>
        <div className="absolute inset-x-0 bottom-0 p-7 text-center">
          <span className="text-[12px] font-semibold tracking-[0.4em]" style={{ color: "rgba(255,255,255,0.6)" }}>
            SADIPRIME
          </span>
        </div>
      </div>
    </PointerTilt>
  );
}

export default function HaqidaPage() {
  return (
    <>
      <PageHero
        label="Biz haqimizda"
        title="Kichik jamoa, katta mahsulotlar"
        highlight="katta mahsulotlar"
        subtitle="Bir vaqtda ko'p loyiha olmaymiz — shuning uchun har biriga to'liq berilib ishlay olamiz."
      />

      {/* ── Story + visual ── */}
      <Section top={false}>
        <Reveal className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div variants={fadeUp}>
            <p className="text-[15px] leading-relaxed mb-5" style={{ color: TEXT_DIM }}>{SADIPRIME.description}</p>
            <p className="text-[15px] leading-relaxed" style={{ color: TEXT_DIM }}>
              Biz kichik, lekin tajribali jamoamiz. Har bir loyihaga to{"'"}liq berilib ishlaymiz — shuning
              uchun bir vaqtning o{"'"}zida ko{"'"}p loyiha olmaymiz. Natija: chuqur o{"'"}ylangan mahsulot va
              aniq muddat.
            </p>
          </motion.div>
          <motion.div variants={fadeUp}>
            <StudioVisual />
          </motion.div>
        </Reveal>
      </Section>

      {/* ── Mission / Vision ── */}
      <Section style={{ background: BG_ALT }}>
        <Reveal className="grid md:grid-cols-2 gap-5">
          <motion.div variants={fadeUp}>
            <GlassCard className="p-9 h-full">
              <IconTile><Compass size={20} style={{ color: GOLD }} strokeWidth={1.6} /></IconTile>
              <h2 className="font-semibold text-xl mt-6 mb-3">Missiyamiz</h2>
              <p className="text-[15px] leading-relaxed" style={{ color: TEXT_DIM }}>
                O{"'"}zbekistondagi bizneslarga jahon darajasidagi raqamli mahsulotlarni yetkazish —
                murakkab texnologiyani oddiy va foydali qilib.
              </p>
            </GlassCard>
          </motion.div>
          <motion.div variants={fadeUp}>
            <GlassCard className="p-9 h-full">
              <IconTile><Eye size={20} style={{ color: GOLD }} strokeWidth={1.6} /></IconTile>
              <h2 className="font-semibold text-xl mt-6 mb-3">Vizyonimiz</h2>
              <p className="text-[15px] leading-relaxed" style={{ color: TEXT_DIM }}>
                Mintaqadagi har bir jiddiy biznes AI va avtomatlashtirishdan foydalanadigan davrda,
                ularning texnologik hamkori bo{"'"}lish.
              </p>
            </GlassCard>
          </motion.div>
        </Reveal>
      </Section>

      {/* ── Timeline ── */}
      <Section style={{ background: BG_ALT }}>
        <Reveal>
          <SectionHeading label="Yo'limiz" title="Qanday shu yerga keldik" highlight="shu yerga" className="mb-14" />
          <div className="relative">
            <motion.div
              aria-hidden="true"
              className="hidden md:block absolute left-0 right-0 top-[26px] h-px origin-left"
              style={{ background: `linear-gradient(90deg, ${gold(0.5)}, ${gold(0.08)})` }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {TIMELINE.map((t) => (
                <motion.div key={t.year} variants={fadeUp} className="relative">
                  <div
                    className="w-[52px] h-[52px] rounded-full flex items-center justify-center relative z-10"
                    style={{ background: SURFACE, border: `1px solid ${gold(0.3)}`, boxShadow: `0 0 30px -8px ${gold(0.55)}` }}
                  >
                    <span className="text-[12px] font-bold" style={{ color: GOLD }}>{t.year}</span>
                  </div>
                  <h3 className="font-semibold text-[16px] mt-6 mb-2.5">{t.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: TEXT_DIM }}>{t.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ── Values ── */}
      <Section>
        <Reveal>
          <SectionHeading
            label="Qadriyatlar"
            title="Har bir qarorimiz shularga tayanadi"
            highlight="shularga tayanadi"
            align="center"
            className="mb-14"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {VALUES.map((v, i) => {
              const Icon = VALUE_ICONS[i] ?? Target;
              return (
                <motion.div key={v.title} variants={fadeUp}>
                  <GlassCard className="p-8 h-full">
                    <IconTile><Icon size={20} style={{ color: GOLD }} strokeWidth={1.6} /></IconTile>
                    <h3 className="font-semibold text-[17px] mt-6 mb-3">{v.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: TEXT_DIM }}>{v.desc}</p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </Reveal>
      </Section>

      <CtaBand
        title="Jamoamiz bilan ishlashni xohlaysizmi?"
        subtitle="Loyiha bo'yicha yozing yoki bizga qo'shiling — ikkalasiga ham ochiqmiz."
        primaryLabel="Loyiha bo'yicha yozish"
        secondaryHref="/portfolio/karyera"
        secondaryLabel="Vakansiyalar"
      />
    </>
  );
}
