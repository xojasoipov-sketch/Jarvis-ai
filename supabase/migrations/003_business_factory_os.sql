-- Pari AI · Business Factory OS
-- Workspaces (multi-tenant), RBAC, audit log, activity timeline
-- Run in Supabase SQL Editor after 001 and 002

-- ── Workspaces (tenant) ──────────────────────────────────────────
create table if not exists bf_workspaces (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  plan          text not null default 'starter',  -- starter | pro | enterprise
  settings      jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Members + roles (RBAC) ───────────────────────────────────────
create table if not exists bf_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references bf_workspaces(id) on delete cascade,
  user_id       text not null,          -- auth subject / telegram id / email
  email         text,
  display_name  text,
  role          text not null default 'member',  -- owner | admin | member | viewer
  permissions   jsonb not null default '[]',     -- optional fine-grained overrides
  created_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists idx_bf_members_ws on bf_members(workspace_id);
create index if not exists idx_bf_members_user on bf_members(user_id);

-- ── Audit log ────────────────────────────────────────────────────
create table if not exists bf_audit_logs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references bf_workspaces(id) on delete set null,
  actor_id      text,
  action        text not null,          -- e.g. order.create, agent.run
  module        text,                   -- module id from registry
  entity_type   text,
  entity_id     text,
  meta          jsonb not null default '{}',
  ip            text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_bf_audit_ws_created on bf_audit_logs(workspace_id, created_at desc);
create index if not exists idx_bf_audit_action on bf_audit_logs(action);

-- ── Activity timeline (user-facing feed) ─────────────────────────
create table if not exists bf_activity (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references bf_workspaces(id) on delete cascade,
  actor_id      text,
  actor_name    text,
  title         text not null,
  body          text,
  module        text,
  link          text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_bf_activity_ws on bf_activity(workspace_id, created_at desc);

-- ── Domain events (event-driven backbone) ────────────────────────
create table if not exists bf_events (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid,
  type          text not null,          -- order.paid, task.done, smm.published
  payload       jsonb not null default '{}',
  processed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_bf_events_unprocessed on bf_events(created_at) where processed_at is null;

-- RLS
alter table bf_workspaces enable row level security;
alter table bf_members enable row level security;
alter table bf_audit_logs enable row level security;
alter table bf_activity enable row level security;
alter table bf_events enable row level security;

create policy "service full" on bf_workspaces for all using (true) with check (true);
create policy "service full" on bf_members for all using (true) with check (true);
create policy "service full" on bf_audit_logs for all using (true) with check (true);
create policy "service full" on bf_activity for all using (true) with check (true);
create policy "service full" on bf_events for all using (true) with check (true);
