# 26 — Game Intelligence

> Six short timed games that measure how a player reads the game: a football decision test on an
> animated pitch, ball-flight anticipation, multiple-object tracking, Go/No-Go, a flanker task and
> choice reaction time. It sits **beside** the Talent Score, not inside it.
>
> Source of truth: `supabase/migrations/20260924000001_game_intelligence.sql`. Client:
> `mobile/app/intelligence/`, `mobile/components/intelligence/`, `mobile/lib/gi/`,
> `mobile/lib/api.intelligence.ts`. Product rationale: the "AceAiX Talent Score: Mental &
> Decision-Making Assessment Design" document (September 2026), which recommended building this
> module first and the self-report Mental Profile second.

---

## 1. What the player sees

```
Profile tab ─ Game Intelligence card ─▶ /intelligence
                                          │
          consent not ok ◀────────────────┤  (guardian gate, date of birth, not an athlete)
          intro ─ "Let's play" ───────────┤
                                          ▼
                              /intelligence/session
          get ready (quiet, notifications off, "how fresh?")
          → warm-up (5 simple reactions; median stored as baseline_ms)
          → hub: six games, any order, progress kept 24 h
               each game: how-to → practice (never scored) → scored round → result
          → "See my results" → /intelligence?fresh=1 (confetti, then the result)
```

The result screen shows the overall on a six-segment ring (one segment per game, in that game's
colour), a bar per game, two strengths, one thing to work on with a concrete tip, the history line,
the next full retest date (90 days), and the two sharing switches.

| Game | Measures | Scored round | Metrics sent |
|------|----------|--------------|--------------|
| Pitch Decision | Decision-making | 8 scenarios, 3 s each | `choices[{scenario, option, ms}]` |
| Read the Ball | Anticipation | 10 balls | `trials, answered, mean_error` |
| Track the Runners | Awareness (MOT) | 6 rounds, adaptive level 1–8 | `rounds, targets_total, targets_found, max_level` |
| Go / Stop | Self-control | 40 balls, ¼ no-go | `go_trials, go_hits, go_median_ms, nogo_trials, nogo_withheld` |
| Focus Arrows | Focus (flanker) | 24 trials | `trials, correct, congruent_ms, incongruent_ms` |
| Quick Hands | Reaction speed | 16 trials | `trials, correct, median_ms, anticipations` |

Each trial is answered through a ref, not state: a tap and the trial's timeout can both arrive
before React re-renders, and only the first may record it.

Trial plans are drawn from a seed (`lib/gi/trials.ts`, seeded by session + game + attempt), so a
plan is reproducible and its balance is unit-tested — a Go/No-Go with no red balls would give
everyone a perfect self-control score and nothing on screen would look wrong.

Every timed surface uses `FAST_PRESS` (`components/intelligence/shared.tsx`): react-native-web
otherwise delays press-in by 50 ms and drops very quick clicks, which would add 50 ms to every
reaction time measured in a browser.

---

## 2. Consent — who may play

| Age | Rule |
|-----|------|
| under 13 | no account exists (docs/12 §2) |
| 13 → self-consent age | a guardian must have ticked **Game Intelligence** (`guardian_consents.allow_assessments`) |
| self-consent age and over | the player decides |

The self-consent age is **15 by default** and per country in `public.assessment_consent_ages`
(seeded: Germany, the Netherlands and Ireland at 16, where the GDPR age of digital consent is 16).
**Every market needs counsel's confirmation before launch** — the UAE in particular.

`private.gi_consent_state()` is the gate and `gi_start_session` / `gi_submit_result` enforce it; the
screens only explain it. `age_unknown` is treated as a minor.

The guardian consent page (`functions/guardian-consent`) gained a fourth checkbox, **unticked by
default**: approving discovery is not approving testing. A minor whose guardian approved the profile
but not the games is sent to `/settings/guardian?add=assessments`, which prefills a new request to
the same guardian.

Consents are a union (since 0910/01 a minor may hold several — two parents, say), so a new
approval **replaces only the same guardian's earlier one** (matched on address) and sits beside
anyone else's. A guardian who re-approves with the games box unticked therefore withdraws their own
earlier yes. The consent page pre-ticks each box from the guardian's current choices, so asking to
add the games cannot silently re-grant a scope the guardian had refused. `allow_assessments` is added
to the column-level `SELECT` grant that keeps `token` unreadable (0904/02); the minor cannot write it.

When a minor who consented for themselves finishes their first sitting, any guardian with a linked
AceAiX account gets a `gi_completed` notification — told, not asked.

---

## 3. Scoring — on the server, always

`private.gi_score_test(test, metrics, session)` turns one game's metrics into `{score 0–100, valid,
reason}`. Every branch range-checks first, and a result whose score comes out NULL (a metric left out) is
invalid rather than — as `least(100, NULL)` would have it — 100: a median choice reaction under 180 ms, a Go/No-Go where
the player never tapped, a round with too few trials — stored as **invalid**, not scored, and the
player sees "That round didn't count".

**The pitch-decision answer key never leaves the database.** `gi_scenarios` has RLS on and no policy.
`gi_scenarios_for_session` hands out eight layouts without the key and records their ids on the
session; `gi_submit_result` scores only those ids, each once. The authoring `title` ("switch",
"cutback") names the answer, so it is stripped from what the phone receives. Twelve scenarios are seeded; each has
`reviewed_by` NULL until a coaching panel signs it off — the partial credits (0.5, 0.25) are where
coaches will disagree.

The other five games are timed on the phone, so their metrics are the client's word. Range checks
catch the impossible; a determined person with an API client could still submit tidy, plausible
numbers. That is why the game that cannot be faked this way carries the most weight.

Overall = weighted mean of the valid games' best scores (weights in `private.gi_weight`):
pitch decision 0.35, anticipation 0.15, tracking 0.15, Go/No-Go 0.15, flanker 0.10, reaction 0.10.
Fewer than **four** valid games → no overall.

- **Best of, inside a window.** Best valid score per game within the 14 days ending at the latest
  result. A bad day costs a retake, not a number; the window stops best-of reaching back months.
- **Two attempts per game per 14 days** (`gi_attempt_limit`). Practice rounds never count.
- **Confidence**: high = all six valid and self-rated freshness ≤ 3; medium = four or five; low
  otherwise. Shown to clubs next to the number.
- **Percentile** against the same `age_band` only (13–15, 16–17, 18–24, 25+), hidden below ten —
  the same rule as the Talent Score.

---

## 4. Why it is not in the Talent Score (yet)

The Talent Score measures the **profile**, not the player (docs/11 §1). Game Intelligence measures
the player. Until a pilot has produced age-band norms and test–retest reliability, it is shown
beside the score and never added to it; the results screen says so. The design document's target is
20% of the Talent Score after the pilot. When that happens, bump `algorithm_version` on both tables.

The ring is deliberately not `ScoreRing`: Volt and the single sweep belong to the Talent Score.

---

## 5. Who sees what

| Viewer | What `get_game_intelligence` returns |
|--------|--------------------------------------|
| the athlete | everything (`gi_my_state` on their own screen) |
| coach, scout, club, federation, admin | overall, percentile, age band, confidence, six sub-scores, games played, date — **only if** the athlete switched on *Share with coaches and clubs* |
| anyone else | the overall and percentile only, and only if *Show a badge* is on (which requires sharing) |
| everyone | nothing if the athlete is suspended, blocked either way, or a minor whose guardian has not approved discovery |

`gi_profiles`, `gi_results`, `gi_sessions` and `gi_history` are owner-readable only and not writable
by any client; `supabase/tests/functional.sql` → "game intelligence" asserts each rule, including a
direct `UPDATE` from the `authenticated` role.

---

## 6. Tests

- `mobile/tests/unit/gameIntelligence.test.ts` — trial plans, metric shapes, the tracking staircase.
- `supabase/tests/functional.sql` → "game intelligence" — assertions for consent by age and country,
  the superseding approval (same guardian only) beside another guardian's, a scope the minor cannot
  write, the hidden key and label, invalid and incomplete results, one
  result per game per session, the attempt limit, sharing and the minor gate.
- `mobile/tests/e2e/pipelines.mjs` → "a game result reaches a coach only once it is shared" — the
  whole path over HTTP as the app does it. Rerunnable: games without attempts left are skipped.

---

## 7. Open items

1. **Legal review of the consent ages**, per launch market (UAE first).
2. **Guardians without an AceAiX account are not told** when a 15–17-year-old plays; only linked
   accounts get the notification. An e-mail through the `guardian-consent` function would close it.
3. **Retest reminders** at 90 days need a scheduled job; `next_retest_at` is stored and shown.
4. **Device correction.** `device_class` and `baseline_ms` are recorded on every session; nothing
   uses them yet. Split or correct percentiles once there is enough data to know whether it matters.
5. **Scenario review.** A coaching panel should sign off the twelve seeded scenarios and add more —
   by position and age band — before results are shown to clubs at scale.
6. **Pilot**: 300+ players, test–retest reliability ≥ 0.7 per game, correlation with coach rankings;
   only then consider folding the overall into the Talent Score.
7. **Consent is only as strong as the address it is sent to.** `request_guardian_consent` refuses the
   minor's own address and another minor's, but an adult-looking inbox the minor controls is
   indistinguishable from a parent's — true of every scope, not only this one.
8. The **Mental Profile** (questionnaires) is not built. It needs commercial licences from the
   instrument authors and validated translations first.
9. Discovery filters ("decision-making in the top 20%") are not built.
