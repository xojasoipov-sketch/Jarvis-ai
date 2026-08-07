"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, ArrowRight, HelpCircle } from "lucide-react";
import { GOLD, PANEL, BORDER, goldButtonStyle } from "../_components/theme";
import { fadeUp, Reveal, PageHero } from "../_components/ui";
import { FAQS } from "../_data";

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <PageHero
        label="FAQ"
        titleTop="Ko'p beriladigan"
        titleGold="savollar"
        subtitle="Eng ko'p so'raladigan savollarga javoblar. Kerakli javobni topa olmasangiz — bizga yozing."
      />

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="grid lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
            <motion.div variants={fadeUp} className="space-y-3">
              {FAQS.map((f, i) => {
                const isOpen = open === i;
                return (
                  <div key={f.q} className="rounded-2xl overflow-hidden" style={{ background: PANEL, border: `1px solid ${isOpen ? `${GOLD}44` : BORDER}` }}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: isOpen ? GOLD : "rgba(255,255,255,0.25)" }}
                        />
                        <span className="text-[14px] font-medium text-white/90">{f.q}</span>
                      </span>
                      <ChevronDown
                        size={16}
                        className="flex-shrink-0 transition-transform duration-200"
                        style={{
                          color: isOpen ? GOLD : "rgba(255,255,255,0.35)",
                          transform: isOpen ? "rotate(180deg)" : undefined,
                        }}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pl-11">
                        <p className="text-[13px] text-white/45 leading-relaxed">{f.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>

            <motion.div variants={fadeUp}>
              <div
                className="rounded-2xl p-8 text-center relative overflow-hidden"
                style={{ background: PANEL, border: `1px solid ${BORDER}` }}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: `radial-gradient(ellipse 60% 50% at 50% 35%, ${GOLD}1f, transparent 70%)` }}
                />
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ border: `1px solid ${GOLD}44`, background: `${GOLD}12` }}
                  >
                    <HelpCircle size={26} style={{ color: GOLD }} strokeWidth={1.4} />
                  </div>
                  <h2 className="text-lg font-bold text-white mb-2">Javob topa olmadingizmi?</h2>
                  <p className="text-[13px] text-white/40 leading-relaxed mb-6">
                    Savolingizni yozing — bir ish kuni ichida javob beramiz.
                  </p>
                  <Link
                    href="/portfolio/aloqa"
                    className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-opacity hover:opacity-90"
                    style={goldButtonStyle}
                  >
                    Savol berish <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
