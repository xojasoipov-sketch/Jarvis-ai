-- ─────────────────────────────────────────────────────────────────────────────
-- Gateway PKI — Ed25519 device identity, replay protection, revocation
-- ─────────────────────────────────────────────────────────────────────────────

-- camera_gateways.public_key endi haqiqiy Ed25519 SPKI DER (base64) qiymatni
-- saqlaydi (avval placeholder tasodifiy hex edi — 018-migratsiyada yaratilgan
-- ustunning o'zi qayta ishlatiladi, faqat mazmuni o'zgaradi).
alter table camera_gateways add column if not exists revoked_at timestamptz;
alter table camera_gateways add column if not exists revoked_reason text;

-- So'nggi imzolangan so'rovlar nonce'lari — replay protection uchun.
-- Bir xil (gateway_id, nonce) juftligi ikkinchi marta qabul qilinmaydi.
create table if not exists gateway_nonces (
  gateway_id  text not null references camera_gateways(id) on delete cascade,
  nonce       text not null,
  created_at  timestamptz not null default now(),
  primary key (gateway_id, nonce)
);

alter table gateway_nonces enable row level security;
create policy "service_role full access" on gateway_nonces for all using (true) with check (true);

-- Eski nonce yozuvlarini tozalash uchun — replay oynasi (5 daqiqa)dan eski
-- yozuvlar keraksiz, indeks bilan tez o'chirish mumkin.
create index if not exists idx_gateway_nonces_created on gateway_nonces(created_at);
