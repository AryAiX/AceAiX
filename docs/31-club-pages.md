# 31 — Club and academy pages

> A club or academy account sets up its own page at sign-up and runs it with a small team: posts and
> stories, announcements, challenges, events, fixtures with a live score, squads per season with their
> coaching staff, an About story and a trophy cabinet.
> Source of truth: `supabase/migrations/20261014000001_club_pages.sql`. Client:
> `mobile/app/org/[id].tsx`, `mobile/app/club/`, `mobile/app/match/[id].tsx`, `mobile/app/event/[id].tsx`,
> `mobile/components/club/`, `mobile/lib/api.club.ts`, `mobile/lib/club.ts`, `mobile/lib/clubLabels.ts`,
> `mobile/lib/clubSetup.ts`.

---

## 1. Setting up the page

A **club** account (sign-up role `club`) no longer goes through the recruiter questions. Onboarding runs
`ClubSetupWizard` instead; every step saves as the person moves forward, and a half-finished page resumes
at the first incomplete step.

| Step | Asks for | Written by |
|------|----------|------------|
| 1. Basics | Club or academy, official name, Arabic / local name, year founded, CEO or director | `create_club_page` (first time), then `update_club_page` |
| 2. Where | Country, city, street address, map pin (pasted Google / Apple Maps link or "lat, lng"), other branches and grounds | `update_club_page` (`locations`) |
| 3. Sports | Active sports, and the categories in each (U8…U21, Senior, Women, Girls, Para, Masters, or typed) | `update_club_page` (`sports`) + `saveMatchPreferences` |
| 4. Contact | E-mail, phone, website, socials, facilities, a short bio | `update_club_page` |
| 5. Logo and cover | Square logo, wide cover | `uploadClubImage` → `update_club_page` |
| 6. Verification | Name and role of the person filling it in, licence number, photo of the licence, Terms + Child Safety acceptance | `uploadClubDocument` (private bucket) → `submit_club_verification` |
| 7. Done | — | `completeOnboarding()` |

Clubs that finished onboarding before this existed get a "Set up your club page" card on their Profile
tab, which opens the same wizard at `/club/setup`. Everything can be changed later at
`/club/:orgId/edit`.

## 2. Verification

A page starts `pending` and unverified. `submit_club_verification` stores the papers in
`organization_verification` (readable by the owner, managers and admins only) and puts a request in the
existing admin queue (`verification_requests`, type `club`, the licence as `{bucket, path}`). In the web
portal, **Verification → View** opens the licence through a five-minute signed link.

| Admin decision | The page |
|----------------|----------|
| Approve | `is_verified = true`, `approved` (the portal already did this) |
| Reject / more info | `rejected` / `more_info`, the reason shown on the club's Edit and Manage screens, managers notified |
| Club sends new papers | back to `pending` — the only status change a club can make (`aceaix.club_resubmit`) |

A club still cannot mark itself verified (the 0904/03 trigger).

**What verification unlocks:** announcements and in-person events reach under-18s only from a verified
club; an editor of a verified page can set challenges even if their own account is not verified.

## 3. The page team

| Role | Can |
|------|-----|
| `owner` | Everything. Cannot be removed. One page per club account. |
| `manager` | Page details, team, announcements, verification — and everything below |
| `editor` | Posts, stories, challenges, events, fixtures, squads, awards |
| `scorekeeper`, `coach` | The live score and match events only |
| `staff`, `scout` | Listed; no editing |

`private.org_can(org, 'manage' | 'content' | 'score' | 'member')` is the one predicate. Invitations go by
e-mail to an existing AceAiX account, must be accepted on the club page, and are refused for anyone under
18.

## 4. What the page shows

`club_page(org)` returns the header, sports, branches, the viewer's role and permissions, pending
invitations and squad links, the licence status (team only), a live story, the live or next match and
counts in one call. Each tab loads on first open:

| Tab | RPC | Notes |
|-----|-----|-------|
| Posts | `club_posts`, `club_broadcasts_for` | A club account's posts and stories are tagged to its page by a trigger; followers of the page get them in their Following feed (`get_feed` now reads `organization_follows`). Announcements sent to the viewer are pinned on top. |
| Matches | `club_matches_for` | Live, upcoming, results |
| Squads | `club_squads_page` | Season → sport → category; staff then players |
| Events | `club_events_for` | Trials, camps, clinics, tournaments, open days, showcases |
| Challenges | `club_challenges` | The existing challenges, with `organization_id` |
| Awards | `club_awards_for` | Grouped by year; club, player and coach awards |
| About | (in `club_page`) | Story, mission, philosophy, facts, locations with "Open in Maps", contacts, socials, facilities |
| Openings | (unchanged) | Trials and positions from `opportunities` |

## 5. Announcements

`send_club_broadcast(org, title, body, audience)` — `followers`, `squad` (people linked to the current
season's squads) or `all`. It is a notification, not a chat: nobody can reply. Three per page per day.
Minors receive it only from a verified club. The page team is never a recipient.

## 6. Matches and the live score

A fixture (`save_club_match`) has a sport, an optional squad (which sets the category), opponent, home or
away, competition, venue, kick-off, notes and an optional live-stream link. Links are allowed only to
YouTube, Instagram, Twitch, Facebook, TikTok, X, Kick and Vimeo; AceAiX hosts no video.

The scorekeeper uses the match page itself (`/match/:id`): kick off, half time, second half, full time,
postpone / cancel, the clock, +/– score, and moments (goal, penalty, own goal, points 1–6, cards,
substitution, time-out, period, note). A scoring moment moves the score in `add_match_event`, and
deleting it moves it back, so the board and the timeline cannot disagree.

Followers hear about a new fixture, kick-off (once) and the result. Everyone watching gets updates from
Realtime on the `club_matches` row (score, clock, status; no personal data), with a 30-second poll as a
fallback; the timeline is re-read through `club_match_page`, which applies the naming rule below. Raw
`club_match_events` rows are readable by the page team only.

## 7. Squads and the naming rule

Seasons (`2026–27`, one current), squads (sport + category + optional name), and people: players
(number, position) and staff (head coach, assistant, goalkeeper coach, fitness coach, physio, analyst,
team manager). A line can be linked to an AceAiX profile; the person accepts or declines from the club
page.

**Youth rosters.** For a category that is U-anything up to 18 (or "youth", "junior", "kids", "mini",
"cadet"), everyone outside the page team sees **players** as "First L." (`private.short_person_name`).
Staff are adults and keep their names. A linked, accepted profile shows in full and links through only if
that athlete is visible in discovery anyway. A minor can accept a link only with a guardian's `discovery`
consent. The same rule applies to scorers on a match sheet and to award recipients.

## 8. Events

`save_club_event` → `/event/:id`. The gate (`private.club_event_gate`) answers one of `ok`, `own_club`,
`cancelled`, `past`, `closed`, `full`, `age_out_of_range`, `minor_needs_verified_club`,
`guardian_consent_required`. A minor registers only with a verified club and only under the guardian's
`bookings` scope (in person, like coach booking); guardians with an account are told. The page team sees
the list of who registered; cancelling an event tells everyone registered.

## 9. Notifications

New channel **Club updates** (`notification_preferences.club_updates`, Settings → Notifications). Types:
`club_invite`, `club_invite_accepted`, `club_broadcast`, `club_squad_link`, `club_event_new`,
`club_event_cancelled`, `club_event_registration`, `club_event_registration_minor`,
`club_match_scheduled`, `club_match_live`, `club_match_result`, `club_verification_approved`,
`club_verification_rejected`, `club_verification_more_info`. They route to the club page, the match or the
event (`entity_type` `organization`, `club_match`, `club_event`).

## 10. Tests

- `supabase/tests/functional.sql` — section "club and academy pages" (53 assertions).
- `mobile/tests/e2e/pipelines.mjs` — section "a club runs its page…" (8 steps through PostgREST).
- `mobile/tests/unit/clubSetup.test.ts` — the wizard's pure helpers (map links, resume, validation).
- `mobile/tests/e2e/club-look.mjs` — screenshots of every club screen as a chosen demo account.

## 11. Not done yet

1. **Licence as PDF.** The bucket accepts PDFs, but the app only picks photos (no document picker
   dependency). Add `expo-document-picker` to allow PDFs.
2. **Opponent as an AceAiX club.** `club_matches.opponent_org_id` exists; the form takes a name only.
3. **Awards on the athlete's own profile.** Linked awards are stored; the athlete profile does not show
   them yet.
4. **Admin portal**: approval and rejection work through the existing Verification queue; there is no
   separate club list with page details yet.
5. **Map picker.** The pin comes from a pasted link; there is no interactive map.
6. **Server-written notification text** is English, like every other notification (see the note in
   `components/messaging/NotificationRow.tsx`).
