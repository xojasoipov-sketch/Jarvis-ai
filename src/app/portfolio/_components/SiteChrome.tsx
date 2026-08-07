"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X, Send, Mail, MapPin, Globe, Camera, Video, AtSign } from "lucide-react";
import { SADIPRIME } from "@/lib/sadiprime";
import { GOLD, BG, BORDER, NAV_LINKS, FOOTER_COLUMNS, goldButtonStyle } from "./theme";

/* ── Logo ─────────────────────────────────────────────────────────────────── */

export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2 L22 12 L12 22 L2 12 Z" stroke={GOLD} strokeWidth="1.4" fill="none" />
      <path d="M12 7 L17 12 L12 17 L7 12 Z" stroke={GOLD} strokeWidth="1.4" fill="none" />
    </svg>
  );
}

export function LogoWordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-semibold text-[15px] tracking-wide text-white">
        <span style={{ color: GOLD }}>SADI</span>PRIME
      </span>
    </span>
  );
}

/* ── Navbar ───────────────────────────────────────────────────────────────── */

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/portfolio" ? pathname === "/portfolio" : pathname.startsWith(href);

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50"
      style={{ background: "rgba(10,10,13,0.85)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}` }}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/portfolio" aria-label="SADIPRIME bosh sahifa">
          <LogoWordmark />
        </Link>

        <div className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[13px] transition-colors hover:text-white"
              style={{ color: isActive(l.href) ? GOLD : "rgba(255,255,255,0.55)" }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/portfolio/aloqa"
            className="hidden sm:inline-flex items-center gap-2 text-[13px] font-semibold px-5 py-2.5 rounded-full transition-opacity hover:opacity-90"
            style={goldButtonStyle}
          >
            Buyurtma berish <ArrowRight size={14} />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 text-white"
            aria-label="Menyu"
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden px-5 py-4 space-y-1" style={{ background: BG, borderTop: `1px solid ${BORDER}` }}>
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 hover:text-white transition-colors"
              style={{ color: isActive(l.href) ? GOLD : "rgba(255,255,255,0.7)" }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/portfolio/aloqa"
            onClick={() => setOpen(false)}
            className="mt-3 flex items-center justify-center gap-2 font-semibold px-5 py-3 rounded-full"
            style={goldButtonStyle}
          >
            Buyurtma berish <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </nav>
  );
}

/* ── Footer ───────────────────────────────────────────────────────────────── */

const SOCIALS = [
  { Icon: Send, href: `https://t.me/${SADIPRIME.telegram}`, label: "Telegram" },
  { Icon: Camera, href: "#", label: "Instagram" },
  { Icon: Video, href: "#", label: "YouTube" },
  { Icon: AtSign, href: `mailto:${SADIPRIME.email}`, label: "Email" },
  { Icon: Globe, href: "#", label: "Veb-sayt" },
];

export function SiteFooter() {
  return (
    <footer className="pt-14 pb-8" style={{ background: BG, borderTop: `1px solid ${BORDER}` }}>
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)] mb-12">
          <div>
            <LogoWordmark size={20} />
            <p className="text-sm text-white/40 leading-relaxed mt-4 max-w-xs">
              {SADIPRIME.description}
            </p>
            <ul className="space-y-2 text-sm text-white/40 mt-5">
              <li className="flex items-center gap-2"><Mail size={14} /> {SADIPRIME.email}</li>
              <li className="flex items-center gap-2"><Send size={14} /> @{SADIPRIME.telegram}</li>
              <li className="flex items-center gap-2"><MapPin size={14} /> {SADIPRIME.location}</li>
            </ul>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-4 text-white">{col.title}</h4>
              <ul className="space-y-2.5 text-sm text-white/40">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.label}`}>
                    <Link href={l.href} className="hover:text-white/75 transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: `1px solid ${BORDER}` }}
        >
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} SADIPRIME. Barcha huquqlar himoyalangan.
          </p>
          <div className="flex items-center gap-2">
            {SOCIALS.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
                style={{ border: `1px solid ${BORDER}` }}
              >
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
