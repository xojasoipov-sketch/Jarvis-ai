"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { GOLD, BORDER, goldButtonStyle, outlineStyle } from "../_components/theme";
import { fadeUp, Reveal, PageHero } from "../_components/ui";
import { PROJECTS, PROJECT_CATEGORIES, type ProjectCategory } from "../_data";

export default function LoyihalarPage() {
  const [active, setActive] = useState<ProjectCategory>("Barchasi");

  const visible = active === "Barchasi" ? PROJECTS : PROJECTS.filter((p) => p.category === active);

  return (
    <>
      <PageHero
        label="Portfolio"
        titleTop="Biz yaratgan"
        titleGold="ishlarimiz"
        subtitle="Har bir loyiha — real biznes muammosiga topilgan yechim. Quyida natijalari bilan birga."
      />

      <section className="pb-8">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Loyiha turlari">
            {PROJECT_CATEGORIES.map((cat) => {
              const isActive = cat === active;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(cat)}
                  className="text-[13px] font-medium px-4 py-2 rounded-full transition-colors"
                  style={isActive ? goldButtonStyle : { ...outlineStyle, color: "rgba(255,255,255,0.6)" }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visible.map((p) => (
              <motion.div key={p.slug} variants={fadeUp}>
                <Link
                  href={`/portfolio/loyihalar/${p.slug}`}
                  className="relative block rounded-2xl overflow-hidden aspect-[3/4] group"
                  style={outlineStyle}
                >
                  <div className="absolute inset-0" style={{ background: p.gradient }} />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)" }}
                  />
                  <div className="absolute top-3 left-3 right-3 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: GOLD }} />
                    <span className="text-white/90 font-semibold text-[13px] leading-tight">{p.title}</span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                    <span
                      className="text-[10px] font-medium px-2.5 py-1 rounded-full text-white/80"
                      style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BORDER}` }}
                    >
                      {p.tagline}
                    </span>
                    <ArrowUpRight
                      size={14}
                      className="text-white/40 group-hover:text-white transition-colors flex-shrink-0 mb-1"
                    />
                  </div>
                </Link>
              </motion.div>
            ))}
          </Reveal>

          {visible.length === 0 && (
            <p className="text-white/40 text-sm text-center py-16">Bu turkumda hozircha loyiha yo{"'"}q.</p>
          )}
        </div>
      </section>
    </>
  );
}
