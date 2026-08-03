import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Pari AI — Business Factory OS",
  description:
    "AI-powered Business Operating System: CRM, orders, automation, knowledge, finance, and AI employees in one workspace.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pari AI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#050510",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
