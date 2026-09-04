# Google Play Console listing — AceAiX

Ready to paste. Character counts are given for every limited field and were counted,
not estimated. Anything marked **OPEN** needs a decision or an asset from the team.

Package: `com.aryaix.aceaix.athlete` · Default submit track: `alpha`
(`mobile/eas.json` → `submit.production.android.track`)

---

## 1. Main store listing

**App name** (30 max) — 21 characters

```
AceAiX: Sports Talent
```

Play forbids promotional wording, price, rank or performance claims in the title,
and penalises keyword stuffing. `AceAiX: Sports Talent` says what it is and nothing
more. If the team would rather ship the bare brand, `AceAiX` (6 characters) is also
correct and safer.

**Short description** (80 max) — 71 characters. This is what people read in search
results, so it does more work than the full description.

```
Build a sports profile, share highlights, be found by verified coaches.
```

**Full description** (4,000 max) — 3,595 characters.

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

We have zero tolerance for child sexual abuse and exploitation. Content of that kind is removed, the account is banned permanently, and the matter is reported to the relevant authorities. To raise a concern, use the Child safety report reason in the app or write to safety@aceaix.com. You do not need an account to email us.

PRIVACY

AceAiX does not ask for your location. The app has no location permission at all. The only place shown on your profile is the city you type in yourself. There are no adverts, we do not sell your data, and we do not track you across other apps. You can download a copy of your data or delete your account from Settings, at any time.

AceAiX is free for athletes. We do not charge you to be discovered, to appear in search, or to be contacted by a club. No genuine club will ask you or your family for money.

Published by AryAiX, Dilan Tower, Al Jadaf, Dubai, United Arab Emirates.

Support: support@aceaix.com
Privacy: privacy@aceaix.com
Child safety: safety@aceaix.com
```

**Graphics** — see `docs/13-store-submission.md` §3.

| Slot | Requirement | Status |
|---|---|---|
| App icon | 512 × 512, 32-bit PNG with alpha | `mobile/play-store-assets/icon-512.png` is 512 × 512 but **has no alpha channel** — re-export. **OPEN** |
| Feature graphic | 1024 × 500, PNG or JPEG | `mobile/play-store-assets/feature-graphic-1024x500.png` — ready. Do not upload `feature-graphic.png` (2048 × 1000) |
| Phone screenshots | 2–8, 16:9 or 9:16, 320–3840 px per side | **OPEN — none exist** |
| Tablet screenshots | Optional, 7" and 10" | Optional; supply only if you want the tablet treatment |
| Promo video | Optional YouTube URL | **OPEN — decide whether to make one** |

---

### 1.1 Translations — declare the seven languages

Main store listing → **Manage translations** → *Add your own translation language*. The app ships
seven languages (`mobile/i18n/languages.ts`); Play does not infer them from the bundle, and a
language you do not add here is a locale the app will not surface for in Play search.

| In the app | Play language |
|---|---|
| English (default) | English (United Kingdom) – `en-GB` |
| Arabic — the only right-to-left language | Arabic – `ar` |
| Spanish | Spanish (Spain) – `es-ES` |
| French | French – `fr-FR` |
| German | German – `de-DE` |
| Russian | Russian – `ru-RU` |
| Chinese | Chinese (Simplified) – `zh-CN` |

Play will offer to **machine-translate** the listing when you add a language. **Do not accept it.**
The full description above carries the guardian-consent, messaging and Talent Score claims, and a
mistranslated safety sentence is a claim the product does not support. Adding a language with the
English copy in it is honest; adding it with an unreviewed translation is not.

**The listing copy is English only** and that is a separate task from the app being translated — see
[`../15-known-gaps.md`](../15-known-gaps.md) §3.

Two things a reviewer might reasonably ask about, both deliberate and both documented in
[`../16-internationalisation.md`](../16-internationalisation.md): the four legal documents are
English in every language (the app says so on screen), and notification titles and Talent Score tips
are composed in English by the database.

- [ ] Add the six non-English translation languages.
- [ ] Supply an **Arabic** screenshot set as well as English — screenshots are per-language, and a
      mirrored right-to-left screenshot is the fastest evidence the localisation is real.

---

## 2. Store settings

- **App category**: **Sports**
- **Tags**: up to 5, chosen from Google's fixed list in the console — they cannot be
  typed freely. Pick the entries closest to: sports, social, community. **OPEN —
  whoever opens the console should record the exact tags chosen here**, so the next
  release does not silently change them.
- **Store listing contact details**
  - Email: `support@aceaix.com` (required)
  - Website: `https://aceaix.com`
  - Phone: **OPEN — the team must supply one, or leave it blank**
  - Address (shown publicly for an organisation account): Dilan Tower, Al Jadaf,
    Dubai, United Arab Emirates
- **External marketing**: leave the default unless marketing asks otherwise.

---

## 3. App content — sections to complete

Play will not let you publish until every one of these is answered.

| Section | Answer | Source |
|---|---|---|
| Privacy policy | `https://aceaix.com/privacy` | `web/src/Router.tsx:119` |
| App access | Demo credentials required — see `docs/store/review-notes.md` | `supabase/seeds/demo.sql` |
| Ads | **No ads** | No ads SDK in `mobile/package.json` |
| Content rating | See §5 | |
| Target audience and content | See §6 | |
| News app | No | |
| COVID-19 contact tracing | No | |
| Data safety | See `docs/store/data-safety.md` | |
| Government app | No | |
| Financial features | None | No billing SDK; Terms §8 |
| Health apps | No | The mobile app touches no medical tables |
| Child safety standards | Required — see §7 | `mobile/lib/legal/childSafety.ts` |

---

## 4. Account deletion declaration

Play requires two things from an app that lets people create an account:

1. **In-app deletion.** Settings → Account → Delete account
   (`mobile/app/settings/delete-account.tsx` → `public.delete_own_account()`).
2. **A publicly reachable web URL** where deletion can be requested without
   installing the app. **OPEN — this does not exist.** See
   `docs/13-store-submission.md` §0. Suggested `https://aceaix.com/delete-account`.

Also declare what is deleted and what is retained.

**Deleted:** the profile and everything cascading from it — posts, comments, messages,
follows, applications, Talent Score and history, push tokens, guardian consent records
— **and the files the account uploaded**, in the `avatars`, `posts` and `stories`
buckets. That last part is the version in
`supabase/migrations/20260904000010_close_minor_exposure_gaps.sql`; the original RPC
deleted rows only, so if you are reading an older note that says files are left behind,
it is out of date.

**Retained**, per the Privacy Policy: safety and moderation records, and anything
needed for a legal obligation or claim. `moderation_reports.reporter_id` and
`.reported_user_id` are `on delete set null`, so reports survive the account they
concern — which is the point.

---

## 5. Content rating questionnaire (IARC)

Choose the questionnaire category for **a social networking or communication app** —
AceAiX has profiles, a feed and direct messaging.

| Section | Answer | Reason |
|---|---|---|
| Violence | No | Sporting footage only. Violent content is prohibited by the Community Guidelines and reportable (`violence`). |
| Sexuality / nudity | No | Prohibited. Sexual content involving a minor is a permanent ban with no appeal. |
| Language | No | Profanity is prohibited and reportable. |
| Controlled substances | No | Prohibited. |
| Crude humour | No | Not applicable. |
| Gambling — real or simulated | No | No betting, no simulated gambling, no loot mechanics. |
| Horror or fear | No | Not applicable. |
| **Users can interact / exchange content** | **Yes** | Posts, comments, follows and direct messages. `public.messages`, `public.posts`, `public.post_comments`. |
| Users can share their physical location with other users | **No** — see note | No location permission exists; `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` are in `android.blockedPermissions` in `mobile/app.json`. The only place shown is a city the user types and can leave blank. |
| Users can purchase digital goods | No | No billing SDK. |
| User-provided personal information is shared with third parties | No | Supabase, Expo, Apple and Google are processors acting on our instructions, not recipients of a data sale. Nothing goes to advertising networks or brokers. |
| App is a native app (not a browser wrapper) | Native | React Native / Expo. No WebView screen exists. |

**Note on the location question.** It is genuinely ambiguous: no device location is
ever collected, but a user does type a city that other users can see. The answer
above is No, on the grounds that IARC's question is about sharing *physical* location
between users. If the team prefers the conservative answer, Yes adds a
"Shares Location" interactive element and does not usually move the age band.
**OPEN — pick one and record it here**, so the answer is the same next release.

**Expected outcome.** Because every content question is No, the regional ratings come
back low — an ESRB *Everyone*-class rating and a PEGI 3-class rating are the usual
result — with the **Users Interact** interactive element attached. That is not a
contradiction of the 13+ minimum age: the IARC rating describes AceAiX's *content*,
while the 13 floor comes from the Target audience declaration (§6) and from the
database itself.

- [ ] **Confirm the certificates IARC actually issues and record them here.** If a
      region returns something materially higher, check which answer caused it before
      changing anything.

---

## 6. Target audience and content

**Target age groups — select exactly these three:**

- 13–15
- 16–17
- 18 and over

**Do not select any group below 13.** Everything else in this section follows from
that.

| Question | Answer | Reason |
|---|---|---|
| Is your app designed for children? | No | Minimum age 13, enforced server-side. |
| Could your store listing unintentionally appeal to children? | No | The imagery and copy address teenage and adult athletes, coaches and parents. Keep it that way when the screenshots are made. |
| Does your app contain ads? | No | No ads SDK. |
| Do you have a Families policy requirement? | Not applicable | No under-13 audience is declared. |

### What declaring an under-13 audience would mean — and why AceAiX does not

If any age group below 13 were selected, the app would enter Google Play's
**Families** programme, and all of the following would apply at once:

- The **Designed for Families** requirements attach: a separate review, a
  Families-appropriate privacy policy, and restrictions on the app's content and
  presentation.
- Every ads SDK, analytics SDK and any other third-party SDK would have to be on
  Google's self-certified Families list. AceAiX ships none, so this would be
  survivable — but any future SDK would be constrained.
- **COPPA** applies in the United States: verifiable parental consent before any
  personal information is collected from a child, with all the infrastructure that
  implies. AceAiX's guardian consent is email-based, which is a reasonable
  mechanism for a 13–17 product and is **not** a COPPA verifiable-consent mechanism.
- Personalised advertising to children would be prohibited, and data collection
  restricted, in ways the current design has not been built to satisfy.
- Open user-to-user messaging and adult-to-minor discovery — the core of the
  product — would be very hard to justify.

The product answers this by simply not allowing under-13 accounts to exist.
`private.sync_age_state()` raises
`AceAiX requires all account holders to be at least 13 years old` on any date of
birth under 13
(`supabase/migrations/20260904000002_youth_safety_and_consent.sql:144`). The comment
above that code says the same thing in plain words: "There is no compliant way to
run a social product for under-13s without full COPPA verifiable parental consent
infrastructure, so the account simply cannot exist."

Because 13–17 **is** included, the app is subject to Google's requirements for apps
accessible to teens, including the Child Safety Standards declaration in §7.

---

## 7. Child safety standards declaration

Mandatory for apps in the Social category. Have these ready:

| Field | Value | Status |
|---|---|---|
| Published CSAE policy URL | `https://aceaix.com/child-safety` | **OPEN — the page does not exist.** The text is written and ships in the app at `mobile/lib/legal/childSafety.ts`; `web/src/Router.tsx` does not route it. Blocker. |
| In-app CSAE reporting mechanism | The **Child safety** report reason, on every post, comment, profile and message | `mobile/components/feed/ContentActionsSheet.tsx:52`, `mobile/components/messaging/PeerActionsSheet.tsx:28` |
| What happens to a CSAE report | Content is hidden immediately and the report is filed at `high` severity, before a human sees it | `public.report_content()`, `supabase/migrations/20260904000005_moderation_profiles_and_actions.sql:104-112` |
| Published point of contact | `safety@aceaix.com` | Stated in the Child Safety Standards document; usable without an account |
| Compliance statement | AceAiX complies with applicable CSAE laws and reports to the relevant authorities in the UAE and, where applicable, in the country the account is in | Child Safety Standards, "What we do when we receive a report" |
| Reporting body used for CSAM | **OPEN — decision needed.** Nothing in the code or the legal text names NCMEC or an equivalent. | Google asks how you report. Legal must decide and, if a body is named, the Child Safety Standards text should say so too. See [`../15-known-gaps.md`](../15-known-gaps.md) §1 item 11. |

Supporting facts you can cite in the free-text answers, all enforced in the database
rather than in the client:

- Under-13 accounts cannot be created.
- A 13–17 profile is not discoverable until a guardian grants consent, and consent is
  granular (discovery, messaging, media) and revocable.
- The consent gate applies to **every** surface that can name a person: the recruiter
  search (`discover_athletes`), the matched-for-you row (`recommended_athletes`), name
  search (`search_people`) and the public ranking (`talent_leaderboard`). All four
  carry the same clause, and `supabase/tests/functional.sql` asserts all four against
  the same non-consented minor.
- Only a **verified adult professional** may open a conversation with a minor, and
  only when the guardian approved messaging (`private.can_message()`).
- A minor's inbox cannot be set to "everyone"; it is forced to `verified` or stricter.
- A minor is invisible to signed-out visitors (`up_select_anon` policy).
- **Neither a minor's date of birth nor their age in years is returned by any API the
  app calls** — only an age band such as `13_15`. Adults return an exact age. Age
  filters are evaluated on the server against the true date of birth without returning
  it.
- A linked parent or guardian can see **that** their child is in a conversation, with
  whom, how many messages and when — and never its contents
  (`guardian_conversation_overview`, surfaced at Settings → Athletes you look after).
- Rate limits on messages, posts, comments and follows stop a compromised account
  flooding the network.
