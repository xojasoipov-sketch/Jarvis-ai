"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import {
  GOLD, TEXT_DIM, BORDER, alpha, SHADOW_LUXURY, goldButtonStyle, accentButtonStyle,
  ghostButtonStyle, REVEAL_EASE, CATEGORY_ACCENT, type ProjectCategoryName,
} from "../_components/theme";
import { Section, Lift } from "../_components/ui";
import { PROJECT_CATEGORIES, type Project, type ProjectCategory } from "@/lib/portfolio-store";

/** "Barchasi" tabida yagona rang yo'q — shu holatda brend oltin ranggi ishlatiladi. */
function categoryAccent(cat: string): string {
  return CATEGORY_ACCENT[cat as ProjectCategoryName] ?? GOLD;
}

export default function ProjectsGrid({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState<ProjectCategory>("Barchasi");
  const visible = active === "Barchasi" ? projects : projects.filter((p) => p.category === active);

  return (
    <>
      <Section top={false}>
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
            // Har bir kategoriya o'z rangida yonadi — "Barchasi" oltin bilan qoladi.
            const activeStyle = cat === "Barchasi" ? goldButtonStyle : accentButtonStyle(categoryAccent(cat));
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(cat)}
                className="relative text-[13px] font-medium px-5 py-2.5 rounded-full transition-colors"
                style={isActive ? activeStyle : { ...ghostButtonStyle, color: TEXT_DIM }}
              >
                {cat}
              </button>
            );
          })}
        </motion.div>

        {/* grid */}
        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {visible.map((p) => {
              const accent = categoryAccent(p.category);
              return (
                <motion.div
                  key={p.slug}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: REVEAL_EASE }}
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
                          style={{ color: accent }}
                        />
                        <div className="relative p-7">
                          <span
                            className="inline-block text-[10px] font-medium px-2.5 py-1 rounded-full mb-3.5"
                            style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${alpha(accent, 0.32)}`, color: accent }}
                          >
                            {p.tagline}
                          </span>
                          <h2 className="font-semibold text-[17px] mb-2">{p.title}</h2>
                          <p className="text-[13px] leading-relaxed line-clamp-2" style={{ color: TEXT_DIM }}>
                            {p.summary}
                          </p>
                          {p.metrics.length > 0 && (
                            <div className="flex gap-5 mt-5 pt-5" style={{ borderTop: `1px solid ${BORDER}` }}>
                              {p.metrics.slice(0, 2).map((m) => (
                                <div key={m.label}>
                                  <div className="text-[15px] font-bold" style={{ color: accent }}>{m.value}</div>
                                  <div className="text-[10px]" style={{ color: TEXT_DIM }}>{m.label}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Lift>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {visible.length === 0 && (
          <p className="text-sm text-center py-20" style={{ color: TEXT_DIM }}>
            Bu turkumda hozircha loyiha yo{"'"}q.
          </p>
        )}
      </Section>
    </>
  );
}
