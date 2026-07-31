import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || "";
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel

async function elevenLabsTTS(text: string): Promise<ArrayBuffer | null> {
  if (!ELEVENLABS_KEY) return null;
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
          model_id: "eleven_turbo_v2_5",
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

// StreamElements TTS — free, no API key, uses AWS Polly under the hood
async function streamElementsTTS(text: string, lang: string): Promise<ArrayBuffer | null> {
  try {
    // Pick a voice by language
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
    url.searchParams.set("tl", lang === "uz" ? "tr" : lang); // uz not supported, use Turkish (closest)
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

export async function GET(req: NextRequest) {
  const text = (req.nextUrl.searchParams.get("text") || "").trim();
  const lang = req.nextUrl.searchParams.get("lang") || "uz";

  // Status check (no text)
  if (!text) {
    return NextResponse.json({
      elevenlabs: ELEVENLABS_KEY ? "✅ key set" : "❌ ELEVENLABS_API_KEY not set",
      voice_id: VOICE_ID,
      fallbacks: ["streamelements", "google-tts"],
    });
  }

  // 1. ElevenLabs (premium, best quality)
  let buf = await elevenLabsTTS(text);

  // 2. StreamElements (free, no key)
  if (!buf) buf = await streamElementsTTS(text, lang);

  // 3. Google TTS unofficial
  if (!buf) buf = await googleTTS(text, lang);

  if (!buf) {
    console.error("TTS: all providers failed. lang:", lang, "text length:", text.length);
    return NextResponse.json({ error: "tts_failed", hint: "Set ELEVENLABS_API_KEY in Vercel env vars" }, { status: 502 });
  }

  return new Response(buf, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
