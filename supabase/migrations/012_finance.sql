-- ─────────────────────────────────────────────────────────────────────────────
-- Finance: kirim/chiqim, budjet, moliyaviy maqsadlar, obunalar, qarzlar
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pari_finance_transactions (
  id         text primary key default gen_random_uuid()::text,
  type       text not null,               -- income | expense
  amount     numeric not null,
  category   text not null default 'general',
  note       text default '',
  date       date not null default current_date,
  created_at timestamptz not null default now()
);

alter table pari_finance_transactions enable row level security;
create policy "service_role full access" on pari_finance_transactions for all using (true) with check (true);
create index if not exists idx_fin_tx_date on pari_finance_transactions(date desc);
create index if not exists idx_fin_tx_type on pari_finance_transactions(type);

create table if not exists pari_finance_budgets (
  id           text primary key default gen_random_uuid()::text,
  category     text not null unique,
  monthly_limit numeric not null default 0,
  created_at   timestamptz not null default now()
);

alter table pari_finance_budgets enable row level security;
create policy "service_role full access" on pari_finance_budgets for all using (true) with check (true);

create table if not exists pari_finance_goals (
  id            text primary key default gen_random_uuid()::text,
  title         text not null,
  target_amount numeric not null,
  current_amount numeric not null default 0,
  deadline      date,
  done          boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table pari_finance_goals enable row level security;
create policy "service_role full access" on pari_finance_goals for all using (true) with check (true);

create table if not exists pari_finance_subscriptions (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  amount        numeric not null,
  cycle         text not null default 'monthly', -- monthly | yearly
  next_charge   date not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table pari_finance_subscriptions enable row level security;
create policy "service_role full access" on pari_finance_subscriptions for all using (true) with check (true);

create table if not exists pari_finance_debts (
  id         text primary key default gen_random_uuid()::text,
  title      text not null,
  amount     numeric not null,
  direction  text not null default 'owe',   -- owe (men qarzdorman) | owed (menga qarzdor)
  due_date   date,
  paid       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table pari_finance_debts enable row level security;
create policy "service_role full access" on pari_finance_debts for all using (true) with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- CRM pipeline: mijoz bosqichini kuzatish (lead -> negotiation -> won/lost)
-- ─────────────────────────────────────────────────────────────────────────────
alter table pari_clients add column if not exists pipeline_stage text not null default 'lead';
create index if not exists idx_clients_stage on pari_clients(pipeline_stage);
