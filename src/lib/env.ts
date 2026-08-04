/**
 * Env helpers — Railway'dagi barcha key variantlarini o'qiydi
 * KEY, KEY2…KEY10, KEY_2, case farqi, bosh-oxir space
 */

function trim(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/** Barcha process.env ni lower-case map */
function envMap(): Map<string, string> {
  const m = new Map<string, string>();
  for (const [k, v] of Object.entries(process.env)) {
    const t = trim(v);
    if (t) m.set(k.toLowerCase(), t);
  }
  return m;
}

/** Birinchi topilgan nom */
export function envFirst(...names: string[]): string {
  const map = envMap();
  for (const n of names) {
    const direct = trim(process.env[n]);
    if (direct) return direct;
    const hit = map.get(n.toLowerCase());
    if (hit) return hit;
  }
  return "";
}

export function envAny(...names: string[]): boolean {
  return Boolean(envFirst(...names));
}

/**
 * BASE, BASE2…BASE10, BASE_2… va case-insensitive
 */
export function envAll(base: string, max = 12): string[] {
  const map = envMap();
  const found: string[] = [];
  const seen = new Set<string>();

  const push = (val: string) => {
    if (!val || seen.has(val)) return;
    seen.add(val);
    found.push(val);
  };

  push(trim(process.env[base]));
  for (let i = 2; i <= max; i++) {
    push(trim(process.env[`${base}${i}`]));
    push(trim(process.env[`${base}_${i}`]));
  }

  const baseLower = base.toLowerCase();
  const re = new RegExp(
    `^${baseLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:_?(\d+))?$`
  );

  const indexed: { n: number; v: string }[] = [];
  for (const [k, v] of map) {
    const m = k.match(re);
    if (!m) continue;
    const n = m[1] ? parseInt(m[1], 10) : 1;
    indexed.push({ n, v });
  }
  indexed.sort((a, b) => a.n - b.n);
  for (const { v } of indexed) push(v);

  return found;
}

/** ElevenLabs — nomlar chalkash bo'lsa ham sk_ kalitni topish */
function findElevenLabsKey(): string {
  const named = envFirst(
    "ELEVENLABS_API_KEY",
    "ELEVEN_LABS_API_KEY",
    "ELEVENLABS_KEY",
    "ELEVENLABS_APIKEY",
    "ELEVEN_LABS_KEY",
    "XI_API_KEY",
    "ELEVENLABS_TOKEN"
  );
  if (named) return named;

  // istalgan env: nomi eleven+api/key va qiymati sk_ yoki uzun
  for (const [k, v] of Object.entries(process.env)) {
    const kl = k.toLowerCase();
    const val = trim(v);
    if (!val) continue;
    if (!kl.includes("eleven")) continue;
    if (kl.includes("voice") || kl.includes("model") || kl.includes("url")) continue;
    if (val.startsWith("sk_") || val.length > 20) return val;
  }
  return "";
}

export const ENV = {
  supabaseUrl: () =>
    envFirst("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_PROJECT_URL"),
  supabaseAnon: () =>
    envFirst(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_ANON_KEY",
      "SUPABASE_ANON_KEY2"
    ),
  supabaseKey: () =>
    envFirst(
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_SERVICE_ROLE_KEY2",
      "SUPABASE_SERVICE_KEY",
      "SUPABASE_SECRET_KEY",
      "SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_KEY"
    ),
  telegram: () =>
    envFirst("TELEGRAM_BOT_TOKEN", "TG_BOT_TOKEN", "TELEGRAM_TOKEN", "BOT_TOKEN"),
  ownerTelegramId: () =>
    envFirst("OWNER_TELEGRAM_ID", "TELEGRAM_ADMIN_ID", "ADMIN_TELEGRAM_ID"),
  github: () =>
    envFirst(
      "GITHUB_TOKEN",
      "Github_token",
      "GITHUB_PERSONAL_ACCESS_TOKEN",
      "GH_TOKEN",
      "GITHUB_PAT",
      "GH_PAT"
    ),
  groq: () => envAll("GROQ_API_KEY"),
  gemini: () => envAll("GEMINI_API_KEY"),
  openai: () => envAll("OPENAI_API_KEY"),
  openrouter: () => envAll("OPENROUTER_API_KEY"),
  deepseek: () => envAll("DEEPSEEK_API_KEY"),
  moonshot: () => envAll("MOONSHOT_API_KEY"),
  cerebras: () => envAll("CEREBRAS_API_KEY"),
  mistral: () => envAll("MISTRAL_API_KEY"),
  dashscope: () => envAll("DASHSCOPE_API_KEY"),
  elevenlabs: () => findElevenLabsKey(),
  elevenlabsVoice: () =>
    envFirst("ELEVENLABS_VOICE_ID", "ELEVEN_LABS_VOICE_ID") || "21m00Tcm4TlvDq8ikWAM",
  elevenlabsModel: () =>
    envFirst("ELEVENLABS_MODEL_ID", "ELEVEN_LABS_MODEL_ID") || "eleven_multilingual_v2",
  appPassword: () => envFirst("APP_PASSWORD", "ADMIN_PASSWORD", "SITE_PASSWORD"),
  siteUrl: () =>
    envFirst(
      "SITE_URL",
      "NEXT_PUBLIC_APP_URL",
      "RAILWAY_PUBLIC_DOMAIN",
      "PUBLIC_URL"
    ),

  inventory(): Record<string, number | boolean | string> {
    return {
      groq: ENV.groq().length,
      gemini: ENV.gemini().length,
      openai: ENV.openai().length,
      openrouter: ENV.openrouter().length,
      deepseek: ENV.deepseek().length,
      moonshot: ENV.moonshot().length,
      cerebras: ENV.cerebras().length,
      mistral: ENV.mistral().length,
      dashscope: ENV.dashscope().length,
      elevenlabs: Boolean(ENV.elevenlabs()),
      telegram: Boolean(ENV.telegram()),
      github: Boolean(ENV.github()),
      supabase: Boolean(ENV.supabaseUrl()),
    };
  },
};
