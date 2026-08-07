"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bot, Mic, Eye, Sparkles, Workflow, Search, Plug, Users, MessageCircle, GitBranch,
  ArrowRight, type LucideIcon,
} from "lucide-react";
import { GOLD, PANEL, BORDER, goldButtonStyle } from "../_components/theme";
import { fadeUp, Reveal, PageHero } from "../_components/ui";
import { AI_CAPABILITIES } from "../_data";

const ICONS: LucideIcon[] = [Bot, Mic, Eye, Sparkles, Workflow, Search, Plug, Users, MessageCircle, GitBranch];

export default function AiShowcasePage() {
  return (
    <>
      <PageHero
        label="AI Showcase"
        titleTop="AI"
        titleGold="yechimlarimiz"
        subtitle="Biznesingizga real foyda keltiradigan sun'iy intellekt imkoniyatlari — namoyish emas, ishlaydigan mahsulot."
      />

      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {AI_CAPABILITIES.map((cap, i) => {
              const Icon = ICONS[i] ?? Bot;
              return (
                <motion.div key={cap.title} variants={fadeUp}>
                  <div
                    className="rounded-2xl p-5 h-full flex flex-col items-center text-center group transition-colors"
                    style={{ background: PANEL, border: `1px solid ${BORDER}` }}
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all"
                      style={{
                        background: `radial-gradient(circle at 50% 40%, ${GOLD}2e, transparent 70%)`,
                        border: `1px solid ${GOLD}40`,
                      }}
                    >
                      <Icon size={20} style={{ color: GOLD }} strokeWidth={1.5} />
                    </div>
                    <h2 className="font-semibold text-white text-[14px] mb-1.5">{cap.title}</h2>
                    <p className="text-[12px] text-white/40 leading-relaxed">{cap.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </Reveal>

          <Reveal>
            <motion.div variants={fadeUp} className="text-center mt-12">
              <Link
                href="/portfolio/aloqa"
                className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-full transition-opacity hover:opacity-90"
                style={goldButtonStyle}
              >
                Suhbat boshlash <ArrowRight size={16} />
              </Link>
            </motion.div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
