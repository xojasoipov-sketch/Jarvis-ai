import { NextRequest, NextResponse } from "next/server";
import { getProviders } from "@/lib/providers";
import { ownerSystemBlock, OWNER } from "@/lib/owner";

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
].filter(Boolean) as string[];

const PARI_SYSTEM = `Sen Pari — ${OWNER.shortName}ning shaxsiy ovozli AI yordamchisissan.

MUHIM:
- "Nima qilmoqchisiz?" DEMA. Buyruq kelsa — darhol bajar yoki bajara boshlaganing haqida ayt.
- Noaniq buyruq → eng mantiqiy talqin qil, so'rama.
- Javob: qisqa, tabiiy, o'zbek tilida, 1-2 gap. Markdown yo'q.
- Egasi: @${OWNER.username} (${OWNER.shortName}) — samimiy munosabat.
- Jarvis uslubi: "Bajarildi", "Tayyor", "Qilindi" — ishonchli, tez.`;

function normalizeMime(raw: string): string {
  const m = raw.toLowerCase().split(";")[0].trim();
  const map: Record<string, string> = {
    "audio/webm": "audio/webm",
    "audio/ogg": "audio/ogg",
    "audio/mp4": "audio/mp4",
    "audio/mpeg": "audio/mpeg",
    "audio/wav": "audio/wav",
  };
  return map[m] || "audio/webm";
}

function mimeToFilename(mime: string): string {
  if (mime.includes("mp4")) return "audio.mp4";
  if (mime.includes("ogg")) return "audio.ogg";
  if (mime.includes("mpeg")) return "audio.mp3";
  if (mime.includes("wav")) return "audio.wav";
  return "audio.webm";
}

// 1. ElevenLabs STT (primary)
async function transcribeElevenLabs(audioBuffer: Buffer, mimeType: string): Promise<string | null> {
  if (!ELEVENLABS_KEY) return null;
  try {
    const fd = new FormData();
    fd.append(
      "audio",
      new Blob([new Uint8Array(audioBuffer)], { type: mimeType }),
      mimeToFilename(mimeType)
    );
    fd.append("model_id", "scribe_v1");
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_KEY },
      body: fd,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.error("ElevenLabs STT error:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    return (data?.text as string) || null;
  } catch (e) {
    console.error("ElevenLabs STT exception:", e);
    return null;
  }
}

// 2. Groq Whisper STT (fallback)
async function transcribeGroq(audioBuffer: Buffer, mimeType: string): Promise<string | null> {
  if (!GROQ_KEY) return null;
  try {
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), mimeToFilename(mimeType));
    fd.append("model", "whisper-large-v3-turbo");
    fd.append("response_format", "json");
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_KEY}` },
      body: fd,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.error("Groq Whisper error:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    return (data?.text as string) || null;
  } catch (e) {
    console.error("Groq Whisper exception:", e);
    return null;
  }
}

// 3. Gemini audio understanding (last resort — handles STT+reply in one call)
async function tryGemini(audioBuffer: Buffer, mimeType: string): Promise<{ transcript: string; reply: string } | null> {
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
    generationConfig: { temperature: 0.7, maxOutputTokens: 300, responseMimeType: "application/json" },
  };
  for (const key of GEMINI_KEYS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.reply) return { transcript: parsed.transcript || "", reply: parsed.reply };
    } catch { continue; }
  }
  return null;
}

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}`, ...(p.headers || {}) },
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

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "audio yo'q" }, { status: 400 });
    }
    const mimeType = audio.type || "audio/webm";
    const buf = Buffer.from(await audio.arrayBuffer());

    if (buf.length < 500) {
      return NextResponse.json({ error: "audio juda qisqa" }, { status: 400 });
    }

    // 1. ElevenLabs STT (primary)
    let transcript = await transcribeElevenLabs(buf, mimeType);

    // 2. Groq Whisper fallback
    if (!transcript || transcript.trim().length < 2) {
      transcript = await transcribeGroq(buf, mimeType);
    }

    // 3. If we have a transcript, get AI reply
    if (transcript && transcript.trim().length > 1) {
      const reply = await askPariText(transcript.trim());
      return NextResponse.json({ transcript: transcript.trim(), reply });
    }

    // 4. Gemini last resort (audio understanding)
    const geminiResult = await tryGemini(buf, mimeType);
    if (geminiResult?.reply) {
      return NextResponse.json(geminiResult);
    }

    console.error("Voice: all providers failed. mime:", mimeType, "size:", buf.length);
    return NextResponse.json(
      { transcript: "", reply: "Kechirasiz, ovozni tushunmadim. Qayta gapiring." },
      { status: 200 }
    );

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    elevenlabs_stt: ELEVENLABS_KEY ? "✅ key set" : "❌ not set",
    groq_stt: GROQ_KEY ? "✅ key set (fallback)" : "❌ not set",
    gemini_stt: GEMINI_KEYS.length ? `✅ ${GEMINI_KEYS.length} key(s) (last resort)` : "❌ not set",
  });
}
