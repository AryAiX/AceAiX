# 03 — Data Model & Schema Design

The canonical data model and the single source of truth for the AceAiX database. This supersedes the
prototype's reduced schema (see §6 gap analysis).

---

## 1. Design principles

1. **Single identity anchor.** `auth.users` (Supabase) is the identity; shared profile in
   `user_profiles` (1:1, PK = `auth.users.id`). Role-specific data lives in **extension tables**
   joined via `user_id`.
2. **Role extension tables:** `athlete_profiles`, `scout_profiles`, `coach_profiles`,
   `medical_partner_profiles`, `federation_profiles`, `org_admin_profiles`.
3. **Organization is first-class.** `organizations` (clubs/federations/academies); seats via
   `organization_staff`.
4. **Immutable audit log.** Every sensitive mutation logged. Medical/clearance data is **soft-deleted**
   (`is_deleted` + `deleted_at`), never hard-deleted.
5. **Verified records carry provenance** (`hash`, `anchor_ref`, issuing partner) and are **append-only**
   — edits create new versioned records, never in-place updates.
6. **UUID PKs throughout.** `created_at` / `updated_at` on every table (trigger-managed).
7. **Hybrid structure.** JSONB for variable/evolving data (stats, attributes, AI output); normalized
   columns for anything queried/filtered/ranked.

---

## 2. Enums

```sql
CREATE TYPE user_role AS ENUM
  ('athlete','scout','club','coach','medical_partner','federation','guardian','org_admin','admin','guest');
CREATE TYPE verification_status AS ENUM ('pending','approved','rejected','expired','more_info');
CREATE TYPE subscription_tier   AS ENUM ('free','pro','elite','enterprise');
CREATE TYPE media_type_enum     AS ENUM ('video','image','highlight_reel','document');
CREATE TYPE connection_status   AS ENUM ('pending','accepted','blocked');
CREATE TYPE clearance_status    AS ENUM ('cleared','restricted','not_cleared','pending');
CREATE TYPE org_type            AS ENUM ('club','federation','academy');
CREATE TYPE seat_role           AS ENUM ('scout','coach','medical','admin');
CREATE TYPE contact_status      AS ENUM ('sent','accepted','declined','expired');
CREATE TYPE consent_status      AS ENUM ('granted','revoked','pending');
CREATE TYPE record_source       AS ENUM ('self','verified','cv');
CREATE TYPE ai_output_type      AS ENUM ('score','forecast','risk','match','insight');
```

> The prototype defines a subset (`user_role` without `coach/guardian/org_admin`, no
> `org_type`/`seat_role`/etc.). Extend the enums in a new migration (Postgres `ALTER TYPE ... ADD VALUE`).

---

## 3. Canonical entity list

Grouped by domain. **Phase** indicates when the table is first needed; create core (P1) tables in the
foundation migration and add the rest per phase. Tables marked **[proto]** already exist in the
prototype in a reduced form (reconcile, don't duplicate).

### Identity & profiles
| Table | Key columns | Phase |
|-------|-------------|-------|
| `user_profiles` **[proto]** | `id` (=auth.uid), `role`, `full_name`, `email`, `phone`, `avatar_url`, `bio`, `city`, `country`, `date_of_birth`, `gender`, `emirates_id` (encrypted), `locale`, `is_verified`, `subscription_tier`, `notification_preferences` JSONB, `stripe_customer_id` | P1 |
| `athlete_profiles` **[proto]** | `user_id`, `sport`, `positions` JSONB, `position_primary`, `position_secondary`, `height_cm`, `weight_kg`, `birth_date`, `nationality`, `dominant_foot`, `current_club_id`, `level`, `bio`, `is_open_to_offers`, `visibility_score`, `profile_completeness`, `highlighted_stats` JSONB | P1 |
| `athlete_attributes` | `athlete_id`, `attribute_key`, `value`, `recorded_at`, `source` (self/verified) | P1 |
| `guardian_links` | `athlete_id`, `guardian_user_id`, `relationship`, `consent_status`, `is_guardian` | P3 |
| `scout_profiles` | `user_id`, `organization_id` (nullable), `credentials`, `verification_status`, `contact_quota_used`, `contact_quota_limit` | P1 |
| `coach_profiles` | `user_id`, `credentials`, `affiliations` JSONB, `verification_status` | P2 |
| `medical_partner_profiles` | `user_id`, `organization_id` (nullable), `license_number`, `accreditation_status`, `commission_rate`, `verification_status` | P1 |
| `federation_profiles` | `user_id`, `organization_id`, `jurisdiction`, `sport` | P3 |
| `org_admin_profiles` | `user_id`, `organization_id` | P3 |

### Organizations
| Table | Key columns | Phase |
|-------|-------------|-------|
| `organizations` **[proto]** | `name`, `type` (org_type), `logo_url`, `description`, `country`, `city`, `website`, `license_tier`, `verification_status`, `branding` JSONB, `founded_year` | P1 |
| `organization_staff` | `organization_id`, `user_id`, `seat_role`, `is_active`, `joined_at` | P2 |

### Media & performance
| Table | Key columns | Phase |
|-------|-------------|-------|
| `athlete_media` **[proto]** | `athlete_id`, `title`, `description`, `media_type`, `storage_url`/`file_url`, `thumbnail_url`, `transcode_status`, `duration_seconds`, `is_featured`, `is_public`, `views_count`, `ai_tags` JSONB | P1 |
| `media_clips` | `media_id`, `start_ms`, `end_ms`, `label`, `ai_tags` JSONB, `is_highlight` | P2 |
| `match_records` **[proto]** | `athlete_id`, `match_date`, `competition`, `opponent`, `result`, `minutes`/`minutes_played`, `goals`, `assists`, `stats` JSONB, `source` (manual/cv), `notes` | P1 |
| `performance_metrics` | `athlete_id`, `metric_key`, `value`, `percentile`, `period`, `computed_at` | P2 |

### Medical
| Table | Key columns | Phase |
|-------|-------------|-------|
| `medical_partners` | `organization_id` (nullable), `license_number`, `accreditation_status`, `commission_rate` | P1 |
| `medical_records` **[proto]** | `athlete_id`, `partner_id`, `record_type`, `title`, `summary`/`description`, `file_url`, `hash`, `anchor_ref`, `issued_at`/`record_date`, `is_verified`, `is_deleted`, `deleted_at` | P1 |
| `medical_clearances` **[proto]** | `athlete_id`, `partner_id`, `status`, `issued_by`, `effective_from`/`issue_date`, `effective_to`/`expiry_date`, `notes` | P1 |
| `injuries` | `athlete_id`, `injury_type`, `body_area`, `severity`, `occurred_at`, `recovery_status`, `partner_id` | P1 |
| `medical_consents` | `athlete_id`, `grantee_user_id` / `grantee_org_id`, `scope`, `status` (consent_status), `granted_at`, `revoked_at` | P1 |
| `medical_access_log` | `athlete_id`, `viewer_user_id`, `record_id`, `accessed_at`, `ip_address` | P1 |

### Network
| Table | Key columns | Phase |
|-------|-------------|-------|
| `endorsements` **[proto]** | `athlete_id`, `endorser_user_id`/`endorser_id`, `endorser_role`, `skill_or_trait`, `note` | P1 |
| `connections` | `requester_id`, `addressee_id`, `status` (connection_status) | P2 |
| `follows` **[proto]** | `follower_id`, `following_id` | P1 |
| `recommendations` **[proto]** | `author_id`, `recipient_id`, `relationship_type`, `body`, `is_public` | P2 |
| `user_blocks` **[proto]** | `blocker_id`, `blocked_id` | P1 |

### Career & discovery
| Table | Key columns | Phase |
|-------|-------------|-------|
| `career_milestones` | `athlete_id`, `milestone_type`, `club_or_event`, `achieved_at`, `notes` | P1 |
| `trajectory_forecasts` | `athlete_id`, `projected_level`, `horizon_months`, `confidence_score`, `comparables` JSONB, `generated_at` | P3 |
| `saved_searches` | `scout_id`, `query` JSONB, `name`, `last_run_at` | P1 |
| `watchlists` **[proto]** | `scout_id`/`user_id`, `name`, `description` | P1 |
| `watchlist_athletes` **[proto]** | `watchlist_id`, `athlete_id`, `notes`, `rating` | P1 |
| `contact_requests` | `scout_id`, `athlete_id`, `message`, `status` (contact_status) | P1 |

### Opportunities
| Table | Key columns | Phase |
|-------|-------------|-------|
| `opportunities` **[proto]** | `organization_id`, `created_by_id`, `title`, `description`, `sport`, `position`, `location`, `type` (trial/offer), `salary_min/max`, `currency`, `application_deadline`, `status`/`is_active` | P1 |
| `opportunity_applications` | `opportunity_id`, `athlete_id`, `status`, `applied_at` | P2 |

### Messaging & notifications
| Table | Key columns | Phase |
|-------|-------------|-------|
| `conversations` **[proto]** | `participant_ids` JSONB *(proto uses `participant_1_id`/`participant_2_id`)*, `subject`, `last_message_at`, `last_message_preview` | P1 |
| `messages` **[proto]** | `conversation_id`, `sender_id`, `body`/`content`, `is_read`, `sent_at`/`created_at`, `read_at` | P1 |
| `notifications` **[proto]** | `user_id`, `type`, `title`, `body`, `is_read`, `action_url` | P1 |
| `user_devices` | `user_id`, `fcm_token`, `platform`, `last_seen_at` | P2 |

### Billing
| Table | Key columns | Phase |
|-------|-------------|-------|
| `subscriptions` | `user_id` or `organization_id`, `plan`, `status`, `current_period_end`, `stripe_subscription_id` | P2 |
| `payments` | `payer_id`, `amount`, `currency`, `status`, `payment_method`, `gateway_transaction_id`, `paid_at` | P2 |
| `commissions` | `partner_id`, `source_test_id`, `amount`, `status` (pending/paid) | P2 |

### Content & AI
| Table | Key columns | Phase |
|-------|-------------|-------|
| `success_stories` **[proto]** | `title`, `slug`, `body`/`content`, `athlete_id` (nullable), `athlete_name`, `sport`, `cover_image_url`, `is_published`/`is_featured`, `published_at` | P1 |
| `ai_chat_sessions` **[proto]** | `user_id` (**nullable for guests**), `session_token`, `title`, `context_type`, `context` JSONB, `started_at`, `ended_at` | P1 |
| `ai_chat_messages` **[proto]** | `session_id`, `role`/`sender_role` (user/assistant/system), `content`, `attachments` JSONB | P1 |
| `ai_outputs` | `subject_athlete_id`, `output_type`, `content` JSONB, `confidence_score`, `generated_at` | P2 |

### Admin
| Table | Key columns | Phase |
|-------|-------------|-------|
| `audit_logs` | `user_id`, `action`, `table_name`, `record_id`, `old_value` JSONB, `new_value` JSONB, `ip_address`, `created_at` | P1 |
| `platform_settings` | `key`, `value` JSONB, `updated_by`, `updated_at` | P1 |
| `verification_requests` | `subject_user_id`/`organization_id`, `type`, `status`, `documents` JSONB, `reviewed_by`, `decision_reason` | P1 |

---

## 4. Key relationships

```
auth.users 1───1 user_profiles
user_profiles 1───0..1 {athlete|scout|coach|medical_partner|federation|org_admin}_profiles
organizations 1───* organization_staff *───1 user_profiles
athlete_profiles 1───* athlete_media 1───* media_clips
athlete_profiles 1───* match_records / performance_metrics / athlete_attributes
athlete_profiles 1───* medical_records *───1 medical_partners
athlete_profiles 1───* medical_clearances / injuries
athlete_profiles 1───* medical_consents (grantee = user or org)  ── governs scout/club medical visibility
scout_profiles 1───* watchlists / saved_searches / contact_requests
organizations 1───* opportunities 1───* opportunity_applications
user_profiles *───* user_profiles via guardian_links (guardian/agent), connections, follows
```

The **athlete profile is the central entity**; everything links to it for a coherent portfolio.

---

## 5. Row-Level Security (RLS) strategy

RLS is the **authorization boundary**. Every table has RLS enabled. Policy patterns:

| Pattern | Applies to | Rule |
|---------|-----------|------|
| **Public read** | `user_profiles` (public fields), public `athlete_profiles`, public `athlete_media`, `success_stories`, `organizations` | `SELECT USING (true)` *only for non-sensitive columns* — split sensitive columns into separate tables or use column-level protection / views |
| **Owner-only** | `watchlists`, `saved_searches`, `notifications`, `ai_chat_sessions`, settings | `auth.uid() = user_id` |
| **Consent-gated** | `medical_records`, `medical_clearances`, `injuries` | owner OR a valid row in `medical_consents` (granted, not revoked) for `auth.uid()` / their org |
| **Org-scoped** | `organization_staff`, club rosters, org analytics | `auth.uid()` is active staff of the row's `organization_id` |
| **Append-only** | `medical_records`, `audit_logs`, `ai_outputs` | INSERT allowed (per role); **no UPDATE/DELETE** policy (immutable) |
| **Admin bypass** | all | policy allowing rows when `auth.jwt() ->> 'role' = 'admin'` (custom claim) or service-role |

> **Critical fix vs prototype:** the prototype's medical RLS is **not** consent-gated
> (`medical_clearances_select` allows any authenticated user; `medical_records` allows insert/update by
> any authenticated user). The platform **must** implement consent-gated, append-only medical access
> and add `medical_consents` + `medical_access_log`. See [07](./07-prototype-audit.md) §security gaps.

**Helper functions** (define once, reuse in policies):
- `is_admin()` → boolean from JWT claim.
- `is_org_staff(org uuid)` → boolean.
- `has_medical_consent(athlete uuid)` → boolean (checks `medical_consents`).
- `owns_athlete(athlete_id uuid)` → `auth.uid() = (SELECT user_id FROM athlete_profiles WHERE id = athlete_id)`.

Set roles via a **custom access token hook** so `auth.jwt()` carries `role` and (for staff) org claims —
avoids recursive subqueries in policies. Avoid `SELECT user_id FROM ...` subqueries in hot policies;
use SECURITY DEFINER helper functions with stable results.

---

## 6. Gap analysis — prototype vs canonical

The prototype migrations (`supabase/migrations/`) implement a **reduced MVP-ish subset**. To reach the
canonical model, the platform needs:

**Missing tables (add):** `athlete_attributes`, `guardian_links`, `scout_profiles`, `coach_profiles`,
`medical_partner_profiles`, `federation_profiles`, `org_admin_profiles`, `organization_staff`,
`media_clips`, `performance_metrics`, `medical_partners`, `injuries`, `medical_consents`,
`medical_access_log`, `connections`, `career_milestones`, `trajectory_forecasts`, `saved_searches`,
`contact_requests`, `opportunity_applications`, `user_devices`, `subscriptions`, `payments`,
`commissions`, `ai_outputs`, `audit_logs`, `platform_settings`, `verification_requests`.

**Schema corrections to existing tables:**
- `user_profiles`: add `date_of_birth`, `gender`, `emirates_id` (encrypted), `locale`, `stripe_customer_id`.
- `athlete_profiles`: add `positions` JSONB, `current_club_id` FK (proto uses free-text `current_club`).
- `athlete_media`: add `transcode_status`; rename/align `file_url` ↔ `storage_url`.
- `medical_records`: add `partner_id` FK, `anchor_ref`, `is_deleted`, `deleted_at`; make append-only.
- `medical_clearances`: add `partner_id`, `effective_from/to`; consent-gate reads.
- `conversations`/`messages`: decide on `participant_ids` JSONB (doc) vs `participant_1/2_id` (proto).
  **Recommendation:** keep proto's two-column model for 1:1 (simpler RLS); revisit if group chats arrive.
- `endorsements`: add `endorser_role`.
- `ai_chat_sessions`: make `user_id` **nullable** + add `session_token` for **guest** sessions (proto
  requires `user_id` NOT NULL, which blocks the guest discovery flow — a P1 requirement).

**Security corrections:** see §5 + [07](./07-prototype-audit.md).

---

## 7. Migrations strategy

- All schema changes are **forward-only versioned SQL** in `supabase/migrations/`, named
  `<timestamp>_<description>.sql` (the prototype already follows this).
- **Never edit an applied migration.** Add a new one.
- Proposed foundation migration set for the platform (rebuilt cleanly rather than patching proto):
  1. `0001_extensions_and_enums.sql` — `uuid-ossp`, `pgcrypto`, `pgvector`, all enums.
  2. `0002_identity_and_profiles.sql` — `user_profiles` + role extension tables + triggers.
  3. `0003_organizations.sql`
  4. `0004_media_and_performance.sql`
  5. `0005_medical_and_consent.sql` — incl. `medical_consents`, `medical_access_log`, append-only + provenance.
  6. `0006_network_and_career.sql`
  7. `0007_discovery_and_opportunities.sql`
  8. `0008_messaging_and_notifications.sql`
  9. `0009_ai_and_content.sql`
  10. `0010_admin_audit_settings.sql`
  11. `0011_rls_policies.sql` — helper functions + all policies (or co-locate per table).
  12. `0012_indexes_and_views.sql` — FK/search indexes, materialized views for dashboards.
- **Triggers:** `update_updated_at_column()` on every table with `updated_at`; audit triggers on
  sensitive tables; `profile_completeness` / `visibility_score` recomputation (or compute in Edge jobs).
- **Seed data:** `supabase/seed/` with realistic athletes, clubs, media, success stories so the UI
  renders against real rows (replaces the prototype's hardcoded arrays). Keep the `create-demo-users`
  Edge Function pattern for demo accounts.

---

## 8. Indexing & performance (initial)

- FK indexes on every `*_id` used in joins/filters (proto already indexes several).
- Search/filter columns: `athlete_profiles(sport, level, nationality, is_open_to_offers)`,
  `user_profiles(role)`, `opportunities(sport, position, status)`.
- Full-text search (`tsvector`) on athlete name/bio/club; `pgvector` index for semantic search.
- Materialized views for dashboard aggregates (scout views count, regional rank); refresh on schedule.
- Partition `audit_logs` (and high-volume media event tables) monthly.
