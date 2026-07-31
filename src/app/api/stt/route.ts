import { NextRequest, NextResponse } from "next/server";

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
        signal: AbortSignal.timeout(20000),
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

  return NextResponse.json({ error: "STT xato" }, { status: 500 });
}
