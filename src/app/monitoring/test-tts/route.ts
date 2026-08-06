import { NextResponse } from "next/server";
import { synthesizeElevenLabs } from "@/lib/elevenlabs";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await synthesizeElevenLabs("Salom, men Pari.", "uz");

  if (result.ok && "buffer" in result) {
    return new Response(result.buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "X-TTS-Provider": result.provider,
        "X-Cached": String(result.cached),
      },
    });
  }

  return NextResponse.json({
    ok: false,
    error: !result.ok ? result.error : "stream returned (unexpected)",
    status: !result.ok ? result.status : undefined,
    hint: "Check ElevenLabs account quota at elevenlabs.io/app/subscription",
  }, { status: 502 });
}
