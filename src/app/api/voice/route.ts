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

const PARI_SYSTEM = `${ownerSystemBlock()}

Sen Pari — ${OWNER.shortName}ning shaxsiy ovozli AI yordamchisissan.
Qoidalar:
- Egasi bilan gaplashayotganingizni biling (@${OWNER.username})
- O'zbek tilida qisqa, tabiiy javob
- Markdown/kod bloki ishlatma — oddiy gap
- Maksimal 3-4 gap`;

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

async function transcribeElevenLabs(audioBuffer: Buffer, mimeType: string): Promise<string | null> {
  if (!ELEVENLABS_KEY) return null;
  try {
    const fd = new FormData();
    fd.append("audio", new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), mimeToFilename(mimeType));
    fd.append("model_id", "scribe_v1");
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_KEY },
      body: fd,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.text as string) || null;
  } catch {
    return null;
  }
}

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
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.text as string) || null;
  } catch {
    return null;
  }
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
    } catch {
      continue;
    }
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

    let transcript = await transcribeElevenLabs(buf, mimeType);
    if (!transcript || transcript.trim().length < 2) {
      transcript = await transcribeGroq(buf, mimeType);
    }
    if (transcript && transcript.trim().length > 1) {
      const reply = await askPariText(transcript.trim());
      return NextResponse.json({ transcript: transcript.trim(), reply });
    }
    return NextResponse.json({
      transcript: "",
      reply: "Kechirasiz, ovozni tushunmadim. Qayta gapiring.",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    elevenlabs_stt: ELEVENLABS_KEY ? "ok" : "missing",
    groq_stt: GROQ_KEY ? "ok" : "missing",
    owner: OWNER.username,
  });
}
