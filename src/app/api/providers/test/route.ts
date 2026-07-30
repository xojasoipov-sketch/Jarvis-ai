import { NextRequest, NextResponse } from "next/server";
import { getProviders } from "@/lib/providers";

// GET /api/providers/test?name=groq — sends a tiny real request to confirm the key actually works
export async function GET(req: NextRequest) {
  const name = new URL(req.url).searchParams.get("name");
  const provider = getProviders().find((p) => p.name === name);
  if (!provider) return NextResponse.json({ ok: false, error: "Provider topilmadi yoki key o'rnatilmagan" }, { status: 404 });

  try {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.key}`, ...(provider.headers || {}) },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 4,
        stream: false,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` }, { status: 200 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 200 });
  }
}
