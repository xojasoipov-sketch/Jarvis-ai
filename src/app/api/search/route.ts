import { NextRequest, NextResponse } from "next/server";
import { internetSearch, fetchUrl } from "@/lib/web";

/** GET ?q=...  yoki POST { query } — internet qidiruv */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q) return NextResponse.json({ error: "q kerak" }, { status: 400 });
  try {
    const result = await internetSearch(q);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.url) {
    try {
      const page = await fetchUrl(String(body.url));
      return NextResponse.json({ ok: true, page });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }
  const q = body.query || body.q || "";
  if (!q) return NextResponse.json({ error: "query yoki url kerak" }, { status: 400 });
  try {
    const result = await internetSearch(String(q));
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
