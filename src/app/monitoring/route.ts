import { NextResponse } from "next/server";
import { elevenLabsMeta, elevenLabsConfigured } from "@/lib/elevenlabs";
import { ENV } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const meta = elevenLabsMeta();
  return NextResponse.json({
    ts: new Date().toISOString(),
    elevenlabs: meta,
    providers: {
      groq: ENV.groq() ? "✅" : "❌",
      gemini: ENV.gemini() ? "✅" : "❌",
      openai: ENV.openai() ? "✅" : "❌",
      openrouter: ENV.openrouter() ? "✅" : "❌",
      telegram: ENV.telegram() ? "✅" : "❌",
    },
  });
}
