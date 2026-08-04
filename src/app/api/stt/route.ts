import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function transcribeElevenLabs(audio: Blob): Promise<{ text: string } | { error: string } | null> {
  const key = ENV.elevenlabs();
  if (!key) return null;
  try {
    const fd = new FormData();
    fd.append("file", audio, "audio.webm");
    fd.append("model_id", "scribe_v1");
    // language hint — auto often better; optional
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": key },
      body: fd,
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { error: `eleven_stt ${res.status}: ${t.slice(0, 120)}` };
    }
    const data = await res.json();
    const text = String(data?.text || "").trim();
    return text ? { text } : { error: "eleven empty" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "eleven stt fail" };
  }
}

async function transcribeGroq(audio: Blob): Promise<{ text: string } | { error: string } | null> {
  const keys = ENV.groq();
  if (!keys.length) return null;

  for (const key of keys) {
    try {
      const body = new FormData();
      body.append("file", audio, "audio.webm");
      body.append("model", "whisper-large-v3");
      body.append("response_format", "json");
      // language bermaymiz — Whisper o'zi aniqlaydi (uz/ru/en aralash uchun yaxshiroq)
      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body,
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = String(data.text || "").trim();
      if (text) return { text };
    } catch {
      continue;
    }
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
