# 10 — Mobile App Architecture

> How `mobile/` is put together and why. The app was rebuilt from scratch in September 2026; the
> previous mobile client was deleted rather than repaired. This document is the map a new engineer
> needs before touching a screen.
>
> Setup and conventions live in [`mobile/README.md`](../mobile/README.md); this is the reasoning.
> Where this document and the code disagree, the code wins — fix the document.

---

## 1. Stack

React Native 0.81 · Expo SDK 54 (New Architecture on) · Expo Router 6 (file-based routing) ·
TypeScript, strict · `@supabase/supabase-js` 2 · `lucide-react-native` for icons ·
`react-native-svg` for the score ring and sparkline.

Deliberately absent:

- **No state-management library.** There is no Redux, Zustand or TanStack Query. Server state is
  fetched per screen through `useAsync` and refetched on focus; the only cross-screen state is a
  session and two unread counts, and those are React context. Adding a cache layer would mean a
  second source of truth for data the database already owns.
- **No Reanimated.** It resolves to a no-op stub (`mobile/stubs/`). See §7.
- **No styling framework.** Styles are plain `StyleSheet` objects built from theme tokens.

The web export (`npm run build:web`) is a real target: it is what the end-to-end walkthrough
drives, and it is the fastest way to look at a screen.

---

## 2. Routing

Expo Router maps `app/` onto URLs. Three groups plus a flat stack:

```
app/
├─ _layout.tsx            providers + the language gate + the routing gate + the root Stack
├─ index.tsx              entry spinner (no group of its own)
├─ (auth)/                welcome, sign-in, sign-up, forgot/reset password, check-email
├─ (onboarding)/          the one-time profile wizard
├─ (tabs)/                home · discover · [create] · trials · profile
├─ compose.tsx            modal
├─ opportunity/new.tsx    modal
├─ post/ u/ org/ chat/    detail stacks
├─ inbox, notifications, search, score, achievements, edit-profile
├─ settings/              ten screens behind one entry point
├─ legal/                 four documents, reachable signed-out
└─ +not-found.tsx
```

44 screens and 6 layouts.

### 2.0 The language gate comes first

Before `RouteGuard` runs at all, `Shell` checks whether a language has been chosen:

```tsx
if (languageLoading) return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;
if (!hasChosen) return <LanguageGate />;
```

`LanguageGate` is **not a route** — it replaces the whole `<Stack>` on a fresh install, so there is
no path to a screen in the wrong language and no redirect to get wrong. It is deliberately the
opposite shape to `RouteGuard`: the routing gate has to redirect, and therefore had to be
concentrated in one place; the language gate has to *precede* routing, and therefore must not be a
destination at all.

The order matters: there is no point deciding which screen to show until we know what language to
show it in, so this sits ahead of the session check too. On every launch after the first the stored
choice makes it invisible. `primeLayoutDirection()` is also called at module scope in this file,
before React renders, so an Arabic install comes up right-to-left rather than flipping a beat later.
See [16 — Internationalisation](./16-internationalisation.md).

### 2.1 The single routing gate

`RouteGuard` inside `app/_layout.tsx` is **the only place in the app that redirects a person
between sections**. It reduces to four rules:

| Condition | Destination |
|-----------|-------------|
| Still loading, or Supabase not configured | do nothing |
| No session, and not already in `(auth)` or a public group (`legal`, `+not-found`) | `/(auth)/welcome` |
| Session but no profile row yet | do nothing — wait for it |
| Profile with `onboarding_completed = false`, not already in `(onboarding)` | `/(onboarding)` |
| Otherwise, if sitting in `(auth)`, `(onboarding)` or at `/` | `/(tabs)` |

Why one place: in the previous build each screen redirected on its own, checking its own subset of
the same conditions. Two screens with slightly different ideas of "signed in" produce a redirect
loop; a screen that forgets a case produces a dead end. Both shipped. With one gate the entire
navigation policy is eight lines you can read at once, and a new screen inherits it by existing.

Two details worth knowing:

- **`atEntry`.** `/` is `app/index.tsx` and belongs to no group, so `segments` is empty there. Every
  other branch of the gate is written against a group name, so with no branch of its own a signed-in,
  fully onboarded person opening the app cold would sit on the entry spinner for ever — nothing would
  ever move them off `/`. The last rule therefore reads
  `if (inAuth || inOnboarding || atEntry) router.replace('/(tabs)')`, with
  `atEntry = (segments as readonly string[]).length === 0` — the widening cast is what lets the
  length be compared at all, since Expo Router types `segments` narrowly from the route tree. If you
  ever add another groupless top-level route, it needs the same treatment.
- **Waiting on `profile`.** After sign-in the `user_profiles` row is created by a database trigger
  and may not be readable for a few hundred milliseconds. The gate returns early rather than
  treating "no profile" as "not onboarded" and bouncing someone into the wizard they just finished.
  `AuthProvider` retries the profile read once, briefly, on `SIGNED_IN` for the same reason.

`legal/` is registered outside the session check because the welcome screen links to Terms and
Privacy, and a store reviewer must be able to read them without an account.

### 2.2 Navigation targets

Screens never build a path by hand. `lib/routes.ts` holds every target as a constant or a small
function (`Routes.profile(id)`, `Routes.applicants(id)`), and `notificationTarget(n)` maps a
notification's typed `entity_type` / `entity_id` / `type` onto a destination — returning `null`
when there is nowhere sensible to go, so the row renders non-tappable rather than navigating into
a dead end. The old client stored a free-text `action_url` on each notification with nothing to
validate it against, which is why taps landed on the wrong screen. `tests/unit/routes.test.ts`
covers the mapping.

---

## 3. The provider stack

`app/_layout.tsx`, outermost first:

| Provider | Responsibility | Why it sits where it does |
|----------|----------------|---------------------------|
| `GestureHandlerRootView` | gesture handling | Required at the root by react-native-gesture-handler. |
| `SafeAreaProvider` | insets | The theme and every `Screen` need insets. |
| `ThemeProvider` | palette, scale, persisted light/dark preference | Everything below it, including error and config screens, must be able to paint. |
| `I18nProvider` | the chosen language, `t()`, direction, the stored choice, the translator bridge | Above everything that renders words, which is everything. Inside the theme only because the language gate it enables needs to paint. |
| `ToastProvider` | transient feedback | Above `AuthProvider` so an auth failure can raise a toast. |
| `AuthProvider` | session, profile row, role flags, all auth verbs | Needs a theme for nothing, but everything below needs a session. |
| `UnreadProvider` | notification/message badge counts | Needs the user id from `AuthProvider`. |
| `ProgressProvider` | streak, achievements, the celebration queue and overlay | Inside `AuthProvider` because it reads the session; **outside `Shell`** so a celebration can appear over any screen. |
| `Shell` | fonts, splash, config check, the language gate, the root `Stack` | — |

`AuthProvider` exposes `session`, `profile` (an `AccountProfile`: role, verification, `is_minor`,
`age_band`, discoverability, onboarding flag, counters) and the derived `isAthlete` /
`isRecruiter` / `isGuardian` flags that switch tab content by role. It also resumes Supabase's
token auto-refresh on foreground, which Supabase pauses in the background — the usual cause of a
session that looks expired after a day on a phone.

`UnreadProvider` subscribes to Postgres changes on `notifications` and `messages` for the current
user and additionally refreshes on foreground, because the realtime socket usually dies while the
app is backgrounded and a stale badge is the most visible kind of staleness. Badge failures are
swallowed: a count is cosmetic and must never raise an error at the user.

`I18nProvider` reads the stored language from `AsyncStorage` on mount, loads that catalogue lazily
(English is bundled eagerly as the fallback), and registers the current translator with
`lib/i18n-bridge.ts` so `lib/errors.ts` and `lib/format.ts` can translate outside React. It exposes
`hydrating` and `hasChosen`, which is what `Shell` gates the language picker on. Full detail in
[16](./16-internationalisation.md).

`ProgressProvider` calls `record_activity` once per foreground — not once per screen — holds the
`my_progress` snapshot everything else reads, and queues unseen achievement unlocks and tier
promotions into `CelebrationOverlay`. **Every path in it swallows its error**: if the network is
down the app behaves exactly as it did before the provider existed, and `useProgress()` has a
working default context of zeros so `StreakChip` and the achievements wall render outside the
provider too. See [17](./17-engagement.md).

Fonts (Inter + Saira Condensed) load in `RootLayout`. A **failed** font load is treated as a
loaded one — otherwise a missing font file leaves the user staring at a splash screen forever.

---

## 4. The data layer

### 4.1 One rule

> Screens call `lib/api*.ts`. Screens never touch `supabase` directly.

`lib/api.ts` holds every call the whole app shares; `lib/api.<feature>.ts` holds the calls only
one feature needs (`auth`, `profile`, `feed`, `discover`, `messaging`, `opportunities`,
`settings`). Each function returns typed data or throws. The two sanctioned exceptions are
`AuthProvider` (owns the auth client) and `UnreadProvider` (owns the realtime channel).

The reason is not tidiness. When a screen assembles its own query, a renamed join or a changed
column produces an empty array, and an empty array renders as an empty screen — silently, with no
error anywhere. Centralising the calls means a broken contract throws, once, in a place that has
a name.

### 4.2 Typed RPC wrappers

Most reads are a single `supabase.rpc(...)` call whose return type mirrors the SQL signature in
`supabase/migrations` one for one, declared in `types/models.ts`. The screen-shaped RPCs —
`get_feed`, `get_profile_bundle`, `get_conversations`, `discover_athletes`,
`recommended_opportunities`, `opportunity_applicants` — each return exactly what one screen
renders, already filtered for blocks, suspensions, moderation state and audience.

That is a deliberate division of labour: **the database decides what a viewer may see; the client
decides how it looks.** It means an empty list genuinely means "nothing to show" rather than "a
join quietly failed", and it means a client bug cannot leak a row that RLS would have hidden.

When you change an RPC, change `types/models.ts` in the same commit. The type is the contract the
whole UI is written against.

### 4.2.1 Searching for a person goes through an RPC

`searchPeople(query, role?, limit)` calls `public.search_people` and returns `PersonResult[]`
(`id`, `role`, `full_name`, `avatar_url`, `bio`, `city`, `country`, `is_verified`, `is_minor`,
`followers_count`, `sport`, `position`, `talent_score`, `tier`, `is_following`).

It used to be a `supabase.from('user_profiles').ilike(...)` query built in the client, and that was
a real hole rather than a style problem. `up_select_authenticated` is `using (true)` — it has to be,
because a signed-in user must be able to load the profile of whoever they are already talking to —
so a client-side name query returned minors whose guardian had approved nothing. Reading *a* profile
and *searching* for one are different acts, and only the second is discovery. The RPC is where that
distinction is drawn; see [12 §5](./12-youth-safety.md#5-discovery-gating).

Two callers: `app/search.tsx` (through `listCoaches`, which forwards to `searchPeople` whenever
there is a search term) and the coach list on Discover. `listCoaches` with an **empty** term is a
browse rather than a search and still reads `user_profiles` directly — noted as an open item in
[12 §11](./12-youth-safety.md#11-known-gaps).

The general rule this is an instance of: **if a screen can put a stranger's name on the screen, the
row has to come from an RPC.** A `.from()` in `lib/api*.ts` is fine for your own rows, for a profile
you already have a relationship with, or for organisations — not for finding people.

### 4.3 `AppError`

`lib/errors.ts` converts any failure into something a 14-year-old can act on, in this order:

1. A `hint` set by a `raise ... using hint = '...'` in SQL — the most specific signal we have.
   `guardian_consent_required`, `messaging_not_permitted`, `rate_limited`, `age_below_minimum`
   each map to a written sentence.
2. A recognised SQLSTATE (`23505`, `23503`, `23514`, `42501`, `54000`, `P0002`, `PGRST301`).
3. A recognised GoTrue message (`Invalid login credentials`, `Email not confirmed`, …).
4. Network and 401/403 shapes.
5. A short, non-SQL-looking `RAISE` message we wrote ourselves, passed through as-is.
6. Otherwise: "Something went wrong. Please try again."

A raw Postgres message never reaches a screen. `AppError` carries the `hint` through, so a caller
can branch on the machine-readable reason while still having a human sentence to show.

### 4.4 `useAsync` and `useAction`

`hooks/useAsync.ts` is the only fetching primitive:

```ts
const feed = useAsync(() => getFeed({ scope }), [scope], { refetchOnFocus: true });
// { data, error, loading, refreshing, refresh, reload, mutate }
```

It guarantees three things the old screens got wrong:

- a response that arrives after unmount, or after a newer request was issued, never sets state
  (a monotonic run id, not just a mounted flag);
- a failure always produces a rendered message, never a silent empty state;
- `refresh()` sets `refreshing`, not `loading`, so pull-to-refresh does not flash the skeleton.

`mutate()` updates the cached value without a round trip, which is how likes, follows and saves
stay instant.

`useAction` is the write-side counterpart for buttons: `{ run, loading, error, clearError }`.

Every screen therefore has the same four states — loading, error, empty, content — and the UI kit
ships a component for the first three (`SkeletonList`, `ErrorState` with retry, `EmptyState` with
an action).

---

## 5. Design system

`theme/tokens.ts` is the only file in the app permitted to contain a colour literal.

**Palettes.** `light` and `dark` are full, independent `Palette` objects with identical keys —
surfaces, lines, text, brand, semantic states, plus `skeleton`, `shadow`, `tabBar` and
`statusBar`. Dark is not derived from light by darkening; both were designed. `tests/unit/theme.test.ts`
asserts key parity, so a token added to one palette and forgotten in the other fails CI rather
than a user's evening.

**Brand.** Ace Orange `#FF5A1F` for actions and active states; Azure for verification, trust and
links; **Volt `#C9F03C` is reserved for the Talent Score and nothing else** — scarcity is what
makes it read as meaning rather than decoration.

**Scale.** `Spacing` (2→56), `Radii` (6→pill), `FontSize` (11→56), `LineHeight`, `Duration`, and
`HitSize` with a 44pt minimum because the primary user is a teenager with a thumb, not a mouse.
Inter for text, Saira Condensed for display numbers and headlines.

**Tier ramp.** `TierColors` / `TierLabels` / `tierForScore()` mirror `private.tier_for_score` in
SQL. The unit test asserts the cut-offs match; if a band moves in the database and not here, the
test fails.

### Light and dark

`ThemeProvider` resolves a stored preference (`system` | `light` | `dark`, persisted in
`AsyncStorage`) against the OS scheme and hands down one `Theme` object:

```ts
const { colors, spacing, radii, font, size, elevation, alpha } = useTheme();
```

`useThemedStyles(factory)` memoises a style object per scheme, so styles are recomputed only when
the palette flips. `elevation(level)` returns a shadow tuned per scheme — a dark UI needs a much
higher shadow opacity than a light one to read at all — and `alpha(hex, a)` produces translucent
variants without a second token.

There is no dark-mode override anywhere in the app: switching schemes is switching the palette
object, and every screen follows because every screen went through `useTheme()`. That is the whole
reason for the "never hardcode a colour" rule.

### Two additions to the kit

- **`Tappable`** (`components/ui/Pressable.tsx`) — the general-purpose tap target. It springs in
  under a thumb and back out on release, the way `Button` does. Exported under that name so it never
  shadows React Native's own `Pressable` at a call site. `haptic` is off by default
  (`true | 'light' | 'medium' | 'selection'`) because not every target should buzz, and the action
  fires before the haptic so feedback can never gate it. `containerStyle` styles the animated
  wrapper; `style` keeps `Pressable`'s own shape including `({ pressed }) => …`.
- **`AnimatedNumber`** (`components/ui/AnimatedNumber.tsx`) — a count that tweens to its new value
  and steps the digits in from the direction they moved. It **never animates on first paint**
  (`animateOnMount` defaults to false — a feed full of counters spinning up looks like a slot
  machine), re-renders only itself, gates re-renders on the formatted string so 12 → 13 costs one
  render, and announces the final value rather than a frame of the count.

Both consult `hooks/useReducedMotion.ts`, as does every other animation in the app: with Reduce
Motion on, `Tappable` dims instead of scaling and `AnimatedNumber` sets the value outright. The
convention and the full table of what degrades to what is in [17 §8](./17-engagement.md).

---

## 6. Information architecture: five tabs

```
Home        the feed                        Discover    athletes, clubs, leaderboard
                          [ + ] compose
Trials      opportunities / your postings    You         your profile
```

Everything else hangs off one of the five: the score screen off the profile, the inbox and
notifications off Home's header, settings off the profile, applicants off a posting.

**Why five.** The previous build put sixteen screens behind a drawer. Each was reachable, and the
result was an app people described as complicated: nothing on screen told you where you were, the
drawer had to be opened to remember what existed, and the two things a person actually does daily
(look at the feed, look at their score) were three taps apart. Sixteen equal-weight destinations
is not an information architecture — it is a list of features.

Five tabs forces a decision about what the product is for, and the decision here is: *see what's
happening, find people, find trials, post, look after your own profile.* Anything that does not
belong to one of those five is a detail screen you reach from a specific thing, not a top-level
destination.

Two consequences worth knowing:

- **The centre button is not a route.** `(tabs)/create.tsx` exists so Expo Router does not warn
  about a missing screen; the tab bar intercepts the press and opens `/compose` as a modal. If a
  deep link or a restored navigation state ever does land on it, it forwards to the composer
  rather than showing a blank tab.
- **Tabs change content by role, not by count.** An athlete's Trials tab shows open, saved and
  applied; a coach's shows their postings and applicants. Discover shows athlete exploration to an
  athlete and preference-driven matching to a recruiter. The frame stays identical, so there is
  one app to learn rather than three.

---

## 7. Reanimated is stubbed

`react-native-reanimated` is redirected to a local no-op package: a `file:` dependency in
`package.json` plus a `resolver.extraNodeModules` entry in `metro.config.js`.

Expo Go bundles a fixed native `react-native-worklets` version. When the JS version of Reanimated
disagrees with it — which it does across most SDK/patch combinations — the app crashes on launch
rather than degrading. Since the design needs no gesture-driven or scroll-linked animation, the
trade was: lose Reanimated, keep Expo Go, and keep the ability to hand anyone a QR code.

The stub exports the whole surface as no-ops (`useSharedValue`, `withTiming`, `FadeIn`, …) so any
transitive dependency that imports it still loads. **Anything you write against it will not
animate.** Use `Animated` from `react-native` with `useNativeDriver: true`; `app/(tabs)/_layout.tsx`
is the working example.

---

## 8. Route table

| Route | Purpose |
|-------|---------|
| `/` | Entry spinner. Renders while the gate decides where you belong. |
| `/(auth)/welcome` | Signed-out landing. Type and gradient only — no stock photography, because we have none and a fake one would be a lie. Links to legal. |
| `/(auth)/sign-in` | Email + password. |
| `/(auth)/sign-up` | Four steps: role, name, date of birth, credentials. The date-of-birth step is an age gate — under 13 the account is never created, and the person gets an explanation rather than a database error. |
| `/(auth)/forgot-password` | Request a recovery e-mail. |
| `/(auth)/reset-password` | Opened from `aceaix://reset-password`. Exchanges the recovery token only on submit, so the gate cannot bounce the person out mid-form. |
| `/(auth)/check-email` | The account exists but the address is unconfirmed. Resend, or go back. |
| `/(onboarding)` | The one-time profile wizard: sport, position, level, place, physicals, photo, guardian consent (13–17), finish. Each answer is written on advance, so quitting halfway loses nothing; the final step sets `onboarding_completed`. Recruiters get a different step set (`RecruiterSteps`). |
| `/(tabs)` | **Home.** The feed — for-you / following / sport. Page one via `useAsync` (so returning from the composer refreshes it), later pages appended with a keyset cursor. The header carries the inbox and notifications, both badged from `UnreadProvider`. |
| `/(tabs)/discover` | **Discover.** Recruiters: preference-driven "Matched for you", full filtered search over `discover_athletes`, shortlists. Athletes: exploration — leaderboard, clubs, coaches, people to follow. |
| `/(tabs)/create` | Not a real destination; the tab bar opens `/compose`. |
| `/(tabs)/opportunities` | **Trials.** Athlete: open / saved / applied. Recruiter: your postings and their applicants. |
| `/(tabs)/profile` | **You.** Your own profile, Talent Score above the fold, tabs for posts, highlights, career and people. |
| `/compose` | Modal composer. Media uploads first, then the row is written, so a failed upload never leaves a caption-only post behind. |
| `/post/[id]` | One post and its comment thread. |
| `/u/[id]` | Someone else's profile. Handles every branch `get_profile_bundle` can return: normal, blocked pair, suspended account, malformed id, failed call. This screen must never render blank. |
| `/u/[id]/followers`, `/u/[id]/following` | The two people lists. |
| `/org/[id]` | A club or academy: about, squad, postings. |
| `/inbox` | Conversations, from one RPC that already excludes blocks and suspensions. |
| `/chat/[id]` | One thread. Shows the minor-safety banner when the other person is under 18, and replaces the composer with an explanation when `can_message_user` says no. |
| `/notifications` | The notification list; each row routes through `notificationTarget()`. |
| `/search` | People and organisations by name. Reached from the Discover tab. People come from `search_people` as `PersonResult` rows, already through the discovery gate (§4.2.1). |
| `/score` | The Talent Score in full: the number, the tier, the curve, the five pillars, the tips, and the "how this is calculated" disclosure sheet. See [11](./11-talent-score.md). Also the only entry point to `/achievements`. |
| `/achievements` | The achievements wall: how many of the nineteen you have, the seven-day streak calendar, the tier-progress bar, and four groups of badges. Unearned ones are shown dimmed with their real condition rather than hidden, because the screen exists to answer "what next?". No error state — pull to refresh. See [17](./17-engagement.md). |
| `/edit-profile` | One form, four sections, one Save. Saving recomputes the score and names the change — that feedback loop is the reason anyone fills a profile in. |
| `/opportunity/[id]` | One opportunity, with match reasons, and apply / save / withdraw for an athlete. |
| `/opportunity/[id]/applicants` | The club's ranked applicant list. A non-owner gets a plain explanation, not an error dump — a shared link landing here is expected. |
| `/opportunity/new` | Modal. Post a trial, scholarship, contract or camp. |
| `/settings` | The settings index. |
| `/settings/account` | Email, password, verification request, data export. |
| `/settings/privacy` | Who may message you, and discoverability. For a minor, discoverability is bound to guardian consent and says so. |
| `/settings/notifications` | Per-channel preferences and the push-permission prompt. |
| `/settings/blocked` | Blocked accounts, with unblock. |
| `/settings/guardian` | Three different screens behind one route: a minor requesting/withdrawing consent, a guardian seeing the children linked to them — with a `ConversationOverview` per granted, messaging-enabled link showing who the young person is talking to and how much, never what was said — and an adult being told it does not apply. |
| `/settings/scouting` | A recruiter's saved match preferences — what drives "Matched for you". |
| `/settings/appearance` | Light / dark / system, previewed with a live miniature feed card built from the theme rather than a screenshot. |
| `/settings/language` | The seven languages, using the same `LanguageList` as the first-launch gate. The choice applies immediately; switching into or out of Arabic changes the layout direction and asks for a restart, because React Native applies direction natively. Also states that the four legal documents are English only. See [16](./16-internationalisation.md). |
| `/settings/delete-account` | Irreversible deletion via `delete_own_account`, with confirmation. |
| `/legal/terms`, `/legal/privacy`, `/legal/guidelines`, `/legal/child-safety` | The four published documents, shipped as strings in `lib/legal/` so a reviewer can read them with no network and the shipped copy can never disagree with the shipped build. |
| `/+not-found` | Unknown path. |

---

## 9. Push notifications

`hooks/usePushNotifications` registers a token and routes a notification tap, but **never asks for
permission on first launch**. A prompt shown before a person understands what AceAiX sends is
declined once and forever, and iOS reviewers treat a cold-start prompt as a smell.
`requestPushPermission` is exported for the settings screen and the moment after onboarding, when
the answer means something.

Nothing in that file may throw into the app: a simulator has no token, a dev build may have no EAS
project id, and Expo Go on Android has no remote push at all. Every one of those degrades to "no
push", never to a red screen.

---

## 10. Related documents

- [`mobile/README.md`](../mobile/README.md) — setup, conventions, tests.
- [11 — Talent Score](./11-talent-score.md) — what the number on `/score` means.
- [12 — Youth Safety](./12-youth-safety.md) — the rules behind the banners and disabled buttons.
- [14 — Local Development](./14-local-development.md) — running the whole stack without Docker.
- [15 — Known gaps](./15-known-gaps.md) — what is still open across the product.
- [16 — Internationalisation](./16-internationalisation.md) — the language gate, catalogues, RTL.
- [17 — Engagement](./17-engagement.md) — `ProgressProvider`, `/achievements`, animation conventions.
- [03 — Data Model](./03-data-model.md) — schema and RLS.
