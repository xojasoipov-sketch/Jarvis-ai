"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { GOLD, TEXT_DIM, BORDER, gold, SHADOW_LUXURY, goldButtonStyle, ghostButtonStyle } from "../_components/theme";
import { Section, PageHero, CtaBand, Lift } from "../_components/ui";
import { PROJECTS, PROJECT_CATEGORIES, type ProjectCategory } from "../_data";

export default function LoyihalarPage() {
  const [active, setActive] = useState<ProjectCategory>("Barchasi");
  const visible = active === "Barchasi" ? PROJECTS : PROJECTS.filter((p) => p.category === active);

  return (
    <>
      <PageHero
        label="Portfolio"
        title="Biz yaratgan ishlarimiz"
        highlight="ishlarimiz"
        subtitle="Har bir loyiha — real biznes muammosiga topilgan yechim, o'lchangan natijalari bilan."
      />

      <Section className="pt-4">
        {/* filters */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap gap-2.5 mb-12"
          role="tablist"
          aria-label="Loyiha turlari"
        >
          {PROJECT_CATEGORIES.map((cat) => {
            const isActive = cat === active;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(cat)}
                className="relative text-[13px] font-medium px-5 py-2.5 rounded-full transition-colors"
                style={isActive ? goldButtonStyle : { ...ghostButtonStyle, color: TEXT_DIM }}
              >
                {cat}
              </button>
            );
          })}
        </motion.div>

        {/* grid */}
        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {visible.map((p) => (
              <motion.div
                key={p.slug}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link href={`/portfolio/loyihalar/${p.slug}`} className="block h-full">
                  <Lift className="h-full">
                    <div
                      className="relative h-full min-h-[340px] overflow-hidden group flex flex-col justify-end"
                      style={{ borderRadius: 24, border: `1px solid ${BORDER}`, boxShadow: SHADOW_LUXURY }}
                    >
                      <div
                        className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                        style={{ background: p.gradient }}
                      />
                      <div
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 5%, transparent 68%)" }}
                      />
                      <ArrowUpRight
                        size={16}
                        className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: GOLD }}
                      />
                      <div className="relative p-7">
                        <span
                          className="inline-block text-[10px] font-medium px-2.5 py-1 rounded-full mb-3.5"
                          style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${gold(0.22)}`, color: GOLD }}
                        >
                          {p.tagline}
                        </span>
                        <h2 className="font-semibold text-[17px] mb-2">{p.title}</h2>
                        <p className="text-[13px] leading-relaxed line-clamp-2" style={{ color: TEXT_DIM }}>
                          {p.summary}
                        </p>
                        <div className="flex gap-5 mt-5 pt-5" style={{ borderTop: `1px solid ${BORDER}` }}>
                          {p.metrics.slice(0, 2).map((m) => (
                            <div key={m.label}>
                              <div className="text-[15px] font-bold" style={{ color: GOLD }}>{m.value}</div>
                              <div className="text-[10px]" style={{ color: TEXT_DIM }}>{m.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Lift>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {visible.length === 0 && (
          <p className="text-sm text-center py-20" style={{ color: TEXT_DIM }}>
            Bu turkumda hozircha loyiha yo{"'"}q.
          </p>
        )}
      </Section>

      <CtaBand
        title="Keyingi loyiha sizniki bo'lsinmi?"
        subtitle="G'oyangizni ayting — 24 soat ichida taxminiy reja va muddat tayyorlab beramiz."
      />
    </>
  );
}
