import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.ELEVENLABS_API_KEY || "";

export async function POST(req: NextRequest) {
  if (!KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const text = (body.text || "").trim();
    const duration = body.duration_seconds || null; // 0.5–22
    const promptInfluence = body.prompt_influence ?? 0.3; // 0–1

    if (!text) {
      return NextResponse.json({ error: "text kerak" }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      text: text.slice(0, 500),
      prompt_influence: promptInfluence,
    };
    if (duration) payload.duration_seconds = Math.min(22, Math.max(0.5, duration));

    const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: {
        "xi-api-key": KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json({ error: `ElevenLabs ${res.status}: ${errText.slice(0, 200)}` }, { status: res.status });
    }

    const audio = await res.arrayBuffer();
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
