# AceAiX

AceAiX is a sports talent-discovery and social network for athletes aged 13–25, plus the
parents and coaches around them. An athlete builds a sporting profile, receives a **Talent
Score** (0–100, computed in the database from evidence on the profile), posts clips, follows
people and is discovered by verified coaches and clubs who post trials, scholarships and camps.

Operated by AryAiX, Dubai, UAE.

## The repository

| Directory | What it is |
|-----------|------------|
| `mobile/` | The 1.0 product: a React Native / Expo Router app (iOS, Android, web export). Rebuilt from scratch; this is where new work happens. |
| `web/`    | The earlier React + Vite SPA — public marketing pages and the admin/moderation portal. Still the only place moderation queues and verification decisions are handled. |
| `supabase/` | The single backend both clients share: Postgres schema, RLS, RPCs and triggers as ordered migrations, plus edge functions, seeds and a SQL test suite. |
| `tools/local-supabase/` | A Docker-free local backend — PostgreSQL + PostgREST + a small auth/storage shim — so the whole stack runs on a laptop or in CI. |
| `docs/` | Engineering documentation. Start at [`docs/README.md`](docs/README.md). |

There is no application server. Every rule the product depends on — who may message whom, who
appears in search, how the Talent Score is computed — lives in Postgres, as RLS policies,
triggers and `SECURITY DEFINER` functions. Clients are thin.

## Running it

No Docker required. From a clean checkout:

```bash
./tools/local-supabase/start.sh   # Postgres + every migration + demo data + API, prints URL and key
cd mobile && npm install
cp .env.example .env              # paste in the URL and anon key start.sh printed
npm run dev                       # Expo: press w for web, or scan the QR with Expo Go
```

Every demo account uses the password `AceAiX-Demo-2026`; sign in as `layla.demo@aceaix.com`
(athlete) or `marco.demo@aceaix.com` (verified coach). Full setup, tests and the limits of the
local harness: [`docs/14-local-development.md`](docs/14-local-development.md).

## Documentation

| | |
|---|---|
| New to the codebase | [`docs/README.md`](docs/README.md) → [`10-mobile-app.md`](docs/10-mobile-app.md) → [`14-local-development.md`](docs/14-local-development.md) |
| The score | [`docs/11-talent-score.md`](docs/11-talent-score.md) |
| Anything touching a minor | [`docs/12-youth-safety.md`](docs/12-youth-safety.md) — read this before changing messaging, discovery or profile reads |
| Schema and RLS | [`docs/03-data-model.md`](docs/03-data-model.md) |
| Shipping a build | [`docs/13-store-submission.md`](docs/13-store-submission.md) |
| What is still missing | [`docs/15-known-gaps.md`](docs/15-known-gaps.md) — one prioritised list, with owners |

## Where we stand on young users

A large share of accounts belong to minors, and that shapes every design decision in this
codebase rather than sitting beside them. Nobody under 13 can hold an account — the database
refuses the date of birth outright. A 13–17 account is invisible in discovery and reachable by
no adult at all until a parent or guardian has confirmed consent by e-mail, and consent is
scoped (discovery, messaging, media are three separate switches) and revocable at any time by
either the young person or the guardian. Only a **verified** adult professional can open a
conversation with a minor, and only within a granted consent. A minor's exact date of birth,
precise age and precise location are never exposed to anyone — only a coarse age band. All of
this is enforced by database constraints, triggers and column-level privileges, not by the UI,
so a modified or hostile client gains nothing. If you are about to write code that reads a
profile, ranks a search result, or opens a conversation, assume the person on the other side is
fourteen and read [`docs/12-youth-safety.md`](docs/12-youth-safety.md) first.
