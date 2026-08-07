"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { GOLD, TEXT_DIM, BORDER, gold, glass, SHADOW_LUXURY } from "../_components/theme";
import {
  Section, PageHero, GoldButton, CtaBand,
  fadeUp, Reveal, Floating,
} from "../_components/ui";
import { FAQS } from "../_data";

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <PageHero
        label="FAQ"
        title="Ko'p beriladigan savollar"
        highlight="savollar"
        subtitle="Eng ko'p so'raladigan savollarga javoblar. Kerakli javobni topa olmasangiz — bizga yozing."
      />

      <Section top={false}>
        <Reveal className="grid lg:grid-cols-[1.35fr_1fr] gap-10 items-start">
          {/* accordion */}
          <div className="space-y-3.5">
            {FAQS.map((f, i) => {
              const isOpen = open === i;
              return (
                <motion.div key={f.q} variants={fadeUp}>
                  <div
                    className="overflow-hidden transition-colors"
                    style={{
                      ...glass,
                      border: `1px solid ${isOpen ? gold(0.34) : BORDER}`,
                      boxShadow: isOpen ? `0 24px 60px -30px ${gold(0.4)}` : SHADOW_LUXURY,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-5 px-7 py-6 text-left"
                    >
                      <span className="flex items-center gap-4 min-w-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors"
                          style={{
                            background: isOpen ? GOLD : "rgba(255,255,255,0.25)",
                            boxShadow: isOpen ? `0 0 12px ${GOLD}` : undefined,
                          }}
                        />
                        <span className="text-[15px] font-medium">{f.q}</span>
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="flex-shrink-0"
                      >
                        <ChevronDown size={17} style={{ color: isOpen ? GOLD : TEXT_DIM }} />
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <p
                            className="px-7 pb-7 pl-[52px] text-[14px] leading-relaxed"
                            style={{ color: TEXT_DIM }}
                          >
                            {f.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* help card */}
          <motion.div variants={fadeUp} className="lg:sticky lg:top-28">
            <div
              className="relative overflow-hidden p-10 text-center"
              style={{ ...glass, boxShadow: SHADOW_LUXURY }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 65% 55% at 50% 30%, ${gold(0.16)}, transparent 70%)` }}
              />
              <div className="relative">
                <Floating amplitude={6} duration={6}>
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                    style={{
                      border: `1px solid ${gold(0.32)}`,
                      background: gold(0.1),
                      boxShadow: `0 0 50px -12px ${gold(0.6)}`,
                    }}
                  >
                    <HelpCircle size={30} style={{ color: GOLD }} strokeWidth={1.3} />
                  </div>
                </Floating>
                <h2 className="text-xl font-bold mt-7 mb-3">Javob topa olmadingizmi?</h2>
                <p className="text-[14px] leading-relaxed mb-8" style={{ color: TEXT_DIM }}>
                  Savolingizni yozing — bir ish kuni ichida javob beramiz.
                </p>
                <GoldButton href="/portfolio/aloqa">Savol berish</GoldButton>
              </div>
            </div>
          </motion.div>
        </Reveal>
      </Section>

      <CtaBand
        title="Loyihangizni muhokama qilaylikmi?"
        subtitle="Birinchi konsultatsiya bepul — savollaringizga to'g'ridan-to'g'ri javob beramiz."
        secondaryHref="/portfolio/narxlar"
        secondaryLabel="Narxlarni ko'rish"
      />
    </>
  );
}
