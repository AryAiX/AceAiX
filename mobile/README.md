# AceAiX mobile

The AceAiX app: React Native 0.81 + Expo SDK 54, Expo Router, TypeScript. One codebase for iOS,
Android and a web export (the web export is what the end-to-end walkthrough drives).

Architecture and the reasoning behind it: [`../docs/10-mobile-app.md`](../docs/10-mobile-app.md).

---

## Getting started

**Prerequisites**

- Node 20 or newer, and npm.
- A backend to talk to — either the local harness (`../tools/local-supabase/start.sh`, no Docker
  needed, see [`../docs/14-local-development.md`](../docs/14-local-development.md)) or a hosted
  Supabase project with every migration in `../supabase/migrations` applied.
- To run on a phone: **Expo Go** from the App Store or Play Store. Nothing else is required —
  there is no custom native code, and `react-native-reanimated` is stubbed out precisely so
  Expo Go works (see Conventions).

**Environment**

Two variables, both required, both public by design (the anon key is safe in a client — RLS is
what protects data):

```bash
cp .env.example .env
```

| Variable | Where it comes from |
|----------|---------------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Local: the URL `start.sh` prints (`http://localhost:8790`). Hosted: Supabase dashboard → Project Settings → API → Project URL. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Local: the key `start.sh` prints. Hosted: the same page → `anon` / publishable key. Never the service-role key. |

`app.config.js` copies both into `expo.extra` at build time so they survive an EAS build;
`lib/supabase.ts` reads `extra` first and falls back to the environment. If either is missing or
malformed the app renders `components/common/ConfigMissing.tsx` at startup instead of letting
every screen fail one at a time with a network error.

**Install and run**

```bash
npm install
npm run dev          # Metro + the Expo dev menu
```

From the dev menu: `w` opens the web build in a browser, `i` an iOS simulator, `a` an Android
emulator.

**On a device.** Phone and laptop must be on the same network. Run `npm run dev`, scan the QR
code with Expo Go (Android) or the Camera app (iOS). If you point at the local harness, replace
`localhost` in `.env` with your machine's LAN address (`192.168.x.x`) — the phone cannot resolve
your laptop's `localhost` — and restart Metro, because `EXPO_PUBLIC_*` is inlined at bundle time.

Native builds go through EAS: `npm run build:ios`, `npm run build:android` (profiles in
`eas.json`).

---

## Folder layout

| Path | |
|------|---|
| `app/` | Every route. Expo Router maps the file tree to URLs; groups are `(auth)`, `(onboarding)`, `(tabs)`, plus stack screens at the root. |
| `app/_layout.tsx` | The provider stack and **the only routing gate in the app**. |
| `components/ui/` | The design-system kit: `Button`, `Card`, `Screen`, `Text`, `Input`, `Sheet`, `Toast`, `ScoreRing`, `Tappable`, `AnimatedNumber`, loading/empty/error states. Import from `@/components/ui`. |
| `components/<feature>/` | Feature components (`feed`, `profile`, `discover`, `messaging`, `opportunities`, `settings`, `onboarding`, `celebrate`, `common`) — composed from the kit, never from raw styles. |
| `i18n/` | `languages.ts` (the seven shipped languages), `index.tsx` (`I18nProvider`, `useT`, plurals, RTL) and `locales/<code>/` — 17 namespace files per language, English typed as the source of truth. See [`../docs/16-internationalisation.md`](../docs/16-internationalisation.md). |
| `theme/tokens.ts` | Colour palettes (light **and** dark), spacing, radii, type scale, tier ramp. The only file allowed to contain a hex value. |
| `theme/ThemeProvider.tsx` | `useTheme()`, `useThemedStyles()`, and the persisted light/dark/system preference. |
| `lib/api.ts` | The shared data layer — every call the whole app makes. |
| `lib/api.<feature>.ts` | Calls only one feature needs (`auth`, `profile`, `feed`, `discover`, `messaging`, `opportunities`, `settings`). |
| `lib/supabase.ts` | The single Supabase client, plus bucket names and `publicUrl()`. |
| `lib/errors.ts` | `AppError` and the mapping from Postgres/GoTrue failures to sentences a 14-year-old can act on. |
| `lib/routes.ts` | Every navigation target, and `notificationTarget()` — build links from here, never by concatenating strings. |
| `lib/format.ts` | Small shared formatters (relative time, names, deadlines, metric lines). |
| `lib/legal/` | Terms, privacy, community guidelines and child-safety standards as strings, so a reviewer can read them offline. **English only, deliberately** — see `../docs/16-internationalisation.md` §10. |
| `lib/i18n-bridge.ts` | The one module-level translator, so `lib/errors.ts` and `lib/format.ts` can translate outside React. |
| `providers/` | `AuthProvider` (session + profile + role helpers), `UnreadProvider` (tab badges) and `ProgressProvider` (streak, achievements, celebrations). |
| `hooks/` | `useAsync` / `useAction` — the data-fetching primitives — plus `usePushNotifications` and `useReducedMotion`. |
| `types/models.ts` | TypeScript shapes mirroring the RPC signatures in `supabase/migrations`, one for one. |
| `constants/sports.ts` | The sport catalogue: positions and the metrics scouts filter on. |
| `stubs/` | The `react-native-reanimated` no-op (see below). |
| `tests/` | `tests/unit/` (Vitest) and `tests/e2e/walkthrough.mjs` (signed-in Playwright tour). |

---

## Conventions

These are not style preferences. Each one exists because its absence produced a bug in the
previous build.

**Never hardcode a colour.** Every screen calls `useTheme()`. Both palettes are defined in
`theme/tokens.ts`; a literal `'#fff'` in a screen is a dark-mode bug that ships. `tests/unit/theme.test.ts`
asserts that the light and dark palettes have exactly the same keys, so a token added to one and
forgotten in the other fails the test run rather than a user's night-time session.

**Reanimated is stubbed — use React Native's `Animated`.** `react-native-reanimated` resolves to
`stubs/reanimated-pkg` (via `metro.config.js` and a `file:` dependency), because the native
worklets version in Expo Go does not reliably match the JS one, and a mismatch is a hard crash on
launch. The stub exports no-op hooks and passthrough helpers, so a library that imports Reanimated
still loads — but anything you write with it will not animate. Write animations with
`Animated.timing` / `Animated.spring` from `react-native` and `useNativeDriver: true`, the way
`app/(tabs)/_layout.tsx` does.

**Every screen renders loading, error and empty.** Not "usually". `useAsync` returns
`{ data, error, loading, refreshing }` and the kit ships `SkeletonList`, `ErrorState` (with a
retry) and `EmptyState` (with an action) for exactly these. An empty list must say why it is
empty and offer the next step; a failure must offer a retry. A blank screen is a bug report
nobody can act on.

**Screens call `lib/api.ts`, never `supabase` directly.** The API layer returns typed data or
throws an `AppError` carrying a message worth showing. A screen that reaches for `supabase`
bypasses the error mapping, the typing, and the one place where a changed RPC signature can be
fixed. The two providers are the deliberate exceptions: `AuthProvider` owns the auth client and
`UnreadProvider` owns the realtime subscription.

**Navigate through `lib/routes.ts`.** `Routes.profile(id)`, not `` `/u/${id}` ``.
`notificationTarget(n)` maps a notification's typed `entity_type` / `entity_id` to a destination
and returns `null` when there isn't a sensible one, so the row renders non-tappable instead of
landing somewhere wrong.

**Redirect in one place.** `RouteGuard` in `app/_layout.tsx` is the only code allowed to
`router.replace()` someone between the auth, onboarding and app sections. Screens that redirect
each other is what produced the loops in the previous build.

**Types track the database.** When you change an RPC in `supabase/migrations`, change
`types/models.ts` in the same commit. The type is the contract the UI is written against.

**Never hardcode a user-visible string.** `const t = useT()`, then `t('feed.emptyTitle')`. New
strings are born in `i18n/locales/en/` and typechecking fails until the other six have them. Values
that are *stored* — a sport, a level, an opportunity type — stay English in the database and are
translated only at the label, through the helpers in `constants/sports.ts`. Outside React, use
`tr(key, 'English fallback')` from `lib/i18n-bridge.ts`.

**Every animation checks `useReducedMotion()`.** Not "no feedback" — a motion-reduced build still
says what changed, it just says it instantly or with a fade. Never animate on first paint, and never
loop something to demand attention. The full convention is in
[`../docs/17-engagement.md`](../docs/17-engagement.md) §8.

---

## Tests

| | Command | What it covers |
|---|---------|----------------|
| Types | `npm run typecheck` | `tsc --noEmit`, strict. Also what enforces catalogue parity: every non-English `i18n/locales/*/index.ts` is typed as `Translations`, so a missing key is a compile error. |
| Lint | `npm run lint` | `eslint-config-expo`. |
| Unit | `npm run test:unit` | Vitest over `tests/unit/` — error mapping, formatters, route/notification targeting, theme-token parity, i18n catalogue parity. Pure functions only; no React renderer, no network. |
| One unit file | `npx vitest run tests/unit/i18n.test.ts` | The translation checks on their own — see below. |
| All three | `npm test` | Typecheck → lint → unit. This is the pre-commit bar. |
| Walkthrough | `npm run test:walkthrough` | Exports the web build, then `tests/e2e/walkthrough.mjs` signs in as a demo account and visits 27 screens, failing on a console error, a missing expected string, or a screen that rendered almost nothing. Screenshots land in `tests/e2e/shots/`. Requires the local backend to be running. |
| Database | `npm run db:test` | Runs `../supabase/tests/run-all.sh`: applies every migration to a throwaway database, then asserts the safety and scoring rules in SQL. |

**`npx vitest run tests/unit/i18n.test.ts`** measures all six translated catalogues against English
and reports, per language: keys missing or unknown; whether it supplies exactly the plural
categories `Intl.PluralRules` says its grammar has (two for German, three for Spanish and French,
four for Russian, six for Arabic, one for Chinese); blank values; any `{{placeholder}}` dropped or
renamed in translation; and whether a namespace looks like it was copied across without being
translated. It also checks the English catalogue itself for blanks and for `${…}` template literals
that would never be translatable. Run it after touching anything under `i18n/`.

The walkthrough takes `--role athlete|coach|club|guardian`, `--scheme light|dark` and
`--lang en|ar|es|fr|de|ru|zh`. Run it for at least one athlete and one recruiter, since the tab
content differs by role. Because a fresh browser profile is a fresh install, the tour **passes the
language gate first** — it asserts the picker is there, clicks the row for `--lang` by its native
name, and only then signs in; shots are named `<scheme>-<role>-<lang>-<screen>.png`. Run
`--lang ar` before shipping a layout change.

Details on the harness and on what it deliberately does not do:
[`../docs/14-local-development.md`](../docs/14-local-development.md).
