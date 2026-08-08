"use client";

import { motion } from "framer-motion";
import { Check, Minus, ArrowRight } from "lucide-react";
import { GOLD, TEXT_DIM, BORDER, BG_ALT, gold, glass, SHADOW_LUXURY, goldButtonStyle } from "../_components/theme";
import {
  Section, SectionHeading, PageHero, GlassCard, GoldButton, GhostButton, CtaBand,
  fadeUp, Reveal, Lift,
} from "../_components/ui";
import { PLANS, FAQS } from "../_data";

/** Feature matrix: which tiers include each capability. */
const COMPARISON: { feature: string; tiers: [boolean, boolean, boolean] }[] = [
  { feature: "Responsive dizayn", tiers: [true, true, true] },
  { feature: "SEO optimallashtirish", tiers: [true, true, true] },
  { feature: "Telegram Mini App", tiers: [false, true, true] },
  { feature: "Admin panel", tiers: [false, true, true] },
  { feature: "AI integratsiya", tiers: [false, true, true] },
  { feature: "CRM tizimi", tiers: [false, false, true] },
  { feature: "Hosting va domen (1 yil)", tiers: [false, false, true] },
  { feature: "Prioritet qo'llab-quvvatlash", tiers: [false, false, true] },
];

export default function NarxlarPage() {
  return (
    <>
      <PageHero
        label="Narxlar"
        title="Siz uchun eng yaxshi paketni tanlang"
        highlight="paketni tanlang"
        subtitle="Har bir loyiha hajmi va vazifasi bo'yicha alohida hisoblanadi — tayyor narxlar emas, aniq smeta beramiz."
      />

      {/* ── Plans ── */}
      <Section top={false}>
        <Reveal>
          <div className="grid md:grid-cols-3 gap-5 items-start">
            {PLANS.map((plan) => (
              <motion.div key={plan.name} variants={fadeUp} className={plan.featured ? "md:-mt-5" : ""}>
                <Lift className="h-full">
                  <div
                    className="relative h-full p-8 md:p-9 flex flex-col"
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
                    <h2 className="font-semibold text-lg">{plan.name}</h2>
                    <span
                      className="block text-[13px] font-medium mt-5 tracking-wide uppercase"
                      style={{ color: plan.featured ? GOLD : "rgba(255,255,255,0.6)" }}
                    >
                      Narx — so&apos;rov asosida
                    </span>
                    <p className="text-[13px] mt-4 mb-8" style={{ color: TEXT_DIM }}>{plan.note}</p>

                    <ul className="space-y-3.5 flex-1 mb-9">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm" style={{ color: "rgba(255,255,255,0.78)" }}>
                          <Check size={15} style={{ color: GOLD }} strokeWidth={2.5} className="flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {plan.featured ? (
                      <GoldButton href="/portfolio/aloqa" className="w-full justify-center">
                        Smeta so&apos;rash <ArrowRight size={14} />
                      </GoldButton>
                    ) : (
                      <GhostButton href="/portfolio/aloqa" className="w-full justify-center">
                        Smeta so&apos;rash <ArrowRight size={14} />
                      </GhostButton>
                    )}
                  </div>
                </Lift>
              </motion.div>
            ))}
          </div>

          <motion.p variants={fadeUp} className="text-center text-[13px] mt-10" style={{ color: TEXT_DIM }}>
            Narx loyiha hajmi, muddati va funksiyalar ro&apos;yxatiga qarab hisoblanadi — bog&apos;lanib aniq smeta oling.
          </motion.p>
        </Reveal>
      </Section>

      {/* ── Comparison table ── */}
      <Section style={{ background: BG_ALT }}>
        <Reveal>
          <SectionHeading
            label="Taqqoslash"
            title="Paketlar nimasi bilan farq qiladi"
            highlight="farq qiladi"
            align="center"
            className="mb-14"
          />

          <motion.div variants={fadeUp}>
            <GlassCard interactive={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[560px]">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <th className="py-5 px-7 text-[13px] font-medium" style={{ color: TEXT_DIM }}>Imkoniyat</th>
                      {PLANS.map((p) => (
                        <th
                          key={p.name}
                          className="py-5 px-5 text-center text-[13px] font-semibold"
                          style={{ color: p.featured ? GOLD : "#fff" }}
                        >
                          {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((row, i) => (
                      <tr key={row.feature} style={i < COMPARISON.length - 1 ? { borderBottom: `1px solid ${BORDER}` } : undefined}>
                        <td className="py-4 px-7 text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{row.feature}</td>
                        {row.tiers.map((has, k) => (
                          <td key={k} className="py-4 px-5 text-center">
                            {has ? (
                              <Check size={16} style={{ color: GOLD }} strokeWidth={2.5} className="inline" />
                            ) : (
                              <Minus size={16} style={{ color: "rgba(255,255,255,0.2)" }} className="inline" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        </Reveal>
      </Section>

      {/* ── Payment FAQ ── */}
      <Section>
        <Reveal>
          <SectionHeading
            label="FAQ"
            title="To'lov haqida savollar"
            highlight="savollar"
            align="center"
            className="mb-14"
          />
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {FAQS.slice(0, 4).map((f) => (
              <motion.div key={f.q} variants={fadeUp}>
                <GlassCard className="p-8 h-full">
                  <h3 className="font-semibold text-[15px] mb-3">{f.q}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: TEXT_DIM }}>{f.a}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </Section>

      <CtaBand
        title="Qaysi paket sizga mos ekanini bilmayapsizmi?"
        subtitle="Loyihangizni tavsiflab bering — eng mos variantni birgalikda tanlaymiz."
        primaryLabel="Bepul konsultatsiya"
      />
    </>
  );
}
