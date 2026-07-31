import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

function isValidUrl(u: string): boolean {
  try { return /^https?:\/\/.+/.test(new URL(u).href); } catch { return false; }
}

const validUrl = isValidUrl(rawUrl) ? rawUrl : "";

export const dbConfigured = Boolean(validUrl && KEY);

export const supabase = dbConfigured
  ? createClient(validUrl, KEY, { auth: { persistSession: false } })
  : null;
