-- ─────────────────────────────────────────────────────────────────────────────
-- Device Pairing System — QR orqali qurilma ulash (Jarvis/Termux/Kotlin agent)
-- Eslatma: bu pari_devices, eski /api/phones (Tasker webhook) dan alohida —
-- ikkalasi ham ishlaydi, biri ikkinchisini almashtirmaydi.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pari_devices (
  id           text primary key,               -- device_id (UUID)
  name         text not null default 'Yangi qurilma',
  platform     text not null default 'android', -- android | ios | windows | macos | linux
  os_info      text default '',
  status       text not null default 'offline', -- online | offline
  battery      int,
  storage_free numeric,
  cpu_load     numeric,
  ram_used     numeric,
  location     text,
  last_seen    timestamptz,
  paired_at    timestamptz not null default now(),
  revoked      boolean not null default false,
  device_token_hash text,                        -- SHA-256(device_token) — faqat solishtirish uchun
  created_at   timestamptz not null default now()
);

alter table pari_devices enable row level security;
create policy "service_role full access" on pari_devices for all using (true) with check (true);
create index if not exists idx_devices_status on pari_devices(status);
create index if not exists idx_devices_revoked on pari_devices(revoked);

-- Kutilayotgan pairing so'rovlari (QR yaratilgan, hali tasdiqlanmagan)
create table if not exists pari_device_pairings (
  device_id  text primary key references pari_devices(id) on delete cascade,
  expires_at timestamptz not null,
  used       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table pari_device_pairings enable row level security;
create policy "service_role full access" on pari_device_pairings for all using (true) with check (true);

-- Qurilmaga yuborilgan buyruqlar (yangi pairing tizimi uchun, /api/phones dan alohida)
create table if not exists pari_device_commands (
  id         text primary key default gen_random_uuid()::text,
  device_id  text not null references pari_devices(id) on delete cascade,
  action     text not null,
  payload    jsonb not null default '{}',
  status     text not null default 'pending', -- pending | delivered | done | error
  result     jsonb,
  created_at timestamptz not null default now()
);

alter table pari_device_commands enable row level security;
create policy "service_role full access" on pari_device_commands for all using (true) with check (true);
create index if not exists idx_devcmd_device on pari_device_commands(device_id);
create index if not exists idx_devcmd_status on pari_device_commands(status);
