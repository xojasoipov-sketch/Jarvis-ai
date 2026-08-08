// Portfolio loyihalari — Supabase'da saqlanadi, admin panel orqali boshqariladi.
// Ommaviy sahifalar (server komponentlar) shu yerdan to'g'ridan-to'g'ri o'qiydi.
import { supabase, dbConfigured } from "./supabase";
import { log } from "./logger";

export const PROJECT_CATEGORIES = [
  "Barchasi",
  "Web-saytlar",
  "Telegram Mini App",
  "AI",
  "Branding",
  "CRM",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export interface ProjectMetric {
  value: string;
  label: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  category: Exclude<ProjectCategory, "Barchasi">;
  tagline: string;
  summary: string;
  /** Card cover — CSS gradient, used as fallback when cover_url is empty. */
  gradient: string;
  /** Topic-relevant illustration (Supabase Storage). Null renders the gradient instead. */
  cover_url: string | null;
  tech: string[];
  /** Live site or repository; null when the work isn't public. */
  link: string | null;
  /** Only measured numbers. Empty is normal and renders nothing. */
  metrics: ProjectMetric[];
  problem: string | null;
  solution: string | null;
  featured: boolean;
  published: boolean;
  sort_order: number;
}

const TABLE = "pari_portfolio_projects";

/** Bo'sh ro'yxat — DB sozlanmagan yoki xato bo'lganda sahifa yiqilmasligi uchun. */
const EMPTY: Project[] = [];

/** Chop etilgan loyihalar, tartib bo'yicha. Ommaviy sahifalar shuni ishlatadi. */
export async function listPublishedProjects(): Promise<Project[]> {
  if (!dbConfigured || !supabase) return EMPTY;
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    log("error", "portfolio", `listPublishedProjects: ${error.message}`);
    return EMPTY;
  }
  return (data as Project[]) ?? EMPTY;
}

/** Bosh sahifadagi tanlangan loyihalar. Hech biri belgilanmagan bo'lsa — birinchi [limit] ta. */
export async function listFeaturedProjects(limit = 4): Promise<Project[]> {
  const all = await listPublishedProjects();
  const featured = all.filter((p) => p.featured);
  return (featured.length > 0 ? featured : all).slice(0, limit);
}

/** Admin ro'yxati — chop etilmaganlar ham ko'rinadi. */
export async function listAllProjects(): Promise<Project[]> {
  if (!dbConfigured || !supabase) return EMPTY;
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    log("error", "portfolio", `listAllProjects: ${error.message}`);
    return EMPTY;
  }
  return (data as Project[]) ?? EMPTY;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  if (!dbConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    log("error", "portfolio", `getProjectBySlug: ${error.message}`);
    return null;
  }
  return (data as Project) ?? null;
}

export type ProjectInput = Partial<Omit<Project, "id">> & { title: string };

/** Sarlavhadan URL uchun xavfsiz slug yasaydi (o'zbekcha apostroflarni ham tozalaydi). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[''`ʻʼ]/g, "")
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "loyiha";
}

export async function createProject(input: ProjectInput): Promise<Project | null> {
  if (!dbConfigured || !supabase) return null;
  const row = {
    ...input,
    slug: input.slug?.trim() || slugify(input.title),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) {
    log("error", "portfolio", `createProject: ${error.message}`);
    throw new Error(error.message);
  }
  return data as Project;
}

export async function updateProject(id: string, patch: ProjectInput): Promise<Project | null> {
  if (!dbConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    log("error", "portfolio", `updateProject: ${error.message}`);
    throw new Error(error.message);
  }
  return data as Project;
}

export async function deleteProject(id: string): Promise<void> {
  if (!dbConfigured || !supabase) return;
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    log("error", "portfolio", `deleteProject: ${error.message}`);
    throw new Error(error.message);
  }
}
