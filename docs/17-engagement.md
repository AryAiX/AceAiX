# 17 — Streaks, achievements and celebrations

> The fast loop that sits underneath the slow one, and the line the team drew around it.
>
> Database side: `supabase/migrations/20260904000011_streaks_and_achievements.sql`.
> Client side: `mobile/components/celebrate/`, `mobile/providers/ProgressProvider.tsx`,
> `mobile/app/achievements.tsx`. Read the migration's header before you change anything here — the
> two design rules in it are the point of the feature, not decoration around it.

---

## 1. Why this exists

The Talent Score answers *where do I stand?* It moves slowly, because the things that move it — a
verified match record, a coach's endorsement, three uploaded clips — take weeks. That is correct: a
number that jumped every time you opened the app would not be worth anything to a scout.

It is also why a fourteen-year-old would open AceAiX once and not come back. There has to be
something to notice today.

So: a streak for turning up, and nineteen achievements that mark the real milestones on the way to
being scouted. Both are *observations*, not currencies. Nothing here is spendable, rankable against
another person, or losable.

---

## 2. The streak

### 2.1 What it is

`activity_days (user_id, day)` — one row per calendar day the person opened the app.
`user_streaks` — the derived numbers: `current_streak`, `longest_streak`, `total_days`,
`last_active_on`.

`public.record_activity()` is the only writer. It is called **once per foreground** by
`ProgressProvider`, never per screen, and it:

1. inserts today into `activity_days` (`on conflict do nothing`);
2. reads the previous state and applies exactly four cases —
   - no previous day → `current = longest = total = 1`,
   - previous day is today → nothing changes,
   - previous day is yesterday → `current + 1`, `longest = greatest(longest, current)`, `total + 1`,
   - anything else → **`current = 1`** (today still counts) and `total + 1`, keeping `longest`;
3. touches `user_profiles.last_active_at`;
4. calls `private.check_achievements()`;
5. returns `{ current_streak, longest_streak, total_days, first_visit_today }`.

`current_date` is the database's date, so the day boundary is server-side and identical for
everyone. `StreakCalendar` computes its own seven-day window in **local** time using a hand-written
`localDay()` rather than `toISOString()`, because `toISOString` would shift the day for anyone west
of UTC and draw yesterday's dot as today's.

### 2.2 What it deliberately is not

- **It does not count actions.** It counts days the app was opened. Nothing about posting, liking,
  applying or messaging moves it. A streak that rewarded posting would push a child to post, which
  is the last thing this product should do.
- **It does not feed the Talent Score.** No pillar reads `user_streaks`. The score is what a scout
  sees; turning up is not evidence of talent and must not be priced as if it were.
- **Breaking it costs nothing but the run.** `longest_streak` is kept forever, `total_days` keeps
  counting, and the score is untouched. There is no decay, no lost points and no grace-period
  purchase.
- **Nothing warns you.** There is no "your streak is about to end" notification, no countdown, no
  red state. Nothing in `20260904000004_notifications_and_counters.sql` is triggered by inactivity —
  by design.
- **It is not comparable.** No leaderboard reads it. The only person who sees your streak is you.

`components/celebrate/StreakChip.tsx` puts the flame and the number in the home header. Tapping it
opens the sheet whose second paragraph is the load-bearing one:

> Miss a day and nothing is lost but the run. Your longest streak stays where it is, your score
> stays where it is, and the count starts again the next time you look in.

That sentence exists because a thirteen-year-old watching a number reset to 1 will assume something
was taken from them unless told otherwise. `i18n/locales/en/progress.ts` carries the tone rules for
anyone rewording or translating it.

`StreakCalendar` draws the last seven days as dots: filled for a day you were here, hollow for one
you were not, with a ring around today either way. There is no red, no cross and no gap shaming — a
missed day is a dot that is not filled in.

---

## 3. The nineteen achievements

The **database** decides what is earned; the **client** owns every word a human reads. `user_achievements`
stores `(user_id, achievement_key, unlocked_at, seen)` and nothing else, so wording can be reworded
and translated without a migration.

`private.check_achievements(p_user)` is idempotent and stateless: it re-derives every achievement
from the rows that prove it and awards what is missing, returning how many were new. It can run as
often as we like and can never award something the underlying data does not support. If a condition
is later found to be wrong, fixing the condition and re-running is the whole repair.

### 3.1 The conditions, exactly

Read from `private.check_achievements`. `ap` is the athlete profile, `ts` the `talent_scores` row.

| Group | Key | Condition in SQL |
|---|---|---|
| Getting started | `first_post` | `count(posts where author_id = user) >= 1` |
| | `first_clip` | `count(athlete_media where athlete_id = ap.id and is_public and media_type in ('video','highlight_reel')) >= 1` |
| | `three_clips` | the same count `>= 3` |
| | `first_match` | `count(match_records where athlete_id = ap.id) >= 1` |
| | `ten_matches` | the same count `>= 10` |
| | `first_application` | `count(applications where athlete_id = user) >= 1` |
| Being seen | `first_follower` | `count(follows where following_id = user) >= 1` |
| | `ten_followers` | the same count `>= 10` |
| | `fifty_followers` | the same count `>= 50` |
| | `first_endorsement` | `count(endorsements where athlete_id = ap.id) >= 1` |
| | `verified` | `user_profiles.is_verified` |
| Your score | `profile_complete` | `talent_scores.profile_score >= 100` |
| | `tier_bronze` | `talent_scores.overall >= 40` |
| | `tier_silver` | `talent_scores.overall >= 55` |
| | `tier_gold` | `talent_scores.overall >= 70` |
| | `tier_elite` | `talent_scores.overall >= 85` |
| Turning up | `streak_3` | `user_streaks.longest_streak >= 3` |
| | `streak_7` | the same `>= 7` |
| | `streak_30` | the same `>= 30` |

Three details that are easy to get wrong:

- The five score achievements are inside `if ts.athlete_id is not null` — an account with no
  `talent_scores` row (a coach, a club, a brand-new athlete) earns none of them and raises nothing.
  The same guard exists for `user_streaks`.
- `first_clip` / `three_clips` count only **public** video and highlight-reel media. A private
  upload is not a clip a scout can watch, so it is not a clip here either.
- The streak achievements read `longest_streak`, not `current_streak`. Once earned they are never
  taken away, and a broken streak cannot revoke one — `user_achievements` rows are only ever
  inserted, never deleted.

**The hint under each badge is the condition above, in words.** `progress.achievements.<key>.hint`
in the catalogue and the SQL are the same fact stated twice, and `components/celebrate/achievements.ts`
carries the rule in a comment: if the two disagree, a teenager is chasing something that will not
arrive, which is worse than having no achievement at all. Reword a hint freely; never change a
number in one place only.

### 3.2 When they are checked

`record_activity()` calls `check_achievements` on every foreground, and six triggers call it the
moment the underlying row lands:

| Trigger | Table | Resolves the user via |
|---|---|---|
| `trg_posts_achievements` | `posts` | `author_id` |
| `trg_follows_achievements` | `follows` | `following_id` |
| `trg_media_achievements` | `athlete_media` | `athlete_profiles.user_id` |
| `trg_matches_achievements` | `match_records` | `athlete_profiles.user_id` |
| `trg_endorsements_achievements` | `endorsements` | `athlete_profiles.user_id` |
| `trg_scores_achievements` | `talent_scores` (insert / update of `overall`) | `athlete_profiles.user_id` |

`private.trg_check_achievements_by_user()` serves three tables with different column names, so it
reads the row as `to_jsonb(coalesce(new, old))` and looks up `author_id`, `following_id` or
`athlete_id` by name — `new.author_id` would raise on a table that has no such column.

The score trigger fires on `update of overall` specifically, because a new tier is the moment most
worth celebrating and waiting for the next app open would waste it.

Applications have **no** trigger; `first_application` lands on the next `record_activity()`.

### 3.3 Nothing can be claimed

```sql
revoke insert, update, delete on public.user_streaks      from authenticated, anon;
revoke insert, update, delete on public.activity_days     from authenticated, anon;
revoke insert, update, delete on public.user_achievements from authenticated, anon;
grant select on … to authenticated;
```

RLS gives each account `select` on its own rows and nothing more. Every write happens inside a
`security definer` function. A modified client cannot award itself anything, and the three RPCs it
*can* call (`record_activity`, `my_progress`, `mark_achievements_seen`) are revoked from `public`
and `anon` and granted only to `authenticated`.

The migration ends by backfilling every existing account and then setting `seen = true` on
everything: an achievement earned before the feature existed is not a surprise worth celebrating.

---

## 4. `my_progress()` — one call for the whole layer

```json
{
  "streak":       { "current", "longest", "total_days", "last_active_on", "active_today" },
  "score":        { "overall", "tier", "previous_overall",
                    "next_tier", "next_tier_at", "points_to_next" } | null,
  "achievements": [ { "key", "unlocked_at", "seen" } ],   // newest first
  "unseen":       [ "key" ],                              // oldest first
  "last_7_days":  [ "2026-09-01", … ]
}
```

`score` is null for anyone with no `talent_scores` row. `next_tier` / `next_tier_at` /
`points_to_next` are null at Elite — there is nothing above it, and the client renders a finished
state rather than an empty bar.

`unseen` is ordered **oldest first** so a backlog is celebrated in the order it was earned;
`achievements` is newest first because that is the order the wall wants. Mirrored in
`types/models.ts` as `Progress`, `Streak`, `ScoreProgress`, `UnlockedAchievement`.

---

## 5. How a celebration is queued and shown once

`mobile/providers/ProgressProvider.tsx`. It sits inside `AuthProvider` (it needs the session) and
outside `Shell` (so a celebration can appear over any screen). Three jobs, in order of how invisible
each has to be:

1. **Record the visit.** On mount for a signed-in user, and on every `AppState` transition back to
   `active` — guarded by `recordedThisForeground`, which is set on the way in and cleared only when
   the app goes to `background`. One call per visit, not one per screen. An `inFlight` ref makes it
   re-entrant-safe.
2. **Hold the progress** everything else reads, through `useProgress()`.
3. **Decide what deserves a moment**, show it, mark it seen.

### 5.1 Building the queue

`buildQueue(snapshot)`:

- **A tier promotion** is derived rather than read: if `previous_overall` is set, `overall` is
  higher, and `tierForScore()` differs between the two, that is a promotion. It gets a
  `{ kind: 'tier' }` card.
- **Unseen achievements** come from the server — the only thing that can award them. Each becomes a
  `{ kind: 'streak', days }` card if it is `streak_3` / `streak_7` / `streak_30`, otherwise
  `{ kind: 'achievement', key }`.
- **The tier promotion's own achievement row is skipped** (`TIER_ACHIEVEMENT[promotedTo]`) so a
  Gold promotion does not produce both a tier card and a `tier_gold` card. The achievement is still
  marked seen; it simply does not get its own moment.
- **A key this build does not recognise is skipped** — `achievementFor(key)` returning null means a
  server running a newer migration, and an unknown achievement should be quietly ignored rather than
  crash a celebration.

### 5.2 Shown once, and only once

Three separate mechanisms, because they guard three different failure modes:

| Mechanism | Guards against |
|---|---|
| `seen` on `user_achievements`, cleared by `mark_achievements_seen` | the same unlock celebrating again on another device or after a reinstall |
| `celebrated` — an in-memory `Set` of keys and tier tokens | a `refresh()` landing mid-celebration and queueing the same item twice |
| `aceaix.celebrated-tier:<userId>` in `AsyncStorage` | the tier promotion repeating on every launch |

That last one earns its complexity. `previous_overall` sits in the database until the score is next
recomputed, which can be days, so without a durable note the same promotion would be celebrated on
every single launch in between — exactly the nagging this layer is forbidden to do. The token is
`"<tier>:<previous>:<overall>"` and is written **when the card is queued**, not when it is dismissed:
an app killed mid-celebration should lose the moment, not repeat it forever.

`onCelebrationDone` marks **everything** in `progress.unseen` as seen, including anything rolled into
the "and N more" line — those are on the wall now, and someone returning after a fortnight should
not meet the same backlog again tomorrow. It updates local state optimistically and swallows the
network failure; it will be marked on the next successful pass.

### 5.3 The overlay

`components/celebrate/CelebrationOverlay.tsx`. A `Modal` over whatever is on screen, one card at a
time, in the order earned. At most **three** in a row (`maxInARow`); the rest are summarised as
`progress.andMore`. Three is where a celebration becomes a slideshow.

- `key={index}` on the card remounts it, so each item arrives with its own entrance.
- One haptic per card, matched to the moment: `notificationAsync(Success)` for a tier,
  `impactAsync(Light)` for everything else, skipped on web.
- The tier card counts the ring from `previous_overall` to `overall` over 1,100 ms, because the
  distance travelled is the story — a dial filling from zero says nothing about what changed today.
- The tier card is the only one with a **Share** button, and it shares a **sentence**, not an image.
  Rendering an image would mean composing something with a young person's name and photo on it and
  handing it to whatever app they pick next. A sentence they can read before they send it is the
  safer object. Web only offers it when `navigator.share` exists.
- Page dots appear only when there is more than one card, and are hidden from the accessibility
  tree.

`Confetti.tsx` runs one shared `Animated.Value` from 0 → 1 and interpolates every particle's path
out of it — 35 separate drivers would be 35 things the scheduler has to keep in step, whereas one
driver interpolated 35 ways runs entirely on the UI thread and cannot drift apart. Each particle is
an `Animated.View` (transforms, native driver) wrapping a tiny SVG shape; animating SVG geometry
directly would force `useNativeDriver: false` and put every frame back on the JS thread. Count is
clamped to 12–60.

### 5.4 It is not allowed to fail loudly

Every path in `ProgressProvider` swallows its error. `getProgress` failing returns null;
`recordActivity` failing is caught inline with a comment saying why it is safe (`my_progress` still
returns yesterday's truth, and today's visit is recorded on the next foreground);
`markAchievementsSeen` failing retries implicitly on the next pass. `useProgress()` has a working
default context of zeros so `StreakChip` and the wall render outside the provider, in a preview or a
test renderer.

If the network is down, the app is exactly as it was before this provider existed. That is the whole
contract for a layer whose only job is to make someone smile.

---

## 6. The wall — `app/achievements.tsx`

Reached from a card on `/score` (`Routes.achievements`). Header count, the seven-day calendar, the
tier bar, then four groups in the catalogue's order: Getting started, Being seen, Your score,
Turning up.

- **Unearned achievements are shown, not hidden.** A locked grid of question marks is a puzzle; a
  dimmed badge with the real name and the real condition under it answers "what should I do next?",
  which is the only question this screen exists to answer.
- Within a group, earned float to the front, then the catalogue's own order. What you have done is
  the reward; what is next is the invitation and belongs underneath.
- An earned tile shows the unlock date instead of the hint; a locked one shows the hint.
- A key this build does not know about is dropped from the count rather than counted, so a server on
  a newer migration cannot produce "20 of 19".
- **No error state.** If progress cannot be loaded there is nothing here worth alarming anyone
  about; pull-to-refresh retries.
- Rarity (`common` / `rare` / `epic`, labelled *Common* / *Rare* / *Standout*) is **cosmetic** — it
  paints the medallion from the tier ramp (silver / gold / Ace Orange) and changes nothing else. No
  points, no multiplier, no ordering.

---

## 7. The tier-progress bar

`components/celebrate/TierProgress.tsx`, on the wall and driven by `my_progress().score`.

The Talent Score has no visible finish line, which is what makes it hard to care about at fourteen.
The bar gives it one: a start (`TIER_FLOOR[current]`), an end (`next_tier_at`) and the number of
points between them, painted in the colour of the tier being aimed at so the goal is legible before
the words are read.

- `TIER_FLOOR` mirrors `tierForScore` and `my_progress` — rising 0, bronze 40, silver 55, gold 70,
  elite 85. Three copies of those cut-offs now exist (SQL, `theme/tokens.ts`, this file);
  `tests/unit/theme.test.ts` pins the client pair to the SQL.
- At Elite it renders a finished state — a crown, "Top tier" — rather than a full or empty bar.
- With no score row it renders "No Talent Score yet" and what to do about it.
- It is a real `accessibilityRole="progressbar"` with `accessibilityValue={{ min, max, now }}`, and
  its label is the same sentence sighted users read.

---

## 8. Animation conventions

Reanimated is stubbed ([10 §7](./10-mobile-app.md)), so everything here is React Native's own
`Animated`, native driver wherever the property allows it.

### 8.1 Every animation checks `useReducedMotion()`

`hooks/useReducedMotion.ts` reads `AccessibilityInfo.isReduceMotionEnabled()` and subscribes to
`reduceMotionChanged`. The last known answer is cached at **module scope**, so a card scrolling into
view never gets one frame of motion before the async read comes back.

The rule is not "no feedback". It is: **a motion-reduced build still tells you what changed, it just
tells you instantly or with a fade.** Nothing is communicated by movement alone.

| Component | Full motion | Reduce Motion |
|---|---|---|
| `Confetti` | 34–46 particles, 2.2 s | renders nothing, calls `onDone` immediately |
| `AchievementBadge` (`animateIn`) | spring from 0.4× | fades in at full size |
| `CelebrationOverlay` tier card | ring counts `from` → `to` over 1.1 s | already showing the final score |
| `CelebrationOverlay` streak card | spring from 0.5× | timed fade |
| `StreakChip` | number rolls out and up, flame pulses once | number swaps instantly |
| `TierProgress` | bar sweeps over 900 ms, `Easing.out(cubic)` | appears at final length (`duration: 0`) |
| `ScoreRing` | counts up over 900 ms, plus a sheen on a rise | jumps to the value, no sheen |
| `AnimatedNumber` | counts, digits step in from the direction they moved | sets the value |
| `Tappable` | springs to `scaleTo` under the thumb | instant dim to 0.72 opacity |
| `Skeleton` | a sheen travels across on the native driver | opacity pulse |
| Tab bar | icon lifts 2 pt, re-tap bounces | instant state change |
| `PostActions` like | spring overshoot to 1.3× | no pop |

### 8.2 The rest of the rules

- **Never animate on first paint.** `AnimatedNumber` has `animateOnMount = false` by default — a
  feed full of counters spinning up looks like a slot machine. `ScoreRing` only celebrates a *rise*,
  never the first render. `StreakChip` swaps instantly when `shown === 0`, because the first number
  to arrive is the number that was already true, not an increment; rolling it up would congratulate
  someone for opening the app twice.
- **Feedback follows the action, never gates it.** `Tappable` and `PostActions` call `onPress` first
  and fire the haptic after; every `Haptics.*` call is `.catch(() => {})` and skipped on web.
- **One shot, no loops.** The only loops in the app are the skeleton sheen and the compose button's
  2.5 % breath. Nothing pulses to demand attention.
- **`useNativeDriver: true` unless the value is text or layout.** `AnimatedNumber` and `ScoreRing`
  drive text content through a listener and must be `false`; both gate re-renders on the *formatted
  string*, so 12 → 13 costs one render.
- **Clean up.** Every effect returns `animation.stop()`, clears its timer and removes its listener.
  `StreakChip` and `Confetti` deliberately swap on a `setTimeout` rather than in the animation
  callback: a cleared timer never fires, whereas a cancelled animation's callback can still run
  against an unmounted component.

### 8.3 The UI-kit additions

- **`Tappable`** (`components/ui/Pressable.tsx`) — the kit's general-purpose tap target. Exported
  under that name so it never shadows React Native's own `Pressable` at a call site. `scaleTo`
  defaults to 0.96; `haptic` is **off by default** (`true | 'light' | 'medium' | 'selection'`),
  because not every target should buzz. The animated wrapper takes `containerStyle` for layout;
  `style` keeps `Pressable`'s own shape, including the `({ pressed }) => …` form.
- **`AnimatedNumber`** (`components/ui/AnimatedNumber.tsx`) — `memo`ised, takes a `format` function
  (locale-aware formatters, `compactNumber`), and announces the **final** value through
  `accessibilityLabel`, never a frame of the count.
- **Double-tap to like** — `components/feed/PostCard.tsx`. A second tap on the media within
  `DOUBLE_TAP_MS` (260 ms) likes the post and plays a heart burst; a single tap opens the post after
  the same delay. Reduce Motion still gets the burst, at full size, without the spring.

---

## 9. The ethical line

This is the part to read before adding anything to this feature.

The audience is mostly under 18, and the product's entire promise is that being seen by a scout is
earned rather than bought. That makes every mechanic here a claim about how the product treats a
child, and the team drew the line in four places:

**No currency.** There are no coins, gems, XP, points-you-can-spend or anything convertible into
anything else. Rarity is paint. The number on the wall is a count of things you actually did. The
moment a currency exists, someone asks whether it can be bought, and the answer to that question
would contradict the Talent Score's whole reason for existing — that nobody can pay to raise it.

**No urgency.** No countdowns, no limited-time achievements, no daily-reset windows, no "expires in
6 hours". Nothing in the schema has an expiry. Nothing in `20260904000004_notifications_and_counters.sql`
fires on inactivity, so the app never contacts a child to tell them to come back.

**No loss-framing.** A broken streak resets quietly and keeps the longest run; achievements are only
ever inserted; the score is never reduced by anything in this feature. There is no red state, no
"don't break it", no gap shaming on the calendar, no "you're falling behind". `progress.streakNoPressure`
says out loud that nothing was lost, because a child will assume it was.

**No comparison.** Nothing here is ranked against another person. The leaderboard on Discover is the
Talent Score's, gated by guardian consent and discoverability ([12](./12-youth-safety.md)); streaks
and achievements are visible only to their owner, enforced by RLS, not by the client.

**Why this matters more than usual here.** Every one of the four is a standard growth technique, and
every one works — that is the problem. A streak with a countdown, a badge that expires, and a coin
you can spend would measurably increase daily opens. They would do it by manufacturing anxiety in
teenagers about a thing they already care about a great deal, on a platform whose one job is to be
the trustworthy version of "get discovered". Apple 1.2 and Play's Families policy both look hard at
manipulative design in an app rated for minors; but the reason to hold the line is not that a
reviewer might notice. It is that the alternative product is one you would not want a fourteen-year-old
to use.

The concrete rule for anyone extending this: **an achievement marks something that happened, and it
is checked against the same rows the Talent Score reads.** If a proposed mechanic cannot be stated
that way, it does not belong here.

---

## 10. Related documents

- [11 — The Talent Score](./11-talent-score.md) — the slow loop this sits underneath.
- [10 — Mobile App Architecture](./10-mobile-app.md) §3 — where `ProgressProvider` sits in the stack.
- [16 — Internationalisation](./16-internationalisation.md) — the `progress` namespace and its tone
  rules for translators.
- [12 — Youth Safety](./12-youth-safety.md) — the rules the "no comparison" line depends on.
- [`supabase/migrations/20260904000011_streaks_and_achievements.sql`](../supabase/migrations/20260904000011_streaks_and_achievements.sql)
  — read the header.
