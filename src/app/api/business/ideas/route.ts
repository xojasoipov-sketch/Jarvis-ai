import { NextRequest, NextResponse } from "next/server";
import { listIdeas, createIdea, updateIdea, deleteIdea, MODULE_DEFS, type ModuleKey } from "@/lib/business-store";

// GET /api/business/ideas?module_key=youtube
export async function GET(req: NextRequest) {
  const moduleKey = new URL(req.url).searchParams.get("module_key") as ModuleKey | null;
  const ideas = await listIdeas(moduleKey || undefined);
  return NextResponse.json({ ideas });
}

// POST /api/business/ideas  { module_key, title, content }
export async function POST(req: NextRequest) {
  const { module_key, title, content } = await req.json();
  if (!module_key || !(module_key in MODULE_DEFS) || !title || !content) {
    return NextResponse.json({ error: "module_key, title, content kerak" }, { status: 400 });
  }
  const idea = await createIdea({ module_key, title, content, status: "draft" });
  return NextResponse.json({ idea });
}

// PATCH /api/business/ideas  { id, ...patch }
export async function PATCH(req: NextRequest) {
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await updateIdea(id, patch);
  return NextResponse.json({ ok: true });
}

// DELETE /api/business/ideas?id=...
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await deleteIdea(id);
  return NextResponse.json({ ok: true });
}
