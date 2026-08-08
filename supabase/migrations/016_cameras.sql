-- ─────────────────────────────────────────────────────────────────────────────
-- Camera AI Module — EZVIZ / RTSP / ONVIF kamera tizimi
-- ─────────────────────────────────────────────────────────────────────────────

-- Kamera ro'yxati
create table if not exists cameras (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  provider      text not null default 'ezviz',  -- ezviz | rtsp | onvif | mock
  location      text not null default '',
  serial        text default '',                  -- EZVIZ serial number
  rtsp_url      text default '',                  -- to'g'ridan-to'g'ri RTSP (agar ma'lum bo'lsa)
  status        text not null default 'offline',  -- online | offline | error | unknown
  last_seen     timestamptz,
  capabilities  jsonb not null default '{}',
  metadata      jsonb not null default '{}',
  enabled       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Kamera credentials (encrypted at rest Supabase ichida)
create table if not exists camera_credentials (
  camera_id     text primary key references cameras(id) on delete cascade,
  secret_json   text not null default '{}',       -- JSON, Supabase vault / app-level encryption
  updated_at    timestamptz not null default now()
);

-- Camera zones (polygon asosida)
create table if not exists camera_zones (
  id            text primary key default gen_random_uuid()::text,
  camera_id     text not null references cameras(id) on delete cascade,
  name          text not null,
  zone_type     text not null default 'normal',    -- normal | restricted | entry | exit
  polygon       jsonb not null default '[]',       -- [[x,y], ...]
  enabled       boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Kamera hodisalari (aggregated events)
create table if not exists camera_events (
  id            text primary key default gen_random_uuid()::text,
  camera_id     text not null references cameras(id) on delete cascade,
  zone_id       text references camera_zones(id) on delete set null,
  event_type    text not null,  -- person_detected | vehicle_detected | motion_detected | camera_offline | ...
  severity      text not null default 'low',  -- low | medium | high | critical
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  duration_sec  int,
  track_id      text,
  snapshot_url  text,
  ai_summary    text,
  objects       jsonb not null default '[]',  -- [{type, confidence, bbox}, ...]
  metadata      jsonb not null default '{}',
  notified      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Object tracks (ko'p frame davomida bitta obyektni kuzatish)
create table if not exists camera_tracks (
  id            text primary key default gen_random_uuid()::text,
  camera_id     text not null references cameras(id) on delete cascade,
  track_id      text not null,            -- detection engine'dan keluvchi ID
  object_type   text not null,            -- person | vehicle | animal | ...
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  duration_sec  int,
  path          jsonb not null default '[]',   -- [{zone, timestamp}, ...]
  confidence    numeric,
  thumbnail_url text
);

-- Automation rules
create table if not exists camera_rules (
  id            text primary key default gen_random_uuid()::text,
  camera_id     text references cameras(id) on delete cascade,  -- null = barcha kameralar
  name          text not null,
  trigger_type  text not null,  -- object_detected | zone_enter | zone_exit | schedule | camera_offline
  trigger_config jsonb not null default '{}',
  action_type   text not null,  -- telegram_alert | record | snapshot | webhook
  action_config jsonb not null default '{}',
  schedule      jsonb,          -- {start: "23:00", end: "06:00", days: [...]}
  enabled       boolean not null default true,
  last_triggered timestamptz,
  trigger_count  int not null default 0,
  created_at    timestamptz not null default now()
);

-- Snapshot metadata
create table if not exists camera_snapshots (
  id            text primary key default gen_random_uuid()::text,
  camera_id     text not null references cameras(id) on delete cascade,
  url           text not null,
  taken_at      timestamptz not null default now(),
  event_id      text references camera_events(id) on delete set null,
  file_size     int,
  width         int,
  height        int
);

-- Camera health log
create table if not exists camera_health_logs (
  id            text primary key default gen_random_uuid()::text,
  camera_id     text not null references cameras(id) on delete cascade,
  status        text not null,
  latency_ms    int,
  error         text,
  checked_at    timestamptz not null default now()
);

-- RLS
alter table cameras              enable row level security;
alter table camera_credentials   enable row level security;
alter table camera_zones         enable row level security;
alter table camera_events        enable row level security;
alter table camera_tracks        enable row level security;
alter table camera_rules         enable row level security;
alter table camera_snapshots     enable row level security;
alter table camera_health_logs   enable row level security;

create policy "service_role full access" on cameras              for all using (true) with check (true);
create policy "service_role full access" on camera_credentials   for all using (true) with check (true);
create policy "service_role full access" on camera_zones         for all using (true) with check (true);
create policy "service_role full access" on camera_events        for all using (true) with check (true);
create policy "service_role full access" on camera_tracks        for all using (true) with check (true);
create policy "service_role full access" on camera_rules         for all using (true) with check (true);
create policy "service_role full access" on camera_snapshots     for all using (true) with check (true);
create policy "service_role full access" on camera_health_logs   for all using (true) with check (true);

-- Indexes
create index if not exists idx_cam_events_camera    on camera_events(camera_id, created_at desc);
create index if not exists idx_cam_events_type      on camera_events(event_type);
create index if not exists idx_cam_events_severity  on camera_events(severity);
create index if not exists idx_cam_tracks_camera    on camera_tracks(camera_id, last_seen desc);
create index if not exists idx_cam_health_camera    on camera_health_logs(camera_id, checked_at desc);
create index if not exists idx_cam_snapshots_camera on camera_snapshots(camera_id, taken_at desc);
create index if not exists idx_cam_zones_camera     on camera_zones(camera_id);
