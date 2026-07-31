import { NextRequest, NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || "";

export async function GET(req: NextRequest) {
  const provider = new URL(req.url).searchParams.get("provider");

  if (provider === "gemini-voice") {
    if (!GEMINI_KEY) return NextResponse.json({ ok: false, error: "GEMINI_API_KEY o'rnatilmagan" });
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }], generationConfig: { maxOutputTokens: 4 } }),
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return NextResponse.json({ ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 150)}` });
      }
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ ok: false, error: (e as Error).message });
    }
  }

  if (provider === "groq-stt") {
    if (!GROQ_KEY) return NextResponse.json({ ok: false, error: "GROQ_API_KEY o'rnatilmagan" });
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: "ping" }], max_tokens: 4 }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return NextResponse.json({ ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 150)}` });
      }
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ ok: false, error: (e as Error).message });
    }
  }

  if (provider === "elevenlabs") {
    if (!ELEVENLABS_KEY) return NextResponse.json({ ok: false, error: "ELEVENLABS_API_KEY o'rnatilmagan" });
    try {
      const res = await fetch("https://api.elevenlabs.io/v1/user", {
        headers: { "xi-api-key": ELEVENLABS_KEY },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return NextResponse.json({ ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 150)}` });
      }
      const data = await res.json();
      const tier = data?.subscription?.tier || "unknown";
      const chars = data?.subscription?.character_count ?? null;
      const limit = data?.subscription?.character_limit ?? null;
      const info = limit !== null
        ? `Tier: ${tier} | Chars: ${chars?.toLocaleString()}/${limit?.toLocaleString()}`
        : `Tier: ${tier}`;
      return NextResponse.json({ ok: true, info });
    } catch (e) {
      return NextResponse.json({ ok: false, error: (e as Error).message });
    }
  }

  return NextResponse.json({ ok: false, error: "Noma'lum provider" }, { status: 400 });
}
