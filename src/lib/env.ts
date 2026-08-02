/** Env helpers — Railway da turli nomlar bilan qo'yilgan keylarni topish */

export function envFirst(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n];
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

export function envAny(...names: string[]): boolean {
  return Boolean(envFirst(...names));
}

/** Known aliases users might set on Railway */
export const ENV = {
  supabaseUrl: () =>
    envFirst("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_PROJECT_URL"),
  supabaseKey: () =>
    envFirst(
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_SERVICE_KEY",
      "SUPABASE_SECRET_KEY",
      "SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_KEY"
    ),
  telegram: () => envFirst("TELEGRAM_BOT_TOKEN", "TG_BOT_TOKEN", "TELEGRAM_TOKEN", "BOT_TOKEN"),
  github: () =>
    envFirst(
      "GITHUB_TOKEN",
      "GITHUB_PERSONAL_ACCESS_TOKEN",
      "GH_TOKEN",
      "GITHUB_PAT",
      "GH_PAT"
    ),
  groq: () => envFirst("GROQ_API_KEY", "GROQ_KEY"),
  gemini: () => envFirst("GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GEMINI_API_KEY"),
  openai: () => envFirst("OPENAI_API_KEY"),
  elevenlabs: () => envFirst("ELEVENLABS_API_KEY"),
  openrouter: () => envFirst("OPENROUTER_API_KEY"),
};
