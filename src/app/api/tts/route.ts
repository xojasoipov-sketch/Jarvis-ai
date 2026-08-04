import { NextRequest, NextResponse } from "next/server";
import {
  synthesizeElevenLabs,
  elevenLabsMeta,
  defaultWelcomeText,
} from "@/lib/elevenlabs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    lang === "uz" ? ["uz", "tr"] : lang === "ru" ? ["ru"] : [lang, "en"];

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

async function resolveTTS(text: string, lang: string) {
  const el = await synthesizeElevenLabs(text, lang);
  if (el) return { buf: el.buffer, provider: el.provider, cached: el.cached };

  let buf = await streamElementsTTS(text, lang);
  if (buf) return { buf, provider: "streamelements", cached: false };

  buf = await googleTTS(text, lang);
  if (buf) return { buf, provider: "google", cached: false };

  return null;
}

function audioResponse(
  buf: ArrayBuffer,
  provider: string,
  cached: boolean,
  cacheControl = "public, max-age=3600"
) {
  return new Response(buf, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": cacheControl,
      "X-TTS-Provider": provider,
      "X-TTS-Cached": cached ? "1" : "0",
    },
  });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = (sp.get("mode") || "").toLowerCase();
  const textParam = (sp.get("text") || "").trim();
  const lang = (sp.get("lang") || "uz").toLowerCase();

  if (!textParam && mode !== "welcome") {
    return NextResponse.json({
      ...elevenLabsMeta(),
      default_lang: "uz",
      welcome: defaultWelcomeText(),
      note: "mode=welcome yoki ?text=... — Railway Variables: ELEVENLABS_API_KEY",
    });
  }

  const text = mode === "welcome" ? defaultWelcomeText() : textParam;
  const result = await resolveTTS(text, lang);
  if (!result) {
    return NextResponse.json(
      {
        error: "tts_failed",
        hint: "1) ELEVENLABS_API_KEY to'g'ri servicega 2) Redeploy 3) key sk_ bilan boshlanadi",
        ...elevenLabsMeta(),
      },
      { status: 502 }
    );
  }

  return audioResponse(result.buf, result.provider, result.cached);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lang = String(body.lang || "uz").toLowerCase();
    const mode = String(body.mode || "").toLowerCase();
    const text =
      mode === "welcome"
        ? defaultWelcomeText(body.name)
        : String(body.text || "").trim();

    if (!text) return NextResponse.json({ error: "text kerak" }, { status: 400 });

    const result = await resolveTTS(text, lang);
    if (!result) {
      return NextResponse.json({ error: "tts_failed", ...elevenLabsMeta() }, { status: 502 });
    }

    return audioResponse(result.buf, result.provider, result.cached, "no-store");
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
