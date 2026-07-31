import { NextResponse } from "next/server";

// Server-side only — returns boolean presence, never the actual secret values.
function has(name: string): boolean {
  return Boolean(process.env[name]);
}

export async function GET() {
  const keys = [
    "GROQ_API_KEY", "CEREBRAS_API_KEY", "OPENROUTER_API_KEY", "DEEPSEEK_API_KEY",
    "MOONSHOT_API_KEY", "DASHSCOPE_API_KEY", "MISTRAL_API_KEY", "OPENAI_API_KEY",
    "ELEVENLABS_API_KEY", "GEMINI_API_KEY", "TELEGRAM_BOT_TOKEN", "GITHUB_TOKEN",
    "SUPABASE_URL", "VERCEL_TOKEN", "APP_PASSWORD",
  ].map((name) => ({ name, set: has(name) }));

  return NextResponse.json({
    keys,
    checks: {
      httpsEnforced: true, // Vercel terminates TLS for every deployment; not conditional on config
      secretsNotHardcoded: true, // fixed in commit 747126c — no fallback secrets remain in source
      botProtected: has("TELEGRAM_BOT_TOKEN"),
      rateLimiting: false, // no Redis/rate-limit middleware wired up
      authSystem: has("APP_PASSWORD"), // password-gate middleware, opt-in via APP_PASSWORD
      auditLogs: "partial", // src/lib/logger.ts exists but is in-memory only, lost on cold start
    },
  });
}
