import { NextRequest, NextResponse } from "next/server";

// Server-side TTS proxy — Google Translate TTS (bepul, kalit shart emas)
// iOS da Audio element speechSynthesis'dan yaxshiroq ishlaydi

export async function GET(req: NextRequest) {
  const text = (req.nextUrl.searchParams.get("text") || "").slice(0, 500);
  const lang = req.nextUrl.searchParams.get("lang") || "ru";

  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const url = new URL("https://translate.google.com/translate_tts");
  url.searchParams.set("ie", "UTF-8");
  url.searchParams.set("q", text);
  url.searchParams.set("tl", lang);
  url.searchParams.set("client", "tw-ob");
  url.searchParams.set("ttsspeed", "0.95");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/",
        "Accept": "audio/mpeg,audio/*",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error("TTS fetch error:", res.status);
      return NextResponse.json({ error: "tts_failed" }, { status: 502 });
    }

    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("TTS error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
