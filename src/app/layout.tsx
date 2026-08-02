import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Pari AI — Business Factory OS",
  description:
    "AI-powered Business Operating System: CRM, orders, automation, knowledge, finance, and AI employees in one workspace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
