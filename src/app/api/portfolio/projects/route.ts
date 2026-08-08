import { NextRequest, NextResponse } from "next/server";
import {
  listAllProjects, createProject, updateProject, deleteProject,
  PROJECT_CATEGORIES, type ProjectInput,
} from "@/lib/portfolio-store";
import { log } from "@/lib/logger";

// Bu route /api/portfolio/* — middleware'ning parol-gate'i ostida (matcher'da
// istisno qilinmagan), shuning uchun faqat tizimga kirgan admin yoza oladi.
// Ommaviy portfolio sahifalari bu API'ni umuman ishlatmaydi — ular server
// komponent sifatida portfolio-store'dan to'g'ridan-to'g'ri o'qiydi.

const VALID_CATEGORIES = new Set(PROJECT_CATEGORIES.filter((c) => c !== "Barchasi"));

/** Kelgan JSON'dan faqat kutilgan maydonlarni oladi va turlarini to'g'rilaydi. */
function sanitize(body: Record<string, unknown>): ProjectInput | { error: string } {
  const title = String(body.title ?? "").trim();
  if (!title) return { error: "title bo'sh bo'lmasligi kerak" };

  const category = String(body.category ?? "AI");
  if (!VALID_CATEGORIES.has(category as never)) {
    return { error: `Noto'g'ri kategoriya: ${category}` };
  }

  const tech = Array.isArray(body.tech)
    ? body.tech.map(String).map((t) => t.trim()).filter(Boolean)
    : String(body.tech ?? "").split(",").map((t) => t.trim()).filter(Boolean);

  const metrics = Array.isArray(body.metrics)
    ? body.metrics
        .filter((m): m is { value: unknown; label: unknown } => typeof m === "object" && m !== null)
        .map((m) => ({ value: String(m.value ?? "").trim(), label: String(m.label ?? "").trim() }))
        .filter((m) => m.value && m.label)
    : [];

  const link = String(body.link ?? "").trim();

  return {
    title,
    category: category as ProjectInput["category"],
    slug: String(body.slug ?? "").trim() || undefined,
    tagline: String(body.tagline ?? "").trim(),
    summary: String(body.summary ?? "").trim(),
    gradient: String(body.gradient ?? "").trim() ||
      "linear-gradient(150deg,#0b1220 0%,#12233d 55%,#0b1220 100%)",
    cover_url: String(body.cover_url ?? "").trim() || null,
    tech,
    link: link || null,
    metrics,
    problem: String(body.problem ?? "").trim() || null,
    solution: String(body.solution ?? "").trim() || null,
    featured: Boolean(body.featured),
    published: body.published === undefined ? true : Boolean(body.published),
    sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
  };
}

export async function GET() {
  return NextResponse.json({ projects: await listAllProjects() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const clean = sanitize(body);
  if ("error" in clean) return NextResponse.json({ error: clean.error }, { status: 400 });
  try {
    const project = await createProject(clean);
    log("info", "portfolio", `Loyiha qo'shildi: ${clean.title}`);
    return NextResponse.json({ project });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  const clean = sanitize(body);
  if ("error" in clean) return NextResponse.json({ error: clean.error }, { status: 400 });
  try {
    const project = await updateProject(id, clean);
    return NextResponse.json({ project });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  try {
    await deleteProject(id);
    log("info", "portfolio", `Loyiha o'chirildi: ${id}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
