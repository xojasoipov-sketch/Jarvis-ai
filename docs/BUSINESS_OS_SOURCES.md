# PARI AI — Business OS Source Map

**Qoida:** ochiq loyihalardan *kod nusxa* emas — **modul bo‘linishi, workflow, UX qarorlari**.
Asl stack: Next.js · Supabase · multi-provider LLM · Telegram · Railway.

Loop: **Speak → Route → Execute → Remember → Repeat**

---

## Eng muhim 15 (birinchi o‘rganish)

| # | Loyiha | Pari moduli | O‘rganiladigan narsa |
|---|--------|-------------|----------------------|
| 1 | [ERPNext](https://github.com/frappe/erpnext) | CRM, Orders, Finance, Ops | DocType, modul chegaralari, workflow state |
| 2 | [Odoo](https://github.com/odoo/odoo) | Business modules | App = mustaqil paket, menu guruhlari |
| 3 | [n8n](https://github.com/n8n-io/n8n) | Automation | Node graph, trigger → action, credential vault |
| 4 | [Activepieces](https://github.com/activepieces/activepieces) | Automation | Piece = kichik integratsiya, oddiy UX |
| 5 | [Twenty](https://github.com/twentyhq/twenty) | CRM | Modern CRM list/detail, lightweight objects |
| 6 | [Plane](https://github.com/makeplane/plane) | Tasks / Projects | Issue states, cycles, simple boards |
| 7 | [Chatwoot](https://github.com/chatwoot/chatwoot) | Support / Inbox | Conversation inbox, agent assignment |
| 8 | [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) | Knowledge | Blocks + AI, local-first notes |
| 9 | [AFFiNE](https://github.com/toeverything/AFFiNE) | Knowledge | Canvas + docs hybrid |
| 10 | [Flowise](https://github.com/FlowiseAI/Flowise) | AI Brain | Visual LLM chains (inspiration only) |
| 11 | [OpenHands](https://github.com/All-Hands-AI/OpenHands) | AI Employees | Agent loop, tool use, sandbox ideas |
| 12 | [Medusa](https://github.com/medusajs/medusa) | Commerce / Marketplace | Cart, order lifecycle, modules |
| 13 | [Metabase](https://github.com/metabase/metabase) | Analytics | Question → dashboard, simple metrics |
| 14 | [Supabase](https://github.com/supabase/supabase) | Database & Auth | Postgres, RLS, storage (already in use) |
| 15 | [Cal.com](https://github.com/calcom/cal.com) | Calendar | Booking slots, availability |

---

## Kategoriya → Pari mapping

### AI & Agent
| Source | Pari |
|--------|------|
| OpenHands, CrewAI, AutoGen, LangGraph | `/agents`, Hermes, skills router |
| Flowise, Langflow, Dify | Workflow builder (keyin), skill graph |
| LibreChat, Open WebUI | `/chat` UX patterns |
| Mem0 | `vault/` + `/api/memory` + GitHub vault |

### Automation
| Source | Pari |
|--------|------|
| n8n, Activepieces | `/automation` — triggers, schedules |
| Windmill, Trigger.dev, Kestra | Background jobs (Railway cron keyin) |

### ERP / CRM / Projects
| Source | Pari |
|--------|------|
| ERPNext, Odoo | Module boundaries in `src/lib/modules.ts` |
| Twenty, EspoCRM | `/clients` CRM |
| Plane, OpenProject | `/tasks`, `/projects` |

### Knowledge
| Source | Pari |
|--------|------|
| AppFlowy, AFFiNE, Docmost, Outline | `/knowledge`, `vault/wiki` |

### Support / Analytics / Billing / Commerce
| Source | Pari |
|--------|------|
| Chatwoot | Inbox skill + TG bot |
| Metabase, PostHog | `/analytics`, metrics skill |
| Invoice Ninja, Lago | `/billing` |
| Medusa, Saleor | `/marketplace`, `/orders` |

### Calendar / Internal tools / Platform
| Source | Pari |
|--------|------|
| Cal.com | `/calendar` |
| Appsmith, ToolJet | Admin panels pattern |
| Supabase, PocketBase | Backend (Supabase live) |
| shadcn/ui | UI kit direction (restrained) |

---

## Bosqichma-bosqich (amaliy)

### Phase A — hozir (wire, not busywork)
1. **AI Brain** — chat + skills + vault remember ✅
2. **Owner identity** — TG id, limits ✅
3. **Knowledge** — markdown vault graph ✅
4. **Module registry** — single source `modules.ts` ✅

### Phase B — keyingi
1. CRM list (Twenty-style): clients table in Supabase
2. Tasks board (Plane-style): status columns
3. Automation stubs (n8n-style): cron + webhook endpoints
4. Analytics cards (Metabase-style): KPI from vault/metrics

### Phase C — keyinroq
1. Orders + Marketplace (Medusa lifecycle ideas)
2. Billing drafts (Invoice Ninja fields)
3. Calendar booking (Cal.com availability)
4. Support inbox unified with Telegram

---

## Qat’iy chegaralar

- **Nusxa qilinmaydi:** butun ERPNext/Odoo/n8n deploy qilish
- **Olinadi:** modul nomlari, state machine, empty states, navigation hierarchy
- **UI:** Linear / Stripe / Notion — AGENTS.md falsafasi
- **AI:** kichik skill’lar (`skills/*/SKILL.md`), bitta ulkan prompt emas

---

## Checklist holati (Pari ichida)

- [x] AI chat + multi-provider
- [x] Skills router + vault memory
- [x] Module map (Business Factory OS)
- [x] Telegram owner / guest
- [x] Portfolio (SADIPRIME) public
- [ ] CRM data model (Twenty-inspired)
- [ ] Tasks board (Plane-inspired)
- [ ] Automation runner (n8n-inspired)
- [ ] Analytics KPIs (Metabase-inspired)
- [ ] Calendar (Cal.com-inspired)

Yangilash: har bir modul yakunlanganda shu fayl va `src/lib/modules.ts` sinxron.
