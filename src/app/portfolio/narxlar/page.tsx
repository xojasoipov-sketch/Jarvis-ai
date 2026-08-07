"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { GOLD, PANEL, BORDER, goldButtonStyle, outlineStyle } from "../_components/theme";
import { fadeUp, Reveal, PageHero, Card } from "../_components/ui";
import { PLANS, FAQS } from "../_data";

export default function NarxlarPage() {
  return (
    <>
      <PageHero
        label="Narxlar"
        titleTop="Siz uchun eng yaxshi"
        titleGold="paketni tanlang"
        subtitle="Barcha paketlarga dizayn, ishlab chiqish va ishga tushirish kiradi. Yashirin to'lovlar yo'q."
      />

      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="grid md:grid-cols-3 gap-5 items-start">
            {PLANS.map((plan) => (
              <motion.div key={plan.name} variants={fadeUp} className={plan.featured ? "md:-mt-4" : ""}>
                <div
                  className="rounded-2xl p-7 h-full flex flex-col relative"
                  style={{
                    background: PANEL,
                    border: `1px solid ${plan.featured ? `${GOLD}66` : BORDER}`,
                    boxShadow: plan.featured ? `0 0 60px ${GOLD}14` : undefined,
                  }}
                >
                  {plan.featured && (
                    <span
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-3 py-1 rounded-full whitespace-nowrap"
                      style={goldButtonStyle}
                    >
                      Eng ommabop
                    </span>
                  )}

                  <h2 className="font-semibold text-white text-lg">{plan.name}</h2>
                  <div className="text-4xl font-bold mt-3" style={{ color: plan.featured ? GOLD : "#fff" }}>
                    {plan.price}
                  </div>
                  <p className="text-[13px] text-white/35 mt-2 mb-6">{plan.note}</p>

                  <ul className="space-y-3 flex-1 mb-7">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px] text-white/60">
                        <Check size={14} style={{ color: GOLD }} strokeWidth={2.5} className="flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/portfolio/aloqa"
                    className="inline-flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-full transition-opacity hover:opacity-90 w-full"
                    style={plan.featured ? goldButtonStyle : { ...outlineStyle, color: "#fff" }}
                  >
                    Buyurtma berish <ArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </Reveal>

          <Reveal>
            <motion.p variants={fadeUp} className="text-center text-[13px] text-white/30 mt-8">
              Narxlar taxminiy — aniq narx loyiha hajmiga qarab belgilanadi.
            </motion.p>
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal>
            <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">
              To{"'"}lov haqida savollar
            </motion.h2>
            <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {FAQS.slice(0, 4).map((f) => (
                <motion.div key={f.q} variants={fadeUp}>
                  <Card className="p-6 h-full">
                    <h3 className="font-semibold text-white text-[14px] mb-2">{f.q}</h3>
                    <p className="text-[13px] text-white/40 leading-relaxed">{f.a}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
