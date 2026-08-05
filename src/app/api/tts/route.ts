import { NextRequest, NextResponse } from "next/server";
import {
  synthesizeElevenLabs,
  elevenLabsMeta,
  elevenLabsConfigured,
  defaultWelcomeText,
  splitSentences,
} from "@/lib/elevenlabs";

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || "";
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const DEFAULT_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";

async function elevenLabsTTS(
  text: string,
  voiceId?: string,
  modelId?: string,
  stability?: number,
  similarity?: number,
  style?: number,
): Promise<ArrayBuffer | null> {
  if (!ELEVENLABS_KEY) return null;
  try {
    const vid = voiceId || DEFAULT_VOICE_ID;
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${vid}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.slice(0, 5000),
          model_id: modelId || DEFAULT_MODEL_ID,
          voice_settings: {
            stability: stability ?? 0.5,
            similarity_boost: similarity ?? 0.75,
            style: style ?? 0,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(15000),
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
    return NextResponse.json({
      elevenlabs: ELEVENLABS_KEY ? "✅ key set" : "❌ ELEVENLABS_API_KEY not set",
      voice_id: DEFAULT_VOICE_ID,
      model_id: DEFAULT_MODEL_ID,
      fallbacks: ["streamelements", "google-tts"],
    });
  }

  let buf = await elevenLabsTTS(text);
  if (!buf) buf = await streamElementsTTS(text, lang);
  if (!buf) buf = await googleTTS(text, lang);

  if (!buf) {
    return NextResponse.json(
      { error: "tts_failed", hint: "Set ELEVENLABS_API_KEY in env vars" },
      { status: 502 }
    );
  }

  return new Response(buf, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600" },
  });
}

// POST — advanced TTS with voice/model selection
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = (body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "text kerak" }, { status: 400 });
    }

    const voiceId = body.voice_id || DEFAULT_VOICE_ID;
    const modelId = body.model_id || DEFAULT_MODEL_ID;
    const stability = body.stability;
    const similarity = body.similarity;
    const style = body.style;
    const lang = body.lang || "uz";

    // 1. ElevenLabs with custom settings
    let buf = await elevenLabsTTS(text, voiceId, modelId, stability, similarity, style);

    // 2. StreamElements fallback (ignores voice/model settings)
    if (!buf) buf = await streamElementsTTS(text, lang);

    // 3. Google TTS last resort
    if (!buf) buf = await googleTTS(text, lang);

    if (!buf) {
      return NextResponse.json(
        { error: "tts_failed", hint: "Barcha TTS provayderlar xato berdi" },
        { status: 502 }
      );
    }

    return new Response(buf, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
