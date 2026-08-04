/**
 * ElevenLabs TTS — shared client + in-memory cache
 * (inspired by hectorg2211/jarvis welcome cache pattern)
 */

const KEY = () => process.env.ELEVENLABS_API_KEY || "";
const VOICE = () => process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const MODEL = () => process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

// process-local cache (Railway instance lifetime)
const CACHE = new Map<string, { buf: ArrayBuffer; ts: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h
const CACHE_MAX = 40;

function cacheKey(text: string, lang: string) {
  return `${VOICE()}|${MODEL()}|${lang}|${text.slice(0, 500)}`;
}

export function elevenLabsConfigured() {
  return Boolean(KEY());
}

export function elevenLabsMeta() {
  return {
    configured: elevenLabsConfigured(),
    voice_id: VOICE(),
    model_id: MODEL(),
  };
}

export async function synthesizeElevenLabs(
  text: string,
  lang = "uz",
  opts: { skipCache?: boolean } = {}
): Promise<{ buffer: ArrayBuffer; cached: boolean; provider: "elevenlabs" } | null> {
  const key = KEY();
  if (!key) return null;

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
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE()}`, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    return res;
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

  // cache
  if (CACHE.size >= CACHE_MAX) {
    const first = CACHE.keys().next().value;
    if (first) CACHE.delete(first);
  }
  CACHE.set(ck, { buf: buffer, ts: Date.now() });

  return { buffer, cached: false, provider: "elevenlabs" };
}

/** Default owner welcome line (double-clap / HUD boot) */
export function defaultWelcomeText(name = process.env.OWNER_SHORT_NAME || "Sadi") {
  return (
    process.env.JARVIS_WELCOME_TEXT ||
    `Salom, ${name}. Pari tayyor. Buyruq bering — plan, metrics yoki eslab qolish.`
  );
}
