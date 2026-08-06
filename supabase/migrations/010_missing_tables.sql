-- Migration 010: Business modules/ideas and trace memory tables
-- pari_services and pari_service_orders are in 004_services.sql (run that first)

-- ─────────────────────────────────────────────────────────────────────────────
-- Business modules (Sadi's monetization tracks)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pari_business_modules (
  id          text primary key,
  module_key  text not null unique,     -- youtube | smm | courses | blogging | ai_tools
  status      text not null default 'idea',  -- idea | active | paused
  revenue     numeric(12,2) not null default 0,
  notes       text,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

alter table pari_business_modules enable row level security;
create policy "service_role full access" on pari_business_modules for all using (true) with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Business ideas per module
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pari_business_ideas (
  id         text primary key default gen_random_uuid()::text,
  module_key text not null,
  title      text not null,
  content    text not null default '',
  status     text not null default 'draft',  -- draft | used | archived
  created_at timestamptz not null default now()
);

alter table pari_business_ideas enable row level security;
create policy "service_role full access" on pari_business_ideas for all using (true) with check (true);
create index if not exists idx_ideas_module on pari_business_ideas(module_key);
create index if not exists idx_ideas_status on pari_business_ideas(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Experience/Trace memory (successful agent task chains)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pari_traces (
  id         text primary key default gen_random_uuid()::text,
  task       text not null,
  task_norm  text not null,
  steps      jsonb not null default '[]',
  answer     text,
  success    boolean not null default true,
  source     text not null default 'react',  -- react | hermes | research | manual
  created_at timestamptz not null default now()
);

alter table pari_traces enable row level security;
create policy "service_role full access" on pari_traces for all using (true) with check (true);
create index if not exists idx_traces_task_norm on pari_traces(task_norm);
create index if not exists idx_traces_created   on pari_traces(created_at desc);
