# Data safety and App Privacy — AceAiX

Google Play's **Data safety** form and Apple's **App Privacy** label, answered from
the code. Every answer below is traceable; nothing is aspirational. Where an answer
is a genuine judgement call, it says so and gives both readings.

Sources read to produce this: `mobile/lib/api.ts`, `mobile/lib/api.auth.ts`,
`mobile/lib/api.settings.ts`, `mobile/lib/api.feed.ts`, `mobile/lib/api.profile.ts`,
`mobile/lib/api.messaging.ts`, `mobile/lib/supabase.ts`, `mobile/app.json`,
`mobile/package.json`, `supabase/migrations/*.sql`, `supabase/functions/*`.

---

## 1. What the code actually collects

### 1.1 Written to the database by the app

| Data | Where it lands | Written by |
|---|---|---|
| Email address, password (hashed by Supabase) | `auth.users`, mirrored to `user_private.email` | sign-up; `private.handle_new_user()` |
| Name (full, first, last) | `user_profiles` | sign-up, `updateUserProfile` |
| **Date of birth** | `user_private.date_of_birth` | `setDateOfBirth()` (`mobile/lib/api.ts:99`) |
| Role (athlete, coach, club, guardian) | `user_profiles.role` | sign-up metadata |
| Avatar, bio, **city, country**, locale | `user_profiles` | `updateUserProfile` |
| Sport, position, level, league, club, height, weight, nationality, dominant side, honours, languages, certifications | `athlete_profiles` | `updateAthleteProfile` |
| Coach specialty, years of experience, philosophy, licences | `coach_profiles` | onboarding |
| Posts — caption, text, media references, tags, audience | `posts` | `createPost` |
| Comments | `post_comments` | `addComment` |
| Highlight clips and images | `athlete_media`, `stories` | media upload |
| **Direct messages** | `messages`, `conversations` | `sendMessage` |
| Follows, likes, saves, post views, comment likes | `follows`, `post_likes`, `post_saves`, `post_views`, `comment_likes` | feed and profile actions |
| **Who viewed an athlete's profile** — viewer id, name, role, organisation, verified flag | `profile_views` | `public.get_profile_bundle()` writes this on every non-self view |
| Last active timestamp | `user_profiles.last_active_at` | session activity |
| Match records — date, competition, opponent, result, minutes, goals, assists | `match_records` | athlete entry / verified import |
| Endorsements | `endorsements` | verified coaches and clubs |
| Applications to trials and scholarships, saved opportunities | `applications`, `opportunity_saves` | `applyToOpportunity`, `toggleSaveOpportunity` |
| Recruiter search preferences — sports, positions, levels, countries, age range | `match_preferences` | `saveMatchPreferences` |
| Talent Score, pillar scores, inputs, tips, history, optional AI summary | `talent_scores`, `talent_score_history` | server-side only; no client can write it |
| **Guardian name, guardian email, relationship, approved scopes, consent token, granted-at** | `guardian_consents` | `public.request_guardian_consent()` |
| Reports — reason, free-text details (capped at 2,000 characters), severity, minor flag | `moderation_reports` | `public.report_content()` |
| Blocks | `user_blocks` | `public.block_user()` |
| Verification requests — type and status | `verification_requests` | `requestVerification()`; the client sends `documents: []`, so **no identity documents are uploaded from the app today** |
| Notification preferences | `notification_preferences` | Settings → Notifications |
| **Expo push token and platform string** | `push_tokens` | `registerPushToken()` (`mobile/lib/api.ts:616`) |

### 1.2 Files uploaded to storage

| Bucket | Public? | Limit | Types |
|---|---|---|---|
| `avatars` | **Public** | 10 MB | JPEG, PNG, WebP |
| `posts` | **Public** | 100 MB | JPEG, PNG, WebP, MP4, QuickTime |
| `stories` | Private, authenticated read | 100 MB | Same as `posts` |

`posts` was created private and made public by
`supabase/migrations/20260904000007_release_fixes.sql:25`: the feed and profile
highlights build plain public URLs, so while the bucket was private every image and
clip 404'd for every viewer, including its own uploader. Object paths carry an
unguessable UUID and **who can find a post is still governed by `posts.audience` and
RLS** — but the file behind a URL that leaks is readable without a session. That is
the honest description of the current behaviour, and it is why a minor's *media*
consent scope (`allow_media`) is a separate switch from discovery.

Deleting an account removes its objects from all three buckets
(`public.delete_own_account()`, §2.4).

### 1.3 Held on the device only, never uploaded

- The Supabase session token, in AsyncStorage (`mobile/lib/supabase.ts`).
- Theme choice and notification preferences cached locally.
- A date of birth parked under `aceaix.pending-date-of-birth` between sign-up and
  onboarding, alongside the email it belongs to so it cannot be applied to a
  different account on a shared phone. Cleared once written
  (`mobile/lib/api.auth.ts:27`).

### 1.4 What the app does not collect — and how that is enforced

- **No GPS.** `mobile/app.json` puts `ACCESS_FINE_LOCATION` and
  `ACCESS_COARSE_LOCATION` in `android.blockedPermissions`, and there is no
  `NSLocationWhenInUseUsageDescription` in `infoPlist`. No location API is called
  anywhere in `mobile/`. The only location held is a **city and country the user
  types**, which can be left blank.
- **No contacts.** `READ_CONTACTS` is blocked; nothing reads an address book.
- **No calendar, no files.** The data export writes a file *out* to a folder the user
  picks; it never reads the user's documents.
- **No payment data.** No billing SDK. Terms §8: athletes are never charged.
- **No advertising identifier.** No IDFA, no GAID, no `expo-tracking-transparency`.
- **No third-party analytics, attribution or crash SDK.** `mobile/package.json`
  contains no Sentry, Firebase, Amplitude, Mixpanel, PostHog or similar. The only
  network destination the app itself talks to is the Supabase project.
- **No medical data.** The `supabase/migrations/0004_medical.sql` tables exist for the
  web product; the mobile app never reads or writes them.

### 1.5 Permissions the app requests

| Permission | Why | Where |
|---|---|---|
| Camera | Record a clip, take a profile photo | `NSCameraUsageDescription`, `android.permission.CAMERA` |
| Microphone | Sound on a recorded clip | `NSMicrophoneUsageDescription`, `android.permission.RECORD_AUDIO` |
| Photo library | Pick a profile picture, post image or clip | `NSPhotoLibraryUsageDescription` (iOS). Android 13+ uses the system photo picker, so no media permission is requested |
| Notifications | Push notifications the user turns on | `POST_NOTIFICATIONS`, `UIBackgroundModes: ["remote-notification"]` |

### 1.6 Who else processes the data

| Recipient | What they see | Role | In the Privacy Policy? |
|---|---|---|---|
| Supabase | Everything — hosting, database, auth, storage | Processor | Yes |
| Expo | Push token, notification payloads | Processor | Yes |
| Apple, Google | Distribution, push transport | Processor / platform | Yes |
| **Resend** | Guardian's name and email address, child's display name, for the consent email | Processor | **Yes.** Named in "Who we share it with", with the fields it receives. `supabase/functions/guardian-consent/index.ts:204` posts to `api.resend.com` when `RESEND_API_KEY` is set. |
| **Anthropic** | Overall score, tier, five pillar numbers, sport, and a minor flag. **No name, email or user id.** | Processor, optional | **Yes, conditionally.** The policy names Anthropic and says it applies "only if the optional Talent Score insights feature is switched on", listing what is sent and stating that name, email, account identifier, photos and messages are not. `supabase/functions/talent-insights/index.ts:118`; only reached when `ANTHROPIC_API_KEY` is set, otherwise a written-in template is used and nothing leaves the project. **OPEN — which way it ships is still a decision (owner: legal), and the Data safety / App Privacy answers must match whichever is chosen.** |

---

## 2. Google Play — Data safety form

### 2.1 The two cross-cutting definitions used here

- **"Collected"** — transmitted off the device. Everything in §1.1 and §1.2 counts.
  The device-only items in §1.3 do not.
- **"Shared"** — transferred to a third party. Play excludes transfers to a service
  provider acting on your instructions, and transfers the user themselves initiates.
  On that basis every answer below is **Shared: No**: Supabase, Expo and Resend are
  processors, and a post being visible to other AceAiX users is a transfer the user
  chose to make inside the app.
  **This is the interpretation being submitted — record it, and do not change it
  release to release without saying why.**

### 2.2 Data types

Every type below is **linked to the user's identity** (it hangs off an account) and
**not used for tracking**. Nothing has "Advertising or marketing" as a purpose.

#### Location

| Type | Collected | Shared | Required | Purposes | Note |
|---|---|---|---|---|---|
| Approximate location | **Yes** | No | Optional | App functionality, Personalisation | The city and country the user **types**. No device location API is used; the OS location permissions are explicitly blocked. Used to filter discovery and the leaderboard (`discover_athletes`, `talent_leaderboard(p_country)`). |
| Precise location | No | — | — | — | No location permission exists. |

**Judgement call.** A self-typed city is still information about where the user is,
so it is declared. The alternative reading is to put it under Personal info → Other
info and answer No here. Under-declaring is the failure mode Google penalises, so the
recommendation is to declare it and explain it in the review notes. **OPEN — confirm
the choice and keep it consistent with the Apple side (§3, Coarse Location).**

#### Personal info

| Type | Collected | Shared | Required | Purposes |
|---|---|---|---|---|
| Name | Yes | No | **Required** | App functionality, Account management |
| Email address | Yes | No | **Required** | App functionality, Account management, Developer communications |
| User IDs | Yes | No | **Required** | App functionality, Account management, Fraud prevention/security/compliance |
| Address | No | — | — | — |
| Phone number | No | — | — | — |
| Race and ethnicity | No | — | — | — |
| Political or religious beliefs | No | — | — | — |
| Sexual orientation | No | — | — | — |
| Other info | Yes | No | Mixed | App functionality, Fraud prevention/security/compliance |

**Other info** covers: **date of birth** (required — the account cannot exist
without it, and it drives every minor protection), nationality, height, weight,
dominant side, sport, position, level, club, honours, languages, and — for a 13–17
account — **the guardian's name and email address**.

`user_private` has a `phone` column, populated from `auth.users.phone` at sign-up.
The app signs people up with email and password only, so it is always null.
**Verify this stays true before each submission.**

#### Financial info

Nothing. No type in this section is collected.

#### Health and fitness

| Type | Collected | Shared | Required | Purposes |
|---|---|---|---|---|
| Health info | No | — | — | — |
| Fitness info | **Yes** | No | Optional | App functionality |

**Judgement call.** Match records (minutes played, goals, assists) and body
measurements (height, weight) are physical-activity data about the user. Google
defines Fitness info as "information about a user's fitness, such as exercise or
other physical activity", which this fits. Declaring it costs nothing; omitting it
is the kind of gap Google's automated checks flag. **OPEN — confirm. If you declare
it here, you must also declare Health & Fitness → Fitness on the Apple side and add
`NSPrivacyCollectedDataTypeFitness` to the privacy manifest.**

Health info is **No**: the mobile app never touches the medical tables.

#### Messages

| Type | Collected | Shared | Required | Purposes |
|---|---|---|---|---|
| Emails | No | — | — | — |
| SMS or MMS | No | — | — | — |
| Other in-app messages | **Yes** | No | Optional | App functionality |

Direct messages are stored so a conversation persists (`public.messages`). Who may
open a conversation is decided by `private.can_message()`, not by the client. Messages
are not processed ephemerally and are not used for any purpose beyond delivering the
conversation and acting on a report about it.

#### Photos and videos

| Type | Collected | Shared | Required | Purposes |
|---|---|---|---|---|
| Photos | **Yes** | No | Optional | App functionality |
| Videos | **Yes** | No | Optional | App functionality |

#### Audio files

Not declared. The app records video **with sound** (`RECORD_AUDIO`,
`NSMicrophoneUsageDescription`), but that audio is part of the video file and is
declared under Videos. There is no voice note, no standalone recording feature and
no music upload.

#### Files and docs, Calendar, Contacts

None collected. `READ_CONTACTS` is in `android.blockedPermissions`.

#### App activity

| Type | Collected | Shared | Required | Purposes |
|---|---|---|---|---|
| App interactions | **Yes** | No | **Required** | App functionality, Personalisation |
| In-app search history | **No** | — | — | — |
| Installed apps | No | — | — | — |
| Other user-generated content | **Yes** | No | Optional | App functionality |
| Other actions | **Yes** | No | Optional | App functionality, Fraud prevention/security/compliance |

- *App interactions*: follows, likes, saves, post views, `last_active_at`, and
  `public.profile_views` — which records who looked at an athlete's profile, because
  "who has been looking at you" is a product feature and an input to the Talent Score.
- *In-app search history* is **No**: `searchPeople` (which calls the `search_people`
  RPC) and `searchOrganizations` query live and persist nothing. No search term is
  written to any table.
- *Other user-generated content*: posts, comments, bio and profile text, match
  records, endorsements, and the free-text details on a report.
- *Other actions*: applications to opportunities, blocks, and reports.

#### Web browsing

None. There is no browser or WebView screen in the app.

#### App info and performance

Crash logs, diagnostics and other performance data are all **No**. The app ships no
crash or performance SDK. Whatever Apple and Google gather on their own platforms is
theirs; Play's form excludes data collected by Google Play itself.

#### Device or other IDs

| Type | Collected | Shared | Required | Purposes |
|---|---|---|---|---|
| Device or other IDs | **Yes** | No | Optional | App functionality |

The Expo push token, stored with a platform string in `public.push_tokens`. Collected
only if the user turns notifications on, and removed with the account.

### 2.3 Security practices

| Question | Answer | Evidence |
|---|---|---|
| Is all of the user data collected by your app encrypted in transit? | **Yes** | Every call goes to Supabase over HTTPS, and every storage read is an HTTPS URL — public-bucket CDN URLs for `avatars` and `posts`, an authenticated read for `stories`. |
| Do you provide a way for users to request that their data be deleted? | **Yes** | In app: Settings → Account → Delete account (`mobile/app/settings/delete-account.tsx` → `public.delete_own_account()`), which deletes the account's uploaded files as well as its rows. The web URL Play wants in addition still has to be published — see §6. |
| Has your app been independently validated against a global security standard? | **No** | There is no audit and no certification. Do not tick this. |
| Can users request that their data be deleted for a specific data type? | Partially | The account and everything on it goes together. Individual posts, comments, media and blocks can be deleted on their own. |

Also worth stating in the free-text: the app offers a **full data export** — Settings
→ Account → Download my data, or the same button on the delete screen. It writes a
JSON file of the profile, private record, athlete profile, posts, comments, follows,
applications and media (`exportMyData()`, `mobile/lib/api.ts:732`).

### 2.4 Deletion, precisely

`public.delete_own_account()` — the version in
`supabase/migrations/20260904000010_close_minor_exposure_gaps.sql`, which replaces the
original in `0013_account_deletion_rpc.sql` — does three things for the calling user:

1. deletes every object in the `avatars`, `posts` and `stories` buckets whose first
   path segment is that user's id (uploads are stored under a folder named for the
   account, so `(storage.foldername(name))[1] = requester::text` catches all of them);
2. deletes `public.user_profiles`, which cascades to posts, comments, media, messages,
   follows, applications, talent scores and history, push tokens and guardian consents;
3. deletes `auth.users`.

Step 1 is new. Until it existed, every photo and clip a person had uploaded stayed in
storage after they deleted their account, which contradicted both Apple 5.1.1(v) and
the Privacy Policy. Say "yes, including uploaded files" on the Play form and in the
review notes.

**Guardian consent records go with the account.**
`guardian_consents.minor_user_id` is `on delete cascade`, so when a minor deletes their
account the consent record — the guardian's name, email and what they approved — is
deleted at the same time. This is now a stated position rather than a discrepancy: the
Privacy Policy has been corrected to describe exactly this, because deleting it is the
more privacy-protective behaviour and the account it concerned no longer exists. If a
compliance obligation later requires the evidence to outlive the account, the
constraint and the policy have to change together.

Retained by design: `moderation_reports.reporter_id` and `.reported_user_id` are
`on delete set null`, so a report survives the account it concerns. That is correct —
deleting your account should not erase a child-safety report about you, and the
Privacy Policy now says so in the retention section.

The one deletion item still open is the **publicly reachable web URL** Play requires
in addition to the in-app flow (§6).

---

## 3. Apple — App Privacy answers

Same facts, Apple's taxonomy. Every entry is **Linked to the user**, and **Tracking
is No for every single type** — see §4.

| Apple category | Type | Collected | Purpose | Why |
|---|---|---|---|---|
| Contact Info | Email Address | **Yes** | App Functionality | Sign-in and account email. |
| Contact Info | Name | **Yes** | App Functionality | Displayed on the profile. |
| Contact Info | Other User Contact Info | **Yes** | App Functionality | The guardian's name and email address for a 13–17 account. |
| Contact Info | Phone Number, Physical Address | No | — | Not collected. |
| Health & Fitness | Fitness | **Yes** (judgement call) | App Functionality | Match minutes, goals, assists; height and weight. Must match the Play answer. |
| Health & Fitness | Health | No | — | No medical data in the mobile app. |
| Location | Coarse Location | **Yes** (judgement call) | App Functionality | The city and country the user types. Must match the Play answer. |
| Location | Precise Location | No | — | No location permission exists. |
| Sensitive Info | — | No | — | None collected. |
| Contacts | — | No | — | Address book is never read. |
| User Content | Photos or Videos | **Yes** | App Functionality | Avatars, post images, highlight clips. |
| User Content | Other User Content | **Yes** | App Functionality | Posts, comments, bio, direct messages, report details. |
| User Content | Audio Data, Gameplay Content, Customer Support | No | — | Audio only ever arrives inside a video. Support is a `mailto:` link. |
| Browsing History, Search History | — | No | — | Nothing persisted. |
| Identifiers | User ID | **Yes** | App Functionality | The account UUID. |
| Identifiers | Device ID | **Yes** | App Functionality | The Expo push token, only if notifications are enabled. |
| Purchases | — | No | — | No purchases. |
| Usage Data | Product Interaction | **Yes** | App Functionality | Follows, likes, saves, profile views, last active. |
| Usage Data | Advertising Data, Other Usage Data | No | — | No ads, no advertising data. |
| Diagnostics | Crash Data, Performance Data, Other | No | — | No crash or performance SDK. |
| Other Data | Other Data Types | **Yes** | App Functionality | Date of birth, nationality, sport, position, level, club, honours, languages. |

**Date of birth deserves its own sentence on the label and in the review notes:** it
is collected for every account, it is required, and it is stored in a table separate
from the public profile (`user_private`). For anyone under 18, **neither the date nor
the age in years is returned by any API the client calls** — `get_profile_bundle`,
`discover_athletes`, `recommended_athletes` and `opportunity_applicants` each return
`age: null` and an `age_band` such as `13_15` instead
(`supabase/migrations/20260904000008_profile_bundle_non_athletes.sql` and
`…0010_close_minor_exposure_gaps.sql`). Adults still return an exact age. A recruiter
can filter on an age range, which the server evaluates against the real date of birth
without returning it. Signed-out visitors cannot see a minor's profile at all
(`up_select_anon`).

This is the wording to use on the label and in the review notes; the older claim that
only the date of birth was private described the code before those migrations.

---

## 4. The iOS privacy manifest has to be fixed first

`mobile/app.json` → `ios.privacyManifests.NSPrivacyCollectedDataTypes` currently
declares five types:

```
NSPrivacyCollectedDataTypeEmailAddress
NSPrivacyCollectedDataTypeName
NSPrivacyCollectedDataTypePhotosorVideos
NSPrivacyCollectedDataTypeUserContent
NSPrivacyCollectedDataTypeOtherUserContactInfo
```

Two problems. **OPEN — mobile owns this, and it should be fixed before the build you
submit.**

1. **`NSPrivacyCollectedDataTypeUserContent` does not appear in Apple's published
   list of collected-data-type constants.** Apple's User Content group is
   `EmailsOrTextMessages`, `PhotosorVideos`, `AudioData`, `GameplayContent`,
   `CustomerSupport` and `OtherUserContent`. Check it against Apple's current
   documentation and, if confirmed, change it to
   `NSPrivacyCollectedDataTypeOtherUserContent`.

2. **The manifest under-declares relative to §3.** Add, each with
   `Linked: true`, `Tracking: false`, purpose `NSPrivacyCollectedDataTypePurposeAppFunctionality`:

   - `NSPrivacyCollectedDataTypeCoarseLocation` — the typed city and country
   - `NSPrivacyCollectedDataTypeUserID` — the account UUID
   - `NSPrivacyCollectedDataTypeDeviceID` — the Expo push token
   - `NSPrivacyCollectedDataTypeProductInteraction` — follows, likes, profile views
   - `NSPrivacyCollectedDataTypeOtherDataTypes` — date of birth and sporting attributes
   - `NSPrivacyCollectedDataTypeFitness` — only if you declare Fitness in §3

The accessed-API declarations already present are consistent with what the app does
and need no change: `UserDefaults` (CA92.1) for AsyncStorage, `FileTimestamp`
(C617.1) and `DiskSpace` (E174.1) for the export written through `expo-file-system`,
and `SystemBootTime` (35F9.1).

`NSPrivacyTracking: false` is correct, and with tracking false there is correctly no
`NSPrivacyTrackingDomains` array.

The manifest and the App Store Connect answers must agree. Apple cross-checks them,
and a mismatch is a rejection that costs a build.

---

## 5. The plain statements — and what backs them

**Data is not sold.** Privacy Policy: "We never sell your personal data, and we do
not share it with advertising networks or data brokers."
(`mobile/lib/legal/privacy.ts:59`)

**Data is not used for advertising.** There is no ads SDK in `mobile/package.json`,
no advertising identifier is read, and "Advertising or marketing" is not selected as
a purpose for any data type on either form. Privacy Policy: "We do not show
personalised advertising to anyone, and we do not profile minors for advertising."

**Data is not used for tracking.** `NSPrivacyTracking: false`. No App Tracking
Transparency prompt exists because there is nothing to ask for. No SDK correlates a
user with data from other apps or websites, and no data is shared with a data broker.

**No third-party analytics.** The app's only network destination is its own Supabase
project. Two edge functions reach further — Resend for the guardian consent email, and
Anthropic for the optional score summary — and **both are now named in the Privacy
Policy**, Anthropic conditionally on the feature being enabled. What remains open is
the product decision about whether that feature ships enabled (§1.6, §6).

---

## 6. Open items, collected

| # | Item | Owner |
|---|---|---|
| 1 | Fix the iOS privacy manifest — one constant to verify, six types to add (§4) | Mobile |
| 2 | Decide the **approximate location** answer (Yes/No) and keep Play and Apple consistent (§2.2, §3) | Legal + mobile |
| 3 | Decide the **Fitness info** answer and keep Play, Apple and the manifest consistent | Legal + mobile |
| 4 | Decide whether `talent-insights` ships with `ANTHROPIC_API_KEY` set, and make the Data safety and App Privacy answers match. The Privacy Policy already covers both cases (§1.6) | Legal |
| 5 | Publish the **account-deletion web URL** Play requires in addition to the in-app flow | Web |
| 6 | Confirm `user_private.phone` is never populated by the app before each submission | Mobile |
| 7 | Re-publish `https://aceaix.com/privacy` from the current `mobile/lib/legal/privacy.ts` — it changed on three points (Resend named, Anthropic named conditionally, guardian consent records deleted with the account) — and confirm the two match | Web |

**Closed since this table was written**, so they are not re-opened from an old copy:
naming the transactional **email provider** in the Privacy Policy (Resend is now
named, with the fields it receives); deleting **storage objects** on account deletion
(`20260904000010`); and reconciling **guardian consent retention** — the schema still
cascades, and the policy now says so rather than claiming retention.
