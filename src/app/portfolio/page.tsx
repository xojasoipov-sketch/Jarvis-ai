import type { Metadata } from "next";
import { listFeaturedProjects } from "@/lib/portfolio-store";
import HomeContent from "./HomeContent";

export const metadata: Metadata = {
  title: "SADIPRIME — AI, Telegram Mini App va web yechimlar",
  description:
    "AI platformalar, Telegram Mini App'lar va zamonaviy web mahsulotlar quramiz. " +
    "Yaratilgan ishlar va ular qanday texnologiyada qurilgani.",
};

// Loyihalar admin paneldan boshqariladi — o'zgarish darhol ko'rinishi kerak.
export const revalidate = 0;

export default async function PortfolioHomePage() {
  const projects = await listFeaturedProjects(4);
  return <HomeContent projects={projects} />;
}
