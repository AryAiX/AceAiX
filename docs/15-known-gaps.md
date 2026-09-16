# 15 — Known gaps

> One honest list of everything still open, in the order it has to be dealt with. This is the
> document the team works from; the others explain the machinery, this one says what is missing from
> it.
>
> Every entry names an owner and a one-line reason. Where the answer is a decision rather than a
> task, it says who has to make it — an item with no owner is not a plan.
>
> Rule for keeping this file honest: **an item leaves this list only when the code changes**, and it
> is struck in §4 rather than deleted, so nobody re-opens it from an older copy of another document.

---

## 1. Before submission

Each of these will fail a review, or make a claim we cannot support. They are ordered by what blocks
what.

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | **Publish `https://aceaix.com/child-safety`.** | Web | **Code done, needs a deploy.** `web/src/pages/legal/LegalPages.tsx` renders it at `/child-safety` from the app's own `mobile/lib/legal/childSafety.ts`, through a Vite alias — so the page and the app can no longer disagree. Deploying `web/` publishes it. |
| 2 | **Publish an account-deletion web page.** | Web + legal | **Code done, needs a deploy.** `/delete-account` names both routes (in-app, immediate; by email, 3 working days to confirm and 30 to complete), lists exactly what is deleted and what is kept, and says deletion cannot be undone. |
| 3 | **Publish `https://aceaix.com/guidelines`.** | Web | **Code done, needs a deploy.** `/guidelines`, same shared source. |
| 4 | **Fix the iOS privacy manifest.** | Mobile | **Done.** `NSPrivacyCollectedDataTypeUserContent` → `OtherUserContent`, and the six under-declared types added: CoarseLocation, UserID, DeviceID, ProductInteraction, Fitness, OtherDataTypes. Fitness is declared deliberately — minutes played and height/weight are fitness data, and under-declaring is the failure mode Google's automated checks catch. |
| 5 | **Decide whether `talent-insights` ships with `ANTHROPIC_API_KEY` set**, then make the store answers match. | Legal | **OPEN — your decision.** The function works either way; without a key it writes from a template, and `tools/local-supabase/server.mjs` now serves the same template locally so the screen reads the same in development. If you set the key, Data safety and App Privacy must both say personal data goes to a third-party AI provider. |
| 6 | **Decide the Play "approximate location" and "Fitness info" answers**, and keep Play, Apple and the manifest consistent. | Legal + mobile | **Half done.** The iOS manifest now declares both. Play's form still needs the same two answers ticked to match. |
| 7 | **Re-publish `https://aceaix.com/privacy`** from the current app text. | Web | **Structurally fixed.** `/privacy` and `/terms` now render `mobile/lib/legal/` instead of a second hand-written copy, so this can never fall out of date again. Needs the same deploy as 1–3. |
| 8 | **All screenshots.** | Design | **Done.** 36 images in `store-assets/screenshots/`, at every required size, in English and Arabic. `node mobile/tests/e2e/store-screenshots.mjs` regenerates them from the preview build — no simulator, no device, and repeatable when a screen changes. Every account shown is an adult. |
| 9 | **A Play icon with an alpha channel.** | Design | **Done.** `store-assets/play/icon-512.png` (512×512 RGBA), plus `store-assets/app-store/icon-1024.png` (1024×1024, no alpha, as Apple requires) and the Play feature graphic at 1024×500. |
| 10 | **Store credentials and contacts**: Play service account key, App Store Connect API key, review contact name and phone number. | Whoever holds each account | **OPEN — nothing in a repository can supply these.** Apple requires a contact and will call. |
| 11 | **Decide whether AryAiX registers with NCMEC or an equivalent body.** | Legal | **OPEN — your decision.** The published text says "the relevant authorities"; Play's Child Safety Standards form asks specifically. |
| 12 | **Name who is on the moderation queue, and the response-time commitment.** | Operations | **OPEN — your decision.** The Child Safety Standards document says child reports are the first thing the team looks at each day. Somebody has to actually be that person, and a reviewer may ask who. |
| 13 | **Decide email confirmations on or off** for the hosted Supabase project. | Product + backend | **OPEN — your decision.** |
| 14 | **Populate `consent_ip` and `consent_user_agent`**, or correct the migration comment. | Backend | **OPEN.** The comment still describes something the code does not do. |

### Closed since the last revision

**The `private` schema was reachable by every signed-in account.**
`0001_init_extensions_enums.sql` created it with the comment "NOT exposed via
Data API" and then granted `USAGE` on it to `anon` and `authenticated` on the
next line; PostgreSQL's default `EXECUTE`-to-PUBLIC did the rest, leaving 62 of
69 helpers — `private.notify`, `private.award`,
`private.refresh_talent_score` — callable by anyone signed in. Nothing exploited
it, because PostgREST is configured with `db-schemas = "public"` and will not
route elsewhere. But one line of server configuration was the only thing
standing between a teenager's account and a function that forges notifications.
`20260907000006_close_the_private_schema.sql` revokes it, and
`supabase/tests/functional.sql` now asserts the schema is unreachable, that every
public table has RLS on, and that every SECURITY DEFINER function pins its
`search_path`.

**The tab bar was never translated.** Five hard-coded English labels and four
hard-coded accessibility labels in `app/(tabs)/_layout.tsx`, in an app that
ships seven languages. Found by looking at an Arabic store screenshot.
`tests/unit/i18n.test.ts` now also checks that every `t('…')` key a screen asks
for exists in English — 1,328 assertions, which is what caught a second one.

---

## 2. Before scale

Not blockers for a first release; each becomes a problem as soon as there are real users in real
numbers.

| # | Item | Owner | Why it matters later |
|---|------|-------|----------------------|
| 1 | **No automated content scanning.** No image, video or text classifier anywhere; every removal is a user report or a moderator action. | Product + backend | Fine at seed scale with a human on the queue. At volume, "we look at reports" stops being a moderation system, and it is the gap most likely to be raised in a store review of a product where minors upload video. |
| 2 | **Age is self-declared and re-declarable.** The only hard floor is the under-13 raise; a 16-year-old can re-declare as an adult. | Product | Every minor protection hangs off a number the user typed. Real age assurance is what would let the messaging rules be tightened rather than merely enforced — and it is a cost and friction decision before it is an engineering one. |
| 3 | **Consent never expires or re-confirms.** The token expires after 14 days; a granted consent does not. | Backend | A parent who approved a 13-year-old is still the recorded consent at 17. An annual re-confirmation, or one on the `13_15` → `16_17` transition, is the obvious fix. |
| 4 | **`listCoaches` with an empty term reads `user_profiles` directly**, filtered only on `role = 'coach'` and `is_suspended`. Every other people-naming path goes through an RPC. | Mobile + backend | Role is chosen at sign-up, so a minor holding a coach account would appear in that browse list without guardian consent. Small hole, same class as the ones `20260904000010` closed. |
| 5 | **No age-based feed filtering.** A minor's feed is filtered for blocks, suspensions, audience and moderation state, but not for the age-appropriateness of what an adult posts. | Product | Depends entirely on adult accounts behaving. That holds until it does not. |
| 6 | **Deep-link association files are not served.** No `.well-known/apple-app-site-association`, no `assetlinks.json` in `web/public/`. | Web | Universal Links and Android App Links will not verify; links open the browser instead of the app. Not a review blocker, just a broken feature. |
| 7 | **`algorithm_version` is never bumped.** It defaults to 1 and nothing writes it. | Backend | The moment the score formula changes materially, historical rows become uninterpretable without it. |
| 8 | **Sport-blind performance scoring.** The formula is shaped around goals and assists, so the 30-point output term is unreachable in chess, athletics or swimming. `constants/sports.ts` already knows each sport's metrics; the scorer does not use them. | Product + backend | The single largest weakness in the Talent Score, and it grows with every non-football sport onboarded. |
| 9 | **Engagement is cheap to game.** Posting daily and following broadly moves 20% of the score with no sporting content. | Product | Caps and the log limit the damage now; at scale it becomes a visible incentive. |
| 11 | **Notification titles and bodies are English in every language.** The triggers in `20260904000004_notifications_and_counters.sql` concatenate a finished sentence at insert time (`<name> started following you`, `Your application to <title> is now <status>`), so `NotificationRow` has no key to look up and renders `n.title` verbatim. | Backend + mobile | The most-read untranslated surface in the app, and the one an Arabic reader meets first. Fix: store the type plus its parameters in the existing `data` jsonb and compose the sentence on the client from a per-type key — which also fixes word order, which no client-side surgery on a finished sentence can. See [16 §11.1](./16-internationalisation.md). |
| 12 | **Talent Score tips are English in every language.** `private.build_score_tips` writes `label` and `detail` as English literals into `talent_scores.tips`, so the text is stored, not just rendered. | Backend + mobile | `tip.key` already exists and already drives the (translated) action button, so the client is halfway there. Fix: emit `key`, `points`, `pillar` and a small `params` object and look the copy up from `score.tips.<key>.*`. Existing rows need a recompute, or a fallback to the stored English. See [16 §11.2](./16-internationalisation.md). |
| 13 | **The `guardian-consent` edge function's web page is English only.** | Backend | It is read by a parent who may not have the app installed, and it has no access to the app's catalogues. Lower priority than 11 and 12, but it is the one page in the product that a non-user is asked to act on. |
| 14 | **Portuguese and Persian are not shipped**, although Brazil, Portugal and Iran are all in `PRIORITY_COUNTRIES`. | Product | Both fall back to English. Persian is also right-to-left, so it is not a copy of an existing catalogue. Adding a language is mechanical ([16 §12](./16-internationalisation.md)); deciding which is not. |

---

## 3. Accepted for now

Known, deliberate, and not planned. Listed so that "we know" is written down and nobody rediscovers
them as surprises.

| # | Item | Why it is accepted |
|---|------|--------------------|
| 1 | **Guardian consent records are deleted with the account** (`guardian_consents.minor_user_id` is `on delete cascade`). | Deleting the evidence along with the account is the more privacy-protective behaviour, and the account it concerned no longer exists. The Privacy Policy now says exactly this. Revisit only if a compliance obligation requires the record to outlive the account — then the constraint and the policy change together. Owner if that day comes: legal. |
| 2 | **E-mail confirmation is not verifiable parental consent.** | It meets a "reasonable effort" standard in several regimes but would not satisfy COPPA — which is why under-13 accounts do not exist at all. If the age floor ever moves, the consent mechanism has to move first. |
| 3 | **The guardian link is an e-mail match.** `guardian_user_id` is set by matching `guardian_email` against the address on an account. | A minor who nominates an address they control is linked to their own second account. This is the same weakness the consent flow already had — the token goes to that address either way — so the link adds no new exposure. Worth naming because it is now also the route to the conversation overview. |
| 4 | **`up_select_authenticated` is `using (true)`.** Any signed-in account can read any profile row. | It has to be: a conversation, a feed post and an applicant list all need the other person's profile to load. The distinction that matters — reading *a* profile versus *searching* for one — is drawn at the RPC layer instead (`search_people`, `discover_athletes`, `talent_leaderboard`). |
| 5 | **Reanimated is stubbed out.** | Expo Go bundles a fixed native worklets version that disagrees with most Reanimated releases and crashes on launch. The design needs no gesture-driven animation, so the trade is: lose Reanimated, keep Expo Go and the ability to hand anyone a QR code. |
| 6 | **Posts, followers and profile views do not trigger a score recompute.** | The write volume would be enormous and the value marginal. Those parts of the score move on the next recompute or when the athlete pulls to refresh — which is why the score screen has pull-to-refresh at all. |
| 7 | **The percentile lags, and is hidden below a cohort of ten.** | It is recomputed only when the athlete's own row is refreshed, so it reflects the cohort as it was at that moment; and "Top 50%" from a cohort of three is worse than saying nothing. Expect no percentile at all on a fresh install. |
| 8 | **The `posts` bucket is public**, so a post's media file is readable by anyone holding its URL, including a signed-out visitor. | Made public by `20260904000007` because the feed and profile highlights build plain public URLs and every image 404'd while it was private. Paths carry an unguessable UUID, and who can *find* a post is still governed by `posts.audience` and RLS — but a leaked URL is a leaked file. Moving to signed URLs is the fix if this ever needs to be tighter, and it is a real change to the feed's read path, not a config flip. Owner if revisited: backend. |
| 9 | **The `stories` bucket is private and unused by the 1.0 client.** | Stories are ephemeral by design and are not in the shipped app. The bucket and its policies exist; nothing reads them. |
| 10 | **`user_private.phone` exists and is always null.** | It is populated from `auth.users.phone`, and the app signs people up with email and password only. Re-confirm before each submission rather than removing the column. |
| 11 | **No third-party analytics, crash or attribution SDK.** | Deliberate: the app's only network destination is its own Supabase project, which is what makes the Data safety answers simple and true. The cost is that production problems are found from user reports, not dashboards. |
| 12 | **The four legal documents exist only in English.** Terms, Privacy Policy, Community Guidelines and Child Safety Standards in `mobile/lib/legal/` are shipped as English strings and are not translated, even though the rest of the app is available in seven languages. | A translated legal document is either a second binding text or a misleading one, and which of those it is is a lawyer's decision rather than an engineering one. Until someone qualified signs off on a translation, the English text is the version that applies — and the app says so rather than leaving it to be discovered: `components/settings/LegalDocument.tsx` renders `language.legalEnglishOnly` above the document whenever the language is not English, and the same line appears on the first-launch language gate and on `/settings/language`. That notice **is** translated into all seven. Revisit when there is legal capacity to review a translation per market; the mechanism to ship one already exists. Owner if that day comes: legal. |
| 13 | **The store listing copy is written only in English.** Both stores accept localised listings; `docs/store/*.md` holds one language. | Separate from the app being translated, and a lower bar: an untranslated listing is a marketing cost, not a broken product, and a machine-translated one in a market the team cannot read is worse than none. The seven supported languages are still **declared** in both consoles so the app surfaces in those locales ([13 §4.1](./13-store-submission.md)). Owner if revisited: product. |

---

## 4. Closed — do not re-open from an older document

These appeared on earlier versions of this list, in `12 §11`, or in
`docs/13-store-submission.md` §0. They are fixed in code. If you find a document that still describes
them as open, that document is stale.

| Was | Fixed by |
|-----|----------|
| `talent_leaderboard` applied no minor, discoverability, block or suspension filter | `20260904000010` — it now carries the same clause as `discover_athletes` |
| Name search read `user_profiles` from the client, bypassing the discovery gate | `20260904000010` — `public.search_people`, called by `searchPeople()` |
| A minor's exact age was returned by `discover_athletes` and `opportunity_applicants` and rendered as "Age 14" | `20260904000010` — `age = null` plus `age_band` for under-18s; adults unchanged; age filters still exact |
| `guardian_consents.guardian_user_id` was never populated, so the guardian view was permanently empty | `20260904000010` — triggers in both directions plus a backfill |
| The minor-safety banner promised guardian oversight that no schema object provided | `20260904000010` — `guardian_conversation_overview`, surfaced in `/settings/guardian` |
| Two birth dates could drift apart, so the displayed age and the governing age could differ | `20260904000010` — mirror triggers in both directions, plus a backfill |
| `delete_own_account` left uploaded files in storage | `20260904000010` — deletes objects under the account's folder in `avatars`, `posts` and `stories` |
| Comments on `private.can_message` and `private.build_score_tips` described the opposite of the code | `20260904000010` — both replaced with accurate `COMMENT ON FUNCTION` text |
| `get_profile_bundle` raised `55000` for coaches and clubs, and `viewer.has_blocked` was wrong | `20260904000008` |
| `recommended_athletes` raised `42702 — column reference "user_id" is ambiguous` | `20260904000009` |
| A signed-in person opening the app at `/` was stranded on the entry spinner | `mobile/app/_layout.tsx` — the `atEntry` branch in `RouteGuard` |
| Four of the six application statuses the client uses were rejected by a CHECK constraint, and there was no way to withdraw | `20260904000007` — the constraint matches the client, and `guard_application_status` splits athlete and club transitions |
| The Talent Score percentile compared every sport at once | `20260904000007` — per-sport cohort; the client copy now says "in your sport" |

---

## 5. Related documents

- [12 — Youth Safety](./12-youth-safety.md) §11 — the same safety items with the engineering detail.
- [13 — Store Submission](./13-store-submission.md) §0 — the submission-day view of §1 above.
- [`store/data-safety.md`](./store/data-safety.md) §6 — the privacy-label view.
- [11 — The Talent Score](./11-talent-score.md) §11 — the score's own limitations.
- [16 — Internationalisation](./16-internationalisation.md) §11 — §2 items 11–14 with the code detail.
- [10 — Mobile App Architecture](./10-mobile-app.md) — where each of these surfaces in the client.
