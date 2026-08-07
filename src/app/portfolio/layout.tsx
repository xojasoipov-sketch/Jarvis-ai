import type { ReactNode } from "react";
import type { Metadata } from "next";
import { SiteNav, SiteFooter } from "./_components/SiteChrome";
import { BG } from "./_components/theme";

export const metadata: Metadata = {
  title: "SADIPRIME — Raqamli yechimlar agentligi",
  description:
    "Veb-saytlar, Telegram Mini App, AI yechimlar, avtomatlashtirish va marketing — biz biznesingizni keyingi bosqichga olib chiqamiz.",
};

export default function PortfolioLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen antialiased"
      style={{ background: BG, color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
