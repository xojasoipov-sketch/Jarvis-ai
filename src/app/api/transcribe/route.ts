import { NextRequest, NextResponse } from "next/server";

// Priority: Gemini (audio understanding) → Groq Whisper → error
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY2 || "";

async function transcribeWithGemini(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const b64 = Buffer.from(buf).toString("base64");
  const mime = blob.type || "audio/webm";

  const body = {
    contents: [{
      parts: [
        {
          inline_data: { mime_type: mime, data: b64 },
        },
        {
          text: "Ushbu audio yozuvdagi gapni aniq transcript qil. Faqat aytilgan so'zlarni yoz, boshqa hech narsa qo'shma.",
        },
      ],
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 512 },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

async function transcribeWithGroq(blob: Blob): Promise<string> {
  const fd = new FormData();
  fd.append("file", blob, "audio.webm");
  fd.append("model", "whisper-large-v3");
  fd.append("language", "uz");
  fd.append("response_format", "json");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}` },
    body: fd,
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return data.text?.trim() || "";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio");
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "audio yo'q" }, { status: 400 });
    }

    // Try Gemini first (understands Uzbek natively, no language config needed)
    if (GEMINI_KEY) {
      try {
        const text = await transcribeWithGemini(audio);
        if (text) return NextResponse.json({ text, provider: "gemini" });
      } catch { /* fallthrough */ }
    }

    // Fallback: Groq Whisper
    if (GROQ_KEY) {
      const text = await transcribeWithGroq(audio);
      return NextResponse.json({ text, provider: "groq" });
    }

    return NextResponse.json({ error: "GEMINI_API_KEY yoki GROQ_API_KEY kerak" }, { status: 503 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
