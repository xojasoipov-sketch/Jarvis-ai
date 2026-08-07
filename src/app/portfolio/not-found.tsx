"use client";

import { motion } from "framer-motion";
import { ArrowRight, Home } from "lucide-react";
import { TEXT_DIM, gold } from "./_components/theme";
import { Container, GoldButton, GhostButton, fadeUp, Reveal, Floating } from "./_components/ui";

export default function PortfolioNotFound() {
  return (
    <section className="relative pt-44 pb-36 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: `radial-gradient(ellipse 55% 45% at 50% 40%, ${gold(0.13)}, transparent 70%)` }}
      />
      <Container className="text-center">
        <Reveal>
          <motion.div variants={fadeUp}>
            <Floating amplitude={9} duration={7}>
              <div
                className="text-[7rem] md:text-[11rem] font-bold leading-none tracking-[-0.04em] select-none"
                style={{ color: "transparent", WebkitTextStroke: `1.5px ${gold(0.85)}` }}
              >
                404
              </div>
            </Floating>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-2xl md:text-4xl font-bold tracking-[-0.02em] mt-6 mb-4">
            Sahifa topilmadi
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="leading-relaxed max-w-md mx-auto mb-10"
            style={{ color: TEXT_DIM }}
          >
            Siz qidirgan sahifa o{"'"}chirilgan, nomi o{"'"}zgargan yoki hech qachon mavjud bo{"'"}lmagan.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3">
            <GoldButton href="/portfolio" size="lg">
              <Home size={16} /> Bosh sahifaga qaytish
            </GoldButton>
            <GhostButton href="/portfolio/loyihalar" size="lg">
              Loyihalarni ko{"'"}rish <ArrowRight size={16} />
            </GhostButton>
          </motion.div>
        </Reveal>
      </Container>
    </section>
  );
}
