-- ─────────────────────────────────────────────────────────────────────────────
-- EZVIZ access token persist cache — server restart'da qayta login talab
-- qilmaslik uchun. Qiymat app-level AES-256-GCM bilan shifrlanadi
-- (src/lib/camera/crypto.ts), shuning uchun bu yerda plaintext token saqlanmaydi.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists ezviz_token_cache (
  app_key       text primary key,
  token_enc     text not null,           -- encryptSecret() natijasi ("enc:iv:tag:data")
  expires_at    bigint not null,         -- ms epoch, EZVIZ expireTime
  updated_at    timestamptz not null default now()
);

alter table ezviz_token_cache enable row level security;
create policy "service_role full access" on ezviz_token_cache for all using (true) with check (true);
