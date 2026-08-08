import type { Metadata } from "next";
import { listPublishedProjects } from "@/lib/portfolio-store";
import { PageHero, CtaBand } from "../_components/ui";
import ProjectsGrid from "./ProjectsGrid";

export const metadata: Metadata = {
  title: "Portfolio — SADIPRIME",
  description: "Yaratilgan loyihalar: AI platformalar, Telegram Mini App'lar va web yechimlar.",
};

// Admin panelda o'zgarish darhol ko'rinishi uchun har so'rovda yangilanadi.
export const revalidate = 0;

export default async function LoyihalarPage() {
  const projects = await listPublishedProjects();

  return (
    <>
      <PageHero
        label="Portfolio"
        title="Biz yaratgan ishlarimiz"
        highlight="ishlarimiz"
        subtitle="Har bir loyiha — real mahsulot: nima qurilgani, qanday texnologiyada va qayerda ko'rish mumkinligi."
      />

      <ProjectsGrid projects={projects} />

      <CtaBand
        title="Keyingi loyiha sizniki bo'lsinmi?"
        subtitle="G'oyangizni ayting — 24 soat ichida taxminiy reja va muddat tayyorlab beramiz."
      />
    </>
  );
}
