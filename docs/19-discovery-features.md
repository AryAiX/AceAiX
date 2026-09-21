# 19 — Fandom, challenges, and being seen

> Four features that share one job: give an athlete with no club, no contacts and
> no footage something to do on their first day, and give a scout something to
> read on their second.
>
> None of them changes the Talent Score's formula. That was a deliberate
> constraint — a score that moves because we shipped a feature is a score nobody
> can trust twice.

---

## 1. Who you support

**Migrations:** `20260907000001_fandom.sql`, `20260907000002_teams_catalogue.sql`

A fourteen-year-old signing up has almost nothing to put in a profile. They do
know which team they support, and they will answer that question happily, which
is why it is the last step of the wizard rather than a settings screen nobody
opens.

It earns its place three ways: the feed and discovery have something to work
with on day one, two strangers who support the same club have a reason to follow
each other, and a club posting a trial can see which applicants grew up wanting
to play for them.

**The distinction that matters.** `athlete_profiles.current_club` is where
somebody plays, and a scout depends on it being accurate. `favorite_teams` is
fandom. The onboarding copy says so in as many words, because "Real Madrid" in
the current-club box is a bad row in a recruiter's search results and this step
is the reason it will not happen.

| Object | What it is |
|--------|-----------|
| `public.teams` | The catalogue. 101 curated rows ship in the migration, weighted to the Gulf, Iran and North Africa, then to the clubs a teenager anywhere names first. |
| `public.favorite_teams` | Up to five per person, ordered — rank 1 is the shirt they own. The cap is a deferred constraint trigger, not a client-side check. |
| `user_profiles.favorite_venue` | One free-text line. A stadium somebody loves is taste, not location, which is why it is safe on a minor's profile when their training ground would not be. |
| `search_teams` / `add_custom_team` | Search returns curated rows plus the caller's own additions. A club somebody adds stays **private to them** until a moderator curates it — otherwise the picker becomes a place to publish a slur. |
| `fans_of_team` | Supporters, through the same discovery gate as search: a minor without guardian consent does not appear, and no minor's exact age is ever returned. |
| `fandom_of` | Teams and ground for one profile, in one call. |

The picker deliberately does **not** filter by the athlete's own sport. A swimmer
supporting Liverpool is the normal case.

---

## 2. Weekly skill challenges

**Migration:** `20260907000003_challenges.sql`

A coach asks for one specific thing on film — "thirty seconds of keep-ups, one
take, feet and thighs only, phone on the ground" — and every answer is
comparable, watchable, and worth a scout's minute. An unprompted clip is not.

Three rules shaped it:

**An entry *is* a media item.** It goes into `athlete_media` like any other clip,
so the Talent Score sees it through the media pillar it already has. No new
pillar, no new weight, nobody's score moves because this shipped.

**Claimed and verified are different columns.** Anyone can say they did 214; only
the coach who set the challenge turns that into a number a scout should trust.
The leaderboard shows both and labels which is which — hiding the unverified ones
would mean nobody sees their entry until a coach gets to it, and showing them
unlabelled would make the board worthless.

**Entering is publishing.** A minor who has not been made discoverable cannot
enter: the same gate that keeps them out of search keeps them off a leaderboard,
and the error names the guardian screen. The leaderboard applies the gate again
on read, so a guardian who revokes consent afterwards removes the child from the
board too, not just from search.

Setting one requires a **verified** coach, club or scout. `open_challenges`
returns the ones you have not entered first, then by closing date — the thing to
do today at the top, not a ranked wall of everything.

---

## 3. Who has been looking

**Migration:** `20260907000005_profile_view_digest.sql`

`profile_views` had been collecting rows since the first release and nothing ever
showed them to the person they were about. "Two coaches from Al Jadaf opened your
profile this week" is the sentence that makes somebody come back, and unlike a
streak it is not a game — it is the product working.

Who gets named, and who does not:

- A **verified** coach, scout or club is named. They are professionals acting
  professionally, on a profile the athlete published to be found.
- Everyone else is counted and never named. An unverified account and another
  athlete both land in the total and nowhere else. Naming them would turn a
  discovery feature into a surveillance one, and for a fifteen-year-old it would
  mean handing over a list of strangers who looked at them.

The screen says so in a line the reader can open, because a list that looks
complete and is not is worse than no list.

---

## 4. "What would it take?"

**Migration:** `20260907000004_score_simulator.sql`

The score screen could already say what to do next. What it could not say is what
the number would become — which is the question every fifteen-year-old actually
asks.

Answering it in the client would have meant a second copy of the weights, which
drifts within a release; the first time it disagreed with the number above it,
the whole screen stops being believable. So the calculation was split instead:

```
private.collect_score_inputs(athlete)   what is true about this person
private.score_from_inputs(inputs)       what that is worth
private.compute_talent_score(athlete) = the composition of the two
```

`compute_talent_score` behaves exactly as before — there is an assertion in
`supabase/tests/functional.sql` that the composition equals the whole, and the
migration was verified against every seeded athlete before and after: **no score
moved**. `simulate_talent_score` collects the same inputs, changes the ones the
athlete is asking about, and runs the same weighting.

Only twelve inputs can be moved, each clamped to something a person could
plausibly reach, and dependent inputs are made coherent server-side — a video is
also a media item, a verified match is also a match. The screen cannot promise a
98 for filling in a bio.

---

## 5. The player card

**Screen:** `mobile/app/player-card.tsx`

A fifteen-year-old will not send a scout a link to a profile. They will post a
card. It is the cheapest distribution AceAiX has, and every card carries the
score, the tier and the wordmark.

Drawn with `react-native-svg` — already a dependency — and exported through
`toDataURL`, so there is no new native module and the app still runs in Expo Go.
The file is written with `expo-file-system` and handed to React Native's own
share sheet.

**Known limit:** iOS attaches the image; Android's share sheet ignores a file URL
from `Share.share`, so it takes the text only. On web `toDataURL` is not
implemented and the button says so rather than failing quietly. Fixing Android
properly means `expo-sharing`, which is a native module and therefore an EAS
build rather than Expo Go — worth doing, not worth blocking on.

---

## 6. What this cost the score

Nothing. Stated plainly because it is the thing most likely to be assumed
otherwise:

- The five pillars and their weights are unchanged: profile 15, performance 30,
  media 15, credibility 20, engagement 20.
- Supporting a team is worth zero points. Nothing a person merely likes should
  move a number clubs use to rank them.
- A challenge entry is worth exactly what the clip is worth, through the media
  pillar, like any other clip.
- The simulator writes nothing.

---

## 7. Related documents

- [11 — Talent Score](11-talent-score.md) — the model the simulator runs
- [12 — Youth Safety](12-youth-safety.md) — the discovery gate these features reuse
- [17 — Engagement](17-engagement.md) — streaks and achievements, and the same ethical line
- [18 — The preview build](18-preview-build.md) — how to see all of this without a backend
