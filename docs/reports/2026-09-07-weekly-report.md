# AceAiX Weekly Report

**Week Ending:** September 7, 2026  
**Focus:** Cross-platform reliability (messaging, feed, watchlists, auth), performance sync (KI-029), CI quality gates, and store/web release of **1.0.2**

## Executive Summary

This week closed the mobile UI-driven functional audit (**PR #7**), then shipped a large cross-platform reliability and performance-sync package (**PR #9**) that replaced false-success / false-empty / no-op UI with real persistence or honest errors across web and mobile. Authenticated Chess.com/Lichess and API-Football sync landed as Edge Functions (KI-029), with client fallbacks when provider secrets are missing.

On distribution, **1.0.2** was built from latest `main` (`be94743`) and sent to both mobile stores, and production web was redeployed to the **Aryaix** Vercel project so **https://aceaix.com** serves the new build.

---

## Releases

| Channel | Package / host | Version | Outcome |
| --- | --- | --- | --- |
| Apple App Store | `com.aryaix.aceaix.athlete` | **1.0.2** (iOS build **18**) | Submitted — **Waiting for Review** |
| Google Play | `com.aryaix.aceaix.athlete` | **1.0.2** (versionCode **7**) | Production release prepared; **submitted for review** via Publishing overview |
| Web (production) | https://aceaix.com / https://www.aceaix.com / https://aceaix.vercel.app | Latest `main` (`be94743`) | Redeployed under **Aryaix** Vercel (`aceaix`); smoke-tested (home, athletes, athlete login, dashboard) |

Prior live store build remains **1.0.1** until 1.0.2 clears review. Web previously lagged (July deploy); production now matches the release commit used for the mobile builds.

---

## Stats (this week)

### Merged delivery

| Item | Detail |
| --- | --- |
| PR #7 | Expand mobile UI-driven functional coverage — merged 1 Sep |
| PR #8 | Weekly report (31 Aug) + distributed version note — merged |
| PR #9 | Fix cross-platform flows and performance sync — merged 7 Sep (`be94743`) |
| Diff (PR #9) | ~107 files, ~+5.5k / −0.9k lines (web, mobile, Supabase, CI) |

### Bugs / reliability themes fixed (PR #9 + carry-through from PR #7)

| Type | Where | Notes |
| --- | --- | --- |
| False success / local-only “save” | Web + mobile | Opportunities, follows, and related flows persist or surface real failure |
| False empty / silent no-ops | Web + mobile | Loading, messaging, feed, watchlist, notifications, forms show honest empty vs error |
| Interaction feedback on Expo web | Mobile | Remaining Alert/confirm paths and post-action UI (PR #7 + follow-ups in #9) |
| Race-safe messaging & watchlists | Web + mobile | Conversation/watchlist state hardened; watchlist name uniqueness migration |
| Nested comments & feed pagination | Web + mobile | Stable comment state; feed pagination without fabricated pages |
| Auth / recovery resilience | Web + mobile | Auth state, forgot/reset password surfaces, deep-link mapping |
| Performance source integrity | Supabase + clients | External sync cannot be spoofed as verified; manual football entry remains a fallback |
| Recruiter search / watchlist UX | Web | Search and watchlist pages aligned with real API behavior |

### Improvements

| Type | Notes |
| --- | --- |
| KI-029 performance sync | `sync-chess` and `sync-football` Edge Functions; shared auth/HTTP helpers; cooldown + transactional import |
| Provider UX | Mobile/web show provider-specific failures; Chess needs no secret; football needs `API_FOOTBALL_KEY` in production |
| CI quality gates | GitHub Actions workflow for web and mobile typecheck/tests/lint gates |
| Deep links | Shared mobile deep-link mappings with unit coverage |
| Support / public chrome | Web support page and public header refinements |

### Verification (PR #9)

- Web: typecheck, unit tests, production build, lint (0 errors)
- Mobile: typecheck, unit tests, web export, lint (0 errors)
- Focused web/mobile E2E for messaging, comments, feed, recruiter search, deep links
- Adversarial review loop completed with SHIP verdict
- Gap: new Supabase migrations reviewed statically; local Docker/Supabase apply was unavailable in that environment

---

## Details: fixed bugs and reliability

### Mobile (Expo)

- Closed Expo-web functional gaps from the PR #7 audit (profile save navigation, like/save freshness, Edit Stats wipe, impossible dates, account delete, hydration races, report/block, notification prefs, signup back-stack, language/about/endorse).
- PR #9 continued interaction feedback and reliability across feed, media, messages, notifications, events, career, medical, and opportunities.
- Added helpers for comment/conversation state, edge-function errors, opportunity filters, and deep-link routing with unit tests.

### Web SPA

- Messaging, feed center, watchlists, notifications, auth recovery (forgot/reset), recruiter search/dashboard, and athlete performance/media/network paths hardened against races and misleading UI.
- Public athletes browse and authenticated portals smoke-clean on production after redeploy.
- Content pagination and conversation/watchlist/auth state modules covered by new unit tests; sync-recovery E2E added.

### Backend / sync

- `sync-chess` / `sync-football` with JWT auth, athlete-scoped identity, cooldown, and transactional writes.
- Migration protecting external performance sources (clients cannot mark self-reported stats as externally verified).
- Migration deduplicating watchlist names and enforcing uniqueness.

---

## Details: releases

### iOS 1.0.2

- EAS production build **1.0.2 (18)** from `main`.
- Attached to App Store version **1.0.2** and submitted via App Store Connect review submissions API.
- Status at week end: **Waiting for Review**.

### Android 1.0.2

- EAS production AAB **1.0.2 (versionCode 7)**; artifact retained locally for Play upload (`aceaix-1.0.2-vc7.aab`).
- EAS automated Play submit still blocked without a Google service-account key on the Expo project; upload completed through Play Console Production draft.
- Publishing overview: production change **submitted for review**.

### Web

- Production project: Aryaix team `aceaix` (`prj_fZQsv1yDEynQCaSqli459d8tpN4i`), domains `aceaix.com` / `www.aceaix.com` / `aceaix.vercel.app`.
- Deployed latest `main` (file deploy + production aliases) after correcting the Vercel target away from a personal-account interim project.
- `VERCEL_TOKEN` for Aryaix stored in local `.env.local` (gitignored) for future deploys; `vcp_` token works via API (CLI whoami is unsupported for that token type).

---

## Follow-ups

1. Confirm iOS **1.0.2** and Android **1.0.2** clear store review and go live; then update distributed-version docs.
2. Apply pending Supabase migrations in production and deploy `sync-chess` / `sync-football` with `API_FOOTBALL_KEY` (and optional `CHESS_API_USER_AGENT`) per `docs/qa/KI-029-performance-sync.md`.
3. Attach a Google Play service-account JSON to EAS if fully automated Android submits are desired next cycle.
4. Optionally wire the GitHub repo to the Aryaix Vercel project for push-to-prod (current production deploy was CLI/API file-based).

---

## References

- PR #7 — Expand mobile UI-driven functional coverage  
- PR #9 — Fix cross-platform flows and performance sync (`be94743`)  
- `docs/qa/KI-029-performance-sync.md`  
- Prior report: `docs/reports/2026-08-31-weekly-report.md`
