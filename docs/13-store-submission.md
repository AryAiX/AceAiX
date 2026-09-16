# 13 — Store submission

The checklist the team works through on submission day. Every claim below is
traceable to a file in this repository; where something is not yet true, it is
marked **OPEN** with who has to supply it.

- Product: **AceAiX**, published by **AryAiX**
- Address: Dilan Tower, Al Jadaf, Dubai, United Arab Emirates — Trade Licence 1610838
- Bundle id / package: `com.aryaix.aceaix.athlete`
- iOS App Store Connect app id: `6785269968` (`mobile/eas.json` → `submit.production.ios.ascAppId`)
- EAS project id: `14447620-58bb-46fb-b23d-8ff400ddc77c` (`mobile/app.json` → `extra.eas.projectId`)
- Expo owner: `toorajhelmi4` (`mobile/app.json` → `owner`)
- Minimum age: **13**, enforced in the database (`private.sync_age_state()`)

Companion documents:

- `docs/store/app-store-listing.md` — App Store Connect copy and age rating answers
- `docs/store/play-store-listing.md` — Play Console copy, IARC answers, target audience
- `docs/store/data-safety.md` — Play Data safety and Apple App Privacy, side by side
- `docs/store/review-notes.md` — the note to reviewers, with demo accounts

---

## 0. Blockers to clear before anything else

These will fail review, or fail silently after release. Each one needs a named
owner and a decision. The whole-product version of this list, including items that
are not about submission, is [`docs/15-known-gaps.md`](./15-known-gaps.md).

- [ ] **OPEN — publish the Community Guidelines and Child Safety Standards on the web.**
      `mobile/lib/legal/childSafety.ts` links to `https://aceaix.com/guidelines` and
      `https://aceaix.com/child-safety`. `web/src/Router.tsx` routes `/privacy`
      (line 119), `/terms` (line 120) and `/support` (line 121) — and nothing else
      that is relevant here. Google Play's Child Safety Standards declaration requires
      a **publicly accessible** CSAE policy URL, so the missing `/child-safety` page
      is a hard blocker for Play. Owner: web.
- [ ] **OPEN — publish an account-deletion web page.** Google Play requires a
      publicly reachable URL where a user can request account and data deletion,
      *in addition to* the in-app flow. Nothing in `web/src/pages/` serves one.
      Suggested `https://aceaix.com/delete-account`, describing the in-app path and
      offering `privacy@aceaix.com` as the off-app route. Owner: web + legal.
- [ ] **OPEN — the iOS privacy manifest under-declares.** Still true, and unchanged:
      `mobile/app.json` declares five collected data types, one of which
      (`NSPrivacyCollectedDataTypeUserContent`) is probably not a real Apple constant.
      See `docs/store/data-safety.md` §4 for the exact list of types to add and the
      constant to verify. It must agree with the App Privacy answers you submit.
      Owner: mobile.
- [ ] **OPEN — decide whether `talent-insights` runs with `ANTHROPIC_API_KEY` set.**
      `supabase/functions/talent-insights/index.ts:118` posts the athlete's five
      pillar scores, overall score, tier, sport and a minor flag to
      `api.anthropic.com`. No name, email or user id is sent. The Privacy Policy now
      names Anthropic **conditionally** — "only if the optional Talent Score insights
      feature is switched on" — and lists exactly what is and is not sent, so either
      answer is now honest. What still has to be decided is which one you ship, and
      the Data safety / App Privacy answers must match it. Owner: legal.
- [ ] **OPEN — `consent_ip` and `consent_user_agent` are never written.** The
      columns exist and the migration comment calls them "verifiable-consent
      evidence retained for compliance audits", but no code path populates them.
      What is actually retained is the guardian's name, email, the scopes approved,
      `consent_method = 'email_confirmation'` and `granted_at`. Either populate them
      in the `guardian-consent` edge function or correct the comment. Owner: backend.
- [ ] **OPEN — deep-link association files are not served.** `mobile/app.json`
      declares `associatedDomains: ["applinks:aceaix.com"]` and an `autoVerify`
      Android intent filter for `https://aceaix.com/app`, but `web/public/` contains
      only `aceaix-favicon.svg`, `aceaix-icon.png` and `aceaix-og.svg` — no
      `.well-known/apple-app-site-association` and no `.well-known/assetlinks.json`.
      Universal Links and Android App Links will not verify. Not a review blocker;
      the links will simply open the browser. Owner: web.

### Cleared since this list was written

Struck rather than deleted, so nobody re-opens them from an old copy.

- ~~**Account deletion leaves stored files behind.**~~ Fixed in
  `supabase/migrations/20260904000010_close_minor_exposure_gaps.sql`.
  `public.delete_own_account()` now deletes every object in the `avatars`, `posts`
  and `stories` buckets whose folder is named for the account, before deleting the
  profile row and the auth user. Apple 5.1.1(v) is satisfied by the in-app flow; the
  **web** deletion URL Play wants is a separate item and is still open above.
- ~~**Guardian consent records are cascade-deleted with the account.**~~ Not a code
  change — a documentation one. `guardian_consents.minor_user_id` is still
  `on delete cascade`, and that is now the deliberate answer: deleting the record
  along with the account is the more privacy-protective behaviour, and the Privacy
  Policy (`mobile/lib/legal/privacy.ts`) has been corrected to say so instead of
  claiming retention. If a compliance obligation later requires the evidence to
  outlive the account, both have to change together. Owner if that day comes: legal.
- ~~**A minor's exact age reaches recruiters.**~~ Fixed in the same migration.
  `discover_athletes`, `recommended_athletes` and `opportunity_applicants` return
  `age = null` and an `age_band` for anyone under 18; adults still return exact
  years; the age *filters* still work on the true date of birth. Every store answer
  about age has been rechecked against this — see §5 and
  [12 §7.1](./12-youth-safety.md#71-age-what-leaves-the-server-and-what-does-not).
- ~~**The leaderboard and name search route around the guardian gate.**~~ Fixed in
  the same migration: `talent_leaderboard` now filters on minor/discoverable,
  suspension and blocks, and name search goes through the new `public.search_people`
  RPC instead of a client-side query on `user_profiles`.
- ~~**The guardian view of the app is permanently empty.**~~ Fixed in the same
  migration: triggers populate `guardian_consents.guardian_user_id` by matching the
  address the consent was sent to, in either direction, with a backfill. A parent can
  now see and withdraw what they approved from inside the app, and
  `guardian_conversation_overview` gives them the oversight the minor-safety banner
  promises — who the conversation is with and how busy it is, never its contents.

---

## 1. Pre-submission — backend and configuration

### 1.1 Supabase project settings (hosted project, not `supabase/config.toml`)

`supabase/config.toml` describes the **local** stack only. The hosted project must
be set separately.

- [ ] Decide **email confirmations**. `config.toml:226` has
      `enable_confirmations = false` locally. The client already handles both cases:
      `mobile/lib/api.auth.ts` parks the date of birth on the device when there is
      no session yet, and `mobile/app/(auth)/check-email.tsx` exists for the
      confirmation path. **OPEN — product decision:** confirmations on gives a
      stronger age/identity story for reviewers; off gives a smoother demo. Whichever
      you choose, the demo accounts in `supabase/seeds/demo.sql` must be able to sign
      in without a mailbox.
- [ ] Add **redirect URLs** to Auth → URL Configuration. `mobile/providers/AuthProvider.tsx:184`
      sends password recovery to `aceaix://reset-password`. That scheme must be in the
      allow list or recovery breaks in production. Add `aceaix://reset-password` and,
      if the web app is live, its own reset URL.
- [ ] Confirm **Site URL** is the production web origin, not `http://127.0.0.1:3000`.
- [ ] Confirm SMTP is configured for the hosted project (recovery and, if enabled,
      confirmation emails). **OPEN — who supplies the SMTP credentials.**
- [ ] Verify the three **storage buckets** exist with the right settings. They are
      created by migrations, so pushing migrations is enough — but check them:
      - `avatars` — **public**, 10 MB limit, `image/jpeg,image/png,image/webp`
        (`supabase/migrations/0019_profile_media_storage.sql`)
      - `posts` — **public**, 100 MB, images plus `video/mp4`, `video/quicktime`.
        Created private by `0018_mobile_release_infrastructure.sql` and flipped to
        public by `20260904000007_release_fixes.sql:25`, because the feed and profile
        highlights build plain public URLs and every image 404'd while it was private.
        Object paths carry an unguessable UUID, and who can *find* a post is still
        decided by `posts.audience` and RLS — but a URL that leaks is readable.
        `select id, public from storage.buckets;` after pushing: `posts` must be
        `true`. (0018 upserts `public = excluded.public`, so re-running it out of
        order would flip it back.)
      - `stories` — **private**, same limits as `posts`, and unused by the 1.0 client

### 1.2 Migrations

- [ ] `supabase db push` against the production project. The head migration is
      `supabase/migrations/20260904000010_close_minor_exposure_gaps.sql`.
- [ ] Spot-check that the safety machinery landed:
      - `select private.age_band_for(current_date - interval '14 years');` → `13_15`
      - inserting a `user_private.date_of_birth` under 13 raises
        `AceAiX requires all account holders to be at least 13 years old`
      - `select * from pg_policies where tablename = 'user_profiles';` shows
        `up_select_anon` restricted to `not is_minor and not is_suspended`
      - `select proname from pg_proc where proname in
        ('search_people','guardian_conversation_overview','my_linked_minors');`
        returns all three — they are the objects `20260904000010` adds, and their
        absence means the migration did not apply
      - `select age, age_band from public.discover_athletes(...)` for a seeded minor
        returns `null` and a band, not a number

### 1.3 Edge functions

- [ ] `supabase functions deploy guardian-consent`
- [ ] `supabase functions deploy talent-insights`
- [ ] `signup-user` — deploy only if the sign-up path uses it. The mobile client
      currently signs up through the Supabase client directly; `signup-user` sets
      `email_confirm: true` via the admin API. **OPEN — confirm which path production
      uses** so the two do not disagree about confirmation.
- [ ] Set function secrets (`supabase secrets set …`). `SUPABASE_URL` and
      `SUPABASE_SERVICE_ROLE_KEY` are supplied by the platform.
      - `RESEND_API_KEY` — **required in production**. Without it,
        `guardian-consent` does not send the email; it returns the link in the
        response instead (`supabase/functions/guardian-consent/index.ts:166-170`).
        A guardian would never receive it.
      - `CONSENT_FROM_EMAIL` — defaults to `AceAiX <safety@aceaix.com>`. The sending
        domain must be verified with the email provider or the mail will bounce.
      - `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` — optional; see the blocker above.

### 1.4 The hosted consent page URL

The guardian's approval page is served by the edge function itself, at:

```
https://<project-ref>.supabase.co/functions/v1/guardian-consent?token=<token>
```

- [ ] Confirm that URL loads a page for a valid pending token, and shows the
      "already answered" / "expired" pages for the other cases.
- [ ] **OPEN — decide whether to front it with `https://aceaix.com/consent`.** A
      branded URL reads better in a parent's inbox. If you add one, keep it off the
      `/app` path prefix so the Android intent filter does not capture it — a
      guardian without the app must land in a browser.
- [ ] Note for the record: the page is `noindex,nofollow` and the token is the only
      credential; `confirm_guardian_consent` is deliberately granted to `anon`.

### 1.5 Build-time environment

`mobile/app.config.js` copies two variables into `expo.extra` at build time, and
`mobile/lib/supabase.ts` fails loudly at startup if either is missing.

- [ ] `EXPO_PUBLIC_SUPABASE_URL`
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Both must be present in the EAS build environment. Either set them per-profile in
`mobile/eas.json` under `build.production.env`, or as EAS environment variables /
secrets:

```
eas env:create --name EXPO_PUBLIC_SUPABASE_URL       --value https://<ref>.supabase.co --environment production
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY  --value <publishable key>        --environment production
```

- [ ] Verify after building: a build with the values missing installs and then fails
      on every screen. Open the built app and sign in once before submitting.

---

## 2. Build

### 2.1 Version and build-number policy

- `mobile/app.json` → `version` is the **marketing version** (`1.0.0`) shown in both
  stores. Bump it by hand for every release you want users to see as new.
- `mobile/eas.json` → `cli.appVersionSource: "remote"` means **EAS owns the build
  number**. The `ios.buildNumber: "1"` and `android.versionCode: 1` in `app.json`
  are ignored for production builds.
- `mobile/eas.json` → `build.production.autoIncrement: true` makes EAS read the last
  build number it issued for this project and add one, then write it into the
  binary. You do not edit build numbers by hand, and you cannot collide with a
  build already uploaded.
- Policy: bump `version` when the release is user-visible; let `autoIncrement`
  handle `buildNumber` / `versionCode` on every build, including re-uploads after a
  rejection.

### 2.2 Build commands

```
cd mobile
eas build --platform ios     --profile production
eas build --platform android --profile production   # produces an .aab
```

- [ ] iOS build succeeded and is visible in App Store Connect → TestFlight.
- [ ] Android build succeeded (`build.production.android.buildType: "app-bundle"`).
- [ ] Sanity-check the build on a real device: sign in with `layla.demo@aceaix.com`,
      open the feed, open a profile, open Settings → Account.

Note: there is deliberately no `.aab` in the tree. One was committed once — 61 MB
in every clone, for ever — and `mobile/.gitignore` now refuses the whole class.
Build fresh, every time, so the version and build number are the ones you meant.

### 2.3 Submit

```
eas submit --platform ios     --profile production   # ascAppId 6785269968 is already set
eas submit --platform android --profile production   # track: alpha
```

- [ ] **OPEN — Play service account.** `mobile/eas.json` `submit.production.android`
      sets only `track: "alpha"`. There is no `serviceAccountKeyPath`. Either add the
      key (kept out of the repo) or configure it in EAS credentials. Owner: whoever
      holds the Play Console owner account.
- [ ] **OPEN — App Store Connect API key** for `eas submit --platform ios`, unless
      you upload manually. Owner: whoever holds the Apple developer account.
- [ ] `track: "alpha"` sends the build to closed testing, not production. Promote in
      Play Console when you are ready, or change the track.

---

## 3. Assets

### 3.1 Already in the repo

| Asset | Path | Size | Status |
|---|---|---|---|
| iOS app icon | `mobile/assets/images/icon.png` | 1024×1024, RGB, no alpha | Ready |
| Android adaptive icon foreground | `mobile/assets/images/adaptive-icon.png` | 1024×1024, RGBA | Ready |
| Splash | `mobile/assets/images/splash-icon.png` | 1024×1024 | Ready |
| Notification icon | `mobile/assets/images/notification-icon.png` | 96×96 | Ready |
| Web favicon | `mobile/assets/images/favicon.png` | 196×196 | Ready |
| Play store icon | `mobile/play-store-assets/icon-512.png` | 512×512 | **Verify — see below** |
| Play feature graphic | `mobile/play-store-assets/feature-graphic-1024x500.png` | 1024×500 | Ready |
| Play feature graphic (2×) | `mobile/play-store-assets/feature-graphic.png` | 2048×1000 | Not the required size — do not upload |

- [ ] **OPEN — `play-store-assets/icon-512.png` has no alpha channel** (PNG colour
      type 2, RGB). Google Play asks for a 32-bit PNG with alpha. Re-export with an
      alpha channel, or confirm the console accepts it at upload. Owner: design.
- The iOS 1024×1024 marketing icon is embedded in the build from `icon.png`; App
  Store Connect reads it from the uploaded binary. No separate upload, and no alpha
  channel and no rounded corners — both already correct.

### 3.2 Screenshots — generated, not photographed

**DONE. `store-assets/screenshots/`, regenerate with:**

```bash
cd mobile
npm run preview                                   # export → record → bake
node tests/e2e/store-screenshots.mjs --langs en,ar
```

It drives the same self-contained preview the artifact uses, at each store slot's
exact viewport, and writes a numbered set per language. No simulator, no device,
and repeatable the day a screen changes — which is why the repository had none
before.

| Store | Slot | Size | Shipped |
|-------|------|------|---------|
| App Store | iPhone 6.7" | 1290 × 2796 | en, ar |
| App Store | iPhone 6.5" | 1242 × 2688 | en, ar |
| Play | Phone | 1080 × 1920 | en, ar |

Six shots each, chosen because they show the machinery a reviewer is looking for:
the feed, the athlete profile with the Talent Score, the score breakdown, the
discovery list, trials, and notifications.

Check App Store Connect at upload time for which display sizes it marks mandatory
for this submission — Apple has been adding a 6.9" slot (**1320 × 2868**). Add it
to `SLOTS` in the script and re-run; that is the whole change.

Other assets, also generated:

- `store-assets/app-store/icon-1024.png` — 1024 × 1024, **no alpha** (Apple rejects transparency)
- `store-assets/play/icon-512.png` — 512 × 512, 32-bit with alpha
- `store-assets/play/feature-graphic-1024x500.png` — required on every Play listing

Still open: the optional app preview video (15–30 s, portrait), and screenshots in
the other five languages if you declare them.

Do not put a minor's face in a screenshot unless you hold a written release for it.
Use the seeded adult accounts.

Screenshots are **per-localisation** in both stores, so the six above are needed once per language
you declare in §4.1 — or, at minimum, once in English and once in Arabic, since Arabic is the only
right-to-left layout and is the fastest way to show a reviewer the localisation is real. The
walkthrough can produce a consistent set on demand:
`node tests/e2e/walkthrough.mjs --lang ar --scheme light` writes
`mobile/tests/e2e/shots/light-athlete-ar-*.png`. Those are 414 × 896 web-export shots — fine for
review and for checking layout, **not** at store resolution and not a substitute for device
captures.

---

## 4. Store metadata — where each field goes

| Field | Where | Source |
|---|---|---|
| App name (30) | ASC → App Information → Name | `docs/store/app-store-listing.md` |
| Supported languages | ASC → *version* → add a localisation · Play → Main store listing → Manage translations | §4.1 below |
| Subtitle (30) | ASC → *version* → Subtitle | `docs/store/app-store-listing.md` |
| Promotional text (170) | ASC → *version* → Promotional Text | editable without a new build |
| Description (<4000) | ASC → *version* → Description | `docs/store/app-store-listing.md` |
| Keywords (100) | ASC → *version* → Keywords | `docs/store/app-store-listing.md` |
| Support URL | ASC → *version* | `https://aceaix.com/support` (`web/src/Router.tsx:121`) — confirm it is deployed |
| Marketing URL | ASC → *version* | `https://aceaix.com` |
| Privacy Policy URL | ASC → App Information | `https://aceaix.com/privacy` |
| Category | ASC → App Information | Sports (primary), Social Networking (secondary) |
| Age rating | ASC → App Information → Age Rating | `docs/store/app-store-listing.md` §5 |
| App Privacy | ASC → App Privacy | `docs/store/data-safety.md` |
| Review notes + demo account | ASC → *version* → App Review Information | `docs/store/review-notes.md` |
| Title (30) | Play → Main store listing | `docs/store/play-store-listing.md` |
| Short description (80) | Play → Main store listing | `docs/store/play-store-listing.md` |
| Full description (4000) | Play → Main store listing | `docs/store/play-store-listing.md` |
| Category and tags | Play → Store settings | `docs/store/play-store-listing.md` |
| Contact details | Play → Store settings | `support@aceaix.com`, `https://aceaix.com` |
| Content rating (IARC) | Play → App content → Content rating | `docs/store/play-store-listing.md` §5 |
| Target audience | Play → App content → Target audience and content | `docs/store/play-store-listing.md` §6 |
| Data safety | Play → App content → Data safety | `docs/store/data-safety.md` |
| Child safety standards | Play → App content → Child safety standards | §5 below |
| App access (demo login) | Play → App content → App access | `docs/store/review-notes.md` |

---

### 4.1 Declaring the seven languages

The app ships **seven** languages (`mobile/i18n/languages.ts`). Both stores let you declare which,
and neither infers it from the binary — an undeclared language means the app does not surface for
that locale in search and the store page shows the English listing to everyone. This step is easy to
forget because nothing fails without it.

| Code | Language | App Store Connect localisation | Play language |
|---|---|---|---|
| `en` | English | English (U.K.) — the primary; leave as-is | English (United Kingdom) – `en-GB` |
| `ar` | Arabic | Arabic | Arabic – `ar` |
| `es` | Spanish | Spanish (Spain) | Spanish (Spain) – `es-ES` |
| `fr` | French | French | French – `fr-FR` |
| `de` | German | German | German – `de-DE` |
| `ru` | Russian | Russian | Russian – `ru-RU` |
| `zh` | Chinese, Simplified | Chinese (Simplified) | Chinese (Simplified) – `zh-CN` |

**App Store Connect.** App Store Connect has no "supported languages" checkbox: the set of
**localisations added to the version** *is* the declaration. On the version page, use the language
selector at the top to add each of the six above; each one then needs at least a name, subtitle,
description, keywords and screenshots before the version can be submitted. Apple falls back to the
primary language for any field left empty in a localisation.

**Google Play.** Main store listing → *Manage translations* → *Add your own translation language*.
Adding a language creates a listing you can fill in; Play will also offer machine translation —
**do not accept it** for a product aimed at minors, where the safety wording is the part that must
be exact.

- [ ] **Add all six non-English localisations in App Store Connect.**
- [ ] **Add all six translation languages in the Play Console.**
- [ ] Take at least one screenshot set in **Arabic** — it is the only right-to-left language, and a
      mirrored screenshot is the fastest way for a reviewer to see the app really is localised.
      Screenshots are per-localisation in both stores.

**The listing copy itself is still English only.** `docs/store/app-store-listing.md` and
`docs/store/play-store-listing.md` hold one language. That is a separate task from the app being
translated, and a lower bar: an untranslated listing is a marketing cost, whereas an untranslated
app would be a broken product. Do not machine-translate the descriptions to close the gap — they
contain the safety and Talent Score claims, and a mistranslation there is a claim the product does
not support. Recorded as an accepted decision in [15 §3](./15-known-gaps.md).

Two things that are **not** translated inside the app and should not be described as if they were,
if a reviewer asks: the four legal documents (deliberate — see
[16 §10](./16-internationalisation.md)) and notification titles / Talent Score tips, which are
composed in English by SQL ([16 §11](./16-internationalisation.md)).

---

## 5. Compliance items reviewers check for a social app with minors

Each line: what they check, how AceAiX satisfies it, and where it lives.

- [ ] **Account deletion from inside the app** (Apple 5.1.1(v); Play account
      deletion policy). Settings → Account → Delete account. Type `DELETE`, confirm
      once more. `mobile/app/settings/delete-account.tsx` → `deleteOwnAccount()` in
      `mobile/lib/api.ts` → `public.delete_own_account()`, defined in
      `supabase/migrations/0013_account_deletion_rpc.sql` and **replaced** by
      `20260904000010_close_minor_exposure_gaps.sql`, which is the version that runs.
      It now deletes the account's objects in the `avatars`, `posts` and `stories`
      buckets as well as its rows, so "delete my data" means what it says. The
      publicly reachable **web** deletion URL Play asks for on top of the in-app flow
      is still open — see §0.

- [ ] **Report on every piece of user content** (Apple 1.2; Play UGC policy). Posts,
      comments, stories, opportunities, profiles and messages, with a reason list
      that always includes **Child safety** (nine reasons on content and profiles,
      eight in a conversation). `mobile/components/feed/ContentActionsSheet.tsx:45-54`,
      `mobile/components/profile/ProfileHeader.tsx:53-63`
      and `mobile/components/messaging/PeerActionsSheet.tsx:26-34` →
      `public.report_content()` in
      `supabase/migrations/20260904000005_moderation_profiles_and_actions.sql:38`. A
      `child_safety` report, or any report touching a minor, is filed at `high`
      severity and the content is hidden immediately, before a human sees it
      (lines 85-112).

- [ ] **Block the abusive user** (Apple 1.2). Same two sheets →
      `public.block_user()` (same migration, line 124). A block deletes the follow in
      both directions and the notifications between the two accounts. The feed RLS
      policy `posts_select` (line 173) then excludes that author's posts in both
      directions, and `private.can_message()` refuses the conversation. Blocked
      accounts are managed at Settings → Privacy & safety → Blocked accounts.

- [ ] **Published community guidelines** (Apple 1.2). Shipped in the binary at
      `mobile/lib/legal/guidelines.ts`, rendered by `mobile/app/legal/guidelines.tsx`,
      reachable at Settings → About → Community Guidelines with no network and no
      account. Web copy is **OPEN** (§0).

- [ ] **Privacy policy URL.** `https://aceaix.com/privacy` (`web/src/Router.tsx:119`).
      The same text ships in the binary at `mobile/lib/legal/privacy.ts` and is
      reachable at Settings → About → Privacy Policy.
      - [ ] **Check the deployed page matches `mobile/lib/legal/privacy.ts`.** Two
            versions that disagree is worse than one that is late. The in-app text
            changed on three points and the web page has to be re-published with
            them: Resend is now named as the transactional email provider; Anthropic
            is named conditionally, for the optional insights feature, with what is
            and is not sent; and guardian consent records are now described as being
            deleted with the account rather than retained after it.

- [ ] **Age rating.** 13+ on Apple, Teen-equivalent on IARC. The floor is real, not
      declarative: `private.sync_age_state()` raises on any date of birth under 13
      (`supabase/migrations/20260904000002_youth_safety_and_consent.sql:144`), and
      `mobile/app/(auth)/sign-up.tsx` blocks the same case in the UI before the call.
      Since `20260904000010` the same check also runs when an athlete edits
      `birth_date` on their own profile, because that write is mirrored back into the
      private record. Age remains **self-declared and re-declarable** — do not claim
      any form of age verification in a store answer or a review note.

- [ ] **What is said about a minor's age.** Both listings and the Privacy Policy say
      "your exact age and date of birth are never shown; other people see a band such
      as 13-15". That is now literally true of every API the client calls:
      `get_profile_bundle`, `discover_athletes`, `recommended_athletes` and
      `opportunity_applicants` all return `age = null` and an `age_band` for an
      under-18, and the athlete card and applicant row render the band. Recruiters can
      still *filter* on an age range, which runs against the true date of birth on the
      server without returning it. If anyone edits this copy, check it against
      [12 §7.1](./12-youth-safety.md#71-age-what-leaves-the-server-and-what-does-not)
      — the earlier, weaker claim ("only the date of birth is private") is no longer
      what the code does and must not come back.

- [ ] **Encryption declaration.** `mobile/app.json` sets
      `ios.config.usesNonExemptEncryption: false` and
      `infoPlist.ITSAppUsesNonExemptEncryption: false`, so App Store Connect will not
      ask per build. This is the standard position for an app that uses only HTTPS
      through the operating system. Revisit it if anyone adds custom cryptography.

- [ ] **Google Play child safety standards** (Play → App content → Child safety
      standards, mandatory for Social apps). Have ready:
      - Published CSAE policy URL — **OPEN**, `https://aceaix.com/child-safety` does
        not exist yet (§0). The text is written and shipping in the app at
        `mobile/lib/legal/childSafety.ts`.
      - In-app CSAE reporting mechanism — the **Child safety** report reason, which
        auto-hides the content and files at `high` severity.
      - A published point of contact — `safety@aceaix.com`, stated in the Child
        Safety Standards document and reachable without an account.
      - A statement that the app complies with applicable CSAE laws — in the same
        document, including that matters are reported to the relevant authorities in
        the UAE and, where applicable, the country the account is in.
      - **OPEN — decide whether AryAiX registers with NCMEC or an equivalent
        reporting body.** Play asks how you report CSAM. Nothing in the code or the
        legal text names a body other than "the relevant authorities". This is a
        policy decision, not an engineering one.

- [ ] **No precise location.** `mobile/app.json` `android.blockedPermissions`
      explicitly blocks `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`, and
      there is no `NSLocationWhenInUseUsageDescription`. The only location held is
      the city and country a user types on their own profile. Say this in the review
      notes — it pre-empts a question.

- [ ] **Permission strings.** All four iOS purpose strings are set in
      `mobile/app.json` `infoPlist` and name the feature, not the permission. Android
      requests only `CAMERA`, `RECORD_AUDIO`, `POST_NOTIFICATIONS` and `INTERNET`;
      photo picking on Android 13+ goes through the system photo picker, so no media
      permission is requested.

- [ ] **Sign in with Apple** is not required: the app offers email and password only,
      with no third-party or social login (`mobile/providers/AuthProvider.tsx`).
      Worth one line in the review notes so nobody wonders.

- [ ] **No in-app purchases, no ads, no subscriptions.** No billing SDK, no ads SDK
      in `mobile/package.json`. Terms §8 states athletes are never charged.

---

## 6. Post-submission

### 6.1 If it is rejected

1. Read the resolution centre message and identify the **guideline number** cited.
   Apple names one; Play names a policy page.
2. Decide whether it is a **metadata** rejection (fixable without a build — copy,
   screenshots, age rating, privacy answers, review notes) or a **binary** rejection
   (needs a new build). Metadata fixes are usually resolved same-day.
3. Reply in the resolution centre before resubmitting. A reply that points at the
   exact screen and the exact database rule is much faster than a new build. Most of
   this category's rejections are answered by §5 above.
4. For a new build: bump nothing by hand — `autoIncrement` handles the build number.
   Bump `version` in `mobile/app.json` only if the change is user-visible.
5. Record what happened at the bottom of this file, so the next release does not
   repeat it.

### 6.2 Rejections this category actually gets

- **Apple 1.2 — Safety: User-Generated Content.** The reviewer could not find
  reporting, blocking, or the filtering commitment. Answer: name the exact taps
  (long-press a post → Report; profile → ⋯ → Block) and quote the auto-hide rule in
  `report_content`.
- **Apple 5.1.1(v) — account deletion.** The reviewer could not find it, or found it
  but the data was not deleted. Answer: Settings → Account → Delete account, and note
  that the RPC removes uploaded files as well as rows.
- **Apple 5.1.4 — Kids Category / apps aimed at children.** AceAiX is **not** in the
  Kids Category and does not target under-13s. If a reviewer treats it as a kids app,
  point at the hard 13 floor in the database.
- **Apple 5.1.2 / App Privacy mismatch.** The App Privacy answers disagree with the
  privacy manifest, or with what the app plainly does. Fix the manifest first (§0).
- **Play — Data safety mismatch.** Google runs automated checks against the binary.
  The commonest cause is declaring "no data collected" for something the app clearly
  sends. `docs/store/data-safety.md` is derived from the code precisely to avoid this.
- **Play — Families / target audience.** Declaring an under-13 audience triggers the
  whole Families programme. Do not. See `docs/store/play-store-listing.md` §6.
- **Play — Child safety standards incomplete.** The declaration is submitted without
  a working public CSAE policy URL. This is §0's first blocker.
- **Play — App access.** The reviewer could not sign in. Put the demo credentials in
  App content → App access, not only in the release notes.
- **Both — a broken demo account.** Re-run `supabase/seeds/demo.sql` against the
  production project shortly before submitting, and sign in yourself to confirm.

### 6.3 After it is approved

- [ ] Tag the release commit.
- [ ] Confirm the store listings show the intended screenshots and description.
- [ ] Confirm push notifications arrive on a production build (APNs key for iOS,
      FCM for Android, both via Expo).
- [ ] Confirm the guardian consent email actually sends from the production project,
      end to end, with a real mailbox.
- [ ] Watch the moderation queue: `select * from public.moderation_reports where
      status = 'open' order by severity desc, created_at;` **OPEN — who is on the
      queue, and what the response-time commitment is.** The Child Safety Standards
      document says child reports are "the first thing our team looks at each day";
      somebody has to actually do that.
