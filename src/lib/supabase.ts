import { createClient } from "@supabase/supabase-js";

const URL  = process.env.SUPABASE_URL || "";
// Prefer service_role key (bypasses RLS) for server-side; fall back to anon key
const KEY  =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

export const dbConfigured = Boolean(URL && KEY);

export const supabase = dbConfigured
  ? createClient(URL, KEY, { auth: { persistSession: false } })
  : null;
