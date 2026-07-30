import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.OBSIDIAN_URL || "";
const KEY = process.env.OBSIDIAN_KEY || "";

function h(extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { ...extra };
  if (KEY) headers["Authorization"] = `Bearer ${KEY}`;
  return headers;
}

export async function GET(req: NextRequest) {
  if (!BASE) return NextResponse.json({ error: "OBSIDIAN_URL o'rnatilmagan", configured: false });
  const path = new URL(req.url).searchParams.get("path") || "/";
  try {
    const res = await fetch(`${BASE}/vault${path}`, { headers: h(), signal: AbortSignal.timeout(5000) });
    if (!res.ok) return NextResponse.json({ error: res.statusText, configured: true }, { status: res.status });
    return NextResponse.json({ ...(await res.json()), configured: true });
  } catch {
    return NextResponse.json({ error: "Obsidian ulanmadi", configured: true }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  if (!BASE) return NextResponse.json({ error: "OBSIDIAN_URL o'rnatilmagan" }, { status: 503 });
  const { path, content } = await req.json();
  try {
    const res = await fetch(`${BASE}/vault${path}`, {
      method: "PUT",
      headers: h({ "Content-Type": "text/markdown" }),
      body: content,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json({ error: res.statusText }, { status: res.status });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Obsidian ulanmadi" }, { status: 503 });
  }
}

export async function PUT(req: NextRequest) {
  if (!BASE) return NextResponse.json({ error: "OBSIDIAN_URL o'rnatilmagan", results: [] }, { status: 503 });
  const { query } = await req.json();
  try {
    const res = await fetch(`${BASE}/search/simple/?query=${encodeURIComponent(query)}&contextLength=200`, {
      headers: h(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json({ error: res.statusText, results: [] }, { status: res.status });
    return NextResponse.json({ results: await res.json(), configured: true });
  } catch {
    return NextResponse.json({ error: "Obsidian ulanmadi", results: [] }, { status: 503 });
  }
}
