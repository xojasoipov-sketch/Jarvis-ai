import { NextRequest, NextResponse } from "next/server";
import {
  synthesizeElevenLabs,
  elevenLabsMeta,
  elevenLabsConfigured,
  defaultWelcomeText,
  splitSentences,
} from "@/lib/elevenlabs";

// StreamElements TTS — free, no API key, uses AWS Polly under the hood
async function streamElementsTTS(text: string, lang: string): Promise<ArrayBuffer | null> {
  try {
    const voice = lang === "ru" ? "Maxim" : "Brian";
    const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(text.slice(0, 200))}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

// Google TTS unofficial — last resort
async function googleTTS(text: string, lang: string): Promise<ArrayBuffer | null> {
  try {
    const url = new URL("https://translate.google.com/translate_tts");
    url.searchParams.set("ie", "UTF-8");
    url.searchParams.set("q", text.slice(0, 200));
    url.searchParams.set("tl", lang === "uz" ? "tr" : lang);
    url.searchParams.set("client", "tw-ob");
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://translate.google.com/",
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

// GET — simple TTS (backwards-compatible)
export async function GET(req: NextRequest) {
  const text = (req.nextUrl.searchParams.get("text") || "").trim();
  const lang = req.nextUrl.searchParams.get("lang") || "uz";

  // Status check (no text)
  if (!text) {
    return NextResponse.json(elevenLabsMeta());
  }

  // Try ElevenLabs first (via lib — has cache, retry, diagnostics)
  const elResult = await synthesizeElevenLabs(text, lang);
  if (elResult.ok && "buffer" in elResult) {
    return new Response(elResult.buffer, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600", "X-TTS-Provider": "elevenlabs" },
    });
  }

  // Log why ElevenLabs failed
  if (!elResult.ok) {
    console.error("ElevenLabs TTS failed:", elResult.error, "status:", elResult.status);
  }

  // Fallbacks
  let buf = await streamElementsTTS(text, lang);
  if (buf) {
    return new Response(buf, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600", "X-TTS-Provider": "streamelements" },
    });
  }

  buf = await googleTTS(text, lang);
  if (buf) {
    return new Response(buf, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600", "X-TTS-Provider": "google" },
    });
  }

  return NextResponse.json(
    { error: "tts_failed", elevenlabs_error: !elResult.ok ? elResult.error : undefined },
    { status: 502 }
  );
}

// POST — advanced TTS with voice/model selection
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = (body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "text kerak" }, { status: 400 });
    }

    const lang = body.lang || "uz";

    // 1. ElevenLabs via lib (has cache, retry, diagnostics)
    const elResult = await synthesizeElevenLabs(text, lang);
    if (elResult.ok && "buffer" in elResult) {
      return new Response(elResult.buffer, {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600", "X-TTS-Provider": "elevenlabs" },
      });
    }

    if (!elResult.ok) {
      console.error("ElevenLabs TTS (POST) failed:", elResult.error);
    }

    // 2. StreamElements fallback
    let buf = await streamElementsTTS(text, lang);
    if (buf) {
      return new Response(buf, {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600", "X-TTS-Provider": "streamelements" },
      });
    }

    // 3. Google TTS last resort
    buf = await googleTTS(text, lang);
    if (buf) {
      return new Response(buf, {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600", "X-TTS-Provider": "google" },
      });
    }

    return NextResponse.json(
      { error: "tts_failed", elevenlabs_error: !elResult.ok ? elResult.error : undefined },
      { status: 502 }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Re-export the advanced helpers from the lib for external consumers
export { synthesizeElevenLabs, elevenLabsMeta, elevenLabsConfigured, defaultWelcomeText, splitSentences };
