# Pari AI — Business Factory OS

**Goal:** One workspace to run an entire AI-powered business.  
Not a simple admin panel — an **operating system** for the business.

Inspired by architecture/UX *patterns* from ERPNext, Odoo, n8n, Activepieces, Twenty, Plane, Chatwoot, AppFlowy, AFFiNE, Metabase, Appsmith, Invoice Ninja, Cal.com, Medusa, Flowise, Langflow, OpenHands — **without copying** those products.

Feels like: **Notion + ERPNext + n8n + HubSpot + ClickUp + ChatGPT + Linear + Stripe + Shopify Admin**.

---

## 20 Core Modules

| # | Module | Route(s) | Status |
|---|--------|----------|--------|
| 1 | Dashboard | `/` | ✅ Live |
| 2 | AI Brain | `/chat`, `/pari`, `/history`, `/skilltree` | ✅ Live |
| 3 | AI Employees | `/agents`, `/tasks`, `/projects` | ✅ Live |
| 4 | Business CRM | `/clients`, `/services` | ✅ Live |
| 5 | Client Portal | `/clients` (extend) | 🟡 Partial |
| 6 | Orders | `/orders` | ✅ Live |
| 7 | Services Marketplace | `/marketplace` | ✅ Live |
| 8 | Automation Center | `/automation` | ✅ Live |
| 9 | Workflow Builder | `/automation` | 🟡 Shared with automation |
| 10 | Content Factory | `/smm`, `/business` | ✅ Live |
| 11 | Media Studio | `/media` | ✅ Live |
| 12 | Knowledge Hub | `/knowledge`, `/files` | ✅ Live |
| 13 | Analytics | `/analytics` | ✅ Live |
| 14 | Finance | `/billing` | ✅ Live |
| 15 | Calendar | `/calendar` | ✅ Live |
| 16 | Notifications | bell + `/api/notifications` | ✅ Live |
| 17 | Team Workspace | settings / members | 🟡 Schema ready |
| 18 | Settings | `/settings`, `/security` | ✅ Live |
| 19 | Integrations | `/apis` | ✅ Live |
| 20 | API Center | `/apis` | ✅ Live |

Registry source of truth: `src/lib/modules.ts`

---

## Architecture principles

1. **Modular** — each module owns UI route + API + store; registry connects them.
2. **AI-first** — AI Brain (`/api/chat`, Hermes, tools) can call any module tool.
3. **Event-ready** — `bf_events` table for async jobs / webhooks (n8n-style).
4. **Multi-tenant ready** — `bf_workspaces` + `bf_members` (RBAC roles: owner/admin/member/viewer).
5. **Audit** — `bf_audit_logs` + `bf_activity` for enterprise trail.
6. **Command palette** — ⌘K / Ctrl+K global search (Linear / Notion pattern).
7. **Railway-first deploy** — see `docs/RAILWAY.md`.

### Folder map (feature-oriented)

```
src/
  app/           # Next.js routes (module pages + api)
  components/    # Shell, palette, shared UI
  lib/
    modules.ts   # Module registry
    tools.ts     # AI Brain tools (cross-module)
    *-store.ts   # Domain stores
  hooks/
supabase/migrations/
```

---

## What was added in this foundation

- Module registry + nav groups
- Command palette (⌘K)
- Sidebar grouped as Core / Business / Create / Ops / System
- SQL: workspaces, members, audit, activity, events
- Branding: **Business Factory OS**

---

## Roadmap (next increments)

1. Wire `workspace_id` into existing tables (clients, orders, tasks…)
2. Visual workflow canvas (n8n-like) on `/automation`
3. Dedicated Client Portal route + public token links
4. Background worker processing `bf_events`
5. Full RBAC checks in middleware
6. Realtime (Supabase realtime) for activity feed
7. Optional turbovec sidecar for Knowledge RAG

---

## Security notes

- Service role used server-side only
- Auth middleware already gates UI/API when `AUTH_*` configured
- Audit every mutating API when workspace layer is enabled
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
