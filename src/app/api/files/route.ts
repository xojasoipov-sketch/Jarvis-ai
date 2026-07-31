import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

const BUCKET = "pari-files";
const TEXT_EXTS = new Set(["md", "txt", "json", "csv", "js", "ts", "tsx", "py", "yaml", "yml", "html", "css"]);

// GET /api/files                 — list all files
// GET /api/files?read=name.ext   — read text content of one file
export async function GET(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ files: [], configured: false });

  const readName = new URL(req.url).searchParams.get("read");
  if (readName) {
    const ext = readName.split(".").pop()?.toLowerCase() || "";
    if (!TEXT_EXTS.has(ext)) return NextResponse.json({ content: null });
    const { data, error } = await supabase!.storage.from(BUCKET).download(readName);
    if (error) return NextResponse.json({ content: null, error: error.message });
    const text = await data.text();
    return NextResponse.json({ content: text.slice(0, 20000) });
  }

  const { data, error } = await supabase!.storage.from(BUCKET).list("", { sortBy: { column: "created_at", order: "desc" } });
  if (error) {
    const hint = error.message.includes("not found") || error.message.includes("Bucket not found")
      ? `"${BUCKET}" bucket topilmadi — Supabase Dashboard > Storage > New bucket'da yarating`
      : error.message;
    return NextResponse.json({ files: [], configured: true, error: hint }, { status: 200 });
  }
  const files = (data || [])
    .filter((f) => f.id) // skip folder placeholders
    .map((f) => ({
      name: f.name,
      size: f.metadata?.size ? `${(f.metadata.size / 1024).toFixed(1)} KB` : "—",
      date: (f.created_at || "").slice(0, 10),
    }));
  return NextResponse.json({ files, configured: true });
}

export async function POST(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Baza sozlanmagan" }, { status: 503 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file kerak" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase!.storage.from(BUCKET).upload(file.name, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) {
    const hint = error.message.includes("not found") || error.message.includes("Bucket not found")
      ? `"${BUCKET}" bucket topilmadi — Supabase Dashboard > Storage > New bucket'da yarating`
      : error.message;
    return NextResponse.json({ error: hint }, { status: 500 });
  }
  return NextResponse.json({ ok: true, name: file.name });
}

export async function DELETE(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Baza sozlanmagan" }, { status: 503 });
  const name = new URL(req.url).searchParams.get("name");
  if (!name) return NextResponse.json({ error: "name kerak" }, { status: 400 });
  const { error } = await supabase!.storage.from(BUCKET).remove([name]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
