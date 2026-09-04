# 16 — Internationalisation

> How AceAiX speaks seven languages, where a string lives, and the three places it still speaks
> English when it should not.
>
> Everything here is in `mobile/`. There is no i18n library — the whole mechanism is
> `mobile/i18n/index.tsx`, 320 lines, and you can read all of it in ten minutes. This document is
> the reasoning around it. Where this document and the code disagree, the code wins.

---

## 1. The seven languages

`mobile/i18n/languages.ts` is the register. Nothing else in the app decides what is shipped.

| Code | Name | `nativeName` | `dir` |
|------|------|--------------|-------|
| `en` | English | English | `ltr` |
| `ar` | Arabic | العربية | **`rtl`** |
| `es` | Spanish | Español | `ltr` |
| `fr` | French | Français | `ltr` |
| `de` | German | Deutsch | `ltr` |
| `ru` | Russian | Русский | `ltr` |
| `zh` | Chinese (Simplified) | 中文 | `ltr` |

`DEFAULT_LANGUAGE` is `en`. `isLanguageCode`, `languageMeta`, `directionFor` and
`resolveDeviceLanguage` are the only accessors; `LanguageCode` is derived from the array, so adding
a row to it is what makes a language exist as far as TypeScript is concerned.

**Why these seven.** The repository records no written rationale for the exact set, and this document
will not invent one. What can be shown is how the set lines up against the intended market.
`constants/sports.ts` → `PRIORITY_COUNTRIES` is the launch list, and it leads with the UAE, Saudi
Arabia, Qatar, Kuwait, Bahrain, Oman, Iran, Egypt, Jordan, Lebanon, Morocco and Tunisia before
Europe, the Americas, South Asia and West Africa. Mapping the two lists onto each other:

| Language | Priority countries it serves |
|---|---|
| Arabic | UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman, Egypt, Jordan, Lebanon, Morocco, Tunisia |
| English | UK, US, Canada, Australia, India, Pakistan, Nigeria, Ghana, South Africa — and the fallback everywhere else |
| French | France, Morocco, Tunisia, Canada |
| Spanish | Spain, Argentina |
| German | Germany |
| Russian | none on the list |
| Chinese | none on the list |

Four things follow from that table. They are observations, not criticism:

- **Arabic is the point.** It is the only right-to-left language, it covers eleven of the first
  twelve priority countries, and the whole RTL machinery in §9 exists for it.
- **Portuguese is missing** although Brazil and Portugal are both on the list. Listed in §11.
- **Persian is missing** although Iran is on the list. A Persian reader currently gets English, and
  Persian is right-to-left, so adding it is not a copy of an existing catalogue.
- **Russian and Chinese serve no priority country**, so the reason for those two is not in the code.
  Ask before removing either — the absence of a written reason is not evidence there was none.

`resolveDeviceLanguage(tags)` matches on the **base subtag only** — `ar-AE`, `zh-Hans-CN` and
`pt-BR` reduce to `ar`, `zh` and `pt`, and anything unrecognised falls back to English rather than
guessing at a near neighbour. It is only used to pre-select a row in the first-launch picker, so a
rough answer is acceptable there and a wrong one costs one tap.

---

## 2. First launch: the language gate

`mobile/components/common/LanguageGate.tsx`.

On a fresh install, before anything else, the person picks a language. Three properties are
deliberate:

- **It is not a route.** `Shell` in `app/_layout.tsx` returns `<LanguageGate />` in place of the
  `<Stack>` while `hasChosen` is false. There is no path to a screen in the wrong language, and no
  redirect to get wrong. Compare `RouteGuard`, which *is* a redirect and therefore had to be
  concentrated in one place ([10 §2.1](./10-mobile-app.md)).
- **It runs before the routing gate**, and before the session check. Deciding *which* screen to show
  is pointless until you know *what language* to show it in. `Shell` renders a bare themed view
  while `hydrating` is true, then the gate, then `RouteGuard`.
- **Its heading is hard-coded English.** `LanguageGate` renders the literal string
  `Choose your language`, not a translated key, because at that moment nobody has told us what they
  read. The body line under it *is* translated (`language.chooseBody`), from whatever the device
  locale suggested.

The picker itself is `components/common/LanguageList.tsx`, shared verbatim with
`app/settings/language.tsx`. Each row leads with the language's own name in its own script and puts
the English name underneath — somebody looking for Arabic is scanning for العربية, not for the word
"Arabic". Rows are `accessibilityRole="radio"` with the label `"<nativeName>, <name>"`.

The choice is stored in `AsyncStorage` under `aceaix.language`. Every launch after the first reads
it in `I18nProvider`'s mount effect and the gate never appears again.

---

## 3. How a string gets from a screen to a catalogue

```tsx
import { useT } from '@/i18n';

const t = useT();
<Text>{t('feed.emptyTitle')}</Text>
<Text>{t('progress.pointsToNext', { count: 6, tier: 'Gold' })}</Text>
```

`useT()` returns the `t` from context; `useI18n()` returns the whole value when you also need
`language`, `direction`, `isRTL`, `setLanguage`, `formatNumber` or `formatDate`. Both throw if used
outside `<I18nProvider>` — a silent English fallback there would hide the mistake.

Lookup, in `i18n/index.tsx`:

1. Split the dotted key and walk the active catalogue (`walk`).
2. If nothing was found **and** `vars.count` is a number, retry with a plural suffix (§5).
3. If it is still not a string and the catalogue is not English, **look the same key up in
   English**. A catalogue that is missing one key produces one English sentence, never a blank.
4. If English does not have it either, `console.warn` in dev and **return the key itself**. A
   visible `feed.emptyTitle` in the UI is a bug report someone will file; an empty box is a mystery.
5. Interpolate (§6) and return.

### Loading

English is imported eagerly at module scope. The other six go through `CATALOGUES`, a record of
`require`d thunks, resolved lazily in a `useMemo` on `language`:

```ts
const CATALOGUES: Record<LanguageCode, () => Catalogue> = {
  en: () => en,
  ar: () => require('./locales/ar').ar as Catalogue,
  …
};
```

Two reasons. Shipping six unused dictionaries in the first screen's bundle is waste; and
`loadCatalogue` wraps the call in a `try`/`catch` that returns `en`, so a broken or missing
catalogue degrades to English rather than blanking the interface.

---

## 4. The namespace layout

`mobile/i18n/locales/<code>/` holds **17 namespace files plus `index.ts`**, identical in every
language. The English `index.ts` composes them and exports the type the other six are checked
against:

```ts
export const en = { common, language, auth, onboarding, feed, profile, score, progress,
                    discover, opportunities, messaging, settings, safety, sports,
                    errors, format, countries };
export type Translations = typeof en;
```

| Namespace | What is in it |
|---|---|
| `common` | Buttons, tier names, role names, age bands, shared counts. Anything used by three or more screens. |
| `language` | The picker, the restart prompt, and the legal-English notice. |
| `auth` | Welcome, sign-in, sign-up, password recovery, check-email. |
| `onboarding` | The one-time wizard, both the athlete and the recruiter step sets. |
| `feed` | Home, the composer, post cards, comments. |
| `profile` | Own profile, someone else's, edit-profile, career, match records. |
| `score` | The Talent Score screen, the pillars, the disclosure sheet, the tip action buttons. |
| `progress` | Streaks, achievements, celebrations, the tier bar. See [17](./17-engagement.md). |
| `discover` | Discover, filters, leaderboard, search. |
| `opportunities` | Trials, applications, applicants, posting an opportunity, organisations. |
| `messaging` | Inbox, chat, notifications. |
| `settings` | Every settings screen, including the legal-document chrome. |
| `safety` | Guardian consent, minor banners, reporting, blocking. |
| `sports` | Sport, position, level, side and opportunity-type **labels** — see §7. |
| `errors` | Everything `lib/errors.ts` can say. |
| `format` | Units and short relative times used by `lib/format.ts` (`{{n}}m`, `{{n}} cm`). |
| `countries` | The 30 entries in `PRIORITY_COUNTRIES`. |

At the time of writing English holds **1,646 leaf keys**, of which 78 belong to 39 plural families.

**The type is the enforcement.** Every non-English `index.ts` declares its object as
`Translations`, so a key that exists in English and nowhere else is a compile error rather than a
blank label in production. `tests/unit/i18n.test.ts` is stricter still (§9).

---

## 5. Plurals: `Intl.PluralRules`, not hand-written `_one` / `_other`

A plural key is written as a family of siblings sharing a stem:

```ts
days_one:   '{{count}} day',
days_other: '{{count}} days',
```

and resolved at lookup time:

```ts
const category = new Intl.PluralRules(code).select(vars.count);
value = walk(catalogue, [...stem, `${last}_${category}`])
     ?? walk(catalogue, [...stem, `${last}_other`]);
```

The suffix is whatever CLDR says that language's category is for that number, with `_other` as the
last resort.

**Why not two hand-written forms.** Because two forms is an English fact, not a general one. These
are the categories the shipped ICU actually reports — run
`new Intl.PluralRules(code).resolvedOptions().pluralCategories` if you want to confirm them, which
is exactly what the unit test does:

| Language | CLDR categories | Forms |
|---|---|---|
| English, German | `one`, `other` | 2 |
| Spanish, French | `one`, `many`, `other` | 3 |
| Russian | `one`, `few`, `many`, `other` | 4 |
| Arabic | `zero`, `one`, `two`, `few`, `many`, `other` | 6 |
| Chinese | `other` | 1 |

Hard-coding `_one` / `_other` would be wrong in Russian for every number ending in 2–4, wrong in
Arabic for 2 and for 3–10, would miss the `many` form modern CLDR gives Spanish and French for large
and compact numbers, and would leave Chinese carrying a form nothing can ever select. Hermes ships
full ICU on both platforms, so `Intl.PluralRules` is already there and needs no dependency and no
rebuild — and it stays correct when CLDR changes, which is how Spanish and French came to have three
categories in the first place.

### The Chinese mapped type

`i18n/locales/zh/index.ts` is the one catalogue that cannot be typed as plain `Translations`,
because `Translations = typeof en` lists every English `_one` key as required and Chinese must not
have them:

```ts
type SingleFormPlurals<T> = {
  [K in keyof T as K extends `${string}_one` ? never : K]:
    T[K] extends string ? T[K] : SingleFormPlurals<T[K]>;
};

const catalogue: SingleFormPlurals<Translations> = { … };
export const zh = catalogue as Translations;
```

The mapped type drops `*_one` from the requirement and leaves **every other key still checked**;
the `as Translations` at the end is what lets `CATALOGUES` treat all seven uniformly. The file
carries this explanation in Chinese and in English, because the person most likely to be confused by
it is the next translator.

If a language ever needs categories English does not have — Russian's `_few` / `_many`, Arabic's
`_zero` / `_two` — those keys are simply **extra**, and structural typing accepts them. Only the
missing direction needs a type; the surplus direction does not. `tests/unit/i18n.test.ts` is what
checks the surplus is exactly right.

---

## 6. Interpolation

One syntax, `{{name}}`, applied by a single regex after lookup:

```ts
template.replace(/\{\{(\w+)\}\}/g, (whole, name) =>
  vars[name] === undefined ? whole : String(vars[name]));
```

Rules that follow from those five lines:

- **An unknown placeholder is left as written.** `{{tier}}` with no `tier` renders as `{{tier}}` —
  visible, reportable, and not a crash.
- **No expressions, no formatting directives, no nesting.** If a value needs formatting, format it
  before it goes in: `formatNumber` and `formatDate` are on the context for exactly that, and
  `AnimatedNumber` takes a `format` function.
- **No template literals in a catalogue.** `${…}` would be evaluated at module load and could not be
  translated; the unit test fails on any English value containing one.
- **A placeholder is not a word.** The test's "actually translated" heuristic strips placeholders
  before judging whether a string was left in English, because `{{used}}/{{max}}` is identical in
  every language and would otherwise raise a false alarm in every Latin-script catalogue.

Composing a sentence out of two translated halves is the thing to avoid — word order differs, and
`messaging.groupedTitle` (`'{{actors}}{{rest}}'`) exists precisely so a right-to-left language can
reorder the two halves it is given rather than having them concatenated for it.

---

## 7. Stored values are English; only labels are translated

`mobile/constants/sports.ts`, bottom half.

An athlete's `sport` is `'Football'` in the database, in every language. A coach in Madrid filtering
for `Football` and a coach in Dubai filtering for `Football` have to be filtering for the same
thing, and a value that changes with the reader's locale cannot be filtered, joined or aggregated.

So the stored value is the key, and translation happens at the edge:

```ts
sportLabel(t, 'Football')            // → 'Fútbol'
positionLabel(t, 'Goalkeeper')       // → 'حارس مرمى'
levelLabelI18n(t, 'academy')         // → 'Akademie'
levelHint(t, 'academy')
sideLabel(t, 'Right')
opportunityTypeLabel(t, 'trial')     // + opportunityTypeHint
countryLabel(t, 'United Arab Emirates')
```

Each takes the translator as its first argument — these are plain functions, not hooks, so they can
be called from a `map` inside a render or from a memo. Each looks the stored value up in a
`Record<string, string>` of translation keys and **falls back to the stored value itself** when
there is no entry. A sport added to the database before it is added to `SPORT_LABEL_KEYS` shows its
English name rather than a blank chip.

`levelLabel(key)` (no `t`) still exists for the non-React paths and returns the English label.

The same principle holds elsewhere: `posts.audience`, notification `type`, `applications.status`,
tier names and achievement keys are all stable machine values with a translated label somewhere in a
catalogue.

---

## 8. The translator bridge

`mobile/lib/i18n-bridge.ts`. This is the only module-level global of its kind in the app.

`lib/errors.ts` and `lib/format.ts` produce text a person reads — "Your session expired.", "3d",
"Closes today" — but they are called from services, `catch` blocks and memoised helpers, which have
no React context to read from. The alternatives were threading `t` through every formatter call site
(worse call sites, no extra safety) or duplicating the strings (two sources of truth). Instead:

```ts
setGlobalTranslator(fn, language);   // called by I18nProvider's effect, cleared on unmount
tr('errors.rateLimited', 'You are doing that too quickly.');
currentLanguage();                   // for Intl formatting outside React
```

`tr(key, fallback, vars)` returns the fallback — interpolated with the same `{{name}}` rules — when
no translator is registered **or** when the translator returned the key unchanged. That second
condition is what guarantees a raw key never reaches the interface from this path.

Two consequences worth knowing:

- Every `tr()` call site carries an English fallback next to it, so `lib/errors.ts` has an `EN`
  map that duplicates the `errors` namespace in the catalogue. That duplication is deliberate:
  `tests/unit/errors.test.ts` imports `lib/errors.ts` with no provider mounted and asserts on those
  English sentences. Change one and change the other.
- `I18nProvider` re-registers on every language change and clears on unmount, so a stale translator
  cannot outlive the provider.

---

## 9. RTL and the restart

Arabic is the only right-to-left language shipped, and React Native applies layout direction
**natively**, not in JavaScript. `I18nManager.forceRTL()` can be called at any time, but views
already laid out do not re-mirror. So:

- `setLanguage(code)` compares `I18nManager.isRTL` with `directionFor(code)`. If the direction is
  unchanged it returns `{ needsRestart: false }` and the switch is instantaneous.
- If the direction flips, it calls `allowRTL(true)` + `forceRTL(willBeRTL)`, writes the result to
  `AsyncStorage` under `aceaix.rtl-applied`, and returns `{ needsRestart: true }`. On web it reloads
  the page instead and reports no restart needed.
- Both `LanguageGate` and `/settings/language` respond by opening a sheet that explains *why*
  (`language.restartBody`: "Arabic reads right to left…") and offers `tryRestartApp()`, with
  "Not now" and a line telling the person how to do it by hand.
- `tryRestartApp()` tries `expo-updates`' `reloadAsync`, then `NativeModules.DevSettings.reload`
  under `__DEV__`, then gives up and returns `false` — at which point the sheet closes and the
  manual instruction stands. A release build without `expo-updates` cannot restart itself, and
  pretending otherwise would leave a dead button.
- `primeLayoutDirection()` is called **at module scope in `app/_layout.tsx`**, before React renders,
  and re-applies the stored flag. That is what makes an Arabic install come up mirrored on launch
  rather than flipping a beat later.

Inside `LanguageList`, each row sets `writingDirection` from that language's own `dir` so العربية
renders correctly within an otherwise left-to-right list — the row mirrors, the name does not need
to.

---

## 10. The legal documents are English only, on purpose

`mobile/lib/legal/` holds Terms of Service, the Privacy Policy, Community Guidelines and the Child
Safety Standards as Markdown strings. **They are not translated, and translating them is not a
backlog item.**

A translated legal document is either a second binding text or a misleading one, and deciding which
is a lawyer's call, not an engineer's. Until someone signs off on a translation, the English text is
the version that applies.

The app says so rather than leaving it to be discovered:

- `components/settings/LegalDocument.tsx` renders `t('language.legalEnglishOnly')` above the
  document whenever `language !== 'en'`: *"Our Terms, Privacy Policy, Community Guidelines and Child
  Safety Standards are published in English. The English text is the version that applies."*
- The same line appears on the first-launch gate and on `/settings/language`, so the fact is visible
  before a choice is made, not only after.

That notice is itself translated, in all seven languages. This is recorded as an accepted decision
in [15 §3](./15-known-gaps.md).

---

## 11. Known gaps

### 11.1 Notification titles are composed in English by SQL

`supabase/migrations/20260904000004_notifications_and_counters.sql` builds each notification's
`title` and `body` **at insert time, by string concatenation, in PL/pgSQL**:

```sql
perform private.notify(
  new.following_id, 'follow', 'follow',
  private.display_name(new.follower_id) || ' started following you', …);
```

Every trigger in that file does the same thing:

| Trigger | Sentence stored in `notifications.title` |
|---|---|
| `on_follow_change` | `<name> started following you` |
| `on_message_insert` | `<name> sent you a message` (body: first 120 chars of the message) |
| `on_comment_insert` | `<name> commented on your post` / `<name> replied to you` |
| `on_post_like_insert` | `<name> liked your post` |
| `on_application_change` | `<name> applied to <opportunity title>` / `Your application to <title> is now <status>` |
| `on_profile_view` | `<org or name> viewed your profile` |
| `on_endorsement_insert` | `<name> endorsed you for <skill>` |
| `on_talent_tier_change` | `You reached <Tier> tier` (body: `Your Talent Score is now <n>.`) |

By the time the client sees the row there is no key to look up — only a finished English sentence —
so `components/messaging/NotificationRow.tsx` renders `n.title` and `n.body` verbatim. Everything
*around* them on the row (the section headers, the relative time, "Unread", the grouping phrase) is
translated, which makes the untranslated middle more obvious, not less.

Grouping does what it can: the server writes the newest actor's name at the front and counts the
rest in `actor_count`, so `notificationTitle()` replaces that prefix with the translated
`messaging.actorAndOthers` **only when the title genuinely starts with the name**, and reassembles
through `messaging.groupedTitle` (`'{{actors}}{{rest}}'`) so an RTL language can reorder the two
halves. The remainder of the sentence stays English.

**The fix.** Change `private.notify` and its callers to store the notification's `type` plus its
parameters — actor name, opportunity title, status, skill, tier, score — in the existing `data`
jsonb column, and compose the sentence on the client from a per-type key. That also fixes word
order, which no amount of client-side surgery on a finished sentence can. `notifications.title` and
`body` would then be either dropped or kept as an English fallback for push payloads, which are
composed outside the app entirely.

### 11.2 Talent Score tips are composed in English by SQL

Same shape, different function. `private.build_score_tips(p_result jsonb)` in
`20260904000001_talent_score.sql` returns a jsonb array of
`{ key, label, detail, points, pillar }`, and `label` and `detail` are English literals — some of
them assembled by concatenation, e.g.:

```sql
'label','Upload ' || (3 - (i ->> 'video_items')::int) || ' more highlight clip(s)',
'detail','Scouts open footage before anything else. Three short clips is the sweet spot.',
```

The seven tips it can emit are keyed `add_highlights`, `complete_profile`, `log_matches`,
`get_verified`, `ask_endorsement`, `link_club` and `post_update`, in that fixed order (documented in
`COMMENT ON FUNCTION`, added by `20260904000010`). The array is written into `talent_scores.tips` by
`private.refresh_talent_score`, so the English text is **stored**, not just rendered — every existing
row already holds it.

`components/profile/TipList.tsx` renders `tip.label` and `tip.detail` as they arrive. It does
translate the two things it can: the points badge (`score.tipPoints`) and the action button, which
is looked up from `tip.key` through `ACTION_KEYS` — so the button under an English tip is already in
the reader's language.

**The fix.** `tip.key` already exists and already drives the button, so the client is halfway there.
Make `build_score_tips` emit `key`, `points`, `pillar` and a small `params` object (`{ clips: 2 }`,
`{ fields: 5 }`) and nothing else, then look the title and detail up from a `score.tips.<key>.*` key
in the catalogue. Existing rows would need a recompute — or the client can fall back to the stored
English `label` when `params` is absent, which makes the migration lazy.

### 11.3 Smaller ones

- **Push notification payloads.** Whatever composes them reads the same English `title` / `body`;
  fixing 11.1 is a prerequisite.
- **The `guardian-consent` edge function's web page is English only**
  (`supabase/functions/guardian-consent/index.ts`). It is read by a parent who may not have the app,
  and it has no access to the app's catalogues.
- **The seed data and demo content are English.** Fine locally; worth knowing before a screenshot in
  another language is taken for a store listing.
- **`language.chooseTitle` and `language.current` are defined in all seven catalogues and used
  nowhere** — the gate hard-codes its heading (§2). Harmless, but the parity test cannot tell a dead
  key from a live one.
- **Portuguese and Persian are not shipped** although Brazil, Portugal and Iran are all in
  `PRIORITY_COUNTRIES` (§1).

---

## 12. How to add a language

Worked example, adding Portuguese:

1. **Register it.** Add `{ code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr' }` to
   `LANGUAGES` in `i18n/languages.ts`. `LanguageCode` widens automatically; the picker, the settings
   screen and `resolveDeviceLanguage` all read from this array and need no edit.
2. **Add the loader.** One line in `CATALOGUES` in `i18n/index.tsx`:
   `pt: () => require('./locales/pt').pt as Catalogue`. TypeScript will demand it — the record is
   keyed by `LanguageCode`.
3. **Copy the catalogue.** `cp -r i18n/locales/en i18n/locales/pt`, then rename the export in each
   file and translate the values. Do **not** translate the keys.
4. **Write `index.ts`.** Copy `es/index.ts`, rename, and keep the `: Translations` annotation — that
   annotation is what turns a missing key into a compile error.
   - If the language has **one** plural category, copy `zh/index.ts` instead and keep its
     `SingleFormPlurals` mapped type, dropping the `_one` forms.
   - If it has categories English lacks (`_few`, `_many`, `_zero`, `_two`), add those keys; extra
     keys type-check fine.
5. **Right-to-left?** Set `dir: 'rtl'` and nothing else. The restart prompt, the stored flag,
   `primeLayoutDirection` and the per-row `writingDirection` are all driven off that one field.
6. **Run the tests.** `npx vitest run tests/unit/i18n.test.ts` will tell you exactly which keys are
   missing, which are unknown, which plural family has the wrong categories, which placeholder was
   dropped, and which namespace looks like it was copied without being translated.
7. **Walk it.** `node tests/e2e/walkthrough.mjs --lang pt` — see [14 §4.4](./14-local-development.md).
8. **Declare it in both stores.** [13 §4.1](./13-store-submission.md).

## 13. How to add a string

1. Put it in the **English** namespace that owns the screen. English is where a key is born; a key
   that exists only in another language is a bug the parity test will catch from the other side.
2. Use `{{name}}` for anything variable, and `count` specifically for anything that pluralises —
   `count` is the only variable name the plural lookup inspects.
3. For a plural, write the English pair `foo_one` / `foo_other`. Do not write a bare `foo` as well.
4. Add it to the other six. Typecheck (`npm run typecheck`) fails until you do, naming each file.
5. If a value is a *stored* value rather than copy — a new sport, a new opportunity type — add the
   key **and** the entry in the matching map in `constants/sports.ts` (§7).
6. If the string is produced outside React, use `tr(key, 'English fallback')` and keep the fallback
   accurate (§8).

---

## 14. Related documents

- [10 — Mobile App Architecture](./10-mobile-app.md) — the provider stack, the gates, the route table.
- [17 — Engagement](./17-engagement.md) — the `progress` namespace and its tone rules.
- [14 — Local Development](./14-local-development.md) §4.3–4.4 — running the i18n test and the
  multilingual walkthrough.
- [15 — Known gaps](./15-known-gaps.md) — §11 above, in the product-wide list.
- [13 — Store Submission](./13-store-submission.md) §4.1 — declaring the seven languages in both
  stores.
