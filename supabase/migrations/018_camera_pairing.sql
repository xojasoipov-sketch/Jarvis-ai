-- ─────────────────────────────────────────────────────────────────────────────
-- Camera Pairing — QR/gateway pairing protocol (EZVIZ'dan mustaqil)
-- ─────────────────────────────────────────────────────────────────────────────

-- Bitta pairing session: Mini App "+ Add Camera → Scan QR" bosganda yaratiladi.
-- Gateway shu pairing_id'ni QR orqali oladi va o'zini shu sessionga bog'laydi.
create table if not exists camera_pairings (
  id              text primary key default gen_random_uuid()::text,
  status          text not null default 'pending', -- pending | claimed | cameras_found | completed | expired
  token_hash      text not null,                    -- HMAC(pairing token) — xom token DB'da saqlanmaydi
  gateway_id      text,                              -- claim qilingan gateway (mavjud bo'lsa)
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now(),
  claimed_at      timestamptz
);

-- Ro'yxatdan o'tgan gateway'lar (uy tarmog'idagi local bridge instance)
create table if not exists camera_gateways (
  id              text primary key,                 -- deviceId, gateway o'zi generatsiya qiladi
  name            text not null default 'Camera Gateway',
  public_key      text not null,                     -- gateway public key (signed request tekshirish uchun)
  last_seen       timestamptz,
  status          text not null default 'offline',   -- online | offline
  created_at      timestamptz not null default now()
);

-- Gateway tomonidan discovery qilingan, hali user tasdiqlamagan kameralar
create table if not exists camera_discovery_results (
  id              text primary key default gen_random_uuid()::text,
  pairing_id      text references camera_pairings(id) on delete cascade,
  gateway_id      text references camera_gateways(id) on delete cascade,
  local_device_id text not null,                     -- gateway ichidagi ONVIF/RTSP device identifikatori
  name            text not null default '',
  manufacturer    text default '',
  model           text default '',
  ip              text default '',
  protocols       jsonb not null default '{}',        -- {rtsp: bool, onvif: bool, ptz: bool, ...}
  created_at      timestamptz not null default now()
);

alter table camera_pairings           enable row level security;
alter table camera_gateways           enable row level security;
alter table camera_discovery_results  enable row level security;

create policy "service_role full access" on camera_pairings           for all using (true) with check (true);
create policy "service_role full access" on camera_gateways           for all using (true) with check (true);
create policy "service_role full access" on camera_discovery_results  for all using (true) with check (true);

create index if not exists idx_pairing_status  on camera_pairings(status, expires_at);
create index if not exists idx_discovery_pairing on camera_discovery_results(pairing_id);

-- Cameralar jadvaliga gateway/pairing bog'lanishi (mavjud jadvalni buzmasdan kengaytiramiz)
alter table cameras add column if not exists gateway_id text references camera_gateways(id);
alter table cameras add column if not exists local_device_id text default '';
