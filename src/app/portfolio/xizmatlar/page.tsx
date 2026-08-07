"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Globe, Send, Gem, Settings2, TrendingUp, Palette, Bot, Database,
  ArrowRight, ArrowUpRight, type LucideIcon,
} from "lucide-react";
import { GOLD, goldButtonStyle, outlineStyle } from "../_components/theme";
import { fadeUp, Reveal, PageHero, Card, IconTile } from "../_components/ui";
import { SERVICES } from "../_data";

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

export default function XizmatlarPage() {
  return (
    <>
      <PageHero
        label="Xizmatlar"
        titleTop="Bizning"
        titleGold="xizmatlarimiz"
        subtitle="G'oyadan ishga tushirishgacha — biznesingizga kerak bo'lgan barcha raqamli yechimlar bitta jamoadan."
      />

      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICES.map((s) => {
              const Icon = ICONS[s.slug] ?? Globe;
              return (
                <motion.div key={s.slug} variants={fadeUp} id={s.slug} className="scroll-mt-24">
                  <Card className="p-5 h-full flex flex-col group">
                    <IconTile><Icon size={18} style={{ color: GOLD }} strokeWidth={1.75} /></IconTile>
                    <h2 className="font-semibold text-white text-[15px] mt-4 mb-2">{s.title}</h2>
                    <p className="text-[13px] text-white/40 leading-relaxed flex-1">{s.desc}</p>
                    <Link
                      href="/portfolio/aloqa"
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium mt-4 transition-colors"
                      style={{ color: GOLD }}
                    >
                      Batafsil <ArrowUpRight size={12} />
                    </Link>
                  </Card>
                </motion.div>
              );
            })}
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal>
            <motion.div variants={fadeUp}>
              <Card className="p-8 md:p-10 text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  Kerakli xizmatni topa olmadingizmi?
                </h2>
                <p className="text-white/40 max-w-lg mx-auto mb-7 leading-relaxed">
                  Loyihangizni tavsiflab bering — sizga mos yechimni birgalikda ishlab chiqamiz.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/portfolio/aloqa"
                    className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-full transition-opacity hover:opacity-90"
                    style={goldButtonStyle}
                  >
                    Bepul konsultatsiya <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/portfolio/narxlar"
                    className="inline-flex items-center gap-2 font-medium px-6 py-3 rounded-full text-white transition-colors"
                    style={outlineStyle}
                  >
                    Narxlarni ko{"'"}rish
                  </Link>
                </div>
              </Card>
            </motion.div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
