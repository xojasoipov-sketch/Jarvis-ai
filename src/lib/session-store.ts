// Telegram session store — Supabase-backed with in-memory cache
// Table setup (run once in Supabase SQL Editor — included in 002_knowledge_conversations.sql):
//   create table pari_tg_sessions (
//     chat_id bigint primary key,
//     data jsonb not null default '{}',
//     updated_at timestamptz default now()
//   );
//   alter table pari_tg_sessions enable row level security;
//   create policy "service_role full access" on pari_tg_sessions for all using (true) with check (true);

import { supabase, dbConfigured } from "@/lib/supabase";

export type Session = {
  mode: "chat" | "agent" | "smm_post" | "smm_generated";
  agentId?: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  waitingFor?: "agent_task";
  smmChannelId?: string;
  smmContent?: string;
  smmDrafts?: string[];
};

const DEFAULT: Session = { mode: "chat", history: [] };
const cache = new Map<number, Session>();

export function getSession(chatId: number): Session {
  return cache.get(chatId) ?? { ...DEFAULT };
}

export async function loadSession(chatId: number): Promise<Session> {
  if (cache.has(chatId)) return cache.get(chatId)!;
  if (!dbConfigured) return { ...DEFAULT };
  try {
    const { data } = await supabase!
      .from("pari_tg_sessions")
      .select("data")
      .eq("chat_id", chatId)
      .single();
    if (data?.data) {
      const s = data.data as Session;
      cache.set(chatId, s);
      return s;
    }
  } catch {}
  const fresh = { ...DEFAULT };
  cache.set(chatId, fresh);
  return fresh;
}

function persist(chatId: number, s: Session) {
  if (!dbConfigured) return;
  void supabase!.from("pari_tg_sessions").upsert({
    chat_id: chatId,
    data: s,
    updated_at: new Date().toISOString(),
  });
}

export function updateSession(chatId: number, update: Partial<Session>) {
  const current = getSession(chatId);
  const next = { ...current, ...update };
  cache.set(chatId, next);
  persist(chatId, next);
}

export function addToHistory(chatId: number, role: "user" | "assistant", content: string) {
  const s = getSession(chatId);
  const history = [...s.history, { role, content }].slice(-20);
  updateSession(chatId, { history });
}

export function clearHistory(chatId: number) {
  updateSession(chatId, { history: [], mode: "chat", agentId: undefined });
}
