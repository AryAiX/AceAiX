# AceAiX — Engineering Documentation

> **AceAiX** is an AI-native athlete intelligence platform for the UAE / GCC sports market.
> It unifies three capabilities into one ecosystem: **verified medical intelligence** (tamper-evident
> records from licensed clinics), **AI performance & match analytics**, and a **professional sports
> network** with third-party endorsement.

This `docs/` folder is the build-time source of truth for engineering AceAiX from the ground up.
It distills the [Product Design Document](../AceAiX_Product_Design.docx.txt) into actionable
specifications and reconciles it with the existing **Bolt prototype** (the visual/UX reference).

## How these documents fit together

| # | Document | Purpose | Primary audience |
|---|----------|---------|------------------|
| — | [`README.md`](./README.md) | Index, conventions, glossary pointer | Everyone |
| 01 | [`01-product-requirements.md`](./01-product-requirements.md) | Roles, features, scope, what we build first | Product + Eng |
| 02 | [`02-architecture.md`](./02-architecture.md) | System architecture, stack, environments | Eng |
| 03 | [`03-data-model.md`](./03-data-model.md) | Canonical Postgres schema, RLS, migrations | Backend |
| 04 | [`04-design-system.md`](./04-design-system.md) | "Floodlight" design system extracted from Bolt | Frontend + Design |
| 05 | [`05-frontend-architecture.md`](./05-frontend-architecture.md) | Routing, state, folder layout, data fetching | Frontend |
| 06 | [`06-supabase-integration.md`](./06-supabase-integration.md) | Auth, RLS, Storage, Edge Functions, AI proxy | Full-stack |
| 07 | [`07-prototype-audit.md`](./07-prototype-audit.md) | Bolt prototype: real vs mock, reuse / rebuild | Eng |
| 08 | [`08-build-roadmap.md`](./08-build-roadmap.md) | Phased, milestone-based implementation plan | Eng leads |
| 09 | [`09-build-status-and-decisions.md`](./09-build-status-and-decisions.md) | Current build status, autonomous decisions, open questions | Everyone |
| 10 | [`10-mobile-app.md`](./10-mobile-app.md) | The rebuilt mobile app: routing, the single routing gate, providers, data layer, design system, five-tab IA, route table | Mobile + Eng |
| 11 | [`11-talent-score.md`](./11-talent-score.md) | The Talent Score: pillars, weights, tiers, percentile, recomputation, and what the number is **not** | Eng + Product |
| 12 | [`12-youth-safety.md`](./12-youth-safety.md) | The youth-safety model as implemented, rule by rule, with the database object enforcing each | Everyone |
| 13 | [`13-store-submission.md`](./13-store-submission.md) | App Store / Play submission checklist, compliance items, and the listing copy in [`store/`](./store/) | Eng leads + Product |
| 14 | [`14-local-development.md`](./14-local-development.md) | Running the whole stack locally without Docker; the four test suites; what the harness deliberately is not | Eng |
| 15 | [`15-known-gaps.md`](./15-known-gaps.md) | One prioritised list of everything still open — before submission, before scale, accepted for now — each with an owner | Everyone |
| 16 | [`16-internationalisation.md`](./16-internationalisation.md) | The seven languages: the first-launch gate, catalogue layout, plurals via `Intl.PluralRules`, the translator bridge, RTL and the restart, the English-only legal documents, and the strings SQL still composes in English | Mobile + Product |
| 17 | [`17-engagement.md`](./17-engagement.md) | Streaks, the nineteen achievements and their exact conditions, how a celebration is queued and shown once, the animation and reduce-motion conventions, and the ethical line — no coins, no urgency, no loss-framing | Mobile + Product |
| 18 | [`18-preview-build.md`](./18-preview-build.md) | The single-file preview: what it is and is not, how the recording and replay layer work, and the icon-barrel change that took 1.8 MB out of every build | Mobile |
| 19 | [`19-discovery-features.md`](./19-discovery-features.md) | Fandom, weekly challenges, the profile-views digest, the score simulator and the player card — and why none of them moved the Talent Score | Mobile + Backend |
| 20 | [`20-colour-and-motion.md`](./20-colour-and-motion.md) | The mobile palette, the tier ramp, the motion kit — and the two web-only rendering traps that shipped once each | Mobile |

**01–09 describe the original web-first plan** and the React SPA in `web/`, which is now the
marketing and admin surface. **10–20 describe the product as it stands** after the September 2026
mobile rebuild: `mobile/` is the 1.0 app, and the Supabase schema it shares with `web/` was extended
by migrations `20260825000000`, `20260904000001`–`…0011` and `20260907000001`–`…0008`. Where 01–09 and 10–20 disagree about
the mobile client, 10–20 win; for schema and RLS baseline, 03 and 06 still apply.

Two places where 01–09 are now specifically out of date on language: `01` says "Launch languages:
English (default); Arabic + full RTL in Phase 2" and `08` plans `react-i18next` — the app ships
seven languages today, with no i18n library. See 16.

## Reading order

- **New engineer, first hour?** Read [10](./10-mobile-app.md) → [14](./14-local-development.md),
  then [12](./12-youth-safety.md) before touching anything that reads a profile or opens a
  conversation, and [15](./15-known-gaps.md) so you know what is already known to be missing.
- **Working on the score?** [11](./11-talent-score.md), then
  `supabase/migrations/20260904000001_talent_score.sql`.
- **Adding or changing any user-visible string?** [16](./16-internationalisation.md) §13 first —
  strings are born in English and typechecking fails until the other six catalogues have them.
- **Touching streaks, achievements or an animation?** [17](./17-engagement.md), and the header of
  `supabase/migrations/20260904000011_streaks_and_achievements.sql`.
- **Adding a colour, a gradient or an animation?** [20](./20-colour-and-motion.md) — including
  the two things that render correctly on a phone and wrongly in the preview build.
- **Touching challenges, fandom or the score simulator?** [19](./19-discovery-features.md) — and
  note that none of them may move the Talent Score's weights.
- **Starting fresh on the product itself?** Read 01 → 02 → 03 → 07 → 08.
- **Building a web screen?** Read 04 → 05, then the relevant section of 01.
- **Wiring data?** Read 03 → 06.

## Source inputs

1. **Product Design Document** (`../AceAiX_Product_Design.docx.txt`) — the authoritative product spec
   (roles, sitemap, flows, AI capabilities, data model, NFRs, phased roadmap). When this folder and
   the design doc disagree, **the design doc wins for product intent**; these docs win for
   engineering decisions made to realize that intent.
2. **Bolt prototype** (`project-bolt-sb1-ytmvcpcl.zip`, extracted) — a React + Vite + Tailwind
   single-page app. It is a **demo / styling reference**: the visual design is production-worthy,
   but nearly all data is hardcoded mock data. We keep the design system and clean up the code into
   a Supabase-backed application. See [07](./07-prototype-audit.md).

## Core product principles (non-negotiable)

1. **Consent-first.** Medical and contact data are private by default; access is explicit and revocable.
2. **Verified, not self-reported.** Medical records come only from licensed partner clinics and are
   tamper-evident (hashed + anchored).
3. **AI is advisory.** Scores, forecasts, and risk summaries are labeled AI-generated; humans decide.
4. **RBAC at the database.** Row-Level Security (RLS) enforces role- and consent-based access in Postgres.
5. **Auditable.** Every sensitive mutation is logged; medical/career data is soft-deleted, never destroyed.

## Tech stack at a glance

React 18 + TypeScript + Vite 5 + Tailwind CSS 3 (SPA) · Supabase (Postgres 15, Auth, Storage,
Edge Functions, Realtime) · OpenAI/Azure AI via Edge Function proxy · Stripe · Twilio · Resend · FCM.

See [02-architecture.md](./02-architecture.md) for the full rationale.

## Document conventions

- **MoSCoW** tags (`MUST` / `SHOULD` / `COULD` / `WON'T`) mark requirement priority for the MVP.
- **Phase tags** (`P1`–`P4`) map features to the delivery roadmap (see [08](./08-build-roadmap.md)).
- Code identifiers, table names, and routes use `monospace`.
- "Prototype" = the Bolt demo. "Platform" = what we build.
