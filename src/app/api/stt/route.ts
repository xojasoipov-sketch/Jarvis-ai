import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || "";
const GROQ_KEYS = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY2].filter(Boolean) as string[];

async function transcribeElevenLabs(audio: File): Promise<string | null> {
  if (!ELEVENLABS_KEY) return null;
  try {
    const fd = new FormData();
    fd.append("audio", audio);
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

async function transcribeGroq(audio: File, lang: string): Promise<string | null> {
  for (const key of GROQ_KEYS) {
    try {
      const body = new FormData();
      body.append("file", audio, "audio.webm");
      body.append("model", "whisper-large-v3");
      body.append("response_format", "json");
      // No language forced — auto-detect works better for Uzbek
      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body,
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.text) return data.text as string;
    } catch { continue; }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const audio = form.get("audio") as File | null;
  if (!audio) return NextResponse.json({ error: "audio kerak" }, { status: 400 });

  // 1. ElevenLabs Scribe v1 (primary)
  const elText = await transcribeElevenLabs(audio);
  if (elText && elText.trim().length > 1) {
    return NextResponse.json({ text: elText.trim() });
  }

  // 2. Groq Whisper (fallback)
  const lang = (form.get("lang") as string) || "uz";
  const groqText = await transcribeGroq(audio, lang);
  if (groqText && groqText.trim().length > 1) {
    return NextResponse.json({ text: groqText.trim() });
  }
  return { error: "groq stt failed" };
}

export async function POST(req: NextRequest) {
  // Probe: empty body → capability
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart")) {
    return NextResponse.json({
      ok: true,
      elevenlabs: Boolean(ENV.elevenlabs()),
      groq: ENV.groq().length > 0,
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
      detail: [groq && "error" in groq ? groq.error : null, el && "error" in el ? el.error : null]
        .filter(Boolean)
        .join(" | "),
    },
    { status: 500 }
  );
}
