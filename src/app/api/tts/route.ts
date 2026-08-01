import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || "";
// Multilingual ovoz — o'zbek uchun yaxshi ishlaydi (Rachel default)
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
// eleven_multilingual_v2 — o'zbek/turkiy tillar uchun barqarorroq
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

async function elevenLabsTTS(text: string, lang: string): Promise<ArrayBuffer | null> {
  if (!ELEVENLABS_KEY) {
    console.warn("TTS: ELEVENLABS_API_KEY yo'q");
    return null;
  }
  try {
    const body: Record<string, unknown> = {
      text: text.slice(0, 2500),
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
        style: 0.15,
        use_speaker_boost: true,
      },
    };
    // Ba'zi modellarda language_code qo'llab-quvvatlanadi
    if (lang === "uz" || lang === "ru" || lang === "en" || lang === "tr") {
      body.language_code = lang === "uz" ? "uz" : lang;
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("ElevenLabs TTS error:", res.status, errText);
      // language_code qo'llab-quvvatlanmasa — qayta urinish
      if (res.status === 400 && body.language_code) {
        delete body.language_code;
        const retry = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": ELEVENLABS_KEY,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(20000),
          }
        );
        if (retry.ok) return retry.arrayBuffer();
        console.error("ElevenLabs retry error:", retry.status);
      }
      return null;
    }
    return res.arrayBuffer();
  } catch (e) {
    console.error("ElevenLabs TTS exception:", e);
    return null;
  }
}

// Faqat ElevenLabs yo'q bo'lganda fallback
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

async function googleTTS(text: string, lang: string): Promise<ArrayBuffer | null> {
  const tryLangs =
    lang === "uz" ? ["uz", "tr"] :
    lang === "ru" ? ["ru"] :
    [lang, "en"];

  for (const tl of tryLangs) {
    try {
      const url = new URL("https://translate.google.com/translate_tts");
      url.searchParams.set("ie", "UTF-8");
      url.searchParams.set("q", text.slice(0, 200));
      url.searchParams.set("tl", tl);
      url.searchParams.set("client", "tw-ob");
      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://translate.google.com/",
        },
        signal: AbortSignal.timeout(7000),
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 500) return buf;
      }
    } catch {
      /* next */
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const text = (req.nextUrl.searchParams.get("text") || "").trim();
  const lang = (req.nextUrl.searchParams.get("lang") || "uz").toLowerCase();

  if (!text) {
    return NextResponse.json({
      elevenlabs: ELEVENLABS_KEY ? "✅ key set" : "❌ ELEVENLABS_API_KEY not set — Railway Variables ga qo'shing",
      voice_id: VOICE_ID,
      model_id: MODEL_ID,
      default_lang: "uz",
      note: "O'zbek ovoz uchun ELEVENLABS_API_KEY majburiy. Model: eleven_multilingual_v2",
    });
  }

  // 1) ElevenLabs — asosiy (o'zbek)
  let buf = await elevenLabsTTS(text, lang);

  // 2–3) Faqat kalit yo'q / xato bo'lsa
  if (!buf) buf = await streamElementsTTS(text, lang);
  if (!buf) buf = await googleTTS(text, lang);

  if (!buf) {
    return NextResponse.json(
      {
        error: "tts_failed",
        hint: "Railway Variables: ELEVENLABS_API_KEY=...  va ixtiyoriy ELEVENLABS_VOICE_ID",
      },
      { status: 502 }
    );
  }

  return new Response(buf, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
      "X-TTS-Provider": ELEVENLABS_KEY ? "elevenlabs" : "fallback",
    },
  });
}

// POST — uzun matn uchun (chat javoblari)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = String(body.text || "").trim();
    const lang = String(body.lang || "uz").toLowerCase();
    if (!text) return NextResponse.json({ error: "text kerak" }, { status: 400 });

    let buf = await elevenLabsTTS(text, lang);
    if (!buf) buf = await streamElementsTTS(text, lang);
    if (!buf) buf = await googleTTS(text, lang);
    if (!buf) return NextResponse.json({ error: "tts_failed" }, { status: 502 });

    return new Response(buf, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-TTS-Provider": ELEVENLABS_KEY ? "elevenlabs" : "fallback",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
