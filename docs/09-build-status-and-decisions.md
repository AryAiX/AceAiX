# 09 — Build Status, Decisions & Open Questions

> Status snapshot for the working build: what is implemented and wired to Supabase,
> the engineering decisions taken autonomously while building, and the open questions
> that need a product/stakeholder call. Companion to the phased roadmap in [08](./08-build-roadmap.md).

---

## 1. What is built and working

The application is a React 18 + TypeScript + Vite SPA, fully wired to the live Supabase
project (`uvjxrimfijxmnjnbrivg`). **All data shown in the UI comes from the database** — every
page reads through the `web/src/api/*` layer and TanStack Query. There is no remaining mock data
on rendered screens.

### Backend (Supabase)
- **33 public tables** with Row-Level Security on every table, role- and consent-based, enforced via
  `SECURITY DEFINER` helpers in a private schema (`private.is_admin`, `private.owns_athlete`,
  `private.has_medical_consent`, `private.owns_medical_partner`).
- Migrations `0001`–`0011` under `supabase/migrations/`. `0010` adds richer profile/CMS/posts schema;
  `0011` lets medical partners read the clearances/records they issued.
- Server-side profile provisioning via the `handle_new_user` auth trigger (clients never write
  `user_profiles` directly).
- **Seed script** (`web/scripts/seed.mjs`) — idempotent; wipes `@aceaix.demo` users (cascades to all
  child rows) and reseeds 17 users (12 athletes, 1 scout, 1 coach, 1 medical partner, 1 admin),
  6 organizations, athlete portfolios (attributes, academy, certs, honors, trajectory, media, matches,
  career milestones), medical clearances/records/injuries, social graph, conversations, watchlists,
  opportunities, notifications, success stories, verification requests, posts, and CMS content.

### Frontend (all wired to DB)
- **Public (13):** home, discover, athletes directory, clubs directory, highlights, feed, plans,
  resources, about, login, register, athlete public profile, club public profile.
- **Athlete app (12):** dashboard, profile, media, performance, medical, network, career,
  opportunities, AI coach, analytics, messages, settings.
- **Recruiter app (5):** dashboard, search, watchlists, analytics, messages.
- **Admin app (4):** overview, users, verification queue, analytics.
- **Medical partner app (2):** dashboard, requests.

### Tests
- **Unit (Vitest):** 12 tests across `format.ts` and UI components. `npm test`.
- **E2E (Playwright):** 7 functional tests (public rendering + role logins + DB-backed assertions)
  in `tests/e2e/app.spec.ts`; full screenshot capture suite for all 35 pages in `screenshots.spec.ts`.
  `npm run test:e2e`.
- Typecheck is clean (`tsc --noEmit`, 0 errors).

### Visual QA performed
Captured and reviewed screenshots of every page across all five role contexts. Bugs found and fixed
during review:
1. Public athlete profile crashed when an athlete had no highlight clips (`HighlightCard` guard added).
2. Home "Faces to watch" cards were invisible — the scroll-reveal `useInView` attached its observer
   on mount before the data-loaded grid existed; switched to a callback ref so it re-attaches.
3. Medical partner dashboard showed all zeros — RLS didn't let the issuing partner read its own
   clearances/records (fixed in migration `0011`).
4. Public highlights / media pages were empty — the seed's batched `athlete_media` insert silently
   failed because `is_featured` (NOT NULL) was set on only the first row, nulling it for the rest.
5. Public feed was monotonous (every post identical) — seed now generates varied post text/images.

---

## 2. Decisions made autonomously

These were decided to keep momentum; flag any you'd like changed.

| # | Area | Decision | Rationale / reversibility |
|---|------|----------|---------------------------|
| D1 | TS DB types | Hand-written types in `web/src/types/index.ts` instead of `supabase gen types`. | The CLI's `gen types` needs Docker/introspection that hung locally. Easy to regenerate later in CI. |
| D2 | Profile richness | Rich, semi-structured portfolio sections (attributes, academy, honors, trajectory, analytics) stored as **JSONB** on `athlete_profiles` rather than fully normalized. | Matches the prototype's shape, avoids premature over-normalization. Normalize later if these need querying/filtering. |
| D3 | Static content | Marketing/landing copy, pricing plans, etc. served from a DB-backed `cms_content` key-value table. | Satisfies "everything comes from DB" without a full CMS. Keys: `home`, `plans`, `resources`, `about`. |
| D4 | AI features | AI Coach, AI scores, trajectory forecasts, and "AI match %" are presented from **stored/derived data**, not a live model call yet. | The Edge Function AI proxy (doc 06) is not wired; values are seeded/computed. Clearly labeled AI-generated. |
| D5 | Media | Media uses external (Pexels) image/video URLs as stand-ins; no Supabase Storage upload pipeline yet. | Storage buckets + signed uploads are a follow-up (P2). |
| D6 | Career milestones | Public profile "career milestones" are derived from athlete scores/records where a dedicated source was thin. | Cosmetic; revisit when real career data exists. |
| D7 | Demo credentials | All demo users share password `demo123456`; emails are `*@aceaix.demo`. | Demo only. See `tests/e2e/helpers.ts`. |
| D8 | Screenshot reveal | E2E screenshot helper scrolls the page to trigger scroll-reveal animations before capture. | Headless captures otherwise miss IntersectionObserver-gated content. |

---

## 3. Open questions for review

1. **AI integration scope.** Do we wire the real AI proxy (OpenAI/Azure) for the AI Coach and scoring
   now, or keep derived/seeded values for the demo? This drives Edge Function + key-management work.
2. **Media pipeline.** Confirm Supabase Storage + transcode/thumbnail flow and max file sizes before
   we replace the Pexels stand-ins.
3. **Payments.** Plans/pricing are display-only from CMS. Stripe checkout + subscription enforcement
   is not built — is it in scope for the first release?
4. **Medical consent UX.** Consent records exist and gate RLS, but the athlete-facing "grant/revoke
   access to scout/club" flow needs a confirmed design.
5. **Verification workflow.** Admin can approve/reject verification requests; the document-upload and
   notification side of that flow needs product sign-off.
6. **Org self-service.** "Register Your Club" links to generic signup; clubs currently have no
   dedicated onboarding/role. Confirm whether clubs are a first-class authenticated role.
7. **Messaging realtime.** Messages read/write to DB but do not yet use Supabase Realtime for live
   updates — acceptable for v1?
8. **Localization / RTL.** Content is English-only; the market is GCC. Is Arabic / RTL required for v1?
9. **Type generation in CI.** Approve adding `supabase gen types` to CI so DB types stay in sync (D1).

---

## 4. How to run

```bash
# from web/
npm install
npm run dev            # local dev server

# seed (service role key required)
SB_URL=https://uvjxrimfijxmnjnbrivg.supabase.co SB_SVC=<service_role_key> npm run seed

npm test               # unit tests (Vitest)
npm run test:e2e       # e2e + screenshots (Playwright)
```

Demo logins (password `demo123456`): `athlete@aceaix.demo` (Karim Al-Hassan, athlete),
`scout@aceaix.demo` (Sergio Mendes, scout), `admin@aceaix.demo` (Layla Ahmed, admin),
`medical@aceaix.demo` (medical partner).
