import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteNav, SiteFooter } from "./_components/SiteChrome";
import { BG } from "./_components/theme";

/**
 * Scoped to the public site only — the authenticated app keeps the system
 * font stack it already ships with.
 */
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "SADIPRIME — Raqamli yechimlar agentligi",
    template: "%s — SADIPRIME",
  },
  description:
    "Veb-saytlar, Telegram Mini App, AI yechimlar, avtomatlashtirish va marketing — biz biznesingizni keyingi bosqichga olib chiqamiz.",
};

export default function PortfolioLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.variable} min-h-screen antialiased`}
      style={{
        background: BG,
        color: "#fff",
        fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
      }}
    >
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
