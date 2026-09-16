# 11 — The Talent Score

> The Talent Score is a 0–100 number on every athlete profile, split into five pillars. It is
> computed entirely in Postgres from rows in this database, recomputed on write, and cannot be
> edited by anyone — not the athlete, not a coach, not an administrator through the app.
>
> Written for both engineering and product. The source of truth is
> `supabase/migrations/20260904000001_talent_score.sql`, amended by
> `20260904000007_release_fixes.sql` (per-sport percentile) and
> `20260904000010_close_minor_exposure_gaps.sql` (the leaderboard's discovery gate, and two function
> comments that described the opposite of the code). If this document and that SQL disagree, the SQL
> wins.

---

## 1. What it is, and what it is not

**It is** a measure of how complete, evidenced and active an athlete's profile is. Every point is
traceable to a pillar, and every pillar to rows you can query. There is no model, no black box and
no randomness in the number itself.

**It is not a scouting judgement, and the app must never present it as one.** A 90 does not mean
a better player than a 60. It means a profile with more evidence on it: more logged matches, more
watchable footage, a verified account, an endorsement from a coach the platform has checked. A
fourteen-year-old who has just joined will score low no matter how good they are, and the product
has to say so plainly rather than let them draw the other conclusion.

Concretely, this constrains the UI:

- Never rank an athlete as "better" than another on the basis of the score, in copy or in a
  heading. Rank by *match to a brief* (`match_percent`, which carries `reasons`), or by score with
  the label "Talent Score", never by "best".
- Never phrase a low score as a verdict. `app/score.tsx`'s disclosure sheet ends with "It is a
  measure of your profile, not of you. A low score means there is more to add, not that you are a
  worse player. No coach makes a decision from this number on its own." That sentence is load-bearing.
- Never generate or display a projection, a comparison to a named professional, or a "potential"
  figure. We do not have the data to support one, and the audience is young enough to believe it.
- The `talent-insights` edge function is prompted with an explicit "do not promise anyone will
  scout them" rule for the same reason (§8).

---

## 2. Where it lives

| Object | Contents |
|--------|----------|
| `public.talent_scores` | One row per athlete: `overall`, `tier`, the five pillar sub-scores, `inputs` (the raw counts behind the calculation), `tips`, `percentile`, `previous_overall`, `ai_summary`, `algorithm_version`, `computed_at`. Primary key is `athlete_id`. |
| `public.talent_score_history` | One row per athlete per day (`unique (athlete_id, recorded_on)`) — `overall`, `tier`, `pillars`. Feeds the curve on `/score`. |
| `private.compute_talent_score(athlete)` | Pure calculation. Returns JSON; writes nothing. |
| `private.build_score_tips(result)` | Turns the `inputs` into an ordered list of suggestions. |
| `private.refresh_talent_score(athlete)` | Computes, upserts `talent_scores` and today's history row, recomputes the percentile, and mirrors three legacy display columns onto `athlete_profiles`. |
| `private.tier_for_score(score)` | The band cut-offs. |
| `public.refresh_my_talent_score()` | The only client-callable recompute — for the caller's own athlete profile only. |
| `public.talent_leaderboard(sport, country, limit)` | Ranked list, capped at 100 rows. Carries the youth-safety discovery gate — see below. |

The score also arrives inside `get_profile_bundle` (as `score`) and on every `get_feed`,
`discover_athletes`, `search_people` and `opportunity_applicants` row, so no screen has to fetch it
separately.

**The leaderboard is a discovery surface, not a report.** It puts a name and an avatar in front of
every signed-in account, so `20260904000010` gave it the same filters as `discover_athletes`: a minor
appears only once a guardian has approved discovery, suspended accounts are excluded, and blocks are
honoured in both directions. Before that it filtered on sport, country and `is_open_to_offers` alone
and a non-consented 14-year-old could be ranked publicly by name. If you add another surface that
sorts by `overall`, it needs the same clause —
[12 §5](./12-youth-safety.md#5-discovery-gating) is the list of surfaces that carry it.

---

## 3. The five pillars

| Pillar | Weight | The question it answers |
|--------|--------|-------------------------|
| Performance | **30** | What have they actually done on the pitch? |
| Credibility | **20** | Who vouches for them, and is any of it verified? |
| Engagement | **20** | Are they active, and are scouts looking? |
| Profile | **15** | Is the portfolio actually filled in? |
| Media | **15** | Can a scout watch them play? |

Each pillar is computed to 0–100 on its own, then weighted. The weights sum to 100, so
`overall` is a straightforward weighted mean, rounded and clamped.

The ordering is the product argument in numeric form: **evidence of playing beats everything**,
credibility and activity matter equally and jointly outweigh performance, and profile text and
media are the entry ticket rather than the prize. Media is capped low deliberately — a beautifully
edited reel from someone who has never logged a match should not out-score a player with a season
behind them.

### 3.1 Profile — 15%

`round(filled / 10 * 100)`, over ten fields, each worth the same:

sport · primary position · birth date · height **and** weight (one field, both required) · bio ·
nationality · current club (linked org *or* free-text) · avatar · city **and** country ·
level.

Height/weight and city/country are paired because half of either is not usable by a scout.

### 3.2 Performance — 30%

Reads `public.match_records` for the athlete. Zero matches scores zero — there is no participation
floor here.

| Component | Formula | Cap |
|-----------|---------|-----|
| Recent, evidenced play | `matches in the last 12 months × 3` | 45 |
| Output relative to games | `(goals + assists) / total matches × 22` | 30 |
| Verified records | `records with source = 'verified' × 5` | 25 |

Two things follow from the shapes. The recency term uses matches from the last twelve months, not
all time, so a profile decays if you stop playing — the number is meant to describe now. And the
output term is a *rate*, so logging thirty quiet matches does not out-score twelve productive ones.
A verified match record is worth roughly double a self-reported one (5 points each, on top of the
3 it already earned as a recent match).

### 3.3 Media — 15%

Reads `public.athlete_media` where `is_public`.

| Component | Formula | Cap |
|-----------|---------|-----|
| Video / highlight reels | `videos × 18` | 55 |
| Other public media | `(items − videos) × 5` | 20 |
| Total views | `views / 40` | 25 |

Three clips saturate the video term almost exactly (54 of 55). That is the intended message, and
the "add three clips" tip says so: a scout opens footage before anything else, and three short
clips is the sweet spot.

### 3.4 Credibility — 20%

| Component | Value | Cap |
|-----------|-------|-----|
| The account itself is verified | 35 if true | — |
| Linked to a listed club (`current_club_id`, not free text) | 20 if true | — |
| Endorsements from a **verified** user whose role is coach / scout / club / federation | `× 10` | 30 |
| Endorsements from any verified user | `× 3` | 15 |

Both endorsement terms only count endorsers whose `user_profiles.is_verified` is true — the join
enforces it. An endorsement from an unverified account is worth nothing at all, which is what
stops a ring of new accounts from manufacturing credibility. Note that an expert endorsement scores
on both rows (10 + 3), so the first one is worth 13 points.

Verification is the largest single boolean anywhere in the score — one flag, 35 raw points, 7 on
the overall — and it is the one thing an athlete cannot do for themselves: it is granted by an
administrator through the web portal.

### 3.5 Engagement — 20%

| Component | Formula | Cap |
|-----------|---------|-----|
| Posts in the last 30 days | `posts × 6` | 30 |
| Followers | `ln(followers + 1) × 9` | 35 |
| Profile views by a scout / coach / club in 30 days | `views × 2.5` | 25 |
| Recency | 10 if active within 7 days, 5 within 30 days, else 0 | 10 |

Followers are logarithmic on purpose: the difference between 10 followers and 100 should matter;
the difference between 10,000 and 100,000 should barely register. Otherwise the score becomes a
popularity contest, which is exactly the failure mode of a teenage social product.

`scout_views` counts only viewers whose role is scout, coach or club — rows written by
`get_profile_bundle` when someone opens the profile. An athlete browsing another athlete does not
count as interest.

"Active" is `greatest(athlete_profiles.updated_at, user_profiles.updated_at)`.

---

## 4. Tiers

| Band | Tier | Colour token |
|------|------|--------------|
| 85–100 | Elite | `TierColors.elite` (Ace Orange) |
| 70–84 | Gold | `TierColors.gold` |
| 55–69 | Silver | `TierColors.silver` |
| 40–54 | Bronze | `TierColors.bronze` |
| 0–39 | Rising | `TierColors.rising` |

`private.tier_for_score` and `tierForScore()` in `mobile/theme/tokens.ts` must agree.
`mobile/tests/unit/theme.test.ts` asserts every cut-off, so moving a band in one place and not the
other fails the test run.

Reaching a **new, higher** tier fires a `score_tier_up` notification (`private.on_talent_tier_change`);
dropping a tier does not notify. Telling a fifteen-year-old their score went down is not
information they can act on that we could not deliver more kindly through the tips.

---

## 5. Percentile

`percentile` is the share of athletes **in the same sport** scoring at or below this athlete, as
an integer 0–100. The UI displays its complement, and it names the cohort in the sentence:
**"Top 12% of athletes in your sport"** — `app/score.tsx` and `components/profile/ScoreCard.tsx`
render the same string from `Math.max(1, 100 - percentile)`.

The cohort rule is the important part, and it is a correction: the original implementation compared
every athlete against every other athlete regardless of sport, which ranked a chess player against
sprinters and made the sentence meaningless. `20260904000007_release_fixes.sql` scoped it, and the
client copy was hedged until then precisely because the number could not carry a comparison group.
The two now agree, so **if the cohort ever changes, that sentence has to change with it** — a
percentile whose stated comparison group is not the one it was computed against is worse than no
percentile at all.

**Below ten scored athletes in a sport, `percentile` is left `NULL`** and the client hides the line
entirely (`app/score.tsx`, `components/profile/ScoreCard.tsx` both branch on `percentile != null`).
A "Top 50%" derived from a cohort of three is worse than saying nothing. On a fresh install or a
young sport, expect no percentile at all — that is correct behaviour, not a bug.

Because the cohort changes as other athletes are scored, an athlete's percentile can move without
their own score moving. It is recomputed on every refresh of *their* row, not globally, so it lags
until the next time something touches their profile.

---

## 6. When it is recomputed

Triggers, all `AFTER`, all calling `private.refresh_talent_score`:

| Trigger | Table | Fires on |
|---------|-------|----------|
| `trg_score_athlete_profile` | `athlete_profiles` | insert, or update of sport, position, birth date, height, weight, bio, nationality, club, level |
| `trg_score_media` | `athlete_media` | insert / update / delete |
| `trg_score_matches` | `match_records` | insert / update / delete |
| `trg_score_endorsements` | `endorsements` | insert / delete |

Plus `public.refresh_my_talent_score()`, which the athlete triggers by pulling to refresh on
`/score`, and which `edit-profile` and the onboarding wizard call after a save so the number moves
while the person is still looking at it.

Both migrations end with a backfill loop over every athlete, and `supabase/seeds/demo.sql` does the
same after seeding.

**What is *not* trigger-driven:** posts, followers and profile views feed the engagement pillar but
have no score trigger — the write volume would be enormous and the value marginal. Those parts of
the score move the next time anything else recomputes it, or when the athlete pulls to refresh.
This is a deliberate accepted staleness, and it is why the score screen has pull-to-refresh at all.

---

## 7. Why it is server-computed and not client-writable

`talent_scores` and `talent_score_history` have `SELECT` granted to `authenticated` and
`INSERT`/`UPDATE`/`DELETE` **revoked** from `authenticated` and `anon`. Only `SECURITY DEFINER`
functions and the service role can write them. `talent_score_history` is additionally readable only
by its owner or an admin — an athlete's daily curve is theirs, not a public record.

Three reasons this is not negotiable:

1. **It is the object the product sells.** A score a client can write is worth nothing to the coach
   reading it. Recruiters filter and sort on it (`discover_athletes`, `talent_leaderboard`,
   `opportunity_applicants`), so a writable score is a direct route to fraudulent discovery.
2. **The inputs are already protected.** `20260904000002` revokes table-wide `UPDATE` on
   `user_profiles` and `athlete_profiles` and grants back only the columns a user genuinely owns —
   `is_verified`, `is_minor` and the derived counters are not among them. Computing the score from
   those columns in the database closes the loop; computing it in the client would reopen it.
3. **One implementation.** The mobile app, the web portal and any future integration all read the
   same number. There is no second copy of the algorithm to drift.

`mobile/lib/api.ts` has no write path to `talent_scores` — the only score-touching call is
`refresh_my_talent_score`, and `supabase/tests/functional.sql` asserts that an athlete attempting to
`UPDATE` their own score row is refused.

---

## 8. Tips

`private.build_score_tips` reads the `inputs` object and emits `{ key, label, detail, points, pillar }`
for each condition that is currently unmet:

| Key | Emitted when | Points offered |
|-----|--------------|----------------|
| `add_highlights` | fewer than 3 videos | `(3 − videos) × 5`, max 15 |
| `complete_profile` | any of the 10 profile fields empty | `missing × 2` |
| `log_matches` | fewer than 5 matches in the last 12 months | 12 |
| `get_verified` | account not verified | 7 |
| `ask_endorsement` | no endorsement from a verified expert | 6 |
| `link_club` | no linked organisation | 4 |
| `post_update` | no post in 30 days | 6 |

`points` is an honest **approximation of the weighted gain**, not a computed delta — e.g. filling
one profile field is worth 10 raw profile points × 0.15 ≈ 1.5, rounded up to 2 for legibility.
Treat it as guidance in the UI (`+7 pts` on the tip card), not as a promise.

The list is emitted in the fixed order above, roughly descending by typical impact, and the client
renders it in that order (`components/profile/TipList.tsx` does not sort). The order is **authored,
not computed** — the original comment in `20260904000001` claimed "ordered by points available",
which is not what the code does. `20260904000010` replaced it with a `COMMENT ON FUNCTION` that says
what actually happens:

> Suggestions for raising the score, emitted in a fixed order: media first, then profile,
> performance, verification, endorsements, club, activity. The client shows them in this order; it
> does not re-sort by points.

If you want true point-ordering, sort in SQL rather than in the client, so the web portal agrees —
and update that comment in the same commit.

Every tip key has a matching destination in `app/score.tsx`'s `targetFor()`; adding a tip key in SQL
without adding the route sends the button to `edit-profile` by default.

**`label` and `detail` are English literals, in every language.** `build_score_tips` writes them by
concatenation into `talent_scores.tips`, so the English text is *stored*, not merely rendered, and
`TipList` shows it as it arrives — only the points badge and the action button are translated (the
button through `tip.key`, which is why it is already localised). Fixing it means the function
emitting `key`, `points`, `pillar` and a small `params` object, and the app owning the copy. See
[16 §11.2](./16-internationalisation.md) and [15 §2](./15-known-gaps.md) item 12.

---

## 9. The `talent-insights` edge function

`supabase/functions/talent-insights/` writes `talent_scores.ai_summary` — two or three sentences
that explain the number in words. It is called by the athlete for their own profile only
(authenticated, resolves the athlete from the JWT).

It adds explanation, never arithmetic. The number is computed in SQL before this function is ever
invoked, so an outage, a rate limit or a missing API key **cannot change anyone's score**. With
`ANTHROPIC_API_KEY` set, the wording comes from a model constrained to the facts passed in; without
one, `templateSummary()` produces the same shape from the strongest and weakest pillar. Either way
the athlete gets a real answer, and the response reports which path it took
(`generated_by: "model" | "template"`).

The prompt is where the product's position on the score is enforced against the model: do not
invent a statistic that was not provided; do not promise anyone will scout them; no exclamation
marks; under 60 words; and when the reader is a minor, keep the language simple and never
discouraging. If you edit that prompt, keep all four constraints.

---

## 10. Worked example

An 18-year-old footballer, one season logged, three clips, one coach endorsement, not yet verified.

**Inputs**

```
profile fields filled       8 of 10   (no dominant foot data, no bio)
matches total              14
matches last 12 months     11
verified match records      3
goals + assists             9
public media items          5   (3 video, 2 photo)
media views               480
endorsements                2   (1 from a verified coach, 1 from a verified athlete)
account verified           no
club linked                yes
posts last 30 days          3
followers                 240
scout views (30d)           4
last active                yesterday
```

**Pillars**

| Pillar | Working | Raw |
|--------|---------|-----|
| Profile | `8 / 10 × 100` | **80** |
| Performance | `min(45, 11×3)=33` + `min(30, 9/14×22)=14.1` + `min(25, 3×5)=15` | **62** |
| Media | `min(55, 3×18)=54` + `min(20, 2×5)=10` + `min(25, 480/40)=12` | **76** |
| Credibility | `0` (not verified) + `20` (club) + `min(30, 1×10)=10` + `min(15, 2×3)=6` | **36** |
| Engagement | `min(30, 3×6)=18` + `min(35, ln(241)×9)=35` + `min(25, 4×2.5)=10` + `10` (7-day) | **73** |

**Overall**

```
80×0.15 + 62.1×0.30 + 76×0.15 + 36×0.20 + 73×0.20
= 12.0  + 18.6      + 11.4    +  7.2    + 14.6
= 63.8  → 64        Silver
```

**Tips generated**, in emitted order:

1. `complete_profile` — 2 fields missing, `+4 pts`
2. `get_verified` — `+7 pts`

Not emitted: `add_highlights` (already 3 videos), `log_matches` (11 ≥ 5), `ask_endorsement` (has an
expert one), `link_club` (linked), `post_update` (posted recently).

The biggest move still open to this athlete is verification — 35 raw credibility points, worth 7
on the overall — and it is the one thing they cannot do alone. That is intentional: the top of the
score requires someone else to vouch for you.

**Percentile:** only shown if at least ten **footballers** on the platform have a score — the cohort
is the sport, not the platform. If so, and 64 sits above 71% of them, the screen reads
"Top 29% of athletes in your sport".

---

## 11. Known limitations

Worth stating plainly before anyone builds on top of the number.

- **Most inputs are self-reported.** Only `match_records.source = 'verified'` and the account
  verification flag are checked by anyone. The scoring shape rewards verified evidence roughly
  double, but a determined athlete can still inflate the self-reported half.
- **Engagement can be gamed cheaply.** Posting every day and following broadly moves 20% of the
  score with no sporting content. The caps and the log limit the damage, but the ceiling here is
  higher than it should be.
- **The percentile lags.** It is recomputed only when the athlete's own row is refreshed, so it
  reflects the cohort as it was at that moment.
- **Sport-blind pillars.** The performance formula is shaped around goals and assists. It works for
  football and reads oddly for chess, athletics or swimming, where `goals + assists` is always zero
  and the whole 30-point output term is unreachable. `constants/sports.ts` already knows the metrics
  each sport cares about; the scorer does not use them yet. This is the largest single gap.
- **`algorithm_version` exists but is never bumped.** It defaults to 1 and nothing writes it. When
  the formula changes materially, bump it in `refresh_talent_score` so historical rows stay
  interpretable.

---

## 12. Related documents

- [10 — Mobile App Architecture](./10-mobile-app.md) — where the score is rendered.
- [12 — Youth Safety](./12-youth-safety.md) — the discovery gate a score alone does not open, and
  which the leaderboard now carries.
- [15 — Known gaps](./15-known-gaps.md) — including §11 of this document.
- [03 — Data Model](./03-data-model.md) — `athlete_profiles`, `match_records`, `endorsements`,
  `athlete_media`, `profile_views`.
