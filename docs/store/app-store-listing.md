# App Store Connect listing — AceAiX

Ready to paste. Character counts are given for every limited field; they were
counted, not estimated. Anything marked **OPEN** needs a decision or an asset from
the team before the page can be saved.

App Store Connect app id: `6785269968` · Bundle id: `com.aryaix.aceaix.athlete`

---

## 1. App Information (not version-specific)

**Name** (30 max) — 6 characters

```
AceAiX
```

Matches `CFBundleDisplayName` in `mobile/app.json`. Do not add a tagline here; the
subtitle does that job and a name plus tagline reads as keyword stuffing.

**Bundle ID**: `com.aryaix.aceaix.athlete`

**Primary language**: English (U.K.)

**Localisations** — the app ships seven languages (`mobile/i18n/languages.ts`), and App Store
Connect has no separate "supported languages" field: the set of localisations added to the version
*is* the declaration. Add all six alongside the primary, or the app will not surface for those
locales in search.

| In the app | Add this localisation |
|---|---|
| Arabic — the only right-to-left language | Arabic |
| Spanish | Spanish (Spain) |
| French | French |
| German | German |
| Russian | Russian |
| Chinese | Chinese (Simplified) |

**The listing copy below is English only.** Apple falls back to the primary language for any field
left empty in a localisation, so adding the six with English copy is valid and is what ships today.
Translating the listing is a separate task from the app being translated — see
[`../15-known-gaps.md`](../15-known-gaps.md) §3 — and the descriptions should **not** be machine
translated, because they carry the safety and Talent Score claims.

Note for the reviewer if it comes up: the four legal documents are English in every language on
purpose (`mobile/components/settings/LegalDocument.tsx` shows a line saying the English text is the
version that applies), and notification titles and Talent Score tips are composed in English by the
database — see [`../16-internationalisation.md`](../16-internationalisation.md) §10–11.

**Category**

- Primary: **Sports**
- Secondary: **Social Networking**

Sports first because that is what a coach or a parent is searching for, and because
Social Networking as a primary category invites a heavier read of the app under
guideline 1.2. The secondary category is still honest — the app has a feed,
following and messaging.

**Privacy Policy URL**

```
https://aceaix.com/privacy
```

**Content Rights**: the app contains third-party content in the sense that users
post their own photos and videos. Answer that you have the rights or permission —
Terms §6 (`mobile/lib/legal/terms.ts`) takes a licence from the user for exactly
this purpose.

---

## 2. Version information

**Subtitle** (30 max) — 28 characters

```
Get discovered in your sport
```

**Promotional text** (170 max) — 157 characters. Editable at any time without a new
build, so use it for whatever is current.

```
AceAiX gives every athlete a profile, a Talent Score you can explain, and a way to be seen by verified coaches. Under-18 profiles need a guardian's approval.
```

**Keywords** (100 max, comma-separated, no spaces) — 92 characters

```
football,athlete,talent,scout,coach,trials,academy,soccer,sports,recruiting,highlights,youth
```

Apple ignores the app name and the category name in keyword matching, so `sports`
is arguably a wasted six characters — swap it for `basketball` or `swimming` if the
team would rather cover a second sport. Do not repeat `AceAiX`.

**Support URL**

```
https://aceaix.com/support
```

Routed at `web/src/Router.tsx:121`. Confirm it is deployed and reachable before
submitting — a dead support URL is a metadata rejection.

**Marketing URL**

```
https://aceaix.com
```

**Copyright**

```
2026 AryAiX
```

---

## 3. Description

3,213 characters, within the 4,000 limit. No exclamation marks. Written to be read
by a fifteen-year-old and by their mother, in that order.

```
AceAiX is where a young athlete builds a proper sporting profile and gets seen by the people who pick teams.

You add your sport, position, club and level, log the matches you have played, and upload a few short clips. From that, AceAiX works out a Talent Score out of 100 and shows you exactly how it got there.

WHAT YOU CAN DO

- Build a profile with your sport, position, level, club, honours and languages.
- Log match records - minutes, goals, assists - so your form is visible.
- Upload highlight clips. Coaches watch before they read.
- Get a Talent Score, broken into five parts: profile, match record, clips, credibility and activity. Each part comes with the next thing you could do about it.
- Follow other athletes, post updates, and comment.
- See trials, academy places and scholarships posted by clubs, and apply to them.
- Message the coaches and clubs you are allowed to talk to.

ABOUT THE TALENT SCORE

The score is worked out on our servers from things you can point at: how complete your profile is, your match records, your clips, endorsements from verified coaches, and how active you are. Verified information counts for more than information you type yourself. No athlete can edit their own score, and nobody can pay to raise it. The score screen lists every input we used.

FOR PARENTS AND GUARDIANS

The minimum age is 13. Anyone younger cannot create an account. That check runs on our servers, so a modified app cannot get past it.

If you are between 13 and 17:

- Your profile stays hidden from searches until a parent or guardian approves it. You give their name and email address, and we send them a link.
- Your guardian approves three things separately: whether you appear in searches, whether you can receive messages, and whether you can share photos and clips. They can allow some and not others.
- Only verified coaches, clubs and scouts can start a conversation with you, and only if your guardian allowed messaging. Everyone else is refused.
- Your exact age and date of birth are never shown. Other people see a band, such as 13-15.
- People who are not signed in cannot see you at all.
- Your guardian can withdraw permission whenever they want, and the profile is hidden again straight away.

These are rules in our database, not settings in the app.

SAFETY

Every post, comment, profile and message can be reported, and Child safety is one of the reasons you can pick. A child safety report hides the content immediately and goes to the top of the review queue. You can block anyone. A block takes effect at once and works in both directions.

PRIVACY

AceAiX does not ask for your location. The only place shown on your profile is the city you type in yourself. There are no adverts, we do not sell your data, and we do not track you across other apps. You can download a copy of your data or delete your account from Settings.

AceAiX is free for athletes. We do not charge you to be discovered, to appear in search, or to be contacted by a club. No genuine club will ask you or your family for money.

Published by AryAiX, Dilan Tower, Al Jadaf, Dubai, United Arab Emirates.

Support: support@aceaix.com
Privacy: privacy@aceaix.com
Child safety: safety@aceaix.com
```

---

## 4. Screenshots and preview

**OPEN — none exist in the repository.** See `docs/13-store-submission.md` §3.2 for
the required pixel sizes and the suggested set of six shots.

Screenshots are per-localisation. At minimum produce an English set and an **Arabic** set — Arabic
is the only right-to-left layout, and a mirrored screenshot is the quickest evidence a reviewer has
that the localisation is real rather than declared.

---

## 5. Age Rating questionnaire

App Store Connect → App Information → Age Rating. Answer every question the page
shows; the ones below are the ones that matter for this app. Apple computes the
final rating from the answers — **confirm the number the page returns before you
save it**, and if it differs from what is stated here, the page is right and this
document is wrong.

### 5.1 Content frequency questions

Every one of these is **None**. AceAiX has no authored content of its own; it hosts
sporting profiles, match records, highlight clips and messages, all of which are
governed by the Community Guidelines and removable.

| Question | Answer | Why |
|---|---|---|
| Cartoon or Fantasy Violence | None | No game content of any kind. |
| Realistic Violence | None | Sporting footage only; violent content is prohibited and removable (`report_content` reason `violence`). |
| Prolonged Graphic or Sadistic Realistic Violence | None | Prohibited by the Community Guidelines. |
| Profanity or Crude Humour | None | Prohibited by the Community Guidelines; reportable as `harassment` or `hate`. |
| Mature or Suggestive Themes | None | Prohibited. Sexualised content involving anyone is removed; involving a minor it is a permanent ban. |
| Horror or Fear Themes | None | Not applicable. |
| Medical or Treatment Information | None | The mobile app touches no medical tables. Height and weight on a sporting profile are not treatment information. |
| Alcohol, Tobacco or Drug Use or References | None | Prohibited by the Community Guidelines. |
| Simulated Gambling | None | No gambling or betting feature. |
| Sexual Content or Nudity | None | Prohibited; `nudity` is a report reason and a `high`-severity one when a minor is involved. |
| Graphic Sexual Content and Nudity | None | Prohibited. Zero tolerance, no appeal (Child Safety Standards). |
| Contests | None | Trials and scholarships are real-world opportunities posted by clubs, not prize contests run by AceAiX. |

### 5.2 The questions that actually set the rating

| Question | Answer | Why |
|---|---|---|
| Does the app include user-generated content? | **Yes** | Profiles, posts, comments, highlight clips and stories. `mobile/lib/api.ts` `createPost`, `addComment`; `athlete_media`. |
| Does the app include messaging or chat between users? | **Yes** | Direct messages. `mobile/app/chat/[id].tsx`, `public.messages`. Who may open a conversation is decided by `private.can_message()`, not by the client. |
| Can users publicly share content, or share personal information? | **Yes** | Posts are public, followers-only or connections-only (`posts.audience`). A minor's date of birth, **exact age** and precise location are never shared: every RPC that carries an age returns `null` and an age band for an under-18 (`get_profile_bundle`, `discover_athletes`, `recommended_athletes`, `opportunity_applicants`), and no coordinate is ever collected. |
| Does the app have moderation controls — reporting, blocking, content removal? | **Yes** | Report and block on every content type, with a reason list that always includes Child safety; `public.report_content()` and `public.block_user()` in `supabase/migrations/20260904000005_moderation_profiles_and_actions.sql`. Child-safety reports auto-hide the content before a human reviews it. |
| Unrestricted web access (a browser or arbitrary URL loading) | **No** | No WebView screen exists. `Linking.openURL` is called in exactly two places, both for our own URLs and `mailto:` (`mobile/app/settings/index.tsx:64`, `mobile/components/settings/LegalDocument.tsx:139`). `LSApplicationQueriesSchemes` is `["mailto"]` only. |
| Gambling or contests with prizes | **No** | None. |
| In-app purchases | **No** | No billing SDK in `mobile/package.json`. Terms §8: athletes are never charged. |
| Is the app made for kids (Kids Category)? | **No** | The minimum age is 13. Do **not** select the Kids Category — it forbids user-to-user messaging and third-party analytics and would make the product illegal to ship as built. |
| Age assurance / age verification | Self-declared date of birth at sign-up, enforced server-side | `mobile/app/(auth)/sign-up.tsx` blocks under-13 in the UI; `private.sync_age_state()` raises `age_below_minimum` in the database, so a modified client cannot get past it, and since `20260904000010` editing `athlete_profiles.birth_date` is mirrored back into the private record so it runs through the same check. The date remains **self-declared and re-declarable** — there is no document-based age verification, so do not claim one. |

### 5.3 Resulting rating

Expected: **13+**.

It is driven by the user-generated content and messaging answers, not by any content
category — every content frequency answer is None. 13+ is also the correct
commercial answer: it matches the enforced minimum age, and it keeps the app out of
the Kids Category, whose rules the product cannot meet.

- [ ] **Confirm the number App Store Connect returns after you save the
      questionnaire.** Apple has changed the bands (4+, 9+, 13+, 16+, 18+) and has
      been adding questions about capabilities. If the page returns 16+, do not
      argue with it — record it here and make sure the Play target audience in
      `docs/store/play-store-listing.md` §6 does not contradict it.

---

## 6. App Review Information

See `docs/store/review-notes.md`. Paste the whole of it into the Notes field, and
put `layla.demo@aceaix.com` / `AceAiX-Demo-2026` in the Sign-In Required fields.

Contact for review: **OPEN — the team must supply a name and phone number.** Apple
requires both, and will call.

---

## 7. Fields that are easy to get wrong

- **Sign in with Apple** is not required. The app offers email and password only, no
  third-party or social login (`mobile/providers/AuthProvider.tsx`). Guideline
  4.8 only bites when a third-party login is offered.
- **Export compliance** will not be asked per build:
  `ios.config.usesNonExemptEncryption` and `ITSAppUsesNonExemptEncryption` are both
  `false` in `mobile/app.json`.
- **App Privacy** is a separate section from the Age Rating and must be filled in
  from `docs/store/data-safety.md`. Apple cross-checks it against the privacy
  manifest embedded in the binary; see that document's §4 for the mismatch that has
  to be fixed first.
- **Promotional text** can be edited without submitting a new build. Description,
  keywords and screenshots cannot.
- **Localisations are per version.** Adding a language to one version does not carry it forward on
  its own; check the language list every release, or a locale silently drops back to English.
