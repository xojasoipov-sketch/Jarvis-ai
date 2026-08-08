"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { ArrowRight, Menu, X, Send, Mail, MapPin, AtSign } from "lucide-react";
import { SADIPRIME } from "@/lib/sadiprime";
import {
  GOLD, TEXT_DIM, BG, BORDER, CONTAINER, gold, goldButtonStyle,
  NAV_LINKS, FOOTER_COLUMNS, REVEAL_EASE,
} from "./theme";
import { Magnetic } from "./motion";

/* ── Logo ─────────────────────────────────────────────────────────────────── */

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="navGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F3D9AE" />
          <stop offset="55%" stopColor={GOLD} />
          <stop offset="100%" stopColor="#B98A45" />
        </linearGradient>
      </defs>
      <path d="M12 2 L22 12 L12 22 L2 12 Z" stroke="url(#navGold)" strokeWidth="1.4" fill="none" />
      <path d="M12 7.5 L16.5 12 L12 16.5 L7.5 12 Z" fill="url(#navGold)" opacity="0.9" />
    </svg>
  );
}

export function LogoWordmark({ size = 24 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="font-semibold text-[15px] tracking-[0.06em] text-white">
        <span style={{ color: GOLD }}>SADI</span>PRIME
      </span>
    </span>
  );
}

/* ── Navbar ───────────────────────────────────────────────────────────────── */

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  const isActive = (href: string) =>
    href === "/portfolio" ? pathname === "/portfolio" : pathname.startsWith(href);

  return (
    <motion.nav
      className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(5,5,5,0.72)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: `1px solid ${scrolled ? BORDER : "transparent"}`,
      }}
    >
      <div className={`${CONTAINER} h-20 flex items-center justify-between`}>
        <Link href="/portfolio" aria-label="SADIPRIME bosh sahifa">
          <LogoWordmark />
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className="relative px-4 py-2 text-[13px] transition-colors hover:text-white"
                style={{ color: active ? "#fff" : TEXT_DIM }}
              >
                {l.label}
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 -z-10 rounded-full"
                    style={{ background: gold(0.12), border: `1px solid ${gold(0.24)}` }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <Magnetic strength={0.3}>
              <Link
                href="/portfolio/aloqa"
                className="inline-flex items-center gap-2 text-[13px] font-semibold px-5 py-3 rounded-full"
                style={goldButtonStyle}
              >
                Buyurtma berish <ArrowRight size={14} />
              </Link>
            </Magnetic>
          </div>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2.5 rounded-xl text-white"
            style={{ border: `1px solid ${BORDER}` }}
            aria-label="Menyu"
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: REVEAL_EASE }}
            className="lg:hidden overflow-hidden"
            style={{ background: BG, borderTop: `1px solid ${BORDER}` }}
          >
            <div className={`${CONTAINER} py-5 space-y-1`}>
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3.5 text-[15px] transition-colors"
                  style={{ color: isActive(l.href) ? GOLD : "rgba(255,255,255,0.7)" }}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/portfolio/aloqa"
                onClick={() => setOpen(false)}
                className="mt-4 flex items-center justify-center gap-2 font-semibold px-5 py-3.5 rounded-full"
                style={goldButtonStyle}
              >
                Buyurtma berish <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

/* ── Footer ───────────────────────────────────────────────────────────────── */

/* Faqat haqiqatan ishlaydigan kanallar — "#" ga bog'langan soxta ijtimoiy
   tarmoq tugmalari ko'rsatilmaydi. */
const SOCIALS = [
  { Icon: Send, href: `https://t.me/${SADIPRIME.telegram}`, label: "Telegram" },
  { Icon: AtSign, href: `mailto:${SADIPRIME.email}`, label: "Email" },
];

export function SiteFooter() {
  return (
    <footer className="relative pt-20 pb-10 overflow-hidden" style={{ borderTop: `1px solid ${BORDER}` }}>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-72 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 50% 100% at 50% 100%, ${gold(0.07)}, transparent 70%)` }}
      />
      <div className={`${CONTAINER} relative`}>
        <div className="grid gap-12 lg:grid-cols-[1.5fr_repeat(4,1fr)] mb-14">
          <div>
            <LogoWordmark />
            <p className="text-sm leading-relaxed mt-5 max-w-xs" style={{ color: TEXT_DIM }}>
              {SADIPRIME.description}
            </p>
            <ul className="space-y-3 text-sm mt-7" style={{ color: TEXT_DIM }}>
              <li className="flex items-center gap-2.5">
                <Mail size={14} style={{ color: gold(0.8) }} /> {SADIPRIME.email}
              </li>
              <li className="flex items-center gap-2.5">
                <Send size={14} style={{ color: gold(0.8) }} /> @{SADIPRIME.telegram}
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin size={14} style={{ color: gold(0.8) }} /> {SADIPRIME.location}
              </li>
            </ul>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-5">{col.title}</h4>
              <ul className="space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.label}`}>
                    <Link
                      href={l.href}
                      className="transition-colors hover:text-white"
                      style={{ color: TEXT_DIM }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-5"
          style={{ borderTop: `1px solid ${BORDER}` }}
        >
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.32)" }}>
            &copy; {new Date().getFullYear()} SADIPRIME. Barcha huquqlar himoyalangan.
          </p>
          <div className="flex items-center gap-2.5">
            {SOCIALS.map(({ Icon, href, label }) => (
              <Magnetic key={label} strength={0.4}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:text-white"
                  style={{ border: `1px solid ${BORDER}`, color: TEXT_DIM }}
                >
                  <Icon size={15} />
                </a>
              </Magnetic>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
