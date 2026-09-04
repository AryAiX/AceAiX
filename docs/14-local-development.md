# 14 — Local Development

> How to run the whole AceAiX stack on one machine, with no Docker and no hosted Supabase project,
> and how to run each of the four test suites against it.
>
> The harness exists so that the real schema — the same migrations, the same RLS, the same RPCs —
> can be exercised on a laptop and in CI. It is not a mock backend, and the difference matters: a
> permission bug shows up here exactly as it would in production.

---

## 1. What `start.sh` brings up

```bash
./tools/local-supabase/start.sh
```

**Prerequisites:** PostgreSQL 16 with `pgvector` (`postgresql-16`, `postgresql-16-pgvector`), a
`postgrest` binary on `PATH` (or at `$POSTGREST`), and Node 20+. On Debian/Ubuntu the two Postgres
packages come from the PGDG apt repository; PostgREST is a single static binary from its releases
page.

The script, in order:

1. Starts a disposable PostgreSQL 16 cluster under `/var/lib/pgtest` if nothing is already
   listening — socket at `$PGHOST`, port 5433, trust auth, `wal_level=logical`.
2. Runs `supabase/tests/run-migrations.sh`, which drops and recreates `aceaix_local`, applies
   `supabase/tests/_shim.sql`, then applies **every** file in `supabase/migrations/` in filename
   order, printing `ok` or `FAIL` per file and stopping on the first failure.
3. Applies `tools/local-supabase/harness.sql` — the `dev` schema and the `authenticator` login role.
4. Seeds `supabase/seeds/demo.sql`.
5. Starts **PostgREST** on `:3010` against that database, with `db-anon-role = anon` and the shared
   JWT secret.
6. Starts `tools/local-supabase/server.mjs` on `:8790`.

| Piece | What it is |
|-------|-----------|
| `supabase/tests/_shim.sql` | Recreates just enough of the hosted platform for the migrations to apply to plain Postgres: the `anon` / `authenticated` / `service_role` / `authenticator` roles, `auth.users`, `auth.uid()` / `auth.role()` / `auth.jwt()` / `auth.email()`, `storage.buckets` / `storage.objects` / `storage.foldername`, and the `supabase_realtime` publication. `supabase db reset` never runs it. |
| `tools/local-supabase/harness.sql` | Not a migration, never run in production. Adds the login role PostgREST connects as, and `dev.sign_in` / `dev.sign_up` / `dev.set_password` / `dev.get_user` — bcrypt password functions standing in for GoTrue. The `dev` schema is not exposed through PostgREST; only the local API server calls it, over a direct connection. |
| `tools/local-supabase/server.mjs` | One origin at `:8790` that looks like a Supabase project to `@supabase/supabase-js`: it answers `/auth/v1/*` (signing HS256 JWTs PostgREST verifies), proxies `/rest/v1/*` to PostgREST, answers enough of `/storage/v1/*` for uploads and image URLs, stubs `/functions/v1/guardian-consent`, and exposes `/health`. |

`auth.uid()` in the shim reads the claim two ways: PostgREST sets one `request.jwt.claims` GUC
holding the whole payload (which is what the hosted platform does); the SQL test harness sets the
individual `request.jwt.claim.*` GUCs directly, because it has no token to present. Both are read.

Logs: `/var/lib/pgtest/postgrest.log` and `/var/lib/pgtest/api.log`.

---

## 2. Demo accounts

`supabase/seeds/demo.sql` populates a believable slice of the product — athletes across several
sports and ages including minors with and without guardian consent, verified and unverified
coaches, two clubs, open trials, applications, conversations and a feed — then recomputes every
Talent Score and prints the resulting table.

**Password for every account: `AceAiX-Demo-2026`**

| Email | Role | Why it exists |
|-------|------|---------------|
| `layla.demo@aceaix.com` | Athlete, 19, complete profile | The default walkthrough account and the app-review account. |
| `omar.demo@aceaix.com` | Athlete, **17** — consent `granted` | Minor with full consent: discoverable, messageable by a verified adult. Age band `16_17`. |
| `yusuf.demo@aceaix.com` | Athlete, **15** — consent `granted` | Minor with consent in the younger band, `13_15`. |
| `mina.demo@aceaix.com` | Athlete, **14** — consent `pending` | Minor **without** consent. Use this one to check the discovery gate and the messaging refusal. |
| `sara.demo@aceaix.com`, `daniel.demo@aceaix.com` | Athletes, 22 and 24 | Adults, for the non-minor paths. |
| `marco.demo@aceaix.com` | Coach, **verified** | The recruiter view; the only account that can open a conversation with a minor. |
| `hana.demo@aceaix.com` | Coach, unverified | Proves the verified-adult branch of `can_message` actually bites. |
| `academy.demo@aceaix.com` | Club | Posts trials, reviews applicants. |
| `parent.demo@aceaix.com` | Guardian | Linked to Mina's pending consent. The seed still sets `guardian_user_id` by hand (`demo.sql:209`), but since `20260904000010` that is belt-and-braces: the consent's `guardian_email` is this account's address, so the link triggers would make the same connection on their own — and do so in production, which they never used to (see [12 §4.6](./12-youth-safety.md)). |

The seed is idempotent: everything is keyed on fixed UUIDs and upserts, so re-running it is safe.
Those fixed ids are also what the walkthrough navigates to directly (`/u/b0000000-…`,
`/opportunity/80000000-…`).

---

## 3. Pointing the app at it

`start.sh` finishes by printing the two values to put in `mobile/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=http://localhost:8790
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs…
```

```bash
cd mobile && npm install && npm run dev
```

Two things to know about that anon key. It is a real HS256 JWT signed with the harness's default
`JWT_SECRET`, minted fresh on each start with a five-year expiry — so the *string* changes every
time the server restarts, but any key it has ever issued keeps verifying as long as the secret is
unchanged. That is why the value checked into `mobile/.env` continues to work across restarts and
you rarely need to re-copy it.

`EXPO_PUBLIC_*` is inlined at bundle time, so **restart Metro after editing `.env`**.

### On a phone, in Expo Go

The phone cannot reach your laptop's `localhost`, so the one thing that has to change is the
address the app is built with.

1. Find the laptop's address on the Wi-Fi it shares with the phone — `ipconfig getifaddr en0` on
   macOS, `hostname -I | awk '{print $1}'` on Linux. Say it is `192.168.1.24`.
2. Put that address in `mobile/.env`, keeping the anon key `start.sh` printed:

   ```
   EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.24:8790
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs…
   ```

3. Install **Expo Go** from the App Store or Play Store.
4. `cd mobile && npm install && npm run dev`, then scan the QR code — the camera app on iOS, the
   scanner inside Expo Go on Android.

Both devices must be on the same network, and the laptop's firewall has to allow ports 8081
(Metro) and 8790 (the API). If the phone loads the app but every screen is empty, it reached
Metro and not the API: the address in `.env` is still `localhost`, or the firewall is blocking
8790.

`npm run dev -- --tunnel` routes Metro through Expo's servers when the two devices are on
different networks — but it only tunnels Metro, not the API, so the backend still has to be
reachable from the phone. For that case, point `mobile/.env` at the hosted Supabase project
(§6) instead of the local harness.

Override any of `PGHOST`, `PGPORT`, `DB`, `API_PORT`, `PGRST_PORT`, `JWT_SECRET`, `PGBIN`,
`POSTGREST` in the environment if the defaults collide with something.

---

## 4. The four test suites

### 4.1 Migrations apply cleanly

```bash
./supabase/tests/run-migrations.sh [dbname]
```

Drops and recreates the database, applies the shim, then applies every migration in order and
prints one line per file. This is the check that a *fresh* environment can be stood up from this
repository at all.

That is not a hypothetical concern. `20260825000000_restore_missing_objects.sql` exists precisely
because several trigger functions and one table had been created directly against the hosted
project and never written into the migration chain — so `supabase db reset` failed at
`20260826000001`, and no local, staging or CI environment could be built from the repo. Everything
in that file is `create ... if not exists` / `create or replace`, so it is a no-op against the
existing production database.

**Rule that follows: never change the hosted database by hand.** If it is not in
`supabase/migrations/`, it does not exist.

### 4.2 The functional SQL suite

```bash
./supabase/tests/run-all.sh
```

Runs 4.1, then `supabase/tests/functional.sql` against the same throwaway database. It seeds its
own fixtures with fixed ids and impersonates users by setting the `request.jwt.claim.*` GUCs, so
every assertion runs under real RLS as a real user. Sections:

| Section | Asserts |
|---------|---------|
| provisioning | the signup trigger creates profile, private, preference and role rows; roles cannot be escalated via signup metadata |
| age banding and minor protection | the under-13 raise; `is_minor` / `age_band` derivation; a minor cannot turn on their own discoverability |
| who may message a minor | every branch of `private.can_message`; a forbidden `conversations` insert fails **at the database** |
| talent score | the pillar arithmetic, the tier bands, and that an athlete cannot write their own score or any other derived column |
| social graph and notifications | counters stay correct; notifications are generated with the right typed target |
| blocking | follows and notifications are removed both ways; blocked content vanishes from every read path |
| discovery and matching | the minor gate, block exclusion, match percentages and reasons |
| feed and profile bundle | audience rules; the blocked, suspended and non-athlete branches of `get_profile_bundle` |
| reporting | severity assignment and the immediate takedown on a child-safety report |
| no route around the discovery gate | the same non-consented minor is absent from `talent_leaderboard`, `search_people` **and** `discover_athletes`; with consent restored they reappear but with `age` null and `age_band` set, while an adult still returns an exact age and the age filters still match on the real date of birth |
| guardians can see what they approved | a guardian account created *after* the consent is linked to it by e-mail; `my_linked_minors` returns one row per young person; `guardian_conversation_overview` works for the linked guardian and raises for anyone else |
| one date of birth | editing `athlete_profiles.birth_date` writes back to `user_private` and flips `is_minor`, in both directions |
| every RPC the client calls, called once | each one invoked once, so an ambiguous column or an unassigned record — which raise at call time, not at create time — cannot reach a build |
| application status | an athlete can withdraw their own application and cannot promote it |

It ends with `✓ all functional tests passed`, or stops at the first failed assertion. Because it
runs `ON_ERROR_STOP`, a failure is loud.

**This suite is where the youth-safety rules are actually verified.** A change to messaging,
discovery or consent that does not break it has probably not been tested.

### 4.3 Mobile unit tests

```bash
cd mobile
npm run test:unit                          # vitest, the whole directory
npm test                                   # typecheck → lint → unit
npx vitest run tests/unit/i18n.test.ts     # one file
```

Vitest over `mobile/tests/unit/`, Node environment, no React renderer and no network — pure
functions only:

| File | |
|------|---|
| `errors.test.ts` | Postgres hints, SQLSTATEs and GoTrue messages map to the intended sentences, and a raw SQL message never leaks through. |
| `format.test.ts` | Relative time, dates, names, deadlines. |
| `routes.test.ts` | `notificationTarget()` sends each notification type to the right screen, and returns `null` rather than a wrong destination. |
| `theme.test.ts` | Light and dark palettes have identical keys; `tierForScore()` bands exactly where `private.tier_for_score` does. |
| `i18n.test.ts` | Catalogue parity across all seven languages — see below. |

The theme test is the tripwire for two whole classes of bug — a token added to one palette only,
and a tier cut-off changed in SQL but not in the client.

#### What `tests/unit/i18n.test.ts` checks

38 assertions, six per non-English language plus two on English itself. English is the source of
truth; every other catalogue is measured against it.

| Check | Fails when |
|---|---|
| English is sane | fewer than 500 keys, a blank value, or a `${…}` template literal that leaked into a catalogue and can never be translated |
| **exactly the English keys** | a non-plural key is missing, or one exists that English does not have (a typo, or a key nobody will ever look up) |
| **the plural forms its own grammar needs** | a language does not supply exactly the CLDR categories `Intl.PluralRules` reports for it — two for German, three for Spanish and French, four for Russian, six for Arabic, one for Chinese. A missing family, an unknown family and a wrong set of suffixes are three separate failures |
| no blank values | a translated string is empty or whitespace |
| **every placeholder the English string uses** | a `{{name}}` was dropped or renamed in translation, which would render a sentence with a hole in it. Plural forms are checked one-way — a form may drop the count word, but must not invent a placeholder |
| **"actually translated"** | 25 or more strings in one language are byte-identical to their English source. A heuristic, not a rule: brand names, `{{n}}m` and "Padel" are legitimately identical, so placeholders are stripped and strings under 8 characters ignored before judging. It exists to catch a namespace copied across and never translated, which is the failure mode that actually happens |

The catalogues are collected with Vite's `import.meta.glob(..., { eager: true })` rather than
`require`: they are TypeScript modules importing each other without file extensions, which Node's
resolver will not follow. A language listed in `LANGUAGES` with no directory on disk is simply
absent from the map, and the `exists` assertion is what reports it.

The compiler catches most of this first — every non-English `index.ts` is typed as `Translations` —
but the type cannot see plural categories, placeholders or untranslated copy. That is what this file
is for.

### 4.4 The signed-in walkthrough

```bash
# with the local backend already running
cd mobile
npm run test:walkthrough                                  # athlete, light, English
node tests/e2e/walkthrough.mjs --role coach --scheme dark
node tests/e2e/walkthrough.mjs --lang ar                  # right-to-left
```

Exports the web build, serves `dist/` on `:8792`, launches Chromium at 414×896, signs in as a demo
account, and visits 27 screens. A screen **fails** if it logs an uncaught console error, is missing
a string the tour expects, or renders under 60 characters of text — the last being the check that
catches a screen that silently rendered nothing, which is the failure mode that shipped in the
previous build.

Three flags: `--role athlete|coach|club|guardian`, `--scheme light|dark`, `--lang en|ar|es|fr|de|ru|zh`.

**The tour passes the language gate before it can sign in.** A fresh browser profile is a fresh
install, so the first thing on screen is the picker, not the sign-in form. The script asserts it is
there (looking for the hard-coded English heading `Choose your language`), photographs it as
`<scheme>-<role>-language-gate.png`, clicks the row for `--lang` by its **native** name — العربية,
Español, 中文 — through `getByRole('radio')`, presses Continue, and then returns to `/sign-in`. That
this step is required at all is itself a useful assertion: it proves the gate really does come
before routing.

Two consequences of running in another language:

- **Sign-in is driven positionally.** Placeholders and the button label are translated, so the
  script fills the first two `input` elements and presses the last button on the screen rather than
  matching text.
- **Only untranslated strings can be asserted.** The `expect` needles in the tour are things that
  are the same in every language — a person's name, an organisation's name, `Ace`. The legal
  documents are asserted on their English titles precisely because they are never translated
  ([16 §10](./16-internationalisation.md)).

The tour also dismisses up to four celebration cards after sign-in, since a fresh account can
legitimately open onto one; otherwise the overlay would be photographed instead of the home screen.

Screenshots land in `mobile/tests/e2e/shots/` as `<scheme>-<role>-<lang>-<screen>.png` and are meant
to be reviewed by eye as well as by assertion; both schemes and both roles are committed, so a
visual regression shows up in a diff.

Run it for at least one athlete and one recruiter — the Discover and Trials tabs render entirely
different content by role — and for `--lang ar` before shipping a layout change, since that is the
one pass that renders every screen with Arabic copy and takes the RTL branch of `setLanguage` (on
web that branch reloads the page instead of asking for a restart). Do not treat the Arabic
screenshots as proof that a native build mirrors correctly: the web export is not the platform that
applies `I18nManager` natively, and only a device or simulator can confirm that.

Note that `/settings/language` itself is **not** in the tour; the gate exercises the same
`LanguageList` component.

Known console noise (network 404s from the storage stub, missing favicon, WebSocket and realtime
failures, React Native web deprecation warnings) is filtered by the `IGNORE` regex. If you add a
genuinely noisy dependency, narrow the regex rather than widening it.

---

## 5. What the local harness is *not*

Read this before debugging something that is not broken.

**No realtime.** There is no websocket server. `server.mjs` answers `/realtime/v1` with `501`; the
Supabase client retries quietly and gives up. So:

- Tab badges do not update live — `UnreadProvider` falls back to its foreground refresh.
- A new message does not appear in an open thread until you refresh.
- Console errors about WebSockets and realtime channels are expected and are filtered by the
  walkthrough.

Live updates can only be verified against a hosted project. `20260904000007` ensures the relevant
tables are in the `supabase_realtime` publication so they work when one is present.

**Storage is stubbed.** Uploads are consumed and acknowledged; **nothing is written anywhere**. Any
`/storage/v1/object/public/...` read returns a 1×1 transparent PNG, so an `<Image>` always resolves
to something rather than 404ing the feed. Consequences: your avatar upload "succeeds" and then shows
a blank square; you cannot test image cropping, video playback, file-size limits or bucket
permissions locally. Storage RLS policies are applied by the migrations but nothing exercises them.

**No GoTrue.** `dev.sign_in` / `dev.sign_up` are bcrypt password checks and nothing more. There is
no e-mail confirmation (local sign-up returns a session immediately), no password-recovery e-mail,
no OAuth, no magic link, no rate limiting on auth, and no refresh-token rotation —
`/auth/v1/token?grant_type=refresh_token` accepts a `local-refresh-<uuid>` string. Do not conclude
anything about the real auth flow from local behaviour.

**Edge functions are not running.** `guardian-consent` is stubbed to return
`{ok: true, sent: false}` so the onboarding guardian step completes without a Deno runtime. The real
consent page, the e-mail, and `talent-insights` are not exercised locally — run them with
`supabase functions serve` against a hosted project, or read the SQL side of the flow
(`confirm_guardian_consent`) which the functional suite does cover.

**No e-mail of any kind.** No Resend, no confirmation mail, no recovery mail.

**Push notifications do not work**, and are not expected to: there is no APNs/FCM path, and the web
export has no native push at all.

**Not a security boundary.** The JWT secret is a literal in `start.sh`, `initdb` runs with `trust`
auth, and `authenticator` has the password `postgres`. Never point this at anything real, and never
reuse the secret.

---

## 6. Deploying the same migrations for real

The local harness applies migrations with plain `psql`; a hosted project uses the Supabase CLI:

```bash
supabase link --project-ref <ref>
supabase db push
supabase functions deploy guardian-consent talent-insights
```

Function secrets to set: `RESEND_API_KEY` and `CONSENT_FROM_EMAIL` for `guardian-consent`;
`ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) for `talent-insights`. Both functions
degrade gracefully without them — the consent link is returned in the response instead of e-mailed,
and the insight falls back to a written template — so a missing secret is a reduced feature, never
an outage.

---

## 7. Related documents

- [`mobile/README.md`](../mobile/README.md) — app setup and conventions.
- [10 — Mobile App Architecture](./10-mobile-app.md)
- [16 — Internationalisation](./16-internationalisation.md) — what the i18n test is protecting.
- [17 — Engagement](./17-engagement.md) — the celebration overlay the walkthrough dismisses.
- [12 — Youth Safety](./12-youth-safety.md) — most of what `functional.sql` asserts.
- [13 — Store Submission](./13-store-submission.md) — the demo accounts above are also the
  review accounts.
- [06 — Supabase Integration](./06-supabase-integration.md) — the hosted-platform view.
