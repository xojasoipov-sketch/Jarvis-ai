import { NextResponse } from "next/server";

const KEY = process.env.ELEVENLABS_API_KEY || "";

export async function GET() {
  if (!KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not set", models: [] }, { status: 503 });
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/models", {
      headers: { "xi-api-key": KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `ElevenLabs ${res.status}` }, { status: res.status });
    }
    const models = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = (models || []).map((m: any) => ({
      model_id: m.model_id,
      name: m.name,
      description: m.description || "",
      can_do_text_to_speech: m.can_do_text_to_speech ?? true,
      can_do_voice_conversion: m.can_do_voice_conversion ?? false,
      can_be_finetuned: m.can_be_finetuned ?? false,
      languages: (m.languages || []).map((l: { language_id: string; name: string }) => ({
        id: l.language_id,
        name: l.name,
      })),
    }));

    return NextResponse.json({
      models: list,
      default_model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e), models: [] }, { status: 500 });
  }
}
