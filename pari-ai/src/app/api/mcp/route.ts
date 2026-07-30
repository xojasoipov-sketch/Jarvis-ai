import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.HERMES_URL || "";
const KEY = process.env.HERMES_KEY || "";

function h() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (KEY) headers["Authorization"] = `Bearer ${KEY}`;
  return headers;
}

export async function GET() {
  if (!BASE) return NextResponse.json({ tools: [], configured: false });
  try {
    const res = await fetch(`${BASE}/tools`, { headers: h(), signal: AbortSignal.timeout(3000) });
    if (!res.ok) return NextResponse.json({ error: "Hermes error", tools: [], configured: true }, { status: res.status });
    const data = await res.json();
    return NextResponse.json({ tools: data.tools || data, configured: true });
  } catch {
    return NextResponse.json({ error: `Hermes topilmadi: ${BASE}`, tools: [], configured: true }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  if (!BASE) return NextResponse.json({ error: "HERMES_URL o'rnatilmagan" }, { status: 503 });
  const { tool, args } = await req.json();
  try {
    const res = await fetch(`${BASE}/tools/${tool}/call`, {
      method: "POST",
      headers: h(),
      body: JSON.stringify(args || {}),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return NextResponse.json({ error: res.statusText }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Hermes ulanmadi" }, { status: 503 });
  }
}
