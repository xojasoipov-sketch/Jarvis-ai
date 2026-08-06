-- ─────────────────────────────────────────────────────────────────────────────
-- Personal Core: uzoq muddatli xotira (foydalanuvchi haqida faktlar/afzalliklar)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pari_memory (
  id         text primary key default gen_random_uuid()::text,
  category   text not null default 'fact',   -- fact | preference | goal | date
  key        text not null,
  value      text not null,
  importance int not null default 1,          -- 1..5
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pari_memory enable row level security;
create policy "service_role full access" on pari_memory for all using (true) with check (true);
create unique index if not exists idx_memory_key on pari_memory(category, key);
create index if not exists idx_memory_category on pari_memory(category);

-- ─────────────────────────────────────────────────────────────────────────────
-- Odatlar (habits) va kunlik belgilash (check-in)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pari_habits (
  id          text primary key default gen_random_uuid()::text,
  title       text not null,
  emoji       text not null default '✅',
  target_days text[] not null default array['mon','tue','wed','thu','fri','sat','sun'],
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table pari_habits enable row level security;
create policy "service_role full access" on pari_habits for all using (true) with check (true);

create table if not exists pari_habit_checkins (
  id         text primary key default gen_random_uuid()::text,
  habit_id   text not null references pari_habits(id) on delete cascade,
  date       date not null,               -- YYYY-MM-DD
  done       boolean not null default true,
  created_at timestamptz not null default now()
);

alter table pari_habit_checkins enable row level security;
create policy "service_role full access" on pari_habit_checkins for all using (true) with check (true);
create unique index if not exists idx_checkin_unique on pari_habit_checkins(habit_id, date);

-- ─────────────────────────────────────────────────────────────────────────────
-- Eslatmalar (reminders): tug'ilgan kunlar, muhim sanalar, suv ichish, dorilar va h.k.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pari_reminders (
  id         text primary key default gen_random_uuid()::text,
  title      text not null,
  note       text default '',
  category   text not null default 'general',  -- general | birthday | health | finance | travel
  due_at     timestamptz not null,
  repeat     text not null default 'none',      -- none | daily | weekly | monthly | yearly
  done       boolean not null default false,
  notified   boolean not null default false,
  created_at timestamptz not null default now()
);

alter table pari_reminders enable row level security;
create policy "service_role full access" on pari_reminders for all using (true) with check (true);
create index if not exists idx_reminders_due on pari_reminders(due_at);
create index if not exists idx_reminders_done on pari_reminders(done);
