import { NextRequest, NextResponse } from "next/server";
import {
  synthesizeElevenLabs,
  elevenLabsMeta,
  elevenLabsConfigured,
  defaultWelcomeText,
  splitSentences,
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
    lang === "uz" ? ["tr", "en"] : lang === "ru" ? ["ru"] : [lang, "en"];
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

const allowFallback = () => process.env.ALLOW_TTS_FALLBACK === "true";

async function resolveBuffer(text: string, lang: string) {
  const el = await synthesizeElevenLabs(text, lang, { stream: false });

  if (el.ok && "buffer" in el) {
    return {
      buf: el.buffer,
      provider: "elevenlabs" as const,
      cached: el.cached,
      error: null as string | null,
    };
  }

  const elError = !el.ok ? el.error : "elevenlabs failed";

  // Kalit BOR bo'lsa — Google/SE ga yashirincha tushilMAYDI (oddiy chalkashlik)
  if (elevenLabsConfigured() && !allowFallback()) {
    return { buf: null, provider: "none" as const, cached: false, error: elError };
  }

  let buf = await streamElementsTTS(text, lang);
  if (buf) return { buf, provider: "streamelements" as const, cached: false, error: elError };
  buf = await googleTTS(text, lang);
  if (buf) return { buf, provider: "google" as const, cached: false, error: elError };
  return { buf: null, provider: "none" as const, cached: false, error: elError };
}

function audioResponse(
  buf: ArrayBuffer,
  provider: string,
  cached: boolean,
  cacheControl = "no-store"
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
  const wantStream = sp.get("stream") === "1" || sp.get("stream") === "true";

  if (!textParam && mode !== "welcome") {
    return NextResponse.json({
      ...elevenLabsMeta(),
      default_lang: "uz",
      welcome: defaultWelcomeText(),
      note: "Kalit bor va EL xato bo'lsa Google ishlatilMAYDI (ALLOW_TTS_FALLBACK=true qilmasangiz)",
    });
  }

  const text = mode === "welcome" ? defaultWelcomeText() : textParam;

  if (wantStream && elevenLabsConfigured()) {
    const el = await synthesizeElevenLabs(text, lang, { stream: true });
    if (el.ok && "stream" in el) {
      return new Response(el.stream, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
          "X-TTS-Provider": "elevenlabs-stream",
        },
      });
    }
  }

  const result = await resolveBuffer(text, lang);
  if (!result.buf) {
    return NextResponse.json(
      {
        error: "tts_failed",
        detail: result.error,
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
    const wantStream = Boolean(body.stream);
    const chunk = Boolean(body.chunk);
    const text =
      mode === "welcome"
        ? defaultWelcomeText(body.name)
        : String(body.text || "").trim();

    if (!text) return NextResponse.json({ error: "text kerak" }, { status: 400 });

    if (chunk) {
      return NextResponse.json({ chunks: splitSentences(text) });
    }

    if (wantStream && elevenLabsConfigured()) {
      const el = await synthesizeElevenLabs(text, lang, { stream: true });
      if (el.ok && "stream" in el) {
        return new Response(el.stream, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
            "X-TTS-Provider": "elevenlabs-stream",
          },
        });
      }
    }

    const result = await resolveBuffer(text, lang);
    if (!result.buf) {
      return NextResponse.json(
        {
          error: "tts_failed",
          detail: result.error,
          ...elevenLabsMeta(),
        },
        { status: 502 }
      );
    }
    return audioResponse(result.buf, result.provider, result.cached);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
