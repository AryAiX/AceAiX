# 08 — Build Roadmap

A phased, milestone-based plan to build AceAiX from the cleaned-up prototype into a Supabase-backed
product. Phases mirror the design doc's roadmap; milestones are engineering-actionable.

---

## Phase overview

| Phase | Theme | New roles | Duration |
|-------|-------|-----------|----------|
| **P0** | Foundation & migration setup | — | ~2–3 weeks |
| **P1** | MVP: verified profiles, discovery, manual medical | Guest, Athlete, Scout, Medical Partner, Admin (min) | ~6 months |
| **P2** | Growth, payments, localization, clubs | Coach, Club (multi-seat) | ~6 months |
| **P3** | AI match analytics, federations, GCC, UAE Pass | Federation, Guardian/Agent, Org Admin | ~6–12 months |
| **P4** | Intelligence, marketplace, multi-sport, native depth | — | Ongoing |

---

## P0 — Foundation (before feature work)

**Goal:** a clean, runnable skeleton with real backend plumbing and the design system intact.

Milestones:
1. **Repo setup.** Create monorepo layout ([02](./02-architecture.md) §8): `web/`, `supabase/`,
   `docs/`, `.github/workflows/`. Import + rename the prototype into `web/` (`aceaix-web`).
2. **Frontend cleanup pass.** Add `@/` alias, TanStack Query, `api/` + `hooks/` layers; convert routes
   to lazy imports; collapse CSS aliases; keep Floodlight design system.
3. **Supabase projects.** Stand up local + staging (+ prod later); rotate keys; `.env.example`.
4. **Clean schema.** Author foundation migrations (core P1 tables) + helper functions + RLS
   ([03](./03-data-model.md) §7) — **consent-gated, append-only medical from day one**.
5. **Type generation + CI.** Generate `database.ts`; CI runs lint + typecheck + build; deploy preview.
6. **Seed data.** Realistic athletes/clubs/media/stories so the UI renders on real rows.

**Exit criteria:** app boots against Supabase; one trivial real query renders (e.g. athlete list);
CI green; RLS policy tests scaffolded.

---

## P1 — MVP

**Goal:** functioning athlete-discovery platform — verified profiles, highlights, discovery, manual
medical verification. (Design doc §13.1.) Build screen-by-screen per [07](./07-prototype-audit.md) §7.

### Workstreams & milestones

**A. Auth & onboarding**
- Email/password + email & SMS OTP; password reset; `/auth/verify-otp`.
- Server-side profile provisioning (trigger / `on-signup` fn); role custom claim.
- Multi-step register (method → OTP → role → core profile → optional uploads); role-adaptive onboarding.

**B. Public zone (guest)**
- Landing, athlete browse/search, club browse, public highlights, success stories, plans (read-only), about.
- Public athlete profile — **consent-aware** (no medical without consent).
- Guest AI discovery (`ai-search` fn) + guest AI chat sessions (nullable `user_id`).

**C. Athlete portal**
- Dashboard wired to real `athlete_profiles`/`match_records`/scout views/opportunities (replace all mocks).
- Profile/portfolio editor; attributes; career milestones; endorsements display.
- Media: resumable highlight upload → transcode webhook → `media-tag` (AI tagging); player.
- Performance: manual match entry; basic insights.
- Medical (athlete view): verified records, clearances, injuries; **access log**; privacy/consent controls.
- AI career coach (`ai-chat`, SSE); messaging (Realtime); notifications (Realtime).

**D. Scout portal**
- Recruiter dashboard (saved searches, shortlists, recent activity, AI recs).
- Advanced search (real filters/full-text + pgvector); AI recommendations.
- Profile evaluation (consent-gated medical); comparison tool; watchlists (persisted).
- Outreach / contact requests with **tiered monthly limits**; messaging.

**E. Medical partner portal (manual)**
- Verification inbox; structured record + document upload to `medical-docs`.
- Clearance issuance (effective dates); injury records.
- Provenance anchoring (`medical-anchor`); verified-partner badge.

**F. Admin (minimal)**
- User management (CRUD, suspend); verification/onboarding approval queue; subscription/license config;
  audit log viewer; basic platform analytics.

**G. Platform foundation**
- Edge Functions: `ai-chat`, `ai-search`, `media-tag`, `media-transcode-webhook`, `medical-anchor`,
  `medical-signed-url`, `on-signup`, `notify`, `retention-jobs`.
- Storage buckets + policies; signed-URL flow for protected content.
- Sentry; basic email (Resend) + SMS (Twilio) OTP/alerts; error pages (404/500/maintenance/access-denied).

**Exit criteria:** the five MVP flows ([01](./01-product-requirements.md) §4 + §5) work end-to-end on
real data; RLS verified by tests; NFR targets met on key screens; no `src/data/` / mock arrays remain.

---

## P2 — Growth, payments, localization, clubs

(Design doc §13.2.) New roles: Coach, Club (multi-seat).
- **Clubs:** multi-seat licenses, `organization_staff` seat management, roster & prospect tracking,
  medical tracking for consented prospects, team analytics, trials/opportunities + applications.
- **Coach:** attributable endorsements, squad/group management, athlete view.
- **Payments:** Stripe subscriptions (athlete tiers + club/scout licenses), `stripe-webhook`, receipts.
- **Notifications:** FCM push, `user_devices`, in-app notification center + preferences.
- **Localization:** Arabic + full RTL (react-i18next; logical properties; Arabic AI agent).
- **Media:** highlight-reel builder enhancements; adaptive streaming improvements.
- **AI:** performance insights, talent recommendations, endorsement/credibility scoring, medical
  interpretation, outreach drafting.
- **Admin:** onboarding workflow, content management (stories, leaderboards, multi-language).

---

## P3 — AI match analytics, federations, GCC, UAE Pass

(Design doc §13.3.) New roles: Federation, Guardian/Agent (full), Org Admin (full).
- **AI match analytics:** venue-based computer-vision tracking → automated `match_records`; venue
  installation workflow; CV pipeline autoscaling + queueing.
- **Advanced AI:** trajectory forecasting + injury-risk scoring at scale; comparable-player intelligence.
- **Medical automation:** partner API integration, automated anchoring, scheduled re-verification.
- **Federation:** national athlete database, development tracking, pipeline analytics, programs.
- **Guardian/Agent:** full minor-safeguarding workflows, agent representation, consent management.
- **UAE Pass:** OIDC auth + Emirates ID verification across registration & medical checks.
- **GCC expansion:** multi-country support, localization expansion, regional partnerships.

---

## P4 — Intelligence, marketplace, scale (ongoing)

(Design doc §13.4.) Predictive analytics (breakout detection, transfer-likelihood), population/sport
analytics for federations (anonymized aggregates), additional sports, third-party services marketplace +
white-label, native mobile depth + wellness integrations (HealthKit/Google Fit), more languages.

---

## Cross-cutting (every phase)

- **Security/privacy:** maintain consent-gating, append-only medical, audit logging, soft-delete;
  periodic RLS policy tests; security review before each release.
- **Accessibility:** keep WCAG-aligned; axe-core in CI + manual screen-reader passes.
- **Performance:** track NFR targets ([01](./01-product-requirements.md) §8) via Lighthouse CI + Sentry.
- **Data retention:** scheduled jobs enforce retention policy ([02](./02-architecture.md) §7).
- **Docs:** keep this `docs/` set current as decisions evolve (code wins; update docs to match).

---

## Immediate next actions (to start P0)

1. Confirm repo layout and import the prototype into `web/` (clean + rename).
2. Create the Supabase staging project; author the foundation migrations + RLS from
   [03](./03-data-model.md).
3. Add TanStack Query + `api/` layer + generated types; wire the **athlete list/profile** as the first
   real-data slice to validate the end-to-end path.
4. Stand up CI (lint/typecheck/build) + preview deploys.
