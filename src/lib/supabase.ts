import { createClient } from "@supabase/supabase-js";
import { ENV } from "@/lib/env";

const rawUrl = ENV.supabaseUrl();
const KEY = ENV.supabaseKey();

function isValidUrl(u: string): boolean {
  try {
    return /^https?:\/\/.+/.test(new URL(u).href);
  } catch {
    return false;
  }
}

const validUrl = isValidUrl(rawUrl) ? rawUrl : "";

export const dbConfigured = Boolean(validUrl && KEY);

export const supabase = dbConfigured
  ? createClient(validUrl, KEY, { auth: { persistSession: false } })
  : null;
