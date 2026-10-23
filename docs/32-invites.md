# 32 — Invites

> Athletes and coaches share a personal invite link from their profile. Whoever signs up through it is
> recorded as invited by them. Every 10 friends who count earn the inviter **1 token**. The circle is
> private; other people only see a tier badge ("Brought 10+ people to AceAiX").
>
> Source of truth: `supabase/migrations/20261023000001_referrals.sql`. Client: `mobile/app/invite.tsx`,
> `mobile/app/i/[code].tsx`, `mobile/app/+native-intent.ts`, `mobile/components/invite/InviteCard.tsx`,
> `mobile/hooks/useClaimPendingInvite.ts`, `mobile/lib/api.invites.ts`, `mobile/lib/invites/code.ts`,
> `mobile/i18n/locales/*/invites.ts`. Admin: `admin/src/pages/InvitesPage.tsx`.

---

## 1. Product decisions

| Question | Decision |
|---|---|
| Who can invite? | Athletes and coaches who are not suspended. Clubs, scouts, sponsors, guardians and admins have no link. |
| When does a friend count? | When their onboarding is complete. A friend under 18 also needs a **granted** guardian consent. |
| What is a token? | In-app points. No cash value; cannot be bought, sold or transferred. The copy never calls them money or rewards. |
| Minors | A minor can invite and earn tokens. Friends are only ever shown by first name. |
| Who sees the circle? | Only its owner. Other profiles show a tier badge at 5, 10, 25, 50, 100 (none between blocked people). |

## 2. Flow

```
Profile tab ─ "Invite your friends" card ─▶ /invite
     link https://aceaix.com/app/i/<CODE>  ·  code  ·  Share
                │
friend opens link ─▶ app installed?  yes → +native-intent → /i/<CODE>
                                     no  → website redirect page → store → (enter code by hand)
/i/<CODE>  "Layla invited you to AceAiX"  → code saved on the device (30 days) → Sign up
     after sign-up: useClaimPendingInvite → referral_claim(code)   (status: pending)
     onboarding completed (+ guardian consent if minor)  → qualified → inviter notified
     every 10 qualified → +1 token in token_ledger → inviter notified
```

A new account can also type a code on `/invite` during its first **14 days**.

## 3. Backend

Tables: `referral_codes` (one per user, 8 chars from `A–H J–N P–Z 2–9`), `referrals` (one row per
invited person: `pending | qualified | revoked`), `token_ledger` (append-only; reasons `referrals`, `admin`).
Clients cannot write any of them directly.

| RPC | Who | What |
|---|---|---|
| `referral_inviter(code)` | anon + signed in | First name, avatar, role of the code's owner (for the landing). |
| `referral_claim(code)` | signed in | Links me to the inviter. Hints: `referral_unknown_code`, `referral_own_code`, `referral_already_claimed`, `referral_too_late`, `rate_limited` (50/day per inviter). |
| `referral_my_circle()` | signed in | My code, counts, progress to next token, tokens, members (first names), who invited me, ledger. |
| `referral_badge(user)` | signed in | Tier or null. |
| `admin_referrals_overview()` | admin | Totals, 30-day chart, top inviters (with a fake-account flag), recent invites. |
| `admin_set_referral(id, revoke, reason)` | admin | Revoke (reason required) or restore. Audited. |

Triggers on `user_profiles` (onboarding, suspension, minor flag) and `guardian_consents` re-evaluate an
invite; `private.referral_sync_tokens` keeps the ledger equal to `floor(qualified / 10)`, so a revoked
invite takes a token back with a negative ledger row. `export_my_data()` includes invites and tokens.

## 4. Deploy notes

- The website must serve `aceaix.com/app/i/*`: the existing AASA / `assetlinks.json` already cover `/app`
  (iOS `applinks:aceaix.com`, Android `pathPrefix: /app`). Without the app, that page should show the
  code and link to the stores.
- Migration `20261023000001_referrals.sql` runs after the Sport Fit migrations. No data backfill.
- `supabase/seeds/admin-demo.sql` adds demo invites (Layla: 15, code `LAYLAPLY`; Marco: 6). LOCAL ONLY.

## 5. Tests

- `supabase/tests/functional.sql` — "invites" section (23 checks).
- `mobile/tests/e2e/pipelines.mjs` — "a personal invite link → a new friend → a token" (8 steps, over HTTP).
- `mobile/tests/unit/invites.test.ts` — code normalisation, links, progress.
