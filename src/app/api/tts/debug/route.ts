import { NextResponse } from "next/server";
import { ENV } from "@/lib/env";
import { elevenLabsMeta } from "@/lib/elevenlabs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Debug: qaysi ELEVEN* env nomlari bor (qiymat yo'q).
 * Production muammo: key Railway'da bor, lekin boshqa service / redeploy yo'q.
 */
export async function GET() {
  const elevenNames = Object.keys(process.env)
    .filter((k) => /eleven|xi_api/i.test(k))
    .sort();

  const sample = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY || "";

  return NextResponse.json({
    meta: elevenLabsMeta(),
    env_names_matching_eleven: elevenNames,
    inventory: (ENV as unknown as Record<string, () => unknown>).inventory?.() ?? {},
    looks_like_sk: sample.startsWith("sk_"),
    key_length: sample.length,
    railway_service: process.env.RAILWAY_SERVICE_NAME || null,
    railway_environment: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT || null,
    hint: elevenNames.length
      ? "Nomlar bor — agar configured=false bo'lsa, qiymat bo'sh yoki boshqa nom."
      : "Hech qanday ELEVEN* o'zgaruvchi containerda yo'q. Variables + Redeploy shu servicega.",
  });
}
