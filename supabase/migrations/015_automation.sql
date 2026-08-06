-- ─────────────────────────────────────────────────────────────────────────────
-- Automation — flow definitions + run history
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists pari_flows (
  id          text primary key,
  name        text not null,
  description text,
  active      boolean not null default true,
  nodes       jsonb not null default '[]',
  trigger_type text not null default 'manual', -- manual | schedule | webhook | keyword | event
  trigger_config jsonb not null default '{}',   -- {cron, keyword, event, secret...}
  runs        integer not null default 0,
  last_run_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists pari_flow_runs (
  id          text primary key default gen_random_uuid()::text,
  flow_id     text not null references pari_flows(id) on delete cascade,
  status      text not null default 'running', -- running | done | error
  trigger     text not null default 'manual',
  steps       jsonb not null default '[]',     -- [{node_id, type, ok, output, ms}]
  error       text,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

alter table pari_flows enable row level security;
alter table pari_flow_runs enable row level security;
create policy "service_role full access" on pari_flows for all using (true) with check (true);
create policy "service_role full access" on pari_flow_runs for all using (true) with check (true);

create index if not exists idx_flow_runs_flow on pari_flow_runs(flow_id, started_at desc);
create index if not exists idx_flows_active on pari_flows(active, trigger_type);
