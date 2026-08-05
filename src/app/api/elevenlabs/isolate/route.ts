import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.ELEVENLABS_API_KEY || "";

// ElevenLabs Audio Isolation — removes background noise, keeps voice
export async function POST(req: NextRequest) {
  if (!KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 503 });
  }

  try {
    const form = await req.formData();
    const audio = form.get("audio") as Blob | null;
    if (!audio) {
      return NextResponse.json({ error: "audio fayl kerak" }, { status: 400 });
    }

    const fd = new FormData();
    fd.append("audio", audio);

    const res = await fetch("https://api.elevenlabs.io/v1/audio-isolation", {
      method: "POST",
      headers: { "xi-api-key": KEY },
      body: fd,
      signal: AbortSignal.timeout(60000), // can be slow for large files
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `ElevenLabs ${res.status}: ${errText.slice(0, 200)}` },
        { status: res.status }
      );
    }

    const result = await res.arrayBuffer();
    return new Response(result, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
