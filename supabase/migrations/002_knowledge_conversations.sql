-- Pari AI — Migration 002: Knowledge Hub (pgvector), Conversations, Events
-- Run this in Supabase SQL Editor: https://app.supabase.com → SQL Editor → New query

-- ── pgvector extension ───────────────────────────────────────────────────────
create extension if not exists vector;

-- ── Knowledge Hub (semantic memory) ─────────────────────────────────────────
create table if not exists pari_knowledge (
  id         bigint primary key generated always as identity,
  title      text not null,
  content    text not null,
  tags       text[] default '{}',
  embedding  vector(1536),          -- text-embedding-3-small (OpenAI)
  created_at timestamptz default now()
);

create index if not exists idx_knowledge_embedding
  on pari_knowledge using ivfflat (embedding vector_cosine_ops) with (lists = 10);

alter table pari_knowledge enable row level security;
create policy "service_role full access" on pari_knowledge for all using (true) with check (true);

-- Semantic search function (called from /api/knowledge)
create or replace function pari_semantic_search(
  query_embedding vector(1536),
  match_count     int default 10
)
returns table (
  id         bigint,
  title      text,
  content    text,
  tags       text[],
  created_at timestamptz,
  similarity float
)
language sql stable as $$
  select
    id, title, content, tags, created_at,
    1 - (embedding <=> query_embedding) as similarity
  from pari_knowledge
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── Conversations ─────────────────────────────────────────────────────────────
create table if not exists pari_conversations (
  id         text primary key,
  title      text not null,
  messages   jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table pari_conversations enable row level security;
create policy "service_role full access" on pari_conversations for all using (true) with check (true);

create index if not exists idx_conversations_updated on pari_conversations(updated_at desc);

-- ── Calendar Events ───────────────────────────────────────────────────────────
create table if not exists pari_events (
  id         bigint primary key generated always as identity,
  title      text not null,
  time       text,
  type       text not null default 'reminder',
  day        int,
  created_at timestamptz default now()
);

alter table pari_events enable row level security;
create policy "service_role full access" on pari_events for all using (true) with check (true);

-- ── pari_agent_runs: add agent_id column if missing ──────────────────────────
alter table pari_agent_runs add column if not exists agent_id text;

-- ── Telegram sessions (persistent across server restarts) ────────────────────
create table if not exists pari_tg_sessions (
  chat_id    bigint primary key,
  data       jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table pari_tg_sessions enable row level security;
create policy "service_role full access" on pari_tg_sessions for all using (true) with check (true);

-- ── Read-only query runner (for /databases page) ──────────────────────────────
create or replace function pari_run_readonly_query(query_text text)
returns setof json language plpgsql security definer as $$
begin
  if query_text !~* '^\s*select' then
    raise exception 'Faqat SELECT so''rovlariga ruxsat berilgan';
  end if;
  return query execute format('select row_to_json(t) from (%s) t', query_text);
end;
$$;
