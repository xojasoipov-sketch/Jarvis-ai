"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Globe, Send, Gem, Settings2, TrendingUp, Palette, Bot, Database,
  ArrowUpRight, Check, type LucideIcon,
} from "lucide-react";
import { GOLD, VIOLET, CYAN, EMERALD, TEXT_DIM, BG_ALT, gold, alpha, SERVICE_ACCENT } from "../_components/theme";
import {
  Section, SectionHeading, PageHero, GlassCard, IconTile, CtaBand,
  fadeUp, Reveal,
} from "../_components/ui";
import { SERVICES, WORKFLOW } from "../_data";

const ICONS: Record<string, LucideIcon> = {
  "web-saytlar": Globe,
  "telegram-mini-app": Send,
  "ai-yechimlar": Gem,
  "avtomatlashtirish": Settings2,
  "marketing": TrendingUp,
  "ui-ux": Palette,
  "chatbotlar": Bot,
  "crm": Database,
};

const TECH_STACK = [
  { group: "Frontend", color: GOLD, items: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Framer Motion"] },
  { group: "Backend", color: EMERALD, items: ["Node.js", "PostgreSQL", "Supabase", "REST API", "Redis"] },
  { group: "AI", color: VIOLET, items: ["OpenAI", "Anthropic", "Gemini", "Groq", "RAG", "MCP"] },
  { group: "Platforma", color: CYAN, items: ["Telegram Mini Apps", "Railway", "Vercel", "Cloudflare"] },
];

const BENEFITS = [
  "Manba kodi to'liq sizga topshiriladi",
  "Har haftada progress hisoboti va demo",
  "Kelishilgan muddat — kechikish bo'lsa, ogohlantiramiz",
  "Topshirgandan keyin qo'llab-quvvatlash davom etadi",
];

export default function XizmatlarPage() {
  return (
    <>
      <PageHero
        label="Xizmatlar"
        title="Bizning xizmatlarimiz"
        highlight="xizmatlarimiz"
        subtitle="G'oyadan ishga tushirishgacha — biznesingizga kerak bo'lgan barcha raqamli yechimlar bitta jamoadan."
      />

      {/* ── Service grid ── */}
      <Section top={false}>
        <Reveal className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICES.map((s) => {
            const Icon = ICONS[s.slug] ?? Globe;
            const accent = SERVICE_ACCENT[s.slug] ?? GOLD;
            return (
              <motion.div key={s.slug} variants={fadeUp} id={s.slug} className="scroll-mt-28">
                <GlassCard className="p-7 flex flex-col">
                  <IconTile color={accent}><Icon size={20} style={{ color: accent }} strokeWidth={1.6} /></IconTile>
                  <h2 className="font-semibold text-[16px] mt-6 mb-3">{s.title}</h2>
                  <p className="text-[13px] leading-relaxed flex-1" style={{ color: TEXT_DIM }}>{s.desc}</p>
                  <Link
                    href="/portfolio/aloqa"
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium mt-6"
                    style={{ color: accent }}
                  >
                    Batafsil <ArrowUpRight size={12} />
                  </Link>
                </GlassCard>
              </motion.div>
            );
          })}
        </Reveal>
      </Section>

      {/* ── Technology stack ── */}
      <Section style={{ background: BG_ALT }}>
        <Reveal>
          <SectionHeading
            label="Texnologiyalar"
            title="Biz ishlatadigan stack"
            highlight="stack"
            subtitle="Moda uchun emas — barqarorligi va uzoq muddatli qo'llab-quvvatlanishi uchun tanlangan."
            align="center"
            className="mb-14"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TECH_STACK.map((g) => (
              <motion.div key={g.group} variants={fadeUp}>
                <GlassCard className="p-7 h-full">
                  <h3 className="font-semibold text-[15px] mb-5" style={{ color: g.color }}>{g.group}</h3>
                  <ul className="space-y-2.5">
                    {g.items.map((t) => (
                      <li key={t} className="text-[13px] flex items-center gap-2.5" style={{ color: TEXT_DIM }}>
                        <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: alpha(g.color, 0.7) }} />
                        {t}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* ── Process ── */}
      <Section>
        <Reveal>
          <SectionHeading
            label="Jarayon"
            title="Har bir loyiha shu yo'ldan o'tadi"
            highlight="shu yo'ldan"
            align="center"
            className="mb-14"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WORKFLOW.map((s) => (
              <motion.div key={s.n} variants={fadeUp}>
                <GlassCard className="p-6 h-full" interactive={false}>
                  <span className="text-xs font-semibold" style={{ color: GOLD }}>{s.n}</span>
                  <h3 className="font-semibold text-[15px] mt-3 mb-2">{s.title}</h3>
                  <p className="text-[12px] leading-relaxed" style={{ color: TEXT_DIM }}>{s.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* ── Benefits ── */}
      <Section style={{ background: BG_ALT }}>
        <Reveal className="grid lg:grid-cols-2 gap-12 items-center">
          <SectionHeading
            label="Nega biz"
            title="Har bir loyihada kafolatlaymiz"
            highlight="kafolatlaymiz"
            subtitle="Bular marketing va'dasi emas — shartnomaga kiritiladigan bandlar."
          />
          <motion.ul variants={fadeUp} className="space-y-4">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-4">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: gold(0.14), border: `1px solid ${gold(0.28)}` }}
                >
                  <Check size={13} style={{ color: GOLD }} strokeWidth={2.5} />
                </span>
                <span className="text-[15px] leading-relaxed pt-0.5">{b}</span>
              </li>
            ))}
          </motion.ul>
        </Reveal>
      </Section>

      <CtaBand
        title="Kerakli xizmatni topa olmadingizmi?"
        subtitle="Loyihangizni tavsiflab bering — sizga mos yechimni birgalikda ishlab chiqamiz."
        primaryLabel="Bepul konsultatsiya"
        secondaryHref="/portfolio/narxlar"
        secondaryLabel="Narxlarni ko'rish"
      />
    </>
  );
}
