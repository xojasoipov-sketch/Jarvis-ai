import { NextRequest, NextResponse } from "next/server";

// Groq Whisper — iOS va barcha brauzerda ishlaydi (SpeechRecognition o'rniga)
const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY2 || "";

export async function POST(req: NextRequest) {
  if (!GROQ_KEY) return NextResponse.json({ error: "GROQ_API_KEY yo'q" }, { status: 503 });

  try {
    const formData = await req.formData();
    const audio = formData.get("audio");
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "audio fayl yo'q" }, { status: 400 });
    }

    const gForm = new FormData();
    gForm.append("file", audio, "audio.webm");
    gForm.append("model", "whisper-large-v3");
    // uz (Uzbek) — Whisper supports it; falls back gracefully if unclear
    gForm.append("language", "uz");
    gForm.append("response_format", "json");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_KEY}` },
      body: gForm,
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ text: data.text || "" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
