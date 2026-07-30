import { NextRequest, NextResponse } from "next/server";

const BASE = (process.env.OBSIDIAN_URL || "").replace(/\/$/, "");
// Support both OBSIDIAN_KEY and OBSIDIAN_API_KEY
const KEY = process.env.OBSIDIAN_API_KEY || process.env.OBSIDIAN_KEY || "";

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  if (KEY) h["Authorization"] = `Bearer ${KEY}`;
  return h;
}

// GET /api/obsidian             — list vault root
// GET /api/obsidian?path=dir/  — list directory
// GET /api/obsidian?file=note.md — read file content
// GET /api/obsidian?search=q   — search vault
export async function GET(req: NextRequest) {
  if (!BASE) return NextResponse.json({ error: "OBSIDIAN_URL o'rnatilmagan", configured: false });

  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");
  const search = searchParams.get("search");
  const path = searchParams.get("path") || "/";

  try {
    // Read a specific file
    if (file) {
      const res = await fetch(`${BASE}/vault/${encodeURIComponent(file)}`, {
        headers: headers({ Accept: "text/markdown" }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return NextResponse.json({ error: res.statusText }, { status: res.status });
      const content = await res.text();
      return NextResponse.json({ content, file, configured: true });
    }

    // Full-text search
    if (search) {
      const res = await fetch(
        `${BASE}/search/simple/?query=${encodeURIComponent(search)}&contextLength=300`,
        { headers: headers(), signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return NextResponse.json({ results: [], configured: true });
      const results = await res.json();
      return NextResponse.json({ results, configured: true });
    }

    // List directory / vault root
    const url = path === "/" ? `${BASE}/vault/` : `${BASE}/vault/${path.replace(/^\//, "")}`;
    const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(8000) });
    if (!res.ok) return NextResponse.json({ error: res.statusText, files: [], configured: true }, { status: res.status });
    const data = await res.json();
    // Normalize: both { files: [] } and plain array formats
    const files = Array.isArray(data) ? data : (data.files || data.vaultFiles || []);
    return NextResponse.json({ files, configured: true });
  } catch {
    return NextResponse.json({ error: "Obsidian ulanmadi", configured: true }, { status: 503 });
  }
}

// POST /api/obsidian — write note  { path, content }
export async function POST(req: NextRequest) {
  if (!BASE) return NextResponse.json({ error: "OBSIDIAN_URL o'rnatilmagan" }, { status: 503 });
  const { path, content } = await req.json();
  if (!path || content === undefined) return NextResponse.json({ error: "path va content kerak" }, { status: 400 });
  try {
    const res = await fetch(`${BASE}/vault/${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: headers({ "Content-Type": "text/markdown" }),
      body: content,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return NextResponse.json({ error: res.statusText }, { status: res.status });
    return NextResponse.json({ ok: true, path });
  } catch {
    return NextResponse.json({ error: "Obsidian ulanmadi" }, { status: 503 });
  }
}

// DELETE /api/obsidian?file=note.md
export async function DELETE(req: NextRequest) {
  if (!BASE) return NextResponse.json({ error: "OBSIDIAN_URL o'rnatilmagan" }, { status: 503 });
  const file = new URL(req.url).searchParams.get("file");
  if (!file) return NextResponse.json({ error: "file kerak" }, { status: 400 });
  try {
    const res = await fetch(`${BASE}/vault/${encodeURIComponent(file)}`, {
      method: "DELETE",
      headers: headers(),
      signal: AbortSignal.timeout(5000),
    });
    return NextResponse.json({ ok: res.ok });
  } catch {
    return NextResponse.json({ error: "Obsidian ulanmadi" }, { status: 503 });
  }
}
