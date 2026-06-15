# 06 — Supabase & Integrations

How the platform connects to real data via Supabase, and how external services integrate. This is the
"make it real" doc — the prototype's data is mostly hardcoded; here we define the actual backend wiring.

---

## 1. Supabase project setup

- One project per environment (local / staging / prod) — see [02](./02-architecture.md) §5.
- Local dev via **Supabase CLI** (`supabase start`) running the full stack in Docker.
- Link the repo: `supabase link --project-ref <ref>`; push migrations with `supabase db push`.
- Generate types after every schema change: `supabase gen types typescript --linked > web/src/types/database.ts`.
- The prototype's `.env` points at a live project (`sjvgfqelzysaniacpruc.supabase.co`). **Treat it as
  disposable**: stand up fresh projects, rotate keys, and never commit real keys (commit `.env.example`).

Client (`lib/supabase.ts`) uses only the **public** URL + anon key. RLS makes the anon key safe to ship.

---

## 2. Authentication

| Method | Phase | Notes |
|--------|-------|-------|
| Email + password | P1 | Already in prototype |
| Email OTP | P1 | Supabase magic-link / OTP |
| SMS OTP | P1 | Supabase Auth Twilio provider |
| Password reset | P1 | `/auth/forgot-password` flow (add) |
| Social login | P2 | Optional |
| UAE Pass (OIDC) | P3 | Custom provider; returns Emirates ID, name, nationality, DOB |

**Profile provisioning:** create the `user_profiles` row (and role extension row) via a **DB trigger on
`auth.users`** or an `on-signup` Edge Function — not client-side (the prototype inserts from the client,
which is fragile). Store role in a **custom JWT claim** via an access-token hook so RLS policies and the
frontend can read `role` without an extra query.

**Sessions:** JWT; `supabase-js` handles refresh. `AuthContext` exposes `user`, `session`, `profile`,
`role`, `loading`.

---

## 3. Row-Level Security (operational)

RLS is defined in migrations (see [03](./03-data-model.md) §5). Operational rules:

- Enable RLS on **every** table (no exceptions). Default-deny; add explicit policies.
- Public browse data exposes only non-sensitive columns; keep sensitive fields in separate tables or
  behind views, because PostgREST returns whole rows.
- **Medical data is consent-gated and append-only** — the single most important RLS requirement.
  Reads require ownership OR a valid `medical_consents` row; there is no UPDATE/DELETE policy on
  `medical_records`/`audit_logs`.
- Test policies with the SQL editor impersonating roles, and add automated policy tests (pgTAP or a
  test harness that signs in as seeded users of each role and asserts allowed/denied access).

---

## 4. Storage

| Bucket | Visibility | Contents |
|--------|-----------|----------|
| `avatars` | public | profile/org images |
| `media-public` | public (signed for originals) | published highlights, thumbnails |
| `media-private` | private | raw uploads, unpublished clips |
| `medical-docs` | private | clinic documents, imaging — **signed URLs only** |
| `verification-docs` | private | licenses, ID docs for onboarding |

- Protected content (medical, verification, private media) is served via **short-lived signed URLs**;
  no public bucket access.
- Storage RLS policies mirror table access (e.g. only the owning athlete + consented parties can sign
  medical-doc URLs — enforce via an Edge Function that checks consent before issuing the URL).
- Uploads: resumable for large video (TUS / `@supabase/storage-js` resumable). Transcode post-upload.

---

## 5. Edge Functions (Deno)

The frontend never holds third-party secrets. Privileged logic lives in Edge Functions
(`supabase/functions/`). Planned functions:

| Function | Purpose | Phase |
|----------|---------|-------|
| `ai-chat` | Proxy to LLM; injects role/consent-checked context; **SSE streaming**; logs to `ai_chat_*` | P1 |
| `ai-search` | Conversational/semantic talent search (LLM + pgvector); guest-capable | P1 |
| `media-tag` | Post-transcode clip tagging; writes `media_clips` | P1→P2 |
| `media-transcode-webhook` | Receives transcoder callbacks; updates `transcode_status` | P1 |
| `medical-anchor` | Hash (SHA-256) + anchor verified medical record provenance | P1 |
| `medical-signed-url` | Consent-checked signed-URL issuance for medical docs | P1 |
| `on-signup` | Provision profile rows + defaults (if not using a trigger) | P1 |
| `notify` | Fan-out notifications → in-app row + email/SMS/push per prefs | P1→P2 |
| `stripe-webhook` | Subscription/payment lifecycle → `subscriptions`/`payments` | P2 |
| `create-demo-users` | Seed demo accounts (exists in prototype) | P1 (dev) |
| `retention-jobs` | Scheduled: purge guest AI sessions (30d), archive, cleanup | P1→P2 |

**AI proxy contract (`ai-chat`):**
- Input: `{ sessionId?, message, context }`. Function resolves the caller (JWT or guest session token),
  fetches only consent-permitted context, calls the LLM with a system prompt, **streams** tokens (SSE).
- Output stored in `ai_chat_messages`; structured outputs (scores/forecasts) in `ai_outputs` with
  `confidence_score` and provenance.
- Rate-limit per user/guest; on provider failure return a graceful "AI temporarily unavailable" signal
  so the UI shows a banner and falls back to manual workflows.

**Secrets:** set via `supabase secrets set` (OPENAI_API_KEY, STRIPE_*, TWILIO_*, RESEND_*, FCM_*,
provenance anchor creds). Never in the client.

---

## 6. Realtime

Use Supabase Realtime for live UX:
- `messages` / `conversations` → live chat.
- `notifications` → live notification badge (prototype currently uses a hardcoded `NOTIFS` array — replace).
- `contact_requests` / scout views → live dashboard updates.

Pattern: subscribe in a hook, and on change either update the cache or invalidate the relevant
TanStack Query key.

---

## 7. External integrations

| Service | Use | Integration point | Phase |
|---------|-----|--------------------|-------|
| **OpenAI / Azure AI** | Chat, matching, OCR, embeddings | `ai-*` Edge Functions; pgvector for embeddings | P1+ |
| **Stripe** | Subscriptions, licenses, commissions | Checkout/Customer Portal + `stripe-webhook`; `stripe_customer_id` on profile | P2 |
| **Twilio** | OTP + SMS alerts | Supabase Auth provider (OTP) + `notify` fn (alerts) | P1 |
| **Resend** | Transactional email + reports | `notify` fn; EN/AR (RTL) HTML templates | P1 |
| **FCM** | Web/mobile push | `user_devices` tokens + `notify` fn | P2 |
| **UAE Pass** | National identity | Custom OIDC provider in Supabase Auth; fallback = Emirates ID OCR | P3 |
| **Provenance anchoring** | Tamper-evidence | `medical-anchor` fn (SHA-256 + anchor ledger ref) | P1 |
| **Managed transcoding** | Video pipeline | Storage upload → transcoder → `media-transcode-webhook` | P1 |
| **Sentry** | Monitoring | Frontend + Edge Function instrumentation | P1 |

---

## 8. Provenance & medical verification flow (reference)

1. Athlete requests verification → row in `verification_requests` routed to partner inbox.
2. Partner verifies identity (Emirates ID / UAE Pass at P3) → uploads structured results to `medical-docs`.
3. Partner issues clearance (`medical_clearances`, effective dates).
4. `medical-anchor` hashes the record (SHA-256) and stores `hash` + `anchor_ref` on `medical_records`
   (append-only). Verification re-computes the hash and compares → mismatch flags tampering.
5. Badges surface on the profile **subject to athlete consent** (`medical_consents`).
6. Platform-booked tests create a `commissions` row (P2).
7. Every medical read is written to `medical_access_log`; athlete can view it.

---

## 9. Definition of "connected to real data"

A screen is done when:
- It reads/writes through `api/` + hooks against Supabase (no mock arrays / no `src/data/`).
- Loading uses `.shimmer` skeletons; errors are handled; empty states render.
- RLS is verified (correct rows for the role; denied for others), with a policy test.
- Any privileged action routes through an Edge Function, never exposing secrets.
- Realtime is wired where the data is live (messages, notifications).
