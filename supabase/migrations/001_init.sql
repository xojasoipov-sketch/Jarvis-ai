-- Pari AI — Supabase schema
-- Run this in Supabase SQL Editor: https://app.supabase.com → SQL Editor → New query

-- Tasks
create table if not exists pari_tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  status      text not null default 'todo',   -- todo | in_progress | done
  priority    text not null default 'medium',  -- low | medium | high
  due_date    timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Projects
create table if not exists pari_projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  status      text not null default 'active',  -- active | paused | done
  github_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Agent runs
create table if not exists pari_agent_runs (
  id          uuid primary key default gen_random_uuid(),
  agent_name  text not null,
  task        text not null,
  result      text,
  status      text not null default 'running',  -- running | done | error
  created_at  timestamptz not null default now()
);

-- Chat history
create table if not exists pari_chat_history (
  id          uuid primary key default gen_random_uuid(),
  role        text not null,   -- user | assistant
  content     text not null,
  session_id  text,
  created_at  timestamptz not null default now()
);

-- SMM channels
create table if not exists pari_smm_channels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  channel_id  text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

-- SMM posts
create table if not exists pari_smm_posts (
  id            uuid primary key default gen_random_uuid(),
  channel_id    text not null,
  content       text not null,
  status        text not null default 'draft',  -- draft | scheduled | published | failed
  scheduled_at  timestamptz,
  published_at  timestamptz,
  tg_message_id bigint,
  created_at    timestamptz not null default now()
);

-- Enable RLS (Row Level Security) — all tables public for now (change per your auth setup)
alter table pari_tasks         enable row level security;
alter table pari_projects      enable row level security;
alter table pari_agent_runs    enable row level security;
alter table pari_chat_history  enable row level security;
alter table pari_smm_channels  enable row level security;
alter table pari_smm_posts     enable row level security;

-- Allow all operations for service_role key (used from Railway/Next.js backend)
create policy "service_role full access" on pari_tasks         for all using (true) with check (true);
create policy "service_role full access" on pari_projects      for all using (true) with check (true);
create policy "service_role full access" on pari_agent_runs    for all using (true) with check (true);
create policy "service_role full access" on pari_chat_history  for all using (true) with check (true);
create policy "service_role full access" on pari_smm_channels  for all using (true) with check (true);
create policy "service_role full access" on pari_smm_posts     for all using (true) with check (true);

-- Indexes
create index if not exists idx_tasks_status      on pari_tasks(status);
create index if not exists idx_posts_status      on pari_smm_posts(status);
create index if not exists idx_posts_channel     on pari_smm_posts(channel_id);
create index if not exists idx_runs_created      on pari_agent_runs(created_at desc);
create index if not exists idx_chat_session      on pari_chat_history(session_id, created_at);
