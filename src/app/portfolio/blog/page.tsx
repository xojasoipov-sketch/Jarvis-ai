"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Clock, Search, Send } from "lucide-react";
import { GOLD, TEXT_DIM, BORDER, BG_ALT, gold, glass, SHADOW_LUXURY, goldButtonStyle, ghostButtonStyle } from "../_components/theme";
import {
  Section, SectionHeading, PageHero, GlassCard, GoldButton,
  fadeUp, Reveal, Lift,
} from "../_components/ui";
import { POSTS } from "../_data";

const CATEGORIES = ["Barchasi", "AI", "Telegram", "Marketing", "Development"] as const;

const MONTHS_UZ = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

/**
 * Formatted by hand rather than via toLocaleDateString: Node's and the
 * browser's uz-UZ data disagree, which produces a hydration mismatch.
 */
function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day}-${MONTHS_UZ[month - 1]}, ${year}`;
}

export default function BlogPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Barchasi");

  const featured = POSTS.find((p) => p.featured) ?? POSTS[0];
  const matches = POSTS.filter(
    (p) =>
      p.slug !== featured.slug &&
      (query.trim() === "" ||
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.excerpt.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <>
      <PageHero
        label="Blog"
        title="Maqolalar va yangiliklar"
        highlight="yangiliklar"
        subtitle="Raqamli mahsulot qurish, AI va biznesni avtomatlashtirish bo'yicha amaliy maqolalar."
      />

      {/* ── Featured ── */}
      <Section top={false}>
        <Reveal>
          <motion.div variants={fadeUp}>
            <Link href="/portfolio/blog" className="block">
              <Lift>
                <div
                  className="relative overflow-hidden group"
                  style={{ borderRadius: 24, border: `1px solid ${BORDER}`, boxShadow: SHADOW_LUXURY }}
                >
                  <div className="grid lg:grid-cols-2">
                    <div
                      className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[380px] overflow-hidden"
                      style={{ background: "linear-gradient(150deg,#0b1220 0%,#1a2c46 55%,#0b1220 100%)" }}
                    >
                      {featured.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={featured.cover}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                          style={{ background: `radial-gradient(ellipse 55% 50% at 55% 42%, ${gold(0.24)}, transparent 68%)` }}
                        />
                      )}
                    </div>
                    <div className="p-9 md:p-12 flex flex-col justify-center" style={{ background: "rgba(18,18,18,0.72)" }}>
                      <span
                        className="inline-flex self-start text-[10px] font-medium px-3 py-1.5 rounded-full mb-6"
                        style={{ border: `1px solid ${gold(0.26)}`, color: GOLD, background: gold(0.06) }}
                      >
                        Tanlangan maqola
                      </span>
                      <h2 className="text-2xl md:text-[2rem] font-bold leading-snug tracking-[-0.02em]">
                        {featured.title}
                      </h2>
                      <p className="text-[15px] leading-relaxed mt-5" style={{ color: TEXT_DIM }}>
                        {featured.excerpt}
                      </p>
                      <div className="flex items-center gap-5 mt-7 text-[12px]" style={{ color: TEXT_DIM }}>
                        <span>{formatDate(featured.date)}</span>
                        <span className="flex items-center gap-1.5"><Clock size={12} /> {featured.readMinutes} daqiqa</span>
                      </div>
                      <span
                        className="inline-flex items-center gap-2 text-[14px] font-semibold mt-8"
                        style={{ color: GOLD }}
                      >
                        O{"'"}qish <ArrowRight size={15} />
                      </span>
                    </div>
                  </div>
                </div>
              </Lift>
            </Link>
          </motion.div>
        </Reveal>
      </Section>

      {/* ── Search + categories + list ── */}
      <Section top={false}>
        <div className="flex flex-wrap items-center justify-between gap-5 mb-10">
          <div className="flex flex-wrap gap-2.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className="text-[13px] font-medium px-5 py-2.5 rounded-full transition-colors"
                style={c === category ? goldButtonStyle : { ...ghostButtonStyle, color: TEXT_DIM }}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: TEXT_DIM }}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Maqola qidirish..."
              aria-label="Maqola qidirish"
              className="w-full text-sm rounded-full pl-11 pr-4 py-3 focus:outline-none transition-colors placeholder:text-white/30"
              style={{ ...ghostButtonStyle, borderRadius: 999 }}
            />
          </div>
        </div>

        <Reveal className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {matches.map((p) => (
            <motion.div key={p.slug} variants={fadeUp}>
              <Link href="/portfolio/blog" className="block h-full">
                <GlassCard className="flex flex-col">
                  <div
                    className="aspect-[16/10] relative overflow-hidden"
                    style={{ background: "linear-gradient(150deg,#141210 0%,#2b2114 60%,#100e0c 100%)" }}
                  >
                    {p.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div
                        className="absolute inset-0"
                        style={{ background: `radial-gradient(ellipse 55% 50% at 55% 40%, ${gold(0.18)}, transparent 68%)` }}
                      />
                    )}
                  </div>
                  <div className="p-7 flex flex-col flex-1">
                    <div className="flex items-center gap-3.5 text-[11px] mb-3" style={{ color: TEXT_DIM }}>
                      <span>{formatDate(p.date)}</span>
                      <span className="flex items-center gap-1.5"><Clock size={11} /> {p.readMinutes} daq</span>
                    </div>
                    <h2 className="font-semibold text-[16px] leading-snug mb-3">{p.title}</h2>
                    <p className="text-[13px] leading-relaxed flex-1" style={{ color: TEXT_DIM }}>{p.excerpt}</p>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium mt-5" style={{ color: GOLD }}>
                      O{"'"}qish <ArrowUpRight size={13} />
                    </span>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </Reveal>

        {matches.length === 0 && (
          <p className="text-sm text-center py-20" style={{ color: TEXT_DIM }}>
            {query ? `"${query}" bo'yicha maqola topilmadi.` : "Maqola yo'q."}
          </p>
        )}
      </Section>

      {/* ── Newsletter ── */}
      <Section style={{ background: BG_ALT }}>
        <Reveal>
          <motion.div variants={fadeUp}>
            <div
              className="relative overflow-hidden px-8 py-14 md:px-16 md:py-16"
              style={{ ...glass, boxShadow: SHADOW_LUXURY }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 55% 90% at 50% 0%, ${gold(0.12)}, transparent 70%)` }}
              />
              <div className="relative grid lg:grid-cols-2 gap-10 items-center">
                <div>
                  <SectionHeading
                    label="Yangiliklar"
                    title="Yangi maqolalardan xabardor bo'ling"
                    highlight="xabardor bo'ling"
                    subtitle="Oyiga bir marta — faqat foydali kontent, spam yo'q."
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="Email manzilingiz"
                    aria-label="Email manzilingiz"
                    className="flex-1 text-sm rounded-full px-5 py-4 focus:outline-none placeholder:text-white/30"
                    style={ghostButtonStyle}
                  />
                  <GoldButton href={`https://t.me/xojasoipov`} size="lg">
                    <Send size={15} /> Obuna
                  </GoldButton>
                </div>
              </div>
            </div>
          </motion.div>
        </Reveal>
      </Section>
    </>
  );
}
