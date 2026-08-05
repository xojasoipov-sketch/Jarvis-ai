import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.ELEVENLABS_API_KEY || "";

export async function GET(req: NextRequest) {
  if (!KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not set", voices: [] }, { status: 503 });
  }

  const category = req.nextUrl.searchParams.get("category"); // premade, cloned, all
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": KEY },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `ElevenLabs ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let voices = (data.voices || []).map((v: any) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category, // premade, cloned, generated, professional
      labels: v.labels || {},
      preview_url: v.preview_url || null,
      description: v.description || null,
    }));

    if (category && category !== "all") {
      voices = voices.filter((v: { category: string }) => v.category === category);
    }

    return NextResponse.json({
      voices,
      default_voice_id: process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
      total: voices.length,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e), voices: [] }, { status: 500 });
  }
}
