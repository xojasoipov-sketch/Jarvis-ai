-- ─────────────────────────────────────────────────────────────────────────────
-- Orchestrator — ko'p bosqichli maqsadni sub-vazifalarga bo'lib, tegishli
-- agentlarga ketma-ket topshirib, oxirida yagona yakuniy javobga jamlaydi.
-- Hermes (mavjud) bitta vazifani mos agent(lar)ga parallel yo'naltiradi;
-- Orchestrator esa bir maqsadni REJA qilib, bosqichma-bosqich OXIRIGACHA bajaradi.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pari_orchestrator_runs (
  id         text primary key default gen_random_uuid()::text,
  goal       text not null,
  steps      jsonb not null default '[]',   -- [{agent_id, agent_name, task, result}]
  final      text,
  status     text not null default 'running', -- running | done | error
  created_at timestamptz not null default now()
);

alter table pari_orchestrator_runs enable row level security;
create policy "service_role full access" on pari_orchestrator_runs for all using (true) with check (true);
create index if not exists idx_orch_created on pari_orchestrator_runs(created_at desc);
