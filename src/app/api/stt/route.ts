import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const audio = form.get("audio") as File | null;
  const lang = (form.get("lang") as string) || "uz";

  if (!audio) return NextResponse.json({ error: "audio kerak" }, { status: 400 });

  const keys = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY2].filter(Boolean) as string[];
  if (!keys.length) return NextResponse.json({ error: "GROQ_API_KEY sozlanmagan" }, { status: 500 });

  for (const key of keys) {
    try {
      const body = new FormData();
      body.append("file", audio, "audio.webm");
      body.append("model", "whisper-large-v3");
      body.append("language", lang === "uz" ? "uz" : lang === "ru" ? "ru" : "en");
      body.append("response_format", "json");

      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body,
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) continue;
      const data = await res.json();
      return NextResponse.json({ text: data.text || "" });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "STT xato" }, { status: 500 });
}
