"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRef } from "react";
import { motion as m, useScroll, useTransform } from "framer-motion";
import {
  Globe, Send, Gem, Settings2, TrendingUp,
  ArrowRight, ArrowUpRight, Check, Clock, ExternalLink,
  type LucideIcon,
} from "lucide-react";
import {
  GOLD, TEXT_DIM, BORDER, BG_ALT, SURFACE, gold, glass,
  SHADOW_LUXURY, goldButtonStyle,
} from "./_components/theme";
import {
  Container, Section, SectionHeading, SectionLabel, GlassCard, IconTile,
  GoldButton, GhostButton, CtaBand,
  fadeUp, Reveal, TextReveal, Counter, Magnetic, Spotlight, Lift,
} from "./_components/ui";
import HeroObject from "./_components/HeroObject";
import { SERVICES, STEPS, PLANS, POSTS, FAQS } from "./_data";
import type { Project } from "@/lib/portfolio-store";

const SERVICE_ICONS: Record<string, LucideIcon> = {
  "web-saytlar": Globe,
  "telegram-mini-app": Send,
  "ai-yechimlar": Gem,
  "avtomatlashtirish": Settings2,
  "marketing": TrendingUp,
};

const MONTHS_UZ = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];
function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}-${MONTHS_UZ[m - 1]}, ${y}`;
}

/* ═══════════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════════ */

function Hero() {
  return (
    <section className="relative pt-36 pb-16 md:pt-44 md:pb-24 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[720px] pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 100% at 65% 10%, ${gold(0.1)}, transparent 68%)` }}
      />

      <Container className="relative">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-8 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-7"
            >
              <SectionLabel>Raqamli yechimlar agentligi</SectionLabel>
            </motion.div>

            <TextReveal
              as="h1"
              text="Biz g'oyalarni raqamli muvaffaqiyatga aylantiramiz"
              highlight="raqamli muvaffaqiyatga"
              className="text-[2.75rem] md:text-[4.25rem] font-bold tracking-[-0.035em] leading-[1.04]"
            />

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-7 text-base md:text-lg leading-relaxed max-w-lg"
              style={{ color: TEXT_DIM }}
            >
              Veb-saytlar, Telegram ilovalar, AI yechimlar va avtomatlashtirish — biznesingizni
              keyingi bosqichga olib chiqadigan mahsulotlar quramiz.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.62 }}
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              <GoldButton href="/portfolio/aloqa" size="lg">
                Loyihani boshlash <ArrowRight size={16} />
              </GoldButton>
              <GhostButton href="/portfolio/loyihalar" size="lg">
                Ishlarimizni ko{"'"}rish
              </GhostButton>
            </motion.div>

          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <HeroObject />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SERVICES
   ═══════════════════════════════════════════════════════════════ */

function ServicesSection() {
  return (
    <Section className="relative" id="services">
      <Reveal>
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <SectionHeading
            label="Xizmatlar"
            title="Biznesingiz uchun to'liq raqamli arsenal"
            highlight="raqamli arsenal"
          />
          <motion.div variants={fadeUp}>
            <GhostButton href="/portfolio/xizmatlar">
              Barcha xizmatlar <ArrowRight size={14} />
            </GhostButton>
          </motion.div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.slice(0, 5).map((s) => {
            const Icon = SERVICE_ICONS[s.slug] ?? Globe;
            return (
              <motion.div key={s.slug} variants={fadeUp}>
                <Link href={`/portfolio/xizmatlar#${s.slug}`} className="block h-full">
                  <GlassCard className="p-8 flex flex-col">
                    <IconTile><Icon size={20} style={{ color: GOLD }} strokeWidth={1.6} /></IconTile>
                    <h3 className="font-semibold text-[17px] mt-6 mb-3">{s.title}</h3>
                    <p className="text-sm leading-relaxed flex-1" style={{ color: TEXT_DIM }}>{s.short}</p>
                    <span
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium mt-6"
                      style={{ color: GOLD }}
                    >
                      Batafsil <ArrowUpRight size={13} />
                    </span>
                  </GlassCard>
                </Link>
              </motion.div>
            );
          })}

          {/* trailing CTA tile keeps the 6-cell grid complete */}
          <motion.div variants={fadeUp}>
            <Link href="/portfolio/aloqa" className="block h-full">
              <Lift className="h-full">
                <div
                  className="h-full p-8 flex flex-col justify-between"
                  style={{
                    borderRadius: 24,
                    background: `linear-gradient(155deg, ${gold(0.16)}, ${gold(0.03)})`,
                    border: `1px solid ${gold(0.24)}`,
                    boxShadow: SHADOW_LUXURY,
                  }}
                >
                  <div>
                    <h3 className="font-semibold text-[17px] mb-3">Sizga boshqa narsa kerakmi?</h3>
                    <p className="text-sm leading-relaxed" style={{ color: TEXT_DIM }}>
                      Loyihangizni tavsiflab bering — mos yechimni birgalikda topamiz.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-[13px] font-semibold mt-8" style={{ color: GOLD }}>
                    Bepul konsultatsiya <ArrowRight size={14} />
                  </span>
                </div>
              </Lift>
            </Link>
          </motion.div>
        </div>
      </Reveal>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURED PROJECTS
   ═══════════════════════════════════════════════════════════════ */

function MarqueeStrip() {
  // Takrorlanuvchi lenta — ikki nusxa yonma-yon, biri to'liq siljiganda
  // ikkinchisi o'rniga kelib uzluksiz aylanish hissini beradi.
  const items = ["AI yechimlar", "Telegram Mini App", "Web platformalar", "Avtomatlashtirish", "CRM tizimlar"];
  const strip = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden py-6 select-none"
      style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: BG_ALT }}
    >
      <m.div
        className="flex gap-10 whitespace-nowrap will-change-transform"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 32, ease: "linear", repeat: Infinity }}
      >
        {strip.map((label, i) => (
          <span key={`${label}-${i}`} className="flex items-center gap-10 text-[15px] md:text-lg font-medium tracking-tight">
            <span style={{ color: "rgba(255,255,255,0.72)" }}>{label}</span>
            <span aria-hidden="true" style={{ color: GOLD }}>&bull;</span>
          </span>
        ))}
      </m.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURED PROJECTS — ustma-ust siljiydigan kartalar
   ═══════════════════════════════════════════════════════════════ */

function StackCard({
  project, index, total, progress,
}: {
  project: Project;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  // Orqadagi kartalar sal kichrayadi — ustma-ust turgan taassurot beradi.
  const targetScale = 1 - (total - 1 - index) * 0.03;
  const scale = useTransform(progress, [index / total, 1], [1, targetScale]);

  return (
    <div className="sticky" style={{ top: `${index * 26 + 104}px` }}>
      <m.div
        style={{ scale, background: SURFACE, borderRadius: 28, border: `1px solid ${BORDER}`, boxShadow: SHADOW_LUXURY }}
        className="overflow-hidden"
      >
        <div className="grid md:grid-cols-2 gap-0 items-stretch">
          <div className="p-8 md:p-11 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-[11px] font-mono" style={{ color: GOLD }}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className="text-[10px] font-medium px-2.5 py-1 rounded-full"
                style={{ border: `1px solid ${gold(0.22)}`, color: GOLD }}
              >
                {project.category}
              </span>
            </div>

            <h3 className="text-2xl md:text-[2rem] font-bold tracking-[-0.02em] leading-tight">
              {project.title}
            </h3>
            <p className="mt-4 text-[14px] md:text-[15px] leading-relaxed" style={{ color: TEXT_DIM }}>
              {project.summary}
            </p>

            {project.tech.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {project.tech.slice(0, 5).map((t) => (
                  <span
                    key={t}
                    className="text-[11px] px-3 py-1.5 rounded-full"
                    style={{ border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.65)" }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-8">
              <Link
                href={`/portfolio/loyihalar/${project.slug}`}
                className="inline-flex items-center gap-2 text-[13px] font-semibold transition hover:gap-3"
                style={{ color: GOLD }}
              >
                Batafsil <ArrowRight size={14} />
              </Link>
              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[13px] transition hover:opacity-70"
                  style={{ color: TEXT_DIM }}
                >
                  Ochish <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>

          <Link
            href={`/portfolio/loyihalar/${project.slug}`}
            className="relative min-h-[220px] md:min-h-[380px] group overflow-hidden"
            aria-label={project.title}
          >
            <div
              className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
              style={{ background: project.gradient }}
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 4%, transparent 55%)" }}
            />
            <ArrowUpRight
              size={18}
              className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: GOLD }}
            />
          </Link>
        </div>
      </m.div>
    </div>
  );
}

function FeaturedProjects({ projects }: { projects: Project[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  if (projects.length === 0) return null;

  return (
    <Section className="relative" style={{ background: BG_ALT }}>
      <Reveal>
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <SectionHeading label="Portfolio" title="Tanlangan ishlarimiz" highlight="ishlarimiz" />
          <motion.div variants={fadeUp}>
            <GhostButton href="/portfolio/loyihalar">
              Barcha loyihalar <ArrowRight size={14} />
            </GhostButton>
          </motion.div>
        </div>
      </Reveal>

      <div ref={ref} className="space-y-6">
        {projects.map((p, i) => (
          <StackCard
            key={p.slug}
            project={p}
            index={i}
            total={projects.length}
            progress={scrollYProgress}
          />
        ))}
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROCESS
   ═══════════════════════════════════════════════════════════════ */

function ProcessSection() {
  return (
    <Section>
      <Reveal>
        <SectionHeading
          label="Jarayon"
          title="Oddiy qadamlar, kuchli natijalar"
          highlight="kuchli natijalar"
          subtitle="Shaffof to'rt bosqich — har haftada progress hisoboti va ishlaydigan demo."
          align="center"
          className="mb-14"
        />

        <div className="relative">
          {/* animated connection line */}
          <motion.div
            aria-hidden="true"
            className="hidden lg:block absolute top-[42px] left-[12%] right-[12%] h-px origin-left"
            style={{ background: `linear-gradient(90deg, transparent, ${gold(0.45)}, transparent)` }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s) => (
              <motion.div key={s.n} variants={fadeUp} className="relative text-center lg:text-left">
                <div className="flex justify-center lg:justify-start">
                  <div
                    className="w-[84px] h-[84px] rounded-full flex items-center justify-center relative"
                    style={{ background: SURFACE, border: `1px solid ${gold(0.28)}` }}
                  >
                    <span className="text-lg font-bold" style={{ color: GOLD }}>{s.n}</span>
                    <span
                      className="absolute inset-0 rounded-full"
                      style={{ boxShadow: `0 0 40px -8px ${gold(0.5)}` }}
                    />
                  </div>
                </div>
                <h3 className="font-semibold text-[17px] mt-6 mb-2.5">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: TEXT_DIM }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PRICING PREVIEW
   ═══════════════════════════════════════════════════════════════ */

function PricingPreview() {
  return (
    <Section>
      <Reveal>
        <SectionHeading
          label="Narxlar"
          title="Shaffof narxlar, yashirin to'lovlarsiz"
          highlight="yashirin to'lovlarsiz"
          align="center"
          className="mb-14"
        />

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {PLANS.map((plan) => (
            <motion.div key={plan.name} variants={fadeUp} className={plan.featured ? "md:-mt-5" : ""}>
              <Lift className="h-full">
                <div
                  className="relative h-full p-8 flex flex-col"
                  style={{
                    borderRadius: 24,
                    ...(plan.featured
                      ? {
                          background: `linear-gradient(165deg, ${gold(0.13)}, rgba(18,18,18,0.85))`,
                          border: `1px solid ${gold(0.34)}`,
                          boxShadow: `0 30px 80px -30px ${gold(0.45)}`,
                        }
                      : { ...glass, boxShadow: SHADOW_LUXURY }),
                  }}
                >
                  {plan.featured && (
                    <span
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-3.5 py-1.5 rounded-full whitespace-nowrap"
                      style={goldButtonStyle}
                    >
                      Eng ommabop
                    </span>
                  )}
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <div className="flex items-end gap-1.5 mt-4">
                    <Counter
                      value={plan.price}
                      className="text-[2.75rem] font-bold leading-none tracking-[-0.02em]"
                      style={{ color: plan.featured ? GOLD : "#fff" }}
                    />
                  </div>
                  <p className="text-[13px] mt-3 mb-7" style={{ color: TEXT_DIM }}>{plan.note}</p>

                  <ul className="space-y-3.5 flex-1 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                        <Check size={15} style={{ color: GOLD }} strokeWidth={2.5} className="flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {plan.featured ? (
                    <GoldButton href="/portfolio/narxlar" className="w-full justify-center">
                      Boshlash <ArrowRight size={14} />
                    </GoldButton>
                  ) : (
                    <GhostButton href="/portfolio/narxlar" className="w-full justify-center">
                      Boshlash <ArrowRight size={14} />
                    </GhostButton>
                  )}
                </div>
              </Lift>
            </motion.div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BLOG PREVIEW
   ═══════════════════════════════════════════════════════════════ */

function BlogPreview() {
  return (
    <Section style={{ background: BG_ALT }}>
      <Reveal>
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <SectionHeading label="Blog" title="So'nggi maqolalar" highlight="maqolalar" />
          <motion.div variants={fadeUp}>
            <GhostButton href="/portfolio/blog">
              Barchasi <ArrowRight size={14} />
            </GhostButton>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {POSTS.slice(0, 3).map((p) => (
            <motion.div key={p.slug} variants={fadeUp}>
              <Link href="/portfolio/blog" className="block h-full">
                <GlassCard className="flex flex-col">
                  <div
                    className="aspect-[16/10] relative overflow-hidden"
                    style={{ background: "linear-gradient(150deg,#141210 0%,#2b2114 60%,#100e0c 100%)" }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{ background: `radial-gradient(ellipse 55% 50% at 55% 40%, ${gold(0.2)}, transparent 68%)` }}
                    />
                  </div>
                  <div className="p-7 flex flex-col flex-1">
                    <div className="flex items-center gap-3.5 text-[11px] mb-3" style={{ color: TEXT_DIM }}>
                      <span>{formatDate(p.date)}</span>
                      <span className="flex items-center gap-1.5"><Clock size={11} /> {p.readMinutes} daq</span>
                    </div>
                    <h3 className="font-semibold text-[16px] leading-snug mb-3">{p.title}</h3>
                    <p className="text-[13px] leading-relaxed flex-1" style={{ color: TEXT_DIM }}>{p.excerpt}</p>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium mt-5" style={{ color: GOLD }}>
                      O{"'"}qish <ArrowUpRight size={13} />
                    </span>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FAQ PREVIEW
   ═══════════════════════════════════════════════════════════════ */

function FaqPreview() {
  return (
    <Section>
      <Reveal>
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-12 items-start">
          <div>
            <SectionHeading
              label="FAQ"
              title="Ko'p beriladigan savollar"
              highlight="savollar"
              subtitle="Kerakli javobni topa olmasangiz — to'g'ridan-to'g'ri bizga yozing."
            />
            <motion.div variants={fadeUp} className="mt-8">
              <GhostButton href="/portfolio/faq">
                Barcha savollar <ArrowRight size={14} />
              </GhostButton>
            </motion.div>
          </div>

          <div className="space-y-3">
            {FAQS.slice(0, 4).map((f) => (
              <motion.div key={f.q} variants={fadeUp}>
                <Spotlight style={{ borderRadius: 24 }}>
                  <div className="p-7" style={{ ...glass }}>
                    <h3 className="font-semibold text-[15px] mb-2.5">{f.q}</h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: TEXT_DIM }}>{f.a}</p>
                  </div>
                </Spotlight>
              </motion.div>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function HomeContent({ projects }: { projects: Project[] }) {
  return (
    <>
      <Hero />
      <MarqueeStrip />
      <ServicesSection />
      <FeaturedProjects projects={projects} />
      <ProcessSection />
      <PricingPreview />
      <BlogPreview />
      <FaqPreview />
      <CtaBand
        title="Loyihangizni bugun boshlaymizmi?"
        subtitle="Bepul konsultatsiya oling — 24 soat ichida taklif va taxminiy muddat tayyorlab beramiz."
        secondaryHref="/portfolio/narxlar"
        secondaryLabel="Narxlarni ko'rish"
      />
    </>
  );
}
