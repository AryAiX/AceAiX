# 02 — Technical Architecture

System architecture, technology stack, environments, and key technical decisions for AceAiX.
The stack mirrors the AryAiX platform standard.

---

## 1. Architecture overview

Three-tier architecture with a dedicated media pipeline and a secure AI proxy.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PRESENTATION TIER                                                          │
│  React 18 SPA (Vite) + PWA shell  ·  React Native / Capacitor (P3)         │
│  Served as static assets via CDN/edge hosting                              │
└───────────────┬────────────────────────────────────────────┬─────────────┘
                │ supabase-js (REST/Realtime/Storage/Auth)     │ SSE (AI chat)
                ▼                                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ APPLICATION TIER — Supabase                                                │
│  Auth (GoTrue)  ·  PostgREST  ·  Realtime (WS)  ·  Storage (S3-compat)     │
│  Edge Functions (Deno): AI proxy, webhooks, scheduled jobs, integrations   │
└───────┬───────────────────────┬──────────────────────┬────────────────────┘
        │                       │                      │
        ▼                       ▼                      ▼
┌───────────────┐   ┌────────────────────┐   ┌──────────────────────────────┐
│ DATA TIER     │   │ MEDIA PIPELINE     │   │ EXTERNAL SERVICES             │
│ PostgreSQL 15 │   │ Object storage +   │   │ OpenAI/Azure AI · Stripe ·    │
│ + RLS         │   │ managed transcode  │   │ Twilio · Resend · FCM ·       │
│ Vector store  │   │ + CDN delivery     │   │ UAE Pass (P3) · Provenance    │
│ Provenance    │   │ + CV (P3)          │   │ anchoring                     │
└───────────────┘   └────────────────────┘   └──────────────────────────────┘
```

**Key rule:** the frontend talks to Supabase (PostgREST + Realtime + Storage + Auth) directly for
ordinary data, and to **Edge Functions** for anything requiring secrets or privileged logic (AI,
payments webhooks, notification fan-out, provenance anchoring, partner APIs). The browser never holds
the service-role key or any third-party API key.

---

## 2. Technology stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend framework | React 18 + TypeScript | Component model, ecosystem, hiring pool |
| Build tool | Vite 5 | Fast HMR, native ESM, optimized builds |
| Styling | Tailwind CSS 3 | Utility-first, design-system friendly (see [04](./04-design-system.md)) |
| Routing | React Router 7 | Already used by prototype |
| Animation | Framer Motion + Lenis | Prototype uses these; keep for the "Floodlight" feel |
| Charts | Recharts (+ hand-rolled SVG) | Prototype mixes both; standardize on Recharts |
| Icons | lucide-react | Prototype standard |
| State (server) | Supabase client + Realtime; **TanStack Query** (add) | Cache, dedupe, retries for server state |
| State (app) | React Context | Auth, theme, i18n; minimal global state |
| Backend / BaaS | Supabase | Postgres + Auth + Storage + Edge + Realtime in one |
| Database | PostgreSQL 15+ | ACID, JSONB, RLS, full-text search |
| Auth | Supabase Auth (GoTrue) | Email/pw, SMS OTP, social, UAE Pass custom provider (P3) |
| Media | Object storage + managed transcoding | Adaptive-bitrate delivery via signed URLs/CDN |
| Serverless | Supabase Edge Functions (Deno) | AI orchestration, webhooks, jobs, integrations |
| AI / LLM | OpenAI GPT-class (primary) | Conversational search, matching, profile/outreach |
| AI vision/OCR | Vision model | Doc/ID OCR, clip tagging |
| AI embeddings | Embedding model + pgvector | Semantic search over athletes, clips, resources |
| Payments | Stripe (UAE-supported) | Subscriptions, licenses, commissions |
| SMS / OTP | Twilio | OTP, alerts |
| Email | Resend | Transactional + reports (EN/AR/RTL templates) |
| Push | Firebase Cloud Messaging | Web PWA + mobile |
| Monitoring | Sentry + Supabase dashboard | Errors, performance, DB metrics |
| CI/CD | GitHub Actions | Test, lint, typecheck, deploy |
| Hosting | Edge-hosted SPA + managed Supabase | Global static delivery + managed backend |

> **Decision — `TanStack Query`:** the prototype fetches with raw `supabase.from(...).then(...)` inside
> `useEffect`. For the platform we adopt TanStack Query for caching, request dedup, retries, and
> invalidation. Wrap Supabase calls in typed query/mutation hooks (see [05](./05-frontend-architecture.md)).

---

## 3. Multi-tenancy model

Shared database, row-level isolation:

- Clubs and federations share one Postgres DB; each org has a unique `organization_id`.
- RLS ensures org seats see only their org's recruitment data.
- Athletes see/control only their own data; scouts see athlete data per consent + public visibility.
- Super Admins bypass org scoping (service-role / admin-claim policies).

---

## 4. Security architecture

- **AuthN:** Supabase Auth — email/password + SMS OTP (MVP); UAE Pass for national identity (P3).
- **AuthZ:** PostgreSQL RLS enforces role- and consent-based access at the DB level. App-layer checks
  are convenience only; the DB is the boundary.
- **Encryption:** TLS 1.3 in transit; AES-256 at rest. `emirates_id` stored encrypted; no UAE Pass
  tokens persisted beyond the session.
- **Provenance:** verified medical records are hashed (SHA-256) and anchored; tampering is detectable.
- **Audit:** all sensitive mutations logged to immutable `audit_logs` (user, action, table, old/new,
  timestamp, IP). Implemented via DB triggers + Edge Functions.
- **File security:** signed URLs for media and medical documents; no public buckets for protected content.
- **AI data handling:** ephemeral, not used for training (DPA); identifiers pseudonymized where feasible.
- **Secrets:** only in Edge Function env / Supabase Vault. Never in the client bundle. The `.env`
  shipped in the prototype only contains the public `VITE_SUPABASE_URL` + anon key (safe with RLS),
  but **rotate keys** and treat the prototype's project as disposable.

---

## 5. Environments

| Env | Supabase project | Purpose |
|-----|------------------|---------|
| Local | `supabase start` (Docker) | Dev against local stack; seed data |
| Staging | dedicated project | Integration, QA, preview deploys |
| Production | dedicated project | Live; data-residency configured |

- Use the **Supabase CLI** for local dev, migrations, and Edge Function development.
- Migrations are version-controlled SQL (`supabase/migrations/*`); never edit applied migrations —
  add new ones. See [03](./03-data-model.md) §migrations.
- Environment variables: client uses `VITE_*` (public). Edge Functions use service role + provider
  keys from Supabase secrets. Document all in `.env.example` (no real values committed).

---

## 6. Service degradation hierarchy

Design every integration to fail soft:

1. **AI down** → core platform works; AI surfaces show a banner; manual workflows continue.
2. **Media pipeline down** → uploads queue and process on recovery; existing media still plays.
3. **Payment gateway down** → subscriptions retry on recovery; access continues during retry window.
4. **SMS down** → email serves as OTP/notification fallback.

---

## 7. Data retention (enforced via scheduled Edge Functions / pg_cron)

| Category | Retention |
|----------|-----------|
| Athlete portfolio & career | Indefinite (athlete-controlled); archive after long inactivity |
| Verified medical records | Per regulation; append-only; cold storage later; never hard-deleted |
| Video media | Tier-dependent; hot → cold tiering |
| AI chat (authenticated) | 2 years (cold after 1 year) |
| AI chat (guest) | 30 days (auto-deleted) |
| Audit logs | 7 years; monthly partitioned; cold after 1 year |
| Payment records | 7 years |
| Guest temp uploads | Session-scoped; deleted within 24 h |

---

## 8. Repository & build topology

For the MVP we ship a single web app (SPA) plus Supabase backend in one repository:

```
AceAix/
├─ docs/                 # this documentation set
├─ web/                  # React + Vite SPA (from cleaned-up Bolt prototype)
│  ├─ src/
│  └─ ...
├─ supabase/
│  ├─ migrations/        # versioned SQL
│  ├─ functions/         # Edge Functions (Deno)
│  └─ seed/              # seed + demo data
└─ .github/workflows/    # CI/CD
```

Native shells (React Native / Capacitor) are added in P3 sharing core logic; structure for that
(extract a `packages/core` or shared client) when P3 begins, not before.
