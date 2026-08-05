/**
 * ElevenLabs TTS — REST + stream
 */
import { ENV } from "@/lib/env";

const KEY = () => ENV.elevenlabs();
const VOICE = () => process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
const MODEL = () => process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";

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
    key_len: key ? key.length : 0,
    looks_like_sk: key.startsWith("sk_"),
    fallbacks_allowed: process.env.ALLOW_TTS_FALLBACK === "true",
    inventory: (ENV as unknown as Record<string, () => unknown>).inventory?.() ?? {},
  };
}

function buildBody(text: string, lang: string, simple = false) {
  const model = MODEL();
  if (simple) {
    return { text, model_id: model };
  }

  const isTurbo = /turbo|flash/i.test(model);
  const body: Record<string, unknown> = {
    text,
    model_id: model,
    voice_settings: isTurbo
      ? { stability: 0.5, similarity_boost: 0.75 }
      : {
          stability: 0.45,
          similarity_boost: 0.8,
          style: 0.15,
          use_speaker_boost: true,
        },
  };

  // "uz" ba'zi modellarda 400 beradi — faqat aniq qo'llab-quvvatlansa
  if (
    !isTurbo &&
    /multilingual/i.test(model) &&
    ["en", "ru", "tr", "de", "fr", "es", "it", "pt", "pl", "hi"].includes(lang)
  ) {
    body.language_code = lang;
  }

  return body;
}

async function readError(res: Response): Promise<string> {
  try {
    const t = await res.text();
    try {
      const j = JSON.parse(t);
      const d = j?.detail;
      if (typeof d === "string") return d;
      if (d?.message) return String(d.message);
      if (Array.isArray(d))
        return d.map((x: { msg?: string }) => x.msg || JSON.stringify(x)).join("; ");
      return j?.message || t.slice(0, 280);
    } catch {
      return t.slice(0, 280);
    }
  } catch {
    return res.statusText || "unknown";
  }
}

function ttsUrl(stream: boolean) {
  const voice = VOICE();
  const base = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`;
  if (!stream) return base;
  return `${base}/stream?optimize_streaming_latency=2&output_format=mp3_44100_128`;
}

export type SynthResult =
  | { ok: true; buffer: ArrayBuffer; cached: boolean; provider: "elevenlabs" }
  | { ok: true; stream: ReadableStream<Uint8Array>; provider: "elevenlabs" }
  | { ok: false; error: string; status?: number };

export async function synthesizeElevenLabs(
  text: string,
  lang = "uz",
  opts: { skipCache?: boolean; stream?: boolean } = {}
): Promise<SynthResult> {
  const key = KEY();
  if (!key) {
    return { ok: false, error: "ELEVENLABS_API_KEY not set in this Railway service" };
  }
  if (!key.startsWith("sk_") && key.length < 20) {
    return { ok: false, error: "ELEVENLABS_API_KEY looks invalid (need sk_… from API Keys)" };
  }

  const clean = text.trim().slice(0, 2500);
  if (!clean) return { ok: false, error: "empty text" };

  const voice = VOICE();
  if (!voice) return { ok: false, error: "ELEVENLABS_VOICE_ID missing" };

  // buffer + cache
  if (!opts.stream) {
    const ck = cacheKey(clean, lang);
    if (!opts.skipCache) {
      const hit = CACHE.get(ck);
      if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
        return { ok: true, buffer: hit.buf, cached: true, provider: "elevenlabs" };
      }
    }

    const attempts = [buildBody(clean, lang, false), buildBody(clean, lang, true)];
    let lastErr = "";
    let lastStatus = 0;

    for (const body of attempts) {
      try {
        const res = await fetch(ttsUrl(false), {
          method: "POST",
          headers: {
            "xi-api-key": key,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(35000),
        });
        if (!res.ok) {
          lastStatus = res.status;
          lastErr = await readError(res);
          if (res.status === 401 || res.status === 403) break; // key invalid
          continue;
        }
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength < 200) {
          lastErr = "audio too small";
          continue;
        }
        if (CACHE.size >= CACHE_MAX) {
          const first = CACHE.keys().next().value;
          if (first) CACHE.delete(first);
        }
        CACHE.set(ck, { buf: buffer, ts: Date.now() });
        return { ok: true, buffer, cached: false, provider: "elevenlabs" };
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }

    return {
      ok: false,
      status: lastStatus || undefined,
      error: `ElevenLabs ${lastStatus || "err"}: ${lastErr}`,
    };
  }

  // stream
  try {
    let res = await fetch(ttsUrl(true), {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(buildBody(clean, lang, false)),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      res = await fetch(ttsUrl(true), {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify(buildBody(clean, lang, true)),
        signal: AbortSignal.timeout(60000),
      });
    }
    if (!res.ok || !res.body) {
      return { ok: false, status: res.status, error: await readError(res) };
    }
    return { ok: true, stream: res.body, provider: "elevenlabs" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function defaultWelcomeText(name = process.env.OWNER_SHORT_NAME || "Sadi") {
  return (
    process.env.JARVIS_WELCOME_TEXT ||
    `Salom, ${name}. Pari tayyor. Buyruq bering.`
  );
}

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
