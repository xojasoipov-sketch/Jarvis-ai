import { NextRequest, NextResponse } from "next/server";
import { getProviders } from "@/lib/providers";

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
].filter(Boolean) as string[];
const GROQ_KEY = process.env.GROQ_API_KEY || "";

const PARI_SYSTEM = `Sen Pari — Sadining shaxsiy ovozli AI yordamchisissan.
Qoidalar:
- Foydalanuvchi o'zbek tilida gapirsa — o'zbek tilida javob ber
- Javob qisqa va tabiiy bo'lsin (ovozda qulay eshitilsin)
- Markdown, ro'yxat, kod bloki, maxsus belgilar ishlatma — faqat oddiy gap
- Maksimal 3-4 gap
- Agar savol bo'lmasa ham, samimiy muloqot qil`;

// ── 1. Gemini 1.5 Flash (STT + AI, bitta chaqiruv) ──────────────────────────
async function tryGeminiWithKey(key: string, audioBuffer: Buffer, mimeType: string): Promise<{ transcript: string; reply: string } | null> {
  const b64 = audioBuffer.toString("base64");
  const safeMime = normalizeMime(mimeType);

  const body = {
    system_instruction: { parts: [{ text: PARI_SYSTEM }] },
    contents: [{
      parts: [
        { inline_data: { mime_type: safeMime, data: b64 } },
        { text: `Audiodagi so'zni tushun va Pari sifatida javob ber.\nFaqat JSON formatda qaytargin: {"transcript":"...","reply":"..."}` },
      ],
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 300,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!res.ok) {
    console.error("Gemini error:", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.reply) return { transcript: parsed.transcript || "", reply: parsed.reply };
  } catch { /* fall through */ }
  return null;
}

async function tryGemini(audioBuffer: Buffer, mimeType: string): Promise<{ transcript: string; reply: string } | null> {
  for (const key of GEMINI_KEYS) {
    const result = await tryGeminiWithKey(key, audioBuffer, mimeType);
    if (result) return result;
  }
  return null;
}

// ── 2. Groq Whisper STT ─────────────────────────────────────────────────────
async function transcribeGroq(audioBuffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
  if (!GROQ_KEY) return null;

  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), filename);
  fd.append("model", "whisper-large-v3-turbo");
  fd.append("language", "uz");
  fd.append("response_format", "json");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}` },
    body: fd,
  });
  if (!res.ok) {
    console.error("Groq Whisper error:", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = await res.json();
  return data?.text || null;
}

// ── 3. Pari text AI — direct provider call (no HTTP round-trip) ─────────────
async function askPariText(transcript: string): Promise<string> {
  const providers = getProviders();
  const messages = [
    { role: "system", content: PARI_SYSTEM },
    { role: "user", content: transcript },
  ];
  for (const p of providers) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${p.key}`,
          ...(p.headers || {}),
        },
        body: JSON.stringify({ model: p.model, messages, stream: false }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      if (text.trim()) return text.trim();
    } catch { continue; }
  }
  return "Kechirasiz, tushunmadim.";
}

// ── Helper: normalize MIME type for Gemini ───────────────────────────────────
function normalizeMime(raw: string): string {
  const m = raw.toLowerCase().split(";")[0].trim();
  const map: Record<string, string> = {
    "audio/webm": "audio/webm",
    "audio/ogg": "audio/ogg",
    "audio/mp4": "audio/mp4",
    "audio/x-m4a": "audio/mp4",
    "audio/m4a": "audio/mp4",
    "audio/mpeg": "audio/mpeg",
    "audio/mp3": "audio/mpeg",
    "audio/wav": "audio/wav",
    "audio/wave": "audio/wav",
  };
  return map[m] || "audio/webm";
}

function mimeToFilename(mime: string): string {
  const m = mime.toLowerCase().split(";")[0].trim();
  if (m.includes("mp4") || m.includes("m4a")) return "audio.mp4";
  if (m.includes("ogg")) return "audio.ogg";
  if (m.includes("mpeg") || m.includes("mp3")) return "audio.mp3";
  if (m.includes("wav")) return "audio.wav";
  return "audio.webm";
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "audio yo'q" }, { status: 400 });
    }

    const mimeType = audio.type || "audio/webm";
    const buf = Buffer.from(await audio.arrayBuffer());
    const filename = mimeToFilename(mimeType);

    if (buf.length < 500) {
      return NextResponse.json({ error: "audio juda qisqa" }, { status: 400 });
    }

    // ── Attempt 1: Gemini (STT + AI in one call) ──
    const geminiResult = await tryGemini(buf, mimeType);
    if (geminiResult?.reply) {
      return NextResponse.json(geminiResult);
    }

    // ── Attempt 2: Groq Whisper STT + Pari chat ──
    const transcript = await transcribeGroq(buf, mimeType, filename);
    if (transcript && transcript.trim().length > 1) {
      const reply = await askPariText(transcript.trim());
      return NextResponse.json({ transcript: transcript.trim(), reply });
    }

    // ── Attempt 3: Empty audio or both failed ──
    console.error("Voice: all providers failed. mime:", mimeType, "size:", buf.length);
    return NextResponse.json(
      { transcript: "", reply: "Kechirasiz, ovozni tushunmadim. Qayta gapiring." },
      { status: 200 } // 200 so client doesn't crash — soft error
    );

  } catch (e) {
    console.error("Voice route error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Quick diagnostic — GET /api/voice returns provider status
export async function GET() {
  return NextResponse.json({
    gemini: GEMINI_KEYS.length ? `✅ ${GEMINI_KEYS.length} key(s) set` : "❌ not set",
    groq: GROQ_KEY ? "✅ key set" : "❌ not set",
    base_url: BASE_URL,
  });
}
