# 12 — Youth Safety

> AceAiX is built for 13–25 year-olds. A large share of accounts belong to minors, so the safety
> model is not a feature bolted to the side — it decides what the discovery RPCs return, what a
> profile read exposes, and who can open a conversation.
>
> **Everything below is enforced in Postgres**: RLS policies, triggers, column-level privileges and
> `SECURITY DEFINER` functions. The UI explains the rules; it does not implement them. A modified or
> hostile client gains nothing.
>
> Source: `supabase/migrations/20260904000002_youth_safety_and_consent.sql` and
> `20260904000005_moderation_profiles_and_actions.sql`, with the profile read path amended by
> `20260904000008` and four routes around the discovery gate closed by
> `20260904000010_close_minor_exposure_gaps.sql`. Assertions live in
> `supabase/tests/functional.sql` — see in particular the sections "no route around the discovery
> gate", "guardians can see what they approved" and "one date of birth".

---

## 1. The rules, and what enforces each

| # | Rule | Enforced by |
|---|------|-------------|
| 1 | Nobody under 13 holds an account | `private.sync_age_state()` trigger on `user_private` — raises `23514` with hint `age_below_minimum` |
| 2 | A 13–17 account is invisible in **every** surface that can name a person, until a guardian consents | `sync_age_state` sets `is_discoverable = false`; `discover_athletes`, `recommended_athletes`, `search_people` and `talent_leaderboard` all filter on it; `private.guard_minor_visibility()` blocks turning it back on |
| 3 | Only a verified adult professional may open a conversation with a minor, and only within a granted consent | `private.can_message()`, called by `start_conversation` and by the `conversations` insert trigger |
| 4 | A minor's exact date of birth **and exact age in years** are never returned to another user | `user_private` RLS (owner/admin only); `get_profile_bundle`, `discover_athletes`, `recommended_athletes` and `opportunity_applicants` all return `age: null` plus `age_band` when `is_minor` |
| 5 | A minor's precise location is never held at all | No coordinate, address or postcode column exists; city and country are typed by the user |
| 6 | One date of birth governs both the protections and the displayed age | `private.sync_athlete_birth_date()` and `private.mirror_birth_date_to_private()` triggers keep `user_private.date_of_birth` and `athlete_profiles.birth_date` identical in both directions |
| 7 | Consent is scoped and revocable, and revoking it hides the profile again | `guardian_consents.allow_*`; `private.apply_guardian_consent()` trigger |
| 8 | A guardian who holds an account can see and withdraw what they approved | `private.link_guardian_account()` / `private.link_guardian_on_consent()` triggers populate `guardian_user_id`; `my_linked_minors()`, `guardian_conversation_overview()` |
| 9 | A user cannot rewrite their own age, verification or moderation state | Column-level `GRANT UPDATE (...)` — §9 |
| 10 | Anything reported as a child-safety concern comes down immediately | `public.report_content()` sets `moderation_state = 'under_review'` |
| 11 | A compromised account cannot flood the network | `private.enforce_rate_limit()` triggers |
| 12 | Deleting an account deletes the files it uploaded | `public.delete_own_account()` clears `storage.objects` under the account's folder in `avatars`, `posts` and `stories` |

---

## 2. The 13+ floor

Date of birth lives in `public.user_private.date_of_birth`, which is readable only by its owner and
admins. Writing it fires `private.sync_age_state()`, which:

```sql
if v_age < 13 then
  raise exception 'AceAiX requires all account holders to be at least 13 years old'
    using errcode = '23514', hint = 'age_below_minimum';
end if;
```

The client's sign-up flow gates the same thing at step three, so a twelve-year-old gets an
explanation rather than a database error — but the database is the rule. `lib/errors.ts` maps the
`age_below_minimum` hint to a written sentence for the case where the client check is bypassed.

There is no compliant way to run a social product for under-13s without full COPPA-grade
verifiable-parental-consent infrastructure. Rather than build a diminished under-13 experience, the
account cannot exist.

---

## 3. Age bands

`private.age_band_for(dob)` reduces the date to one of four coarse buckets, stored on the public
profile as `user_profiles.age_band`:

| Band | Ages | `is_minor` |
|------|------|-----------|
| `13_15` | 13, 14, 15 | true |
| `16_17` | 16, 17 | true |
| `18_24` | 18–24 | false |
| `25_plus` | 25+ | false |

`is_minor` (age < 18) and `age_band` are derived by `sync_age_state` and written by that trigger
alone; neither is in the column grant a client holds. The band exists so the app can say "16–17"
where it needs an age signal without publishing a birthday.

Two side effects of the same trigger, on the transition into minority:

- `is_discoverable` becomes `has_guardian_consent(user, 'discovery')` — false until a parent acts.
- `allow_messages_from` is downgraded from `everyone` to `verified`. `guard_minor_visibility` then
  silently rewrites any later attempt to set `everyone` back to `verified`, so a minor's inbox
  cannot be opened to the world by them or by anyone else.

### 3.1 One date of birth, held in two places

`user_private.date_of_birth` decides `is_minor` and the band; `athlete_profiles.birth_date` is the
column an athlete edits on their own profile and the one the discovery age *filters* read. Those
could once drift apart, which would have let an athlete present one age to search while being
governed by another. Two triggers in `20260904000010` keep them identical:

| Trigger | On | Does |
|---------|----|------|
| `trg_user_private_sync_birth_date` → `private.sync_athlete_birth_date()` | `user_private`, insert or update of `date_of_birth` | writes the same date onto `athlete_profiles.birth_date` |
| `trg_athlete_birth_date_mirror` → `private.mirror_birth_date_to_private()` | `athlete_profiles`, update of `birth_date` | upserts it back into `user_private.date_of_birth` |

The second one is the important direction: `birth_date` is in the client's column grant, so writing
it is an act of declaring an age, and it therefore has to run through `sync_age_state` — the under-13
raise, `is_minor`, the band, the discoverability reset and the inbox downgrade all follow. The
migration also backfills existing rows from the private record. `functional.sql` → "one date of
birth" asserts both directions, including that editing the profile birth date to 16 years ago turns
the account into a minor account.

---

## 4. Guardian consent

### 4.1 The record

`public.guardian_consents`, one row per request:

| Column | |
|--------|---|
| `minor_user_id` | who it is about |
| `guardian_name`, `guardian_email` | who was asked |
| `guardian_user_id` | the guardian's own account, if they have one — populated automatically, see §4.6 |
| `relationship` | `parent` / `guardian` / `coach_guardian` / `other` |
| `status` | `pending` → `granted` \| `revoked` \| `expired` |
| `allow_discovery`, `allow_messaging`, `allow_media` | three separate decisions |
| `token`, `token_expires_at` | 24 random bytes, hex; 14 days |
| `granted_at`, `revoked_at` | |
| `consent_method`, `consent_ip`, `consent_user_agent` | intended as evidence for a compliance audit — only `consent_method` is ever written, see §11 |

`idx_guardian_consents_active` is a partial unique index on `minor_user_id where status = 'granted'`
— a minor can have at most one live consent, so there is never a question of which one applies.

The three scopes are separate on purpose. A parent may be happy for a profile to exist and be found
by clubs while not wanting direct messages, and the flow has to be able to record that rather than
force an all-or-nothing answer.

### 4.2 Request

`public.request_guardian_consent(name, email, relationship)` — authenticated, callable only for
`auth.uid()`. Validates the address, expires any earlier `pending` row for that minor, inserts a new
one, returns it. `INSERT` and `DELETE` on the table are revoked from `authenticated`, so this
function is the only way a row appears.

The onboarding wizard calls it at the guardian step for any 13–17 account; `/settings/guardian`
calls it again for a re-request.

### 4.3 E-mail

`mobile/lib/api.ts → requestGuardianConsent` invokes the `guardian-consent` edge function with the
new `consent_id`. That call is fire-and-forget: if the function is not deployed, or delivery fails,
**the request still stands** and can be re-sent from `/settings/guardian`. Losing an e-mail must not
lose the consent record.

The function verifies the caller's JWT and refuses unless the caller *is* the minor the request
belongs to, then sends through Resend. Without `RESEND_API_KEY` it returns the link in the response
instead of silently dropping the request, so it can be delivered by hand in development.

### 4.4 Confirm

The guardian opens `GET /functions/v1/guardian-consent?token=…`, which renders a self-contained page
— not a route on the marketing site, so the flow works the moment the function is deployed. The page
states plainly that the profile is currently hidden and nobody can message the child, then offers
the three scopes as checkboxes plus **Approve** and **Not right now**.

Submitting calls `public.confirm_guardian_consent(token, allow_discovery, allow_messaging, allow_media)`.
That function is granted to **`anon`** deliberately: a guardian does not have an AceAiX account, and
the unguessable single-use token is the credential. It refuses a token that is not `pending`, and
marks an expired one `expired` rather than granting.

Declining sets the row to `revoked` directly from the edge function.

`private.apply_guardian_consent()` then fires on the status change and recomputes
`user_profiles.is_discoverable` for the minor.

### 4.5 Revoke

`public.revoke_guardian_consent(consent_id)` — callable by the minor, by the linked guardian account,
or by an admin. Sets `revoked`, which trips the same trigger and hides the profile again. There is no
cooling-off period and no confirmation step beyond the app's own sheet: a parent withdrawing consent
must take effect immediately.

### 4.6 Linking a guardian's own account to the consent they gave

The RLS branches on `guardian_consents` that let a guardian read and revoke a consent match on
`guardian_user_id`. Nothing populated that column outside the demo seed, so the guardian half of the
product was permanently empty in production: a parent who signed up could not see the child they had
approved, and could not withdraw approval from inside the app. `20260904000010` connects the two on
the address the consent was sent to, in either order of events:

| Trigger | On | Does |
|---------|----|------|
| `trg_user_private_link_guardian` → `private.link_guardian_account()` | `user_private`, insert or update of `email` | claims every unlinked consent whose `guardian_email` matches, case-insensitively |
| `trg_guardian_consent_link` → `private.link_guardian_on_consent()` | `guardian_consents`, before insert | fills `guardian_user_id` from an existing account with that address |

The migration also backfills both directions for rows that already existed. `functional.sql` →
"guardians can see what they approved" asserts that a guardian account created *after* the consent
is linked to it.

The match is on an e-mail address, and that is worth stating plainly: it is a convenience for the
person who was already sent the token, not an identity check. The token in the e-mail remains the
credential that grants consent (§4.4); linking only decides who can *see and withdraw* it afterwards.
A minor who types an address they control would be linked to their own second account — the same
weakness the consent flow already has, not a new one.

### 4.7 What a linked guardian can read

Two RPCs, both `SECURITY DEFINER`, both granted to `authenticated` only.

**`public.my_linked_minors()`** — one row per young person, not one per consent request:
`minor_user_id`, `full_name`, `avatar_url`, `age_band`, `consent_id`, `status`, the three
`allow_*` flags and `granted_at`. A `distinct on (minor_user_id)` with granted ordered ahead of
pending ahead of everything else, so a minor who asked, was refused, and asked again shows the
consent that is actually in force. Typed as `LinkedMinor` in `mobile/types/models.ts`.

**`public.guardian_conversation_overview(minor_user_id)`** — see §6.1.

Both are scoped by `guardian_user_id = auth.uid()`; the overview additionally requires a `granted`
consent and raises `42501` for anyone else. `functional.sql` asserts that a stranger calling it is
refused.

---

## 5. Discovery gating

Three layers, and they are not redundant:

**The flag.** `sync_age_state` and `apply_guardian_consent` are the only writers of
`is_discoverable` for a minor. It is `true` only while a granted consent with `allow_discovery` exists.

**The filter.** Every RPC that can put a name in front of a stranger carries the same clause:

```sql
and (coalesce(up.is_minor, false) = false or coalesce(up.is_discoverable, false))
```

| Surface | RPC | Also excludes |
|---------|-----|---------------|
| Recruiter search and its filters | `public.discover_athletes` | blocked pairs (either direction), suspended accounts, the viewer |
| "Matched for you" | `public.recommended_athletes` | delegates entirely to `discover_athletes` |
| Name search, from `/search` and the coach list | `public.search_people` | blocked pairs, suspended accounts, the caller |
| The public ranking on Discover | `public.talent_leaderboard` | blocked pairs, suspended accounts, athletes not open to offers |

The last two were added by `20260904000010`. Before it, `talent_leaderboard` filtered on sport,
country and `is_open_to_offers` only, so a non-consented minor appeared on a ranked list, by name and
avatar, to every signed-in account; and name search read `user_profiles` straight from the client,
which skipped the gate entirely. `functional.sql` → "no route around the discovery gate" now asserts
all four surfaces against the same minor, with consent revoked and then restored.

**Why `search_people` exists rather than a tighter RLS policy.** `up_select_authenticated` is
`using (true)` and has to be: a signed-in user must be able to load the profile of the person they
are already in a conversation with, the author of a post in their feed, or an applicant to their own
posting. Reading *a* profile is not the same act as *searching* for one. The RPC draws that line —
`revoke all … from public, anon; grant execute … to authenticated` — and the client's `searchPeople`
now calls it instead of building a query. See §11 for the one browse path that still reads the table
directly.

**The guard.** `private.guard_minor_visibility()` runs `BEFORE UPDATE` on `user_profiles` and raises
`42501` with hint `guardian_consent_required` if a minor's `is_discoverable` is being flipped from
false to true without a granted discovery consent. This is what makes the privacy-settings toggle
safe: the client can offer it, and the database refuses it. `lib/errors.ts` turns that hint into
"A parent or guardian needs to approve your profile before it can appear in search."

**Anonymous readers see no minors at all.** `up_select_anon` and `ap_select_anon` restrict the `anon`
role to `not is_minor and not is_suspended` on `user_profiles` and `athlete_profiles`.

---

## 6. `private.can_message(sender, recipient)`

One function decides every messaging permission. It is called by `start_conversation`, by the
`BEFORE INSERT` trigger on `conversations` (so a direct PostgREST insert is checked too), by
`can_message_user` for the UI pre-flight, and by `get_profile_bundle` to decide whether the Message
button renders at all.

Evaluated in order — the first `false` wins:

| # | Branch | Returns false when |
|---|--------|--------------------|
| 1 | Sanity | either id is null, or sender = recipient |
| 2 | Existence | either profile row is missing |
| 3 | Suspension | either account is suspended |
| 4 | Blocks | a `user_blocks` row exists in **either** direction |
| 5 | Inbox: nobody | `recipient.allow_messages_from = 'nobody'` |
| 6 | Inbox: following | `= 'following'` and the recipient does not follow the sender |
| 7 | Inbox: verified | `= 'verified'` and the sender is neither verified nor followed by the recipient |
| 8 | **Adult → minor** | the recipient is a minor and the sender is not, and either the sender is not a *verified adult professional* or the minor has no granted `allow_messaging` consent |
| 9 | **Minor → adult** | the sender is a minor and the recipient is not, and the recipient is neither verified nor already followed by the minor |
| — | otherwise | true |

Two definitions matter:

- `private.is_verified_adult(user)` is `is_verified AND NOT is_minor AND role IN (coach, scout, club, federation, org_admin, admin, medical_partner)`. A verified adult **athlete** is not a verified adult for this purpose — the exception exists for professionals with a reason to contact a young player, not for adults in general.
- `v_follows` in branches 6–8 is *the recipient follows the sender*. Branch 9 checks the other
  direction (the minor follows the adult), which is what lets a fifteen-year-old write to their own
  club.

**Minor → minor** has no branch of its own, so it falls through to the inbox rules — and since every
minor is forced to `allow_messages_from = 'verified'`, one minor can only write to another if the
recipient already follows them. The header comment at the top of `20260904000002` still says "minors
can always talk to other minors they follow", which is the wrong direction. The `COMMENT ON FUNCTION`
attached to `private.can_message` in `20260904000010` is the corrected description, and it is the one
`\df+ private.can_message` prints:

> Whether p_sender may open a conversation with p_recipient. Blocks and the recipient's inbox setting
> are checked first. An adult may write to a minor only when they are a verified professional and the
> guardian allowed messaging; a minor may write to an adult only when that adult is verified or the
> minor already follows them.

The code is what runs; where the two comments disagree, the `COMMENT ON` is the accurate one.

`public.can_message_user(recipient)` returns `{allowed, reason}` so the UI can explain a disabled
button before the tap instead of failing after it. The reasons —
`minor_requires_verified_sender`, `minor_requires_guardian_consent`, `recipient_messages_off`,
`recipient_only_accepts_followed`, `recipient_only_accepts_verified`, `not_found` — each map to
written copy in `components/messaging/MessageBlockedCard.tsx`, which replaces the composer.

When the other person is under 18, `components/messaging/MinorSafetyBanner.tsx` sits above the
composer. It is not dismissible: a banner you can swipe away stops being a disclosure.

### 6.1 What that banner promises, and what now keeps the promise

The banner tells an adult that the young person's parent or guardian can see that this conversation
exists. Until `20260904000010` no schema object gave a guardian that view, so it was a safety claim
the product could not honour. `public.guardian_conversation_overview(minor_user_id)` implements
exactly it, and nothing more:

| Returns | Deliberately absent |
|---------|---------------------|
| `conversation_id` | any message body |
| `other_name`, `other_role`, `other_verified` | any attachment or preview |
| `message_count` | who said what, or when each message was sent |
| `last_message_at` | the ability to reply, or to open the thread |

Access: the caller must hold a **granted** consent for that minor as `guardian_user_id`, or be an
admin. Anyone else gets `42501 — Not a linked guardian for this account`.

The line between "a conversation exists, with a named verified coach, 12 messages, yesterday" and
"here is what your child wrote" is the whole design. A parent who can read a teenager's messages
changes what the teenager will say in them, and the product would then be a surveillance tool that
happens to have a talent score attached. The overview gives a guardian enough to ask a question at
home, and nothing to read behind the child's back.

It surfaces in `mobile/app/settings/guardian.tsx` → `ConversationOverview`, rendered inside each
granted link's card and **only when `allow_messaging` is on** — if a guardian did not approve
messaging, there is nothing to oversee. The section ends with the sentence "AceAiX does not show you
the contents of their messages", so the limit is stated to the guardian rather than left to be
discovered. The client wrapper is `guardianConversationOverview()` in `mobile/lib/api.ts`, typed as
`GuardianConversation`.

---

## 7. What is never exposed about a minor

| | |
|---|---|
| **Date of birth** | Never leaves `user_private`, which is readable only by its owner and admins. No RPC returns it. |
| **Exact age in years** | Every RPC that carries an age returns `null` for a minor and the band instead — `get_profile_bundle`, `discover_athletes`, `recommended_athletes`, `opportunity_applicants`. Adults still return exact years. |
| **Precise location** | `city` / `country` only; there is no coordinate, address or postcode column anywhere in the profile path. |
| **E-mail and phone** | `user_private`, never joined into a public read. |
| **The daily score curve** | `talent_score_history` is selectable only by the owner or an admin. |
| **Message contents, even to a guardian** | `guardian_conversation_overview` returns names and counts only (§6.1). |
| **Existence, to a logged-out visitor** | The `anon` RLS policies exclude minors from `user_profiles` and `athlete_profiles`. |

### 7.1 Age: what leaves the server, and what does not

This changed in `20260904000010` and the old wording of this section is no longer true. Until then
`discover_athletes` and `opportunity_applicants` returned a minor's exact age in years, and the cards
rendered it as `Age 14`. Now:

```sql
/* Exact years for adults; nothing for a minor. */
case when s.is_minor then null else s.real_age end,
s.age_band,
```

Three consequences, and they are separable:

1. **What is shown** is the band. `mobile/lib/format.ts → ageBandLabel()` turns `13_15` into
   "Age 13–15"; `components/discover/AthleteCard.tsx` and
   `components/opportunities/ApplicantRow.tsx` render the exact age when the server sent one and
   fall back to the band when it did not. `age: number | null` and `age_band: AgeBand | null` are on
   `DiscoveredAthlete`, `Applicant` and `AthleteProfile` in `types/models.ts`, with the null case
   documented on each.
2. **What can be filtered** is still the true date of birth. `p_age_min` / `p_age_max` are applied
   inside the CTE against `real_age` before the projection drops it, so a coach recruiting an U16
   squad still gets the right people back — they simply are not told which of them is 14 and which is
   15. `functional.sql` asserts both halves: an age filter of 13–16 matches the seeded minor, 18–30
   does not, and the returned `age` is null either way while `age_band` is `13_15`.
3. **What is not affected** is adults. An 18-year-old still comes back with an exact age, asserted by
   the same test section.

So the accurate sentence, and the one to use in user-facing copy, is: **"a minor's date of birth and
exact age are never shown to another user; other people see a band such as Age 13–15."** That is what
`mobile/lib/legal/privacy.ts` and both store listings now say. The older, weaker formulation — "only
the date of birth is truly private" — described the code before this migration and should not be
reintroduced.

An age band is still information about a child, and consent still governs whether the row is
returned at all: without a granted discovery consent the minor is not in the result set, so there is
no band to read either.

### 7.2 One thing that is *not* private: the media file itself

The `posts` bucket is public. It was created private and flipped by
`20260904000007_release_fixes.sql:25`, because the feed and profile highlights build plain public
URLs and every image and clip 404'd for every viewer while it was private. Object paths carry an
unguessable UUID, and **who can find a post is still decided by `posts.audience` and RLS** — but the
file behind a URL that has leaked is readable without a session.

This is why `allow_media` is a separate consent scope from `allow_discovery`: a guardian who does not
want photographs and video of their child on the platform can refuse that without refusing the
profile. If the bucket ever needs to be tighter than that, the change is signed URLs through the feed
read path, not a flag. Recorded in [15 §3](./15-known-gaps.md) as accepted for now.

---

## 8. Reporting, moderation and blocking

### Reporting

`public.report_content(entity_type, entity_id, reason, details)` — the only write path into
`moderation_reports` (client `UPDATE` on that table is revoked entirely).

- Entity types: `post`, `comment`, `user`, `message`, `opportunity`, `story`.
- Reasons: `spam`, `harassment`, `nudity`, `violence`, `hate`, `impersonation`, `child_safety`,
  `scam`, `other`. Anything else raises.
- It resolves the **account behind** the reported object into `reported_user_id`, so a moderator
  acting on a comment can act on its author.
- Severity is assigned server-side: `child_safety` → `high`; **anything where either the reporter or
  the reported user is a minor** → `high`; harassment / nudity / violence / hate → `medium`; else
  `low`. `is_minor_related` is stored alongside so the queue can be filtered.
- **High severity takes the content down immediately**: a reported post becomes
  `moderation_state = 'under_review'` and `is_hidden = true`, a comment `is_hidden`. It stays down
  until a human clears it. Being wrong for a few hours costs a post; being right and slow costs
  something else.

Hidden and under-review content disappears from `posts_select` / `post_comments_select` RLS, from
`get_feed` and from `get_user_posts` — except for its own author, who still sees it and is not told
it is hidden.

Review itself happens in the **web portal** (`web/src/pages/admin/ModerationPage.tsx`). The mobile
app has no moderator surface and is not expected to grow one.

### Blocking

`public.block_user(target)` does three things, not one:

1. inserts the `user_blocks` row;
2. deletes any `follows` row **in both directions**;
3. deletes existing `notifications` between the two accounts in both directions.

A block that leaves the follow in place, or leaves yesterday's "X liked your post" sitting in the
tray, is not a block. `unblock_user` removes only the block row — the follows are not restored.

Blocks are then honoured in every read path: `posts_select`, `post_comments_select`, `get_feed`,
`get_user_posts`, `discover_athletes`, `get_conversations`, `recommended_opportunities`,
`get_profile_bundle` (which returns a `{blocked: true}` stub rather than a profile),
`private.can_message`, `private.notify` (no notification is generated across a block), and
`toggle_follow` (refuses outright).

`/settings/blocked` lists them with an unblock action.

### Rate limits

`private.enforce_rate_limit()` runs `BEFORE INSERT` on four tables. Exceeding a limit raises `54000`
with hint `rate_limited`, which `lib/errors.ts` renders as "You are doing that too quickly."

| Table | Limit |
|-------|-------|
| `messages` | 30 per minute |
| `posts` | 20 per hour |
| `post_comments` | 15 per minute |
| `follows` | 120 per hour |

The service role is exempt, so seeds and back-office jobs are unaffected. These are set to catch
scripted abuse and a compromised account, not to discipline an enthusiastic teenager — a person
typing by hand will not reach any of them.

---

## 9. Column-level privileges

Postgres cannot subtract a column from a table-wide `UPDATE` grant, so the pattern throughout is:
**revoke the table grant, then grant back only the columns a user genuinely owns.** Everything else
is written exclusively by `SECURITY DEFINER` code.

| Table | Client may update |
|-------|-------------------|
| `user_profiles` | `full_name`, `first_name`, `middle_name`, `last_name`, `avatar_url`, `bio`, `city`, `country`, `locale`, `is_discoverable`, `allow_messages_from`, `onboarding_completed`, `last_active_at` |
| `athlete_profiles` | sport / positions / physicals / `birth_date` / nationality / club / level / league / bio / `is_open_to_offers` / cover / stats blobs / external provider handles |
| `posts` | `caption`, `text`, `media`, `tags`, `audience`, `image_url` |
| `post_comments` | `body` |
| `notifications` | `is_read`, `read` |
| `athlete_media` | `storage_url`, `thumbnail_url`, `title`, `description`, `is_featured`, `is_public` |
| `guardian_consents` | select + update only (rows are created by RPC, never deleted) |
| `talent_scores`, `talent_score_history` | **select only** |
| `moderation_reports` | **no update at all** |

Not in any grant, and therefore unwritable by a client: `is_minor`, `age_band`, `is_verified`,
`is_suspended`, `suspended_reason`, `role`, `followers_count`, `following_count`, every score column,
`moderation_state`, `is_hidden`, `removed_reason`.

Why privileges rather than a trigger that raises: a privilege cannot be talked around by a crafted
request, it costs nothing at runtime, and the internal `SECURITY DEFINER` syncs still need to write
those same columns — a trigger strict enough to stop a user would also have to special-case every
internal writer.

Triggers back this up where a grant is not expressive enough:

| Trigger | Refuses, or repairs |
|---------|---------------------|
| `private.prevent_profile_privilege_escalation` | changing `is_verified` or `subscription_tier` |
| `private.prevent_org_self_verification` | a club marking itself verified |
| `private.prevent_sports_identity_change` | reassigning a linked external player id |
| `private.guard_minor_visibility` | a minor turning on their own discoverability; and it rewrites `allow_messages_from = 'everyone'` back to `verified` |
| `private.guard_application_status` | an athlete promoting their own application (they may only withdraw); a club withdrawing on the athlete's behalf |
| `private.mirror_birth_date_to_private` | *repairs*: a `birth_date` edit is pushed back into `user_private`, so it runs through the age checks (§3.1) |

`birth_date` is the one column in the athlete grant that is also a safety input, which is why it
needs a trigger rather than a privilege: an athlete genuinely owns their own birth date and must be
able to correct it, but the correction has to be governed rather than merely stored.

**Application statuses.** `applications.status` is constrained to the six the client actually
speaks — `applied`, `in_review`, `shortlisted`, `invited`, `rejected`, `withdrawn`
(`20260904000007`). Before that the constraint carried a different vocabulary and rejected four of
the six, including `withdrawn`, so an athlete had no way to take an application back — which is a
thing App Store reviewers look for. `guard_application_status` then splits the transitions: the
athlete may only reach `withdrawn` (or return to `applied`), and the club may do everything except
withdraw on their behalf. `functional.sql` asserts both directions.

Role escalation through signup metadata is closed too: `private.handle_new_user` reads the requested
role from `raw_user_meta_data` and forces anything in `admin`, `org_admin`, `medical_partner` or
`federation` back to `athlete`.

### 9.1 Deletion

`public.delete_own_account()` runs as the caller's own account and, since `20260904000010`, deletes
three things in order:

1. every object in the `avatars`, `posts` and `stories` buckets whose first path segment is the
   caller's user id — uploads are stored under a folder named for the account, so
   `(storage.foldername(name))[1] = requester::text` finds all of them;
2. `public.user_profiles` for that id, which cascades to posts, comments, media, messages, follows,
   applications, talent scores and history, push tokens and guardian consents;
3. `auth.users`.

Previously only steps 2 and 3 ran, and every photo and clip the person had uploaded stayed in
storage after they deleted their account. Apple guideline 5.1.1(v) and the Privacy Policy both say
otherwise, so this was a real defect and not a tidy-up.

What survives on purpose: `moderation_reports.reporter_id` and `.reported_user_id` are
`on delete set null`, so a child-safety report outlives the account it concerns. What does **not**
survive, and is a decision worth knowing about: `guardian_consents.minor_user_id` is
`on delete cascade`, so the consent evidence goes with the account (§11).

---

## 10. What a reviewer or a parent asks, and where the answer is

| Question | Answer lives in |
|----------|-----------------|
| Can a child under 13 sign up? | `private.sync_age_state` (§2); `functional.sql` asserts the raise. |
| How do you know a parent actually consented? | `guardian_consents` row with `granted_at`, `consent_method = 'email_confirmation'` and the token that was used (§4); the flow is the `guardian-consent` edge function. |
| Can a stranger message my child? | `private.can_message` branch 8 (§6): verified professional **and** granted messaging consent. Everything else is refused at the database. |
| Can I change my mind? | `revoke_guardian_consent`, or `safety@aceaix.com`. Takes effect on the next read (§4.5). From inside the app if the guardian holds an account (§4.6). |
| Is my child's birthday visible? Their age? | Neither. `user_private` RLS holds the date; every RPC that carries an age returns `null` for a minor and a band such as `13_15` instead (§7.1). Age *filters* still work on the real date, so a recruiter can search U16 without being told anyone's age. |
| Can I see who my child is talking to? | Yes, if you hold the account the consent was sent to: Settings → Athletes you look after. Names, roles and message counts — never the messages (§6.1). |
| Can I see what they wrote? | No. That is deliberate and there is no setting for it (§6.1). |
| Where is the report button? | Every post and comment (`ContentActionsSheet`), every profile (`ProfileHeader`), every opportunity, and every conversation — where the sheet reports the sender (`PeerActionsSheet`). All four call `report_content` (§8). |
| What happens to a child-safety report? | Immediate removal from circulation, `high` severity, human review in the web portal (§8). |
| Where are your child-safety standards? | `/legal/child-safety` in the app — `mobile/lib/legal/childSafety.ts`, shipped as a string so it reads with no network. Also `/legal/terms`, `/legal/privacy`, `/legal/guidelines`. |
| Can a user delete everything? | `/settings/delete-account` → `public.delete_own_account`, which now removes uploaded files as well as rows (§9.1). `/settings/account` also offers a full JSON export (`exportMyData`). |
| Who can see a minor when logged out? | Nobody. `up_select_anon` / `ap_select_anon` (§5). |

---

## 11. Known gaps

Stated honestly, because the next person to work on this needs the real picture. The prioritised,
whole-product version of this list is [15 — Known gaps](./15-known-gaps.md); what follows is the
youth-safety subset with the detail an engineer needs.

### What was here before, and is now closed

Six items from the previous revision of this list were fixed in
`20260904000010_close_minor_exposure_gaps.sql` and are gone: the ungated `talent_leaderboard` (§5),
name search bypassing the gate (§5), a minor's exact age in discovery and applicant lists (§7.1),
the unpopulated `guardian_user_id` (§4.6), the safety banner's unbacked promise (§6.1), and the two
birth dates drifting apart (§3.1). Deletion leaving files in storage was fixed in the same migration
(§9.1). Do not reintroduce them into user-facing copy or into this document.

### Still open

1. **Age is self-declared and re-declarable.** Nothing verifies a date of birth. The owner can update
   `date_of_birth` at any time and `sync_age_state` will recompute a 16-year-old into an adult; the
   mirror trigger (§3.1) means editing `athlete_profiles.birth_date` does the same thing, correctly
   but just as freely. The only hard floor is the under-13 raise. Verifying age properly (a document
   check, a card-based check, or a third-party provider) is the single largest improvement available,
   and it is what would let the messaging rules be tightened rather than merely enforced. **Owner:
   product — this is a cost and a friction decision before it is an engineering one.**
2. **Consent evidence is thin.** `consent_ip` and `consent_user_agent` exist and are never written;
   the retained evidence is the token, the timestamp, the e-mail address and
   `consent_method = 'email_confirmation'`. Populating them in the `guardian-consent` edge function
   is a few lines and materially improves an audit. Owner: backend.
3. **Guardian consent records are deleted with the account.** `guardian_consents.minor_user_id` is
   `on delete cascade`, so when a minor deletes their account the evidence that consent was given
   goes too. That is defensible — it is the more privacy-protective behaviour, and the account it
   concerned no longer exists — and the Privacy Policy has been corrected to say so rather than to
   claim retention. If a compliance obligation later requires keeping it, the constraint has to
   change and the policy has to change back. Owner: legal.
4. **E-mail confirmation is not verifiable parental consent.** It meets a "reasonable effort"
   standard in several regimes but would not satisfy COPPA for under-13s — which is part of why we
   do not accept under-13s at all. If the floor ever moves, the consent mechanism has to move first.
5. **Consent never expires or re-confirms.** The *token* expires after 14 days; a granted consent
   does not. A parent who approves a 13-year-old is still the recorded consent at 17. An annual
   re-confirmation, or a re-confirmation on the `13_15` → `16_17` transition, would be reasonable.
6. **The guardian link is only as strong as an e-mail address.** `guardian_user_id` is set by
   matching `guardian_email` against `user_private.email` (§4.6). A minor who nominates an address
   they themselves control is linked to their own second account. This is the same weakness the
   consent flow already had — the token goes to that address either way — but it is now also the
   route to the conversation overview, so it is worth naming.
7. **One browse path still reads `user_profiles` directly.**
   `mobile/lib/api.discover.ts → listCoaches` goes through `search_people` when there is a search
   term, but with an empty term it lists coaches straight from the table, filtered only on
   `role = 'coach'` and `is_suspended = false`. Role is chosen at sign-up and nothing stops a 15-year-
   old choosing `coach`, so a non-consented minor holding a coach account would appear in that list.
   The fix is either an RPC for the browse case too, or a minor/discoverability filter on the query.
   Owner: mobile + backend.
8. **No automated content scanning.** There is no image, video or text classifier anywhere in the
   pipeline. Every removal is either a user report or a moderator action. For a product where minors
   upload video, this is the gap most likely to be raised in a store review.
9. **No age-based feed filtering.** A minor's feed is filtered for blocks, suspensions, audience and
   moderation state, but not for the age-appropriateness of what an adult account posts.
10. **Nobody is named as the moderation queue.** The Child Safety Standards document says child
    reports are the first thing the team looks at each day. Somebody has to actually be that person,
    with a response-time commitment. **Owner: whoever runs operations — this is a staffing decision,
    not an engineering one.**
11. **No CSAM reporting body is named.** The legal text says "the relevant authorities". Google Play
    asks specifically how CSAM is reported, and whether AryAiX registers with NCMEC or an equivalent
    is undecided. **Owner: legal.**

---

## 12. Related documents

- [10 — Mobile App Architecture](./10-mobile-app.md) — where these rules surface in the UI.
- [11 — The Talent Score](./11-talent-score.md) — the number a discovery search ranks on.
- [13 — Store Submission](./13-store-submission.md) — the compliance answers Apple and Google ask
  for, which draw on §10 of this document.
- [14 — Local Development](./14-local-development.md) — running `functional.sql`, which asserts most
  of this document.
- [15 — Known gaps](./15-known-gaps.md) — §11 of this document, prioritised alongside everything
  else still open.
- [03 — Data Model](./03-data-model.md) — the full schema and RLS baseline.
