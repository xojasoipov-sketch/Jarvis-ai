import { NextResponse } from "next/server";
import { ENV } from "@/lib/env";
import { providerKeyStats } from "@/lib/providers";
import { elevenLabsMeta } from "@/lib/elevenlabs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Kalitlar soni — qiymatlar yuborilmaydi */
export async function GET() {
  return NextResponse.json({
    ok: true,
    inventory: ENV.inventory(),
    providers: providerKeyStats(),
    elevenlabs: elevenLabsMeta(),
    hint: "Redeploy after adding Variables. Names: PROVIDER_API_KEY, PROVIDER_API_KEY2…",
  });
}
