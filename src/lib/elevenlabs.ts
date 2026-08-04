/**
 * ElevenLabs TTS — REST + stream proxy helpers
 * Docs: POST /v1/text-to-speech/{voice_id}/stream
 */
import { ENV } from "@/lib/env";

const KEY = () => ENV.elevenlabs();
const VOICE = () => ENV.elevenlabsVoice();
const MODEL = () => ENV.elevenlabsModel();

const CACHE = new Map<string, { buf: ArrayBuffer; ts: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const CACHE_MAX = 40;

function cacheKey(text: string, lang: string) {
  return `${VOICE()}|${MODEL()}|${lang}|${text.slice(0, 500)}`;
}

export function elevenLabsConfigured() {
  return Boolean(KEY());
}

export function elevenLabsMeta() {
  const key = KEY();
  return {
    configured: Boolean(key),
    elevenlabs: key ? "✅ ELEVENLABS_API_KEY set" : "❌ ELEVENLABS_API_KEY not set",
    voice_id: VOICE(),
    model_id: MODEL(),
    key_prefix: key ? `${key.slice(0, 6)}…` : null,
    fallbacks: ["streamelements", "google-tts"],
    inventory: ENV.inventory(),
  };
}

/** Turbo / flash models reject some voice_settings fields */
function buildBody(text: string, lang: string) {
  const model = MODEL();
  const isTurbo = /turbo|flash|generative/i.test(model);

  const body: Record<string, unknown> = {
    text,
    model_id: model,
  };

  if (isTurbo) {
    body.voice_settings = {
      stability: 0.5,
      similarity_boost: 0.75,
    };
  } else {
    body.voice_settings = {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.15,
      use_speaker_boost: true,
    };
    // language_code faqat multilingual_v2 da ishonchli
    if (/multilingual/i.test(model) && ["uz", "ru", "en", "tr"].includes(lang)) {
      body.language_code = lang;
    }
  }

  return body;
}

export type ElevenError = {
  status: number;
  message: string;
};

async function readError(res: Response): Promise<string> {
  try {
    const t = await res.text();
    try {
      const j = JSON.parse(t);
      return j?.detail?.message || j?.detail || j?.message || t.slice(0, 240);
    } catch {
      return t.slice(0, 240);
    }
  } catch {
    return res.statusText || "unknown";
  }
}

function ttsUrl(stream: boolean) {
  const voice = VOICE();
  const base = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
  if (!stream) return base;
  // optimize_streaming_latency: 0–4 (3 = good balance)
  return `${base}/stream?optimize_streaming_latency=3&output_format=mp3_44100_128`;
}

export async function synthesizeElevenLabs(
  text: string,
  lang = "uz",
  opts: { skipCache?: boolean; stream?: boolean } = {}
): Promise<
  | { buffer: ArrayBuffer; cached: boolean; provider: "elevenlabs" }
  | { stream: ReadableStream<Uint8Array>; provider: "elevenlabs" }
  | null
> {
  const key = KEY();
  if (!key) {
    console.warn("TTS: ELEVENLABS_API_KEY yo'q (env)");
    return null;
  }

  const clean = text.trim().slice(0, 2500);
  if (!clean) return null;

  // Full buffer path + cache
  if (!opts.stream) {
    const ck = cacheKey(clean, lang);
    if (!opts.skipCache) {
      const hit = CACHE.get(ck);
      if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
        return { buffer: hit.buf, cached: true, provider: "elevenlabs" };
      }
    }

    let body = buildBody(clean, lang);
    let res = await fetch(ttsUrl(false), {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    // language_code / voice_settings 400 → soddalashtirib qayta
    if (!res.ok && res.status === 400) {
      body = { text: clean, model_id: MODEL() };
      res = await fetch(ttsUrl(false), {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
    }

    if (!res.ok) {
      console.error("ElevenLabs TTS", res.status, await readError(res));
      return null;
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 200) return null;

    if (CACHE.size >= CACHE_MAX) {
      const first = CACHE.keys().next().value;
      if (first) CACHE.delete(first);
    }
    CACHE.set(ck, { buf: buffer, ts: Date.now() });
    return { buffer, cached: false, provider: "elevenlabs" };
  }

  // Streaming path — no cache
  let body = buildBody(clean, lang);
  let res = await fetch(ttsUrl(true), {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok && res.status === 400) {
    body = { text: clean, model_id: MODEL() };
    res = await fetch(ttsUrl(true), {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
  }

  if (!res.ok || !res.body) {
    console.error("ElevenLabs stream", res.status, await readError(res));
    return null;
  }

  return { stream: res.body, provider: "elevenlabs" };
}

export function defaultWelcomeText(name = process.env.OWNER_SHORT_NAME || "Sadi") {
  return (
    process.env.JARVIS_WELCOME_TEXT ||
    `Salom, ${name}. Pari tayyor. Buyruq bering — plan, metrics yoki eslab qolish.`
  );
}

/** Uzun matnni gaplarga bo'lish (navbatli ijro / kamroq timeout) */
export function splitSentences(text: string, maxLen = 280): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const parts = clean.split(/(?<=[.!?…。])\s+/).filter(Boolean);
  const out: string[] = [];
  let buf = "";
  for (const p of parts) {
    if ((buf + " " + p).trim().length > maxLen && buf) {
      out.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? `${buf} ${p}` : p;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length ? out : [clean.slice(0, maxLen)];
}
