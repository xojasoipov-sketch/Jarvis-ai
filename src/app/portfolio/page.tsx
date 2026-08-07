"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Globe, Send, Gem, Settings2, TrendingUp,
  ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight,
  Play, Plus, Camera, Folder, Users, Award, Headphones,
  type LucideIcon,
} from "lucide-react";
import { STATS } from "@/lib/sadiprime";
import { GOLD, BORDER, PANEL, goldButtonStyle, outlineStyle } from "./_components/theme";
import { fadeUp, stagger, Reveal, SectionLabel, Card, IconTile } from "./_components/ui";
import { SERVICES, PROJECTS, STEPS } from "./_data";

const SERVICE_ICONS: Record<string, LucideIcon> = {
  "web-saytlar": Globe,
  "telegram-mini-app": Send,
  "ai-yechimlar": Gem,
  "avtomatlashtirish": Settings2,
  "marketing": TrendingUp,
};

const STAT_ICONS: LucideIcon[] = [Folder, Users, Award, TrendingUp, Headphones];

/* ═══════════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════════ */

function HeroVisual() {
  return (
    <div className="relative w-full aspect-square max-w-[420px] mx-auto">
      <div className="absolute inset-[6%] rounded-full" style={{ border: `1px solid ${GOLD}2e` }} />
      <div className="absolute rounded-full" style={{ width: 10, height: 10, top: "8%", left: "48%", background: "radial-gradient(circle at 35% 30%, #444, #111)" }} />
      <div className="absolute rounded-full" style={{ width: 7, height: 7, bottom: "10%", right: "6%", background: "radial-gradient(circle at 35% 30%, #444, #111)" }} />
      <div className="absolute inset-[10%] rounded-[38%] blur-2xl opacity-70" style={{ background: `radial-gradient(circle at 55% 45%, ${GOLD}55, transparent 60%)` }} />
      <div
        className="absolute inset-[12%] rounded-[42%_38%_44%_36%/40%_44%_36%_42%]"
        style={{
          background: "linear-gradient(155deg, #26221f 0%, #17140f 45%, #0c0a08 100%)",
          boxShadow: `inset 0 0 60px rgba(0,0,0,0.6), 0 0 80px ${GOLD}22`,
        }}
      >
        <div className="absolute inset-0 rounded-[inherit] opacity-80" style={{ background: `radial-gradient(ellipse 60% 40% at 60% 55%, ${GOLD}66 0%, transparent 55%)` }} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <path d="M20 55 L45 40 L55 60 L80 35" stroke={GOLD} strokeWidth="0.6" opacity="0.7" />
          <path d="M30 70 L50 58 L48 80" stroke={GOLD} strokeWidth="0.5" opacity="0.5" />
        </svg>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width="34%" height="34%" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <path d="M50 10 L88 75 L12 75 Z" stroke={GOLD} strokeWidth="2.5" fill="none" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="absolute bottom-[6%] right-0 text-right">
        <div className="text-3xl font-bold text-white leading-none">7+</div>
        <div className="text-[11px] text-white/40 mt-1">Yillik tajriba</div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-16 md:pt-40 md:pb-20 relative overflow-hidden">
      <div className="hidden lg:flex flex-col items-center gap-4 fixed left-6 top-1/2 -translate-y-1/2 z-40">
        <a href="https://t.me/xojasoipov" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="text-white/40 hover:text-white transition-colors"><Send size={16} /></a>
        <a href="#" aria-label="Instagram" className="text-white/40 hover:text-white transition-colors"><Camera size={16} /></a>
        <span className="text-white/40 text-[11px] font-semibold">Be</span>
        <div className="w-px h-16 bg-white/15" />
      </div>

      <div className="max-w-6xl mx-auto px-5">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="mb-6">
              <SectionLabel>SADIPRIME — raqamli yechimlar agentligi</SectionLabel>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-[3.3rem] font-bold leading-[1.15] tracking-tight mb-6 text-white">
              Biz g{"'"}oyalarni<br />
              <span style={{ color: GOLD }}>raqamli muvaffaqiyatga</span><br />
              aylantiramiz
            </motion.h1>
            <motion.p variants={fadeUp} className="text-white/45 text-base leading-relaxed mb-8 max-w-md">
              Veb-saytlar, ilovalar, AI yechimlar, avtomatlashtirish va marketing — biz biznesingizni keyingi bosqichga olib chiqamiz.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3 mb-10">
              <Link href="/portfolio/xizmatlar" className="inline-flex items-center gap-2 whitespace-nowrap font-semibold px-5 py-3 rounded-full transition-opacity hover:opacity-90" style={goldButtonStyle}>
                Xizmatlarimiz bilan tanishing <ArrowRight size={16} />
              </Link>
              <Link href="/portfolio/loyihalar" className="inline-flex items-center gap-2 whitespace-nowrap font-medium px-5 py-3 rounded-full text-white transition-colors" style={outlineStyle}>
                Portfolio ko{"'"}rish <ChevronRight size={16} />
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <button type="button" aria-label="Showreelni tomosha qilish" className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ ...outlineStyle, background: PANEL }}>
                <Play size={14} className="text-white ml-0.5" fill="currentColor" />
              </button>
              <div className="text-sm">
                <div className="text-white/80 font-medium leading-tight">Showreel</div>
                <div className="text-white/35 text-xs leading-tight">Tomosha qiling</div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.25 }}>
            <HeroVisual />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SERVICES
   ═══════════════════════════════════════════════════════════════ */

function ServicesStrip() {
  return (
    <section className="py-14">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {SERVICES.slice(0, 5).map((s) => {
            const Icon = SERVICE_ICONS[s.slug] ?? Globe;
            return (
              <motion.div key={s.slug} variants={fadeUp}>
                <Link href={`/portfolio/xizmatlar#${s.slug}`} className="relative block rounded-2xl p-5 group h-full transition-colors" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                  <IconTile><Icon size={18} style={{ color: GOLD }} strokeWidth={1.75} /></IconTile>
                  <h3 className="font-semibold text-white text-[15px] mt-4 mb-1.5">{s.title}</h3>
                  <p className="text-[13px] text-white/40 leading-relaxed pr-4">{s.short}</p>
                  <ArrowUpRight size={14} className="absolute bottom-5 right-5 text-white/25 group-hover:text-white/60 transition-colors" />
                </Link>
              </motion.div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROJECTS
   ═══════════════════════════════════════════════════════════════ */

function ProjectsPreview() {
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <motion.div variants={fadeUp}>
              <SectionLabel>Portfolio</SectionLabel>
              <h2 className="text-3xl md:text-[2.6rem] font-bold tracking-tight text-white leading-[1.1] mt-4">
                Tanlangan<br />ishlarimiz
              </h2>
              <Link href="/portfolio/loyihalar" className="inline-flex items-center gap-2 mt-5 text-sm font-medium px-5 py-2.5 rounded-full text-white transition-colors" style={outlineStyle}>
                Barcha loyihalar <ArrowRight size={14} />
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} className="hidden md:flex items-center gap-2">
              <button type="button" aria-label="Oldingi" className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors" style={outlineStyle}>
                <ChevronLeft size={16} />
              </button>
              <button type="button" aria-label="Keyingi" className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-90" style={goldButtonStyle}>
                <ChevronRight size={16} />
              </button>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PROJECTS.slice(0, 4).map((p) => (
              <motion.div key={p.slug} variants={fadeUp}>
                <Link href={`/portfolio/loyihalar/${p.slug}`} className="relative block rounded-2xl overflow-hidden aspect-[3/4] group" style={outlineStyle}>
                  <div className="absolute inset-0" style={{ background: p.gradient }} />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)" }} />
                  <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOLD }} />
                    <span className="text-white/90 font-semibold text-[13px] leading-tight">{p.title}</span>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="text-[10px] font-medium px-2.5 py-1 rounded-full text-white/80" style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BORDER}` }}>
                      {p.category}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STATS
   ═══════════════════════════════════════════════════════════════ */

export function StatsRow() {
  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <Card className="grid grid-cols-2 md:grid-cols-5 divide-x" >
            {STATS.map((s, i) => {
              const Icon = STAT_ICONS[i] ?? Folder;
              return (
                <motion.div key={s.label} variants={fadeUp} className="flex items-center gap-3 px-5 py-6" style={{ borderColor: BORDER }}>
                  <Icon size={18} style={{ color: GOLD }} strokeWidth={1.75} />
                  <div>
                    <div className="text-xl font-bold text-white leading-none">{s.value}</div>
                    <div className="text-[11px] text-white/40 mt-1 leading-tight">{s.label}</div>
                  </div>
                </motion.div>
              );
            })}
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROCESS + CTA
   ═══════════════════════════════════════════════════════════════ */

function ProcessPreview() {
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
          <div>
            <motion.div variants={fadeUp} className="mb-8">
              <SectionLabel>Jarayon</SectionLabel>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight mt-4">
                Oddiy qadamlar,<br />kuchli natijalar
              </h2>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STEPS.slice(0, 4).map((s) => (
                <motion.div key={s.n} variants={fadeUp}>
                  <Card className="p-5 h-full">
                    <div className="text-xs font-semibold mb-3" style={{ color: GOLD }}>{s.n}</div>
                    <h3 className="font-semibold text-white text-sm mb-1.5">{s.title}</h3>
                    <p className="text-[12px] text-white/40 leading-relaxed">{s.desc}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div variants={fadeUp}>
            <Card className="p-7">
              <h3 className="text-lg font-bold text-white mb-2 leading-snug">Loyihangizni boshlashga tayyormisiz?</h3>
              <p className="text-[13px] text-white/40 leading-relaxed mb-6">
                Bepul konsultatsiya oling va biznesingiz uchun eng yaxshi yechimni toping.
              </p>
              <div className="flex items-center gap-3">
                <Link href="/portfolio/aloqa" className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-opacity hover:opacity-90" style={goldButtonStyle}>
                  Buyurtma berish <ArrowRight size={14} />
                </Link>
                <Link href="/portfolio/faq" aria-label="Ko'proq ma'lumot" className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors flex-shrink-0" style={outlineStyle}>
                  <Plus size={16} />
                </Link>
              </div>
            </Card>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function PortfolioHomePage() {
  return (
    <>
      <Hero />
      <ServicesStrip />
      <ProjectsPreview />
      <StatsRow />
      <ProcessPreview />
    </>
  );
}
