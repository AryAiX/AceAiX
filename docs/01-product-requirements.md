# 01 — Product Requirements

This document is the engineering-facing requirements specification, distilled from the
[Product Design Document](../AceAiX_Product_Design.docx.txt). It defines **who** uses AceAiX,
**what** they can do, and **what we build first**.

---

## 1. Vision & positioning

AceAiX turns athletic performance and medical data into a structured, verifiable, and forecastable
**athlete portfolio**. It competes on *intelligence* rather than subjective observation. The athlete
profile is the central entity; media, performance, medical, network, and discovery records all link
to it.

**Launch market:** UAE / GCC. **Launch sport:** Football (primary), with a multi-sport data model.
**Launch languages:** English (default); Arabic + full RTL in Phase 2.

---

## 2. User roles

Three tiers. Each role maps to a portal (zone) in the app. The MVP enables a subset (see §5).

### Tier 1 — Guest (no account)
Discovery features available without registration to lower the barrier and drive conversion.
Contacting an athlete or saving a shortlist **triggers registration**.

- AI Talent Discovery (conversational search)
- Browse athlete profiles, clubs/academies, highlight reels
- Featured talent, leaderboards, success stories, resources
- Guest sessions are **session-scoped**; search context is only persisted if the user registers.

### Tier 2 — Authenticated platform users

| Role | One-line description | MVP? |
|------|----------------------|------|
| **Athlete** | Primary end-user; builds verified portfolio. Sub-role: **Minor Athlete** (<18, guardian-linked). | ✅ P1 |
| **Scout / Recruiter** | Discovers, shortlists, and contacts athletes (tiered contact limits). | ✅ P1 |
| **Medical Partner** | Licensed clinic; uploads verified records & clearances (manual in MVP). | ✅ P1 (manual) |
| **Club / Team** | Multi-seat license; recruiter capabilities + roster/prospect tracking. | P2 |
| **Coach** | Provides attributable endorsements; squad management. | P2 |
| **Guardian / Agent** | Manages a minor's or represented athlete's profile & comms. | P3 |
| **Federation** | National development DB, pipeline analytics, programs. | P3 |

### Tier 3 — Administration

| Role | Description | MVP? |
|------|-------------|------|
| **AceAiX Super Admin** | Full platform access; user mgmt, onboarding/verification, licensing, AI, content, finance, security, config. | ✅ P1 (minimal) |
| **Club / Federation Admin** | Local admin for a licensed org's seats, license, profile, billing. | P3 |

---

## 3. Feature catalogue by role

Priorities: `MUST`/`SHOULD`/`COULD` reflect MVP (Phase 1). Phase tags map to [08](./08-build-roadmap.md).

### 3.1 Athlete
| Area | Feature | Priority | Phase |
|------|---------|----------|-------|
| Dashboard | Performance overview (completeness, score, scout views, opportunities) | MUST | P1 |
| Dashboard | Visibility Score (AI credibility/discoverability signal) | SHOULD | P1 |
| Profile | Athlete portfolio (bio, sport, positions, attributes, history, achievements, club) | MUST | P1 |
| Profile | Verified badges (medical-clearance, performance, identity) | MUST | P1 |
| Media | Video highlight upload | MUST | P1 |
| Media | AI clip analysis / auto-tagging & reel suggestion | SHOULD | P1→P2 |
| Performance | Manual match & stat records | MUST | P1 |
| Performance | AI performance insights & percentiles | SHOULD | P1→P2 |
| Medical | Verified medical records (clinic-uploaded, tamper-evident) | MUST | P1 |
| Medical | Injury history & clearance status | MUST | P1 |
| Medical | AI risk summary (plain-language, athlete-facing) | COULD | P2 |
| Network | Endorsements (received/displayed) | MUST | P1 |
| Network | Connections | SHOULD | P2 |
| Career | Trajectory forecast | COULD | P3 |
| Career | Comparable players & percentiles | COULD | P3 |
| Discovery | Scout interest & opportunities tracking | SHOULD | P1 |
| AI Agent | Career & profile coach (conversational) | SHOULD | P1→P2 |
| Messaging | Secure messaging (consent + tier gated) | MUST | P1 |
| Account | Subscription & billing (Free/Pro/Elite) | COULD | P2 |
| Settings | Granular privacy controls (medical, contact, performance visibility) | MUST | P1 |

### 3.2 Scout / Recruiter
| Area | Feature | Priority | Phase |
|------|---------|----------|-------|
| Dashboard | Recruiter overview (saved searches, shortlists, recent activity, AI recs) | MUST | P1 |
| Discovery | Advanced talent search (sport, position, age, attributes, level, location, verified thresholds) | MUST | P1 |
| Discovery | AI talent recommendations | SHOULD | P1→P2 |
| Evaluation | Full profile access (medical only with consent) | MUST | P1 |
| Evaluation | Comparison tool (side-by-side) | SHOULD | P1 |
| Shortlists | Watchlists with notes & tags | MUST | P1 |
| Outreach | Contact athletes (monthly limits by tier) | MUST | P1 |
| Career Intel | Trajectory & (consented) risk signals | COULD | P3 |
| Messaging | Secure messaging | MUST | P1 |
| Profile | Recruiter profile (credentials, affiliation, verification) | MUST | P1 |

### 3.3 Medical Partner
| Feature | Priority | Phase |
|---------|----------|-------|
| Verification request inbox | MUST | P1 |
| Assessment & test upload (manual) | MUST | P1 |
| Medical clearance issuance (status + effective dates) | MUST | P1 |
| Injury record management | SHOULD | P1 |
| Provenance & tamper-evidence (hash + anchor) | MUST | P1 |
| Bookings & commission tracking | COULD | P2 |
| Verified-partner badge | SHOULD | P1 |
| Analytics (volumes, throughput, revenue) | COULD | P2 |

### 3.4 Club / Team (P2) · Coach (P2) · Federation (P3) · Guardian/Agent (P3)
See design doc §2.2.4–2.2.7. Build per phase; data model in [03](./03-data-model.md) already
accommodates these (organizations, organization_staff, coach/federation profiles, guardian_links).

### 3.5 Super Admin
| Feature | Priority | Phase |
|---------|----------|-------|
| User management (CRUD, suspend, deactivate) | MUST | P1 |
| Verification & onboarding (clubs, federations, partners) | MUST | P1 |
| Subscription & licensing config | SHOULD | P1 |
| AI management (monitor, flagged outputs) | COULD | P3 |
| Content management (stories, education, leaderboards) | SHOULD | P2 |
| Platform analytics | SHOULD | P1→P2 |
| Billing & revenue | COULD | P2 |
| Security & audit logs | MUST | P1 |
| System configuration (feature flags, integrations) | SHOULD | P2 |

---

## 4. Key user flows

Implement these end-to-end. Steps below are condensed; see design doc §4 and §12 for full tables.

1. **Guest → Account (conversion).** Guest uses AI discovery → opens profile → taps *Contact* /
   *Save shortlist* → registration prompt → OTP/UAE Pass → role select → role onboarding. The trigger
   to register is the contact/shortlist action.
2. **Athlete profile build & medical verification.** Register → portfolio wizard → upload highlights
   (AI tags) → enter match records → request verification from partner clinic → clinic uploads results
   + issues clearance (hashed/anchored) → badges appear → request endorsements → review trajectory.
3. **Scout: search → contact.** Define target (search or AI) → ranked candidates → review profiles +
   consented medical → add to watchlist → comparison tool → send contact request (tier-limited) →
   athlete/guardian responds (consent governs medical visibility).
4. **Medical partner: verified record upload.** Athlete requests → partner verifies identity → enters
   structured results → issues clearance with effective date → system hashes + anchors → athlete reviews →
   commission recorded for platform-booked tests.
5. **Highlight upload & AI analysis.** Upload footage → transcode → AI tags key actions → suggests reel →
   athlete edits/publishes → discoverable to scouts.
6. **Onboarding flows.** Athlete direct sign-up; medical partner onboarding (license upload + admin
   approval); recruiter/club onboarding & verification; super-admin verification approval queue.

---

## 5. MVP scope (Phase 1) — what we build first

**Goal:** a functioning athlete-discovery platform demonstrating the core value prop — verified
profiles, video highlights, discovery, and manual medical verification. **Timeline:** ~6 months.

**In scope (P1):**
- Public zone: landing, AI talent discovery (guest), athlete & club browse, public highlights, success stories.
- Auth: athlete + recruiter onboarding via email/mobile OTP; JWT sessions; password reset.
- Athlete portal: profile/portfolio, highlight upload (+ AI tagging), manual match entry, endorsements,
  visibility score, messaging, privacy controls.
- Scout portal: advanced search, AI recommendations, profile access, watchlists, comparison,
  consented outreach (tiered limits).
- Medical verification (manual): partner uploads records + clearances; provenance anchoring;
  consent-gated visibility.
- Admin (minimal): account CRUD, partner/recruiter onboarding, subscription/license config, audit logs.
- Foundation: canonical schema (core tables) with **RLS**, Supabase Auth + Storage, Edge Functions
  for AI chat / tagging / search, CI/CD.

**Explicitly out of MVP (deferred):**
- AI live match analytics with cameras (computer vision) — P3.
- Advanced prediction models (need data first) — P3/P4.
- Coach seats, Federation, Club multi-seat at scale — P2/P3.
- Full payments automation, full Arabic/RTL, native app-store builds, rich push — P2+.
- UAE Pass auth — P3 (use email/mobile OTP for MVP; design the auth layer to add it later).

---

## 6. AI capability matrix (summary)

The AI agent is the intelligence layer across all surfaces. It runs in **guest mode** (no auth) and
**authenticated mode** (role- and consent-aware). All AI is **advisory** and **labeled**.

| Capability | Available to | Account? | Phase |
|------------|--------------|----------|-------|
| Conversational talent discovery | Guest, Athlete, Scout, Club | No | P1 |
| Athlete profile intelligence (field/benchmark tips) | Athlete, Guardian | Yes | P1 |
| Video highlight analysis (tag, segment, reel draft) | Athlete, Guardian | Yes (upload) | P1→P2 |
| AI performance insights (trends, percentiles) | Athlete, Scout, Club | Yes | P2 |
| Injury-risk scoring (advisory) | Athlete (summary), Scout/Club (consented) | Yes | P2→P3 |
| Career trajectory forecast | Athlete, Scout, Club | Yes | P3 |
| Comparable-player matching | Athlete, Scout, Club | Yes | P3 |
| Talent recommendations | Scout, Club, Federation | Yes | P2 |
| Endorsement/credibility scoring | All | Yes | P2 |
| Medical record interpretation (plain language) | Athlete, Guardian | Yes | P2 |
| Outreach drafting | Scout, Club | Yes | P2 |
| Multilingual support (AR/EN, auto-detect) | All | No | P2 |
| AI match analytics (CV) | Athlete, Club, Federation | Yes | P3 |

**Hard rules:** AI requests route through Edge Functions only (frontend never calls AI APIs directly);
context is role/consent-checked before forwarding; responses stream (SSE); outputs are stored with
provenance in `ai_outputs`; zero-retention DPA with providers; graceful degradation if AI is down.

---

## 7. Compliance & privacy requirements (must enforce)

- Athlete-controlled granular privacy for medical data, contact details, performance records.
- Medical clearance/injury data visible to scouts/clubs **only with explicit, revocable consent**.
- Minors managed via Guardian; direct adult→minor contact is mediated/safeguarded.
- Verified medical records are clinic-uploaded only, never self-reported, with provenance metadata.
- Athletes can view an **access log** (who viewed records) and an **AI interaction log** for their data.
- UAE data-residency for categories that require it; encryption in transit (TLS 1.3) and at rest (AES-256).
- RLS at the DB level; immutable `audit_logs`; soft-delete for athlete/medical/clearance data.

See [03-data-model.md](./03-data-model.md) §RLS and [06-supabase-integration.md](./06-supabase-integration.md).

---

## 8. Non-functional requirements (targets)

| Metric | Target |
|--------|--------|
| Initial page load (LCP) | < 2 s |
| SPA navigation | < 300 ms |
| API response (Supabase REST, p95) | < 200 ms |
| Search results | < 500 ms |
| AI chat first token | < 1 s |
| AI chat full response (p95) | < 8 s |
| Video highlight playback start | < 3 s |
| Uptime | 99.9% (RTO < 4 h, RPO < 1 h) |
| Accessibility | WCAG-aligned: keyboard nav, 4.5:1 contrast, ARIA, 44px touch targets, `prefers-reduced-motion` |
| Scale (Y1 / Y3) | 20k / 250k users; 1k / 10k concurrent; 30 / 300 GB DB |

Tactics: per-route code splitting, adaptive-bitrate streaming, lazy media, indexed FK/search columns,
materialized views for dashboard aggregates, CDN caching, streamed AI responses, per-user AI rate limits.
