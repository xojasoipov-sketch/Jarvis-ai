import { NextResponse } from "next/server";

const KEY = process.env.ELEVENLABS_API_KEY || "";

export async function GET() {
  if (!KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 503 });
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    const sub = data.subscription || {};
    return NextResponse.json({
      tier: sub.tier || "unknown",
      character_count: sub.character_count ?? 0,
      character_limit: sub.character_limit ?? 0,
      usage_percent: sub.character_limit
        ? Math.round((sub.character_count / sub.character_limit) * 100)
        : 0,
      voice_limit: sub.voice_limit ?? 0,
      can_use_instant_voice_cloning: sub.can_use_instant_voice_cloning ?? false,
      can_use_professional_voice_cloning: sub.can_use_professional_voice_cloning ?? false,
      next_invoice: sub.next_character_count_reset_unix
        ? new Date(sub.next_character_count_reset_unix * 1000).toISOString()
        : null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
