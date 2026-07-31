import { createClient } from "@supabase/supabase-js";

const URL  = process.env.SUPABASE_URL || "https://tomkxsdkerpbvlumubbg.supabase.co";
// Prefer service_role key (bypasses RLS) for server-side; fall back to anon key
const KEY  =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWt4c2RrZXJwYnZsdW11YmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTI5NTMsImV4cCI6MjA5OTM4ODk1M30.betEr6efsXiJSRb9g2FnarUtF7B09DJombiQdKcMR6U";

export const dbConfigured = Boolean(URL && KEY);

export const supabase = dbConfigured
  ? createClient(URL, KEY, { auth: { persistSession: false } })
  : null;
