"use client";

import { motion } from "framer-motion";
import {
  Bot, Mic, Eye, Sparkles, Workflow, Search, Plug, Users, MessageCircle, GitBranch,
  type LucideIcon,
} from "lucide-react";
import { VIOLET, TEXT_DIM, SURFACE, alpha } from "../_components/theme";
import {
  Section, PageHero, GlassCard, CtaBand, fadeUp, Reveal, Floating,
} from "../_components/ui";
import { AI_CAPABILITIES } from "../_data";

const ICONS: LucideIcon[] = [Bot, Mic, Eye, Sparkles, Workflow, Search, Plug, Users, MessageCircle, GitBranch];

export default function AiShowcasePage() {
  return (
    <>
      <PageHero
        label="AI Showcase"
        title="AI yechimlarimiz"
        highlight="yechimlarimiz"
        subtitle="Biznesingizga real foyda keltiradigan sun'iy intellekt imkoniyatlari — namoyish emas, ishlaydigan mahsulot."
        accent={VIOLET}
      />

      <Section top={false}>
        <Reveal className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {AI_CAPABILITIES.map((cap, i) => {
            const Icon = ICONS[i] ?? Bot;
            return (
              <motion.div key={cap.title} variants={fadeUp}>
                <GlassCard className="p-7 flex flex-col items-center text-center">
                  <Floating amplitude={4} duration={5 + (i % 4)} delay={i * 0.25}>
                    <div
                      className="w-[68px] h-[68px] rounded-full flex items-center justify-center"
                      style={{
                        background: `radial-gradient(circle at 50% 36%, ${alpha(VIOLET, 0.24)}, ${SURFACE} 72%)`,
                        border: `1px solid ${alpha(VIOLET, 0.28)}`,
                        boxShadow: `0 0 40px -12px ${alpha(VIOLET, 0.6)}`,
                      }}
                    >
                      <Icon size={22} style={{ color: VIOLET }} strokeWidth={1.5} />
                    </div>
                  </Floating>
                  <h2 className="font-semibold text-[15px] mt-6 mb-2.5">{cap.title}</h2>
                  <p className="text-[12px] leading-relaxed" style={{ color: TEXT_DIM }}>{cap.desc}</p>
                </GlassCard>
              </motion.div>
            );
          })}
        </Reveal>
      </Section>

      <CtaBand
        title="AI'ni biznesingizga qanday joylashtiramiz?"
        subtitle="Jarayonlaringizni ko'rib chiqamiz va qayerda real foyda berishini aniq aytamiz."
        primaryLabel="Suhbat boshlash"
        secondaryHref="/portfolio/loyihalar"
        secondaryLabel="AI loyihalarni ko'rish"
      />
    </>
  );
}
