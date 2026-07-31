import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || "";
// ELEVENLABS_VOICE_ID — must be your OWN voice (free plan can't use library voices)
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "";

async function elevenLabsTTS(text: string): Promise<ArrayBuffer | null> {
  // Skip if no key or no custom voice ID (free plan blocks library voices)
  if (!ELEVENLABS_KEY || !VOICE_ID) return null;
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.slice(0, 500),
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) {
      console.error("ElevenLabs TTS error:", res.status, await res.text().catch(() => ""));
      return null;
    }
    return res.arrayBuffer();
  } catch (e) {
    console.error("ElevenLabs TTS exception:", e);
    return null;
  }
}

async function googleTTS(text: string, lang: string): Promise<ArrayBuffer | null> {
  try {
    const url = new URL("https://translate.google.com/translate_tts");
    url.searchParams.set("ie", "UTF-8");
    url.searchParams.set("q", text.slice(0, 200));
    url.searchParams.set("tl", lang);
    url.searchParams.set("client", "tw-ob");
    url.searchParams.set("ttsspeed", "0.95");
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://translate.google.com/",
        Accept: "audio/mpeg,audio/*",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const text = (req.nextUrl.searchParams.get("text") || "").trim();
  const lang = req.nextUrl.searchParams.get("lang") || "uz";

  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  // ElevenLabs (chiroyli ayol ovozi) → Google TTS fallback
  const buf = (await elevenLabsTTS(text)) ?? (await googleTTS(text, lang));

  if (!buf) return NextResponse.json({ error: "tts_failed" }, { status: 502 });

  return new Response(buf, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
