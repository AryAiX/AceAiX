# AceAiX Weekly Report

**Week Ending:** August 31, 2026  
**Focus:** Store distribution of version 1.0.1, quality hardening across web and mobile, backend authorization, and deep mobile functional coverage

## Executive Summary

A new AceAiX athlete app version (**1.0.1**) was submitted to the Apple App Store and Google Play and **successfully distributed** on both stores. Engineering work this cycle concentrated on making that release trustworthy: production data handling, authorization, and persistence were hardened on the shared Supabase backend; the web SPA and the Expo mobile app were repaired independently (they do not share UI code); and mobile product flows were re-audited through UI-driven Playwright against Expo web, not static review alone.

This report summarizes **what landed** (merged PRs #4, #5, and #6) and **what is ready to land** (open PR #7, mobile functional audit). Counts below are from git history for this delivery cycle (from 18 August) plus the functional-audit branch.

## Store distribution

| Store | Package | Version | Outcome |
| --- | --- | --- | --- |
| Apple App Store | `com.aryaix.aceaix.athlete` | 1.0.1 | Submitted and **successfully distributed** |
| Google Play | `com.aryaix.aceaix.athlete` | 1.0.1 | Submitted and **successfully distributed** |

The listing remains iPhone-focused (`supportsTablet: false`). Closed-testing opt-in for Android continues at:

`https://play.google.com/apps/testing/com.aryaix.aceaix.athlete`

Web production remains at `https://aceaix.com`.

---

## Stats

### Delivery cycle (git subjects since 18 August)

| Kind | Count |
| --- | --- |
| Bug-fix commits | **50** |
| Improvement / feature commits | **12** |
| Test commits | **41** |
| Chore / environment commits | **5** |
| Other | **1** |
| **Total non-merge commits** | **109** |

### Bugs by type (fixed this cycle)

Counts group distinct defects, not commit volume. One commit can close one defect; several commits can belong to one defect.

| Type | Count | Where |
| --- | --- | --- |
| Expo web dialogs that never ran (`Alert.alert` / native confirm) | **6** | Mobile: profile save exit, delete account, report/block, language/about, endorse/connect |
| Hydration races (empty snapshot overwrote a real form) | **2** | Mobile: edit profile, notification preferences |
| Stale optimistic UI after a successful mutation | **2** | Mobile: post like/save; feed row refresh |
| Destructive overwrite of persisted JSON / records | **1** | Mobile: performance “Edit Stats” wiping the season payload |
| Invalid calendar dates accepted (JS date overflow) | **1** | Mobile: event create/edit (`2026-02-31` and similar) |
| Auth, session, and recovery routing | **6** | Mobile + web: profile fetch races, login timeout, password recovery, signup back-stack, athletes-only loop |
| Authorization / RLS / RPC hardening | **9** | Supabase: definer RPCs, likes, org follows, sports identity, post `athlete_id`, applications, conversations |
| Persistence presented as success when it was local-only | **3** | Web/mobile: opportunities, club follows, applications |
| Medical consent, upload, and record lifecycle | **8** | Medical: storage, duplicate grants, revoke confirm, loading vs unknown, match-stat bounds |
| Accessibility and input naming | **4** | Icon-only controls, `TextInput` names, autofill, named dialogs |
| Empty vs error vs NaN chart geometry | **3** | Trajectory charts, error surfaces on empty lists |
| Media upload and cleanup | **3** | Video ArrayBuffer path, size cap, orphaned media on failed insert |
| **Confirmed functional defects this cycle** | **~48** | Across web, mobile, and backend |

The latest UI-driven mobile audit (PR #7) confirmed and closed **10** of those as live product bugs on Expo web. The rest were closed in the App QA and quality-hardening merges.

### Improvements by type

| Type | Count | Notes |
| --- | --- | --- |
| Medical records as a real product surface | **5** | Private storage bucket, consent-gated upload, create/delete, loading and error states |
| Social / identity data model | **4** | Split names, league field, unique conversation pairs, organization follows |
| Auth and account lifecycle | **4** | Idempotent conversations, safer signup/recovery, account deletion confirm on web |
| Local development environment | **1** | Docker + Supabase + web + mobile reproducible setup (PR #6) |
| Accessibility / platform lifecycle | **3** | Android `onRequestClose`, animation cleanup, accessible names |
| **Improvement items** | **~17** | Distinct product or platform upgrades, excluding pure bugfixes |

### Tests added or expanded

| Suite | New or expanded files | Cases (current totals) |
| --- | --- | --- |
| Mobile unit | `navigation`, `profileData`, `chartScale`, `ui-lifecycle` (new); existing `formatting`, `no-hardcoded-data` | **31** passing |
| Web unit | `navigation`, `profileData`, `accessControl` (new); existing format / AI / admin | **33** passing |
| Mobile Playwright — unauthenticated / routing | `mobile-major.spec.ts` | Login/signup/recovery plus **49** protected-route redirects |
| Mobile Playwright — accessibility | `accessibility-parity.spec.ts` (**new**) | **6** |
| Mobile Playwright — authenticated review | `authenticated-review.spec.ts` (expanded: reels, cleanup) | **14** |
| Mobile Playwright — deep functional | `functional-depth.spec.ts` (**new**, PR #7) | **14** serial workflows |
| Web Playwright — quality | `quality.spec.ts` (**new**) | Keyboard login, RBAC, identity, opportunity persist, club follows, public feed |
| **Mobile Playwright total after PR #7** | | **89** passing |
| Static / bundle gates | | Typecheck pass; mobile lint 0 errors; Expo Doctor **18/18**; Android + iOS `expo export` compile |

New test **files** this cycle: **10** (`4` mobile unit, `3` web unit, `3` e2e).

---

## Details: improvements

### Backend (shared by web and mobile)

Web (`web/`, React DOM + Vite) and mobile (`mobile/`, React Native + Expo Router) remain **two clients**. Only Postgres, Auth, Storage, and RPCs are shared. Authorization work therefore protects both apps at once:

- Anonymous access revoked on `SECURITY DEFINER` RPCs; `search_path` pinned; trigger `EXECUTE` limited.
- `is_verified` and `subscription_tier` are not self-assignable.
- Conversation participants are immutable; conversation pair uniqueness and block checks on insert.
- Medical inserts require a verified partner, consent, and a matching `partner_id`.
- Storage reads for posts and stories are tied to the owner folder or a visible row.
- `toggle_media_like` is idempotent.
- Club follows use `organization_follows` instead of writing an organization id into `follows.following_id` (FK to `user_profiles`).
- Triggers keep `posts.athlete_id` aligned with `author_id` and block athletes from assigning `football_api_player_id`.
- Application status is constrained; athletes cannot update application rows through a leftover policy.
- Profile names are split (`first` / `last`) with league support on identity.

Thirteen migrations from this cycle (18–30 August) encode that work.

### Web SPA

- Auth session races: an in-flight profile fetch no longer wipes a good profile.
- Role guards fail closed (`canAccessRole`) so an unloaded role cannot open another portal.
- Notification `action_url` is sanitised (`safeInternalPath`) to close open redirects.
- Public profile links use `athlete_profiles.id`, not `user.id`.
- Legacy `attributes` score objects are normalised so the dashboard does not crash.
- Empty or single-point trajectory data shows an empty state instead of NaN SVG geometry.
- Opportunity save/apply persists to the database.
- Named “Log Match” dialog, label/input association, autofill hints, Escape-to-close.

### Mobile app

Quality hardening (PR #5), then the UI-driven audit (PR #7):

- Ordered profile fetches; last-good profile retained on error; “Profile Unavailable” distinct from a missing profile.
- Login no longer races a timeout against a successful sign-in.
- Password recovery routes work without a session.
- Video upload reads an `ArrayBuffer` (not base64), with a 50 MB cap.
- Blocks use `get_blocked_user_ids` so reciprocal blocks apply to feed and stories.
- Conversation create is idempotent; notification deep links resolve legacy web paths.
- Errors on discover, medical, analytics, and performance are visible instead of looking empty.
- Failed post/story inserts clean up partial media.
- Football identity is read-only in the UI (and enforced in the database).
- Charts require two points; modals handle Android hardware back and refuse dismiss mid-save.
- Looping animations and deferred updates cancel on unmount.

**Ten Expo-web functional defects closed in the audit:**

1. **Profile save** stayed on `/edit-profile` because React Native Web does not run `Alert.alert` button callbacks. Save now navigates after confirm.
2. **Post like/save** looked stale after HTTP 201. `PostCard` owns optimistic state, syncs from props, and rolls back on error.
3. **Edit Stats** opened a blank year form; saving one field could wipe the stats JSON. The editor prefills the current record/season and supports Cancel.
4. **Impossible event dates** (for example `2026-02-31`) were accepted via JavaScript date overflow. Dates are validated with a UTC round-trip.
5. **Delete Account** was a no-op on Expo web. Confirmation uses `globalThis.confirm`, then `delete_own_account`.
6. **Edit Profile** hydrated from empty/null and overwrote fast typing. The form waits for a real profile snapshot and is not interactive until ready.
7. **Report / block** on posts, stories, and Network did nothing on web. Same confirm pattern as account deletion.
8. **Notification preferences** rendered defaults before fetch, so “Saved!” could persist stale defaults. Controls stay disabled until prefs load.
9. **Direct `/signup`** Cancel/Back with empty history left the user stuck. The screen `replace`s `/login` when it cannot go back.
10. **Language / About** and public-profile **Endorse / Connect** were silent on web. Web uses `alert`; native uses `Alert`.

### Medical product work (PR #4)

- Private `medical-documents` bucket with consent-based access.
- Real medical record create with file upload and signed URLs for viewing.
- Soft-delete RPC and a delete option with confirmation.
- Duplicate active consent grants prevented; already-granted users excluded from search.
- Confirmation required before revoking access.
- Loading vs genuinely unknown consent grantee distinguished.
- Verified match edits/deletes restricted in the database; stat values bounded on create and edit.

### Development environment (PR #6)

- Reproducible Cloud Agent / local stack: Docker, Supabase, web, and mobile.
- Merged after reconciling `_layout.tsx` and lockfile drift against `main`.

---

## Details: tests

### Unit (fast, fail the build)

**Mobile `ui-lifecycle`** fails CI if a `Modal` loses Android `onRequestClose`, a looping animation is not stopped, or a `TextInput` ships without an accessible name.

**Mobile `chartScale`** locks the “never divide by zero / never emit NaN coordinates” contract for trajectory charts.

**Mobile + web `navigation`** locks `safeInternalPath` (internal routes only; reject external, protocol-relative, and backslash URLs).

**Mobile + web `profileData`** locks attribute normalisation: valid arrays kept, legacy score objects converted, garbage dropped.

**Web `accessControl`** locks fail-closed RBAC while a profile role is still loading.

Existing mobile `formatting` and `no-hardcoded-data` suites remain the guard against prototype fixture strings in runtime source.

### Playwright — web quality (`quality.spec.ts`)

- Keyboard-only login.
- Role guards reject cross-portal navigation.
- Named match dialog closes with Escape.
- Athlete account menu uses the athlete profile id.
- Opportunity saves persist across reloads.
- Club follows persist without corrupting user follows.
- Public, scout, and admin views resolve the same athlete identity.
- Anonymous users can interact with public feed posts.

### Playwright — mobile unauthenticated (`mobile-major.spec.ts`)

- Login, signup fields, login→signup link, password recovery without a session.
- **49** protected routes (including query-string variants) redirect to the athlete login screen.

### Playwright — mobile accessibility (`accessibility-parity.spec.ts`)

- Login fields and password toggle expose accessible names.
- Keyboard-only credential entry and submit.
- Password recovery reachable and guarded without a session.
- Signup fields named; sport picker labelled open/close.
- Auth screens load without uncaught runtime errors.

### Playwright — authenticated review (`authenticated-review.spec.ts`)

Covers the App Store review account path: every user-facing screen without a runtime error; messaging; profile fields; AI coach; performance and medical review data; opportunity save; event CRUD; network → conversation; post publish/delete; **reel publish, like/save, play, and delete** with fixture cleanup; global search; career milestone add/remove; visibility preference persist/restore; verified football identity not editable.

### Playwright — deep functional (`functional-depth.spec.ts`, PR #7)

Fourteen serial workflows against live Supabase, with self-cleaning fixtures:

1. Profile edits persist through navigation and reload, then restore.
2. Event create, edit, reload, delete.
3. Event form rejects impossible calendar dates.
4. Career milestone validate, create, edit, reload, delete.
5. Performance stats edit preserves the current record.
6. Saved opportunity survives tab changes and reload, then restores.
7. Notification quiet hours persist and restore.
8. Discover connection persists across reload and returns to the original state.
9. Notification deep links reach opportunity and message destinations.
10. Logout survives browser back and reload.
11. Direct signup deep links have a safe exit to login.
12. Informational settings and profile-preview actions give feedback.
13. New athlete can complete signup and permanently delete the account.
14. Second athlete can discover, engage with, and comment on a new post (plus block/unblock persistence in the same social track).

QA fixtures for Functional/Release-reel posts, events, career rows, performance seasons, and notifications are cleaned to zero after the suite. The review account is restored (Rudy Fuller, Dubai Athletic Club, quiet hours 22:00–07:00).

### Verification snapshot (latest audit)

| Gate | Result |
| --- | --- |
| Deep functional e2e | 14/14 |
| Full mobile Playwright | 89/89 |
| Mobile unit | 31 |
| Web unit | 33 |
| Typecheck (web + mobile) | pass |
| Mobile lint | 0 errors (pre-existing warnings unchanged) |
| Expo Doctor | 18/18 |
| Native bundles | Android and iOS `expo export` compile |

Native runtime on physical iOS/Android devices was not part of this cycle; coverage is Expo web, compiled native bundles, and live backend probes.

---

## Pull requests this cycle

| PR | Title | Status |
| --- | --- | --- |
| [#4](https://github.com/AryAiX/AceAiX/pull/4) | App QA (medical, consent, match bounds) | Merged |
| [#5](https://github.com/AryAiX/AceAiX/pull/5) | Comprehensive web and mobile quality hardening | Merged |
| [#6](https://github.com/AryAiX/AceAiX/pull/6) | Local development environment (web + mobile + Supabase) | Merged |
| [#7](https://github.com/AryAiX/AceAiX/pull/7) | Expand mobile UI-driven functional coverage | Open — ready for review |

---

## Risks and follow-up

- Web and mobile will keep drifting until a shared package owns path sanitisation, profile normalisation, block filtering, and service-layer queries. UI must stay separate; the platform-agnostic third of the logic should not.
- Physical-device, two-real-client, VoiceOver/TalkBack, and network-chaos coverage is still outside the automated gate.
- `sync-chess` / `sync-football` remain client-invoked without checked-in Edge Functions; those controls need a real implementation or a release-safe unavailable state.
- Store distribution of 1.0.1 does not freeze the functional-audit branch; PR #7 should merge so store binaries and `main` stay aligned.

## Recommended next focus

- Merge PR #7 and cut the next store build from `main` so the 10 Expo-web functional fixes ship to testers.
- Add a shared TypeScript package for the duplicated non-UI layer.
- Add native-device smoke, contract tests for RLS/RPCs, and visual regression on auth and profile edit.
- Keep the production review account clean after automated runs.
