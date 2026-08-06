import { NextRequest, NextResponse } from "next/server";
import { listMemory, rememberFact, forgetFact, type MemoryCategory } from "@/lib/memory-store";
import { log } from "@/lib/logger";

// Shaxsiy yordamchi uzoq muddatli xotirasi (faktlar/afzalliklar/maqsadlar).
// Diqqat: bu /api/memory (Obsidian/GitHub bilim vaulti) dan boshqa narsa — uni bilan aralashtirmang.

export async function GET(req: NextRequest) {
  const category = new URL(req.url).searchParams.get("category") as MemoryCategory | null;
  const items = await listMemory(category || undefined);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { category = "fact", key, value, importance } = body;
  if (!key || !value) return NextResponse.json({ error: "key va value kerak" }, { status: 400 });
  const item = await rememberFact({ category, key, value, importance });
  log("info", "personal-memory", `Eslab qolindi: ${key} = ${value}`);
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await forgetFact(id);
  return NextResponse.json({ ok: true });
}
