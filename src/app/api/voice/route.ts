import { NextRequest, NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

const SYSTEM = `Sen Pari — Sadining shaxsiy ovozli AI yordamchisissan.
Qoidalar:
- Foydalanuvchi o'zbek tilida gapirsa — o'zbek tilida javob ber
- Javob qisqa va tabiiy bo'lsin (ovozda qulay)
- Markdown, ro'yxat, kod bloki ishlatma — faqat oddiy gap
- Maksimal 3-4 gap`;

export async function POST(req: NextRequest) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY yo'q" }, { status: 503 });
  }

  try {
    const form = await req.formData();
    const audio = form.get("audio");
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "audio yo'q" }, { status: 400 });
    }

    const buf = await audio.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    const mime = audio.type || "audio/webm";

    const body = {
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{
        parts: [
          { inline_data: { mime_type: mime, data: b64 } },
          { text: "Yuqoridagi audiodagi so'zni tushun va Pari sifatida javob ber. JSON formatda qaytargin: {\"transcript\": \"...\", \"reply\": \"...\"}" },
        ],
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
        responseMimeType: "application/json",
      },
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let parsed: { transcript?: string; reply?: string } = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { reply: raw }; }

    return NextResponse.json({
      transcript: parsed.transcript || "",
      reply: parsed.reply || "Kechirasiz, tushunmadim.",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
