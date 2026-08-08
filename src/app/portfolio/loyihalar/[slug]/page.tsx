import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPublishedProjects, getProjectBySlug } from "@/lib/portfolio-store";
import ProjectDetail from "./ProjectDetail";

// Loyihalar admin paneldan boshqariladi — sahifa har so'rovda yangi ma'lumot oladi.
export const revalidate = 0;
export const dynamicParams = true;

export async function generateStaticParams() {
  const projects = await listPublishedProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Loyiha topilmadi — SADIPRIME" };
  return {
    title: `${project.title} — SADIPRIME`,
    description: project.summary,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const projects = await listPublishedProjects();
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1) notFound();

  const project = projects[index];
  const next = projects[(index + 1) % projects.length];

  return <ProjectDetail project={project} next={next} />;
}
