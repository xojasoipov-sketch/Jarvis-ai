import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || "";
const KEY = process.env.SUPABASE_ANON_KEY || "";

export const dbConfigured = Boolean(URL && KEY);

export const supabase = dbConfigured ? createClient(URL, KEY) : null;
