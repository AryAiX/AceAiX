# 07 — Bolt Prototype Audit

An honest inventory of the Bolt prototype (`project-bolt-sb1-ytmvcpcl.zip`), classifying every part as
**keep**, **clean up**, or **rebuild**, and flagging what is real vs. mocked. Use this to plan the
migration from demo to product.

> **TL;DR:** the design system and component library are excellent — **keep them**. Auth is genuinely
> wired to Supabase. Almost everything else renders **hardcoded mock data** and must be connected to
> real data. The database schema and RLS are an MVP-grade subset with **security gaps** that must be
> fixed before any real medical data exists.

---

## 1. What's real (wired to Supabase)

| Area | Status | File(s) |
|------|--------|---------|
| Supabase client | Real | `src/lib/supabase.ts` |
| Auth: sign in / up / out, session, profile fetch | Real | `src/context/AuthContext.tsx` |
| Athlete onboarding update | Real | `src/pages/auth/OnboardingPage.tsx` |
| Athlete profile fetch on dashboard | Real (partial) | `src/pages/athlete/DashboardPage.tsx` (only `sport/position/club/level`) |
| DB schema + RLS | Real but reduced | `supabase/migrations/*.sql` |
| Demo user seeding | Real | `supabase/functions/create-demo-users/index.ts` |

---

## 2. What's mocked (hardcoded — must be replaced)

Nearly all displayed content is hardcoded constants or local arrays:

- **Athlete dashboard:** `RADAR_ATTRS`, `TRAJECTORY`, `SCOUT_INTEREST`, `OPPORTUNITIES`, `AI_MESSAGES`,
  `CHECKLIST`, `FORM` are all hardcoded. Charts render from these constants.
- **Recruiter search (`recruiter/SearchPage.tsx`):** `ATHLETES` is a local array; AI search is a fake
  `setTimeout`; watchlist is local `Set` state (not persisted).
- **AppLayout notifications:** `NOTIFS` is hardcoded; unread badge counts the mock array.
- **AI coach:** canned `setTimeout` reply; not connected to any LLM.
- **Public profile data:** `src/data/athleteProfile.ts`, `clubProfile.ts`, `coachProfile.ts` are static
  fixtures driving public profile pages.
- Most other pages (medical, performance, career, network, opportunities, analytics, admin, partner)
  follow the same pattern: beautiful UI, static data.

**Action:** for each page, replace constants with `api/` + hooks (TanStack Query) against Supabase, add
loading/empty/error states, then delete `src/data/` and the inline mock arrays. See
[05](./05-frontend-architecture.md) and [06](./06-supabase-integration.md).

---

## 3. Keep (high-value, low-change)

- **Design system:** `tailwind.config.js`, `src/index.css` (Floodlight). Canonical — see [04](./04-design-system.md).
- **UI primitives:** `src/components/ui/*` (ScoreRing, StatTile, StatusChip, VerifiedBadge, AthleteCard,
  GlassPanel, MagneticButton, AuroraBackground, etc.).
- **Profile sections:** `src/components/profile/*`.
- **Layout shells:** `AppLayout.tsx`, `PublicHeader.tsx` (rewire notifications/user to real data).
- **Routing skeleton:** `Router.tsx` (extend per [05](./05-frontend-architecture.md) §3).
- **Type definitions:** `src/types/index.ts` (supersede with generated `database.ts`, keep view models).
- **Page layouts/markup:** reuse JSX structure; swap the data source.

---

## 4. Clean up (refactor during migration)

| Item | Issue | Fix |
|------|-------|-----|
| `package.json` name | `"vite-react-typescript-starter"` | Rename to `aceaix-web`; set version |
| Data fetching | Ad-hoc `useEffect` + `.then` | TanStack Query hooks via `api/` layer |
| Mock data | Inline arrays + `src/data/` | Remove once pages are wired |
| CSS aliases | Many legacy light→dark aliases (`.card-light`, `.input-dark`, `.badge-blue`…) | Collapse to canonical classes |
| Inline styles | Heavy `style={{…}}` usage (e.g. SearchPage) | Move repeated patterns to component classes/tokens |
| Eager route imports | All pages imported in `Router.tsx` | `React.lazy` per zone for code splitting |
| Theme toggle | Toggle exists but surfaces are dark-only | Either finish light mode or make dark the only theme |
| Hand-written types | Drift from DB | Generate `database.ts` from Supabase |
| Hardcoded copy | English strings inline | Externalize for i18n (P2) using logical props now |

---

## 5. Rebuild (not adequate as-is)

- **Database schema:** reduced subset of the canonical model — rebuild cleanly per
  [03](./03-data-model.md) §7 (foundation migration set), rather than incrementally patching the three
  prototype migrations. Missing ~25 tables (scout/coach/partner/federation profiles, organization_staff,
  consent, audit, billing, contact_requests, etc.).
- **RLS policies:** rebuild with consent-gating, append-only medical, admin claims, org scoping (see §6).
- **Auth provisioning:** move profile-row creation server-side (trigger / `on-signup` fn).
- **AI features:** build the real `ai-chat` / `ai-search` Edge Functions (SSE) — there is no AI backend today.
- **Notifications:** real `notifications` table + Realtime + `notify` fn.

---

## 6. Security gaps (fix before real medical data) — HIGH PRIORITY

The prototype RLS is permissive and **not safe for production medical data**:

| Gap | Evidence | Required fix |
|-----|----------|--------------|
| Medical clearances readable by any authenticated user | `medical_clearances_select_own` policy includes `OR auth.uid() IS NOT NULL` | Consent-gate reads (owner OR `medical_consents`) |
| Medical records insert/update by any authenticated user | `medical_records_insert_own`/`update_own` use `auth.uid() IS NOT NULL` | Restrict insert to verified partners; **no UPDATE** (append-only) |
| No consent model | No `medical_consents` table | Add `medical_consents` + `medical_access_log` |
| No audit trail | No `audit_logs` table | Add immutable `audit_logs` + triggers |
| No soft-delete / provenance | `medical_records` lacks `is_deleted`, `anchor_ref` | Add provenance + soft-delete; anchor via `medical-anchor` fn |
| Org tables permissive | `organizations_*` allow any authenticated user to insert/update/delete | Scope to org admins/staff |
| `opportunities` deletable by creator only but insertable by anyone | weak | Scope to org/recruiter roles |
| Profile rows created client-side | `AuthContext.signUp` inserts directly | Server-side provisioning |
| Live anon key + project committed | `.env` in zip | Rotate; use fresh projects; commit only `.env.example` |

---

## 7. Migration approach (recommended)

**Two-track, in parallel:**

1. **Backend track:** stand up fresh Supabase project(s); author the clean foundation migrations +
   RLS + helper functions ([03](./03-data-model.md)); build core Edge Functions ([06](./06-supabase-integration.md));
   create seed data so the UI has realistic rows.
2. **Frontend track:** import the prototype into `web/`, rename/clean the project, add `@/` alias,
   TanStack Query, `api/` layer, generated types; then go **screen-by-screen**, replacing mock data
   with real queries (each screen meets the [06](./06-supabase-integration.md) §9 "done" definition).

**Suggested screen order** (value + dependency): Auth → Athlete dashboard/profile → Public athlete
profile (consent-aware) → Recruiter search/watchlists → Messaging → Medical (partner upload + athlete
view) → Admin (users/verification/audit). This mirrors the MVP slice in [01](./01-product-requirements.md) §5.

---

## 8. Prototype dependency notes

`react` 18, `react-router-dom` 7, `@supabase/supabase-js` 2.57, `framer-motion` 12, `lenis` 1.3,
`recharts` 3.8, `lucide-react`, `react-intersection-observer`. All current and reusable. Add:
`@tanstack/react-query`, `react-i18next` (P2), `@sentry/react`, Stripe SDK (P2). Vite 5 + TS 5.5 +
Tailwind 3.4 toolchain is fine.
