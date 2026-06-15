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

## Reading order

- **Starting fresh?** Read 01 → 02 → 03 → 07 → 08.
- **Building a screen?** Read 04 → 05, then the relevant section of 01.
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
