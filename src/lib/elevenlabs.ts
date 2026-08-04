/**
 * ElevenLabs TTS — shared client + in-memory cache
 */
import { envFirst } from "@/lib/env";

const KEY = () =>
  envFirst(
    "ELEVENLABS_API_KEY",
    "ELEVEN_LABS_API_KEY",
    "ELEVENLABS_KEY",
    "XI_API_KEY"
  );
const VOICE = () =>
  envFirst("ELEVENLABS_VOICE_ID", "ELEVEN_LABS_VOICE_ID") || "21m00Tcm4TlvDq8ikWAM";
const MODEL = () =>
  envFirst("ELEVENLABS_MODEL_ID", "ELEVEN_LABS_MODEL_ID") || "eleven_multilingual_v2";

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
  };
}

export async function synthesizeElevenLabs(
  text: string,
  lang = "uz",
  opts: { skipCache?: boolean } = {}
): Promise<{ buffer: ArrayBuffer; cached: boolean; provider: "elevenlabs" } | null> {
  const key = KEY();
  if (!key) {
    console.warn("TTS: ELEVENLABS_API_KEY yo'q (env)");
    return null;
  }

  const clean = text.trim().slice(0, 2500);
  if (!clean) return null;

  const ck = cacheKey(clean, lang);
  if (!opts.skipCache) {
    const hit = CACHE.get(ck);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
      return { buffer: hit.buf, cached: true, provider: "elevenlabs" };
    }
  }

  const body: Record<string, unknown> = {
    text: clean,
    model_id: MODEL(),
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.15,
      use_speaker_boost: true,
    },
  };
  if (["uz", "ru", "en", "tr"].includes(lang)) {
    body.language_code = lang;
  }

  async function call(payload: Record<string, unknown>) {
    return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE()}`, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
  }

  let res = await call(body);
  if (!res.ok && res.status === 400 && body.language_code) {
    delete body.language_code;
    res = await call(body);
  }
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("ElevenLabs TTS", res.status, err.slice(0, 200));
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

export function defaultWelcomeText(name = process.env.OWNER_SHORT_NAME || "Sadi") {
  return (
    process.env.JARVIS_WELCOME_TEXT ||
    `Salom, ${name}. Pari tayyor. Buyruq bering — plan, metrics yoki eslab qolish.`
  );
}
