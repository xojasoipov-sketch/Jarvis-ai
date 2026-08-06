-- Migration 004: Services catalog and orders tables
-- Must run BEFORE 006_trending_services.sql which INSERTs into pari_services.

-- ─────────────────────────────────────────────────────────────────────────────
-- Sotiladigan xizmatlar katalogi
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pari_services (
  id               serial primary key,
  category         text not null default 'general',
  name             text not null,
  description      text not null default '',
  price            numeric(12,2) not null default 0,
  price_display    text,
  price_negotiable boolean default false,
  currency         text not null default 'USD',
  billing_cycle    text not null default 'one_time',  -- one_time | monthly | weekly
  delivery_days    integer not null default 1,
  features         jsonb not null default '[]',
  active           boolean not null default true,
  is_trending      boolean default false,
  demand_score     integer default 0,
  sort_order       integer default 0,
  created_at       timestamptz not null default now()
);

alter table pari_services enable row level security;
create policy "service_role full access" on pari_services for all using (true) with check (true);
create index if not exists idx_services_active   on pari_services(active);
create index if not exists idx_services_category on pari_services(category);
create index if not exists idx_services_sort     on pari_services(sort_order, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Buyurtmalar
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pari_service_orders (
  id             serial primary key,
  service_id     integer references pari_services(id) on delete set null,
  client_name    text not null,
  client_contact text,
  status         text not null default 'new',  -- new | in_progress | delivered | paid | cancelled
  price          numeric(12,2),
  currency       text default 'USD',
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table pari_service_orders enable row level security;
create policy "service_role full access" on pari_service_orders for all using (true) with check (true);
create index if not exists idx_orders_status  on pari_service_orders(status);
create index if not exists idx_orders_created on pari_service_orders(created_at desc);
