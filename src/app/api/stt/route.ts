import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";

const ELEVENLABS_KEY = () => process.env.ELEVENLABS_API_KEY || "";
const GROQ_KEYS = () =>
  [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY2].filter(Boolean) as string[];

async function transcribeElevenLabs(
  audio: File | Blob
): Promise<{ text: string } | { error: string } | null> {
  const key = ELEVENLABS_KEY();
  if (!key) return null;
  try {
    const fd = new FormData();
    fd.append("audio", audio);
    fd.append("model_id", "scribe_v1");
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": key },
      body: fd,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { error: `ElevenLabs ${res.status}` };
    const data = await res.json();
    return data?.text ? { text: data.text as string } : { error: "empty" };
  } catch (e) {
    return { error: String(e) };
  }
}

async function transcribeGroq(
  audio: File | Blob
): Promise<{ text: string } | { error: string } | null> {
  const keys = GROQ_KEYS();
  for (const key of keys) {
    try {
      const body = new FormData();
      body.append("file", audio, "audio.webm");
      body.append("model", "whisper-large-v3");
      body.append("response_format", "json");
      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body,
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.text) return { text: data.text as string };
    } catch { continue; }
  }
  return { error: "Groq failed" };
}

export async function POST(req: NextRequest) {
  // Probe: empty body → capability check
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart")) {
    return NextResponse.json({
      ok: true,
      elevenlabs: Boolean(ENV.elevenlabs()),
      groq: GROQ_KEYS().length > 0,
      hint: "POST multipart field: file yoki audio",
    });
  }

  const form = await req.formData();
  const audio = (form.get("file") || form.get("audio")) as File | Blob | null;
  if (!audio) {
    return NextResponse.json(
      { error: "audio kerak (form field: file yoki audio)" },
      { status: 400 }
    );
  }

  // 1) Groq Whisper — o'zbek uchun odatda eng yaxshi
  const groq = await transcribeGroq(audio);
  if (groq && "text" in groq) {
    return NextResponse.json({ text: groq.text, provider: "groq-whisper" });
  }

  // 2) ElevenLabs Scribe
  const el = await transcribeElevenLabs(audio);
  if (el && "text" in el) {
    return NextResponse.json({ text: el.text, provider: "elevenlabs-scribe" });
  }

  return NextResponse.json(
    {
      error: "STT xato",
      detail: [
        groq && "error" in groq ? groq.error : null,
        el && "error" in el ? el.error : null,
      ]
        .filter(Boolean)
        .join(" | "),
    },
    { status: 500 }
  );
}
