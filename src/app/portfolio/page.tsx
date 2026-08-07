"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Globe, Send, Gem, Settings2, TrendingUp,
  ArrowRight, ArrowUpRight, Play, Check, Quote, Clock,
  Folder, Users, Award, Headphones,
  type LucideIcon,
} from "lucide-react";
import { STATS } from "@/lib/sadiprime";
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
import { SERVICES, PROJECTS, STEPS, PLANS, POSTS, FAQS, TESTIMONIALS, COMPANIES } from "./_data";

const SERVICE_ICONS: Record<string, LucideIcon> = {
  "web-saytlar": Globe,
  "telegram-mini-app": Send,
  "ai-yechimlar": Gem,
  "avtomatlashtirish": Settings2,
  "marketing": TrendingUp,
};

const STAT_ICONS: LucideIcon[] = [Folder, Users, Award, TrendingUp, Headphones];

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

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.78 }}
              className="mt-12 flex items-center gap-8"
            >
              <Magnetic strength={0.2}>
                <button type="button" className="flex items-center gap-3 group">
                  <span
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                    style={{ border: `1px solid ${BORDER}`, background: SURFACE }}
                  >
                    <Play size={14} className="ml-0.5" fill={GOLD} color={GOLD} />
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-medium">Showreel</span>
                    <span className="block text-xs" style={{ color: TEXT_DIM }}>Tomosha qiling</span>
                  </span>
                </button>
              </Magnetic>

              <div className="h-10 w-px" style={{ background: BORDER }} />

              <div>
                <Counter value="7+" className="block text-2xl font-bold" />
                <span className="block text-xs mt-0.5" style={{ color: TEXT_DIM }}>Yillik tajriba</span>
              </div>
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
   TRUSTED COMPANIES
   ═══════════════════════════════════════════════════════════════ */

function TrustedCompanies() {
  return (
    <section className="py-14" style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
      <Container>
        <Reveal>
          <motion.p
            variants={fadeUp}
            className="text-center text-[11px] uppercase tracking-[0.2em] mb-9"
            style={{ color: TEXT_DIM }}
          >
            Bizga ishonishadi
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6"
          >
            {COMPANIES.map((c) => (
              <span
                key={c}
                className="text-lg md:text-xl font-semibold tracking-[0.12em] transition-colors duration-300 hover:text-white"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                {c}
              </span>
            ))}
          </motion.div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STATISTICS
   ═══════════════════════════════════════════════════════════════ */

function Statistics() {
  return (
    <Section>
      <Reveal>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {STATS.map((s, i) => {
            const Icon = STAT_ICONS[i] ?? Folder;
            return (
              <motion.div key={s.label} variants={fadeUp}>
                <GlassCard className="p-7">
                  <Icon size={18} style={{ color: GOLD }} strokeWidth={1.75} />
                  <Counter
                    value={s.value}
                    className="block text-3xl md:text-4xl font-bold mt-5 tracking-[-0.02em]"
                  />
                  <span className="block text-[12px] mt-2" style={{ color: TEXT_DIM }}>{s.label}</span>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </Reveal>
    </Section>
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

function FeaturedProjects() {
  const [lead, ...rest] = PROJECTS.slice(0, 5);

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

        <div className="grid lg:grid-cols-2 gap-5">
          {/* lead project — tall */}
          <motion.div variants={fadeUp}>
            <Link href={`/portfolio/loyihalar/${lead.slug}`} className="block h-full">
              <Lift className="h-full">
                <div
                  className="relative h-full min-h-[440px] overflow-hidden group"
                  style={{ borderRadius: 24, border: `1px solid ${BORDER}`, boxShadow: SHADOW_LUXURY }}
                >
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105" style={{ background: lead.gradient }} />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 8%, transparent 62%)" }} />
                  <div className="absolute inset-x-0 bottom-0 p-8">
                    <span
                      className="inline-block text-[10px] font-medium px-3 py-1.5 rounded-full mb-4"
                      style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${BORDER}`, color: GOLD }}
                    >
                      {lead.tagline}
                    </span>
                    <h3 className="text-2xl font-bold mb-2.5">{lead.title}</h3>
                    <p className="text-sm leading-relaxed max-w-md" style={{ color: TEXT_DIM }}>{lead.summary}</p>
                    <div className="flex flex-wrap gap-5 mt-6">
                      {lead.metrics.slice(0, 3).map((m) => (
                        <div key={m.label}>
                          <div className="text-lg font-bold" style={{ color: GOLD }}>{m.value}</div>
                          <div className="text-[11px]" style={{ color: TEXT_DIM }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Lift>
            </Link>
          </motion.div>

          {/* supporting grid */}
          <div className="grid sm:grid-cols-2 gap-5">
            {rest.map((p) => (
              <motion.div key={p.slug} variants={fadeUp}>
                <Link href={`/portfolio/loyihalar/${p.slug}`} className="block h-full">
                  <Lift className="h-full">
                    <div
                      className="relative h-full min-h-[208px] overflow-hidden group"
                      style={{ borderRadius: 24, border: `1px solid ${BORDER}`, boxShadow: SHADOW_LUXURY }}
                    >
                      <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105" style={{ background: p.gradient }} />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 6%, transparent 66%)" }} />
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <span className="block text-[10px] mb-1.5" style={{ color: GOLD }}>{p.tagline}</span>
                        <h3 className="font-semibold text-[15px] leading-tight">{p.title}</h3>
                      </div>
                      <ArrowUpRight
                        size={16}
                        className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: GOLD }}
                      />
                    </div>
                  </Lift>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </Reveal>
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
   TESTIMONIALS
   ═══════════════════════════════════════════════════════════════ */

function Testimonials() {
  return (
    <Section style={{ background: BG_ALT }}>
      <Reveal>
        <SectionHeading
          label="Mijozlar fikri"
          title="Biz bilan ishlagan bizneslar"
          highlight="bizneslar"
          align="center"
          className="mb-14"
        />

        <div className="grid md:grid-cols-2 gap-5">
          {TESTIMONIALS.map((t) => (
            <motion.div key={t.name} variants={fadeUp}>
              <GlassCard className="p-8 flex flex-col">
                <Quote size={22} style={{ color: gold(0.55) }} strokeWidth={1.5} />
                <p className="text-[15px] leading-relaxed mt-5 flex-1">{t.quote}</p>
                <div className="flex items-center gap-3.5 mt-7 pt-6" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <span
                    className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
                    style={{ background: `linear-gradient(150deg, ${gold(0.22)}, ${gold(0.06)})`, border: `1px solid ${gold(0.22)}`, color: GOLD }}
                  >
                    {t.initials}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-[12px]" style={{ color: TEXT_DIM }}>{t.role}</div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
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

export default function PortfolioHomePage() {
  return (
    <>
      <Hero />
      <TrustedCompanies />
      <Statistics />
      <ServicesSection />
      <FeaturedProjects />
      <ProcessSection />
      <Testimonials />
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
