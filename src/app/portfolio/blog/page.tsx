"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Clock, ArrowUpRight } from "lucide-react";
import { GOLD, BORDER, outlineStyle } from "../_components/theme";
import { fadeUp, Reveal, PageHero, Card } from "../_components/ui";
import { POSTS } from "../_data";

const MONTHS_UZ = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

/**
 * Formatted by hand rather than via toLocaleDateString: Node's and the
 * browser's uz-UZ data disagree ("2026 M07 28" vs "28-iyul, 2026"),
 * which produces a hydration mismatch.
 */
function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day}-${MONTHS_UZ[month - 1]}, ${year}`;
}

export default function BlogPage() {
  const featured = POSTS.find((p) => p.featured) ?? POSTS[0];
  const rest = POSTS.filter((p) => p.slug !== featured.slug);

  return (
    <>
      <PageHero
        label="Blog"
        titleTop="Maqolalar va"
        titleGold="yangiliklar"
        subtitle="Raqamli mahsulot qurish, AI va biznesni avtomatlashtirish bo'yicha amaliy maqolalar."
      />

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="grid lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
            {/* Featured article */}
            <motion.article variants={fadeUp}>
              <Link href="/portfolio/blog" className="block group">
                <div className="rounded-2xl overflow-hidden" style={outlineStyle}>
                  <div
                    className="relative aspect-[16/9] flex items-end p-6 md:p-8"
                    style={{ background: "linear-gradient(150deg,#0b1220 0%,#16283f 55%,#0b1220 100%)" }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{ background: `radial-gradient(ellipse 50% 45% at 60% 40%, ${GOLD}22, transparent 65%)` }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" }}
                    />
                    <div className="relative">
                      <span
                        className="inline-block text-[10px] font-medium px-2.5 py-1 rounded-full text-white/80 mb-3"
                        style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BORDER}` }}
                      >
                        Tanlangan maqola
                      </span>
                      <h2 className="text-xl md:text-2xl font-bold text-white leading-snug max-w-lg">
                        {featured.title}
                      </h2>
                      <div className="flex items-center gap-4 mt-3 text-[12px] text-white/45">
                        <span>{formatDate(featured.date)}</span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} /> {featured.readMinutes} daqiqa
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <p className="text-[14px] text-white/45 leading-relaxed">{featured.excerpt}</p>
                    <span
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium mt-4 transition-colors"
                      style={{ color: GOLD }}
                    >
                      O{"'"}qish <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.article>

            {/* Trending list */}
            <motion.div variants={fadeUp}>
              <Card className="p-6">
                <h2 className="font-semibold text-white mb-5">Trenddagi maqolalar</h2>
                <ul className="space-y-4">
                  {rest.map((p) => (
                    <li key={p.slug}>
                      <Link href="/portfolio/blog" className="flex gap-3 group">
                        <div
                          className="w-14 h-14 rounded-lg flex-shrink-0"
                          style={{
                            background: "linear-gradient(150deg,#1a1410 0%,#33260f 100%)",
                            border: `1px solid ${BORDER}`,
                          }}
                        />
                        <div className="min-w-0">
                          <h3 className="text-[13px] font-medium text-white/85 leading-snug group-hover:text-white transition-colors line-clamp-2">
                            {p.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-white/35">
                            <span>{formatDate(p.date)}</span>
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {p.readMinutes} daq
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/portfolio/blog"
                  className="inline-flex items-center justify-center gap-2 text-[13px] font-medium mt-6 py-2.5 rounded-full w-full text-white transition-colors"
                  style={outlineStyle}
                >
                  Barcha maqolalar <ArrowUpRight size={13} />
                </Link>
              </Card>
            </motion.div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
