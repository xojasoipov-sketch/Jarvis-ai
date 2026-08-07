"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Home } from "lucide-react";
import { GOLD, goldButtonStyle, outlineStyle } from "./_components/theme";
import { fadeUp, Reveal } from "./_components/ui";

export default function PortfolioNotFound() {
  return (
    <section className="pt-36 pb-32 relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: `radial-gradient(ellipse 55% 45% at 50% 45%, ${GOLD}18, transparent 70%)` }}
      />
      <div className="max-w-3xl mx-auto px-5 text-center">
        <Reveal>
          <motion.div
            variants={fadeUp}
            className="text-[6rem] md:text-[9rem] font-bold leading-none tracking-tight"
            style={{
              color: "transparent",
              WebkitTextStroke: `1.5px ${GOLD}`,
            }}
          >
            404
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-white mt-4 mb-3">
            Sahifa topilmadi
          </motion.h1>

          <motion.p variants={fadeUp} className="text-white/40 leading-relaxed max-w-md mx-auto mb-8">
            Siz qidirgan sahifa o{"'"}chirilgan, nomi o{"'"}zgargan yoki hech qachon mavjud bo{"'"}lmagan.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-full transition-opacity hover:opacity-90"
              style={goldButtonStyle}
            >
              <Home size={16} /> Bosh sahifaga qaytish
            </Link>
            <Link
              href="/portfolio/loyihalar"
              className="inline-flex items-center gap-2 font-medium px-6 py-3 rounded-full text-white transition-colors"
              style={outlineStyle}
            >
              Loyihalarni ko{"'"}rish <ArrowRight size={16} />
            </Link>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
