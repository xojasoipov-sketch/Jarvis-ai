"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Clock } from "lucide-react";
import { GOLD, BORDER, goldButtonStyle, outlineStyle } from "../_components/theme";
import { fadeUp, Reveal, Card } from "../_components/ui";

const OPENINGS = [
  { role: "Frontend Developer", type: "To'liq stavka", place: "Andijon / Masofaviy", stack: "Next.js · TypeScript · Tailwind" },
  { role: "AI Engineer", type: "To'liq stavka", place: "Masofaviy", stack: "Python · LLM · RAG" },
  { role: "UI/UX Designer", type: "Loyiha asosida", place: "Masofaviy", stack: "Figma · Design systems" },
  { role: "SMM Manager", type: "Yarim stavka", place: "Andijon", stack: "Kontent · Target · Analitika" },
];

const PERKS = [
  "Masofaviy ishlash imkoniyati",
  "Real loyihalarda tajriba",
  "O'qish va sertifikatlar uchun byudjet",
  "Moslashuvchan ish grafigi",
];

export default function KaryeraPage() {
  return (
    <>
      <section className="pt-32 pb-16 md:pt-36 relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: `radial-gradient(ellipse 50% 40% at 70% 40%, ${GOLD}14, transparent 70%)` }}
        />
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <motion.h1
                variants={fadeUp}
                className="text-3xl md:text-[2.9rem] font-bold tracking-tight leading-[1.12] text-white mb-5"
              >
                Karyerangizni
                <br />
                <span style={{ color: GOLD }}>biz bilan boshlang</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-white/45 leading-relaxed max-w-md text-[15px] mb-7">
                Kichik jamoada katta loyihalar ustida ishlang. Biz tajribadan ko{"'"}ra o{"'"}rganishga
                tayyorlikni ko{"'"}proq qadrlaymiz.
              </motion.p>
              <motion.div variants={fadeUp}>
                <Link
                  href="/portfolio/aloqa"
                  className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-full transition-opacity hover:opacity-90"
                  style={goldButtonStyle}
                >
                  Vakansiyalarni ko{"'"}rish <ArrowRight size={16} />
                </Link>
              </motion.div>
            </div>

            <motion.div variants={fadeUp}>
              <Card className="p-7">
                <h2 className="font-semibold text-white mb-5">Nima taklif qilamiz</h2>
                <ul className="space-y-3.5">
                  {PERKS.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-[14px] text-white/60">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                        style={{ background: GOLD, boxShadow: `0 0 10px ${GOLD}` }}
                      />
                      {p}
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal>
            <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-white mb-8">
              Ochiq vakansiyalar
            </motion.h2>
            <div className="space-y-3">
              {OPENINGS.map((o) => (
                <motion.div key={o.role} variants={fadeUp}>
                  <Card className="p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white text-[15px] mb-2">{o.role}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-white/40">
                        <span className="flex items-center gap-1.5"><Clock size={12} /> {o.type}</span>
                        <span className="flex items-center gap-1.5"><MapPin size={12} /> {o.place}</span>
                        <span style={{ color: `${GOLD}cc` }}>{o.stack}</span>
                      </div>
                    </div>
                    <Link
                      href="/portfolio/aloqa"
                      className="inline-flex items-center gap-2 text-[13px] font-medium px-5 py-2.5 rounded-full text-white transition-colors flex-shrink-0"
                      style={outlineStyle}
                    >
                      Ariza yuborish <ArrowRight size={13} />
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </div>

            <motion.p variants={fadeUp} className="text-[13px] text-white/30 mt-8 text-center" style={{ borderColor: BORDER }}>
              Ro{"'"}yxatda o{"'"}zingizga mos yo{"'"}nalish yo{"'"}qmi? Baribir yozing — kuchli nomzodlar uchun joy topamiz.
            </motion.p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
