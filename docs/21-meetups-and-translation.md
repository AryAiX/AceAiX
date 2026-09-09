# 21 — Meetups and translation

> Two features that arrived together and have nothing to do with each other, except
> that both are about the app being usable by people who are not already connected.

---

## Part one: Meetups

### 1. What it is

Somebody in Dubai has a pitch booked on Saturday and needs fifteen more people to
make the cost bearable. Somebody else lands in Marbella on Thursday and wants a
tennis partner for an hour. Those are the same feature: a sport, a place, a time,
a number of people, and a level.

So they are one table. `spots_total` is the only thing that distinguishes a
hitting partner (2) from a five-a-side (10), and the card shows what is left —
"4 of 10 · 6 spots left" — because that number is the whole reason anybody
scrolls the list.

The host approves. A request does not take a spot; accepting it does.

### 2. Eighteen-plus, and why the database says so

[docs/12](12-youth-safety.md) rule 5 is the strongest guarantee in this product:

> **A minor's precise location is never held at all.** No coordinate, address or
> postcode column exists; city and country are typed by the user.

A meetup is the exact inverse: a named venue, an exact time, published to
strangers, with an implicit promise that the poster will be standing there. For a
fourteen-year-old that is the single most dangerous row this schema could hold,
and no amount of care in a screen would fix it.

So the floor is eighteen and it is enforced three times, in the database:

| Gate | Where | What it stops |
|---|---|---|
| `private.may_meet()` | called first by every writing function | hosting, joining, deciding |
| the same predicate in RLS | read policies on `meetups` and `meetup_participants` | a minor's client listing the table directly |
| `private.guard_meetup_is_adult()` | `BEFORE INSERT` trigger on `meetup_participants` | any path that forgot to ask, service-role code included |

Three gates for one rule is deliberate. This is the rule where a single missed
check is a story in a newspaper. `is_minor` is maintained by
`private.sync_age_state()` from a date of birth the account cannot rewrite, and
the gate reads it live — so a seventeen-year-old who turns eighteen simply starts
seeing the feature, with nothing to migrate.

The client contributes exactly one thing: `canUseMeetups()` hides the tab, because
a destination that is always empty reads as a broken app rather than as a rule.
It is presentation, not enforcement, and it is the only place in the feature where
the client knows the age at all.

**The tests are the point.** `supabase/tests/functional.sql` asserts that a minor
fails the gate, cannot host, cannot ask to join, finds nothing in search, sees
nothing through RLS, and is refused by the trigger even from a service-role
insert. That last one drops to the `authenticated` role for a statement — the
suite otherwise runs as the superuser, and **a superuser bypasses RLS entirely**,
which is how an RLS hole survives a full green suite.

### 3. Why there are still no coordinates

Searching "who is playing in Marbella" wants PostGIS. It does not use it.

A pitch is not a point you need to be within 400 metres of; it is a place with a
name, and "Marbella" or "Dubai Marina" is what somebody planning a trip actually
types. More importantly, adding a coordinate column creates a place for a minor's
coordinates to land the day somebody relaxes the age gate — and the strength of
rule 5 is that the column does not exist.

So `country` and `city` are matched exactly-ish, `area` is a neighbourhood, and
`venue` is the specific place. `find_meetups` matches a single typed string
against city, area and venue at once, because nobody agrees whether it is "Dubai
Marina" or "Marina, Dubai".

### 4. The tab bar, and what this cost

Adding Play made six tabs, and the raised **+** button had been the middle of
five. Six slots have no middle, so it would have gone back to sitting off-centre —
the exact defect [docs/20](20-colour-and-motion.md) had just fixed.

Composing is not a destination, so it stopped being a tab. It now floats above the
bar, positioned `left: 0, right: 0` with `alignItems: 'center'` — centred against
the screen rather than against a slot, which is both more honest and no longer
hostage to how many tabs there are. `tests/e2e/look.mjs` measures it: `offBy 0`.

### 5. Shape

```
meetups                 host, sport, title, note, country/city/area/venue,
                        starts_at/ends_at, spots_total/spots_taken, level,
                        cost_note, status
meetup_participants     one row per person per meetup
                        requested → joined | declined | withdrawn, plus host
```

`spots_taken` is never written by hand. A trigger recounts `joined` + `host` after
every change and flips `status` between `open` and `full`, so "6 spots left" cannot
drift from the roster under it.

| Function | For |
|---|---|
| `create_meetup(...)` | host one; the host takes a spot immediately |
| `find_meetups(sport, country, place, from, to, level, …)` | the search; returns nothing to a minor rather than raising |
| `meetup_detail(id)` | one game; roster only for people going, pending only for the host |
| `request_to_join_meetup(id, message)` | ask |
| `decide_meetup_request(id, user, accept)` | host only |
| `leave_meetup(id)` / `cancel_meetup(id)` | a host cancels rather than leaving |
| `my_meetups(include_past)` | hosting and going, one list |

---

## Part two: Translation

### 6. What it is

A line under any post, comment, message or meetup note — "See translation" — the
way Instagram does it. Tap, read, tap again for the original.

It never translates on its own. Somebody's words are shown as they wrote them
until a reader asks otherwise; auto-translating a feed is how you end up reading a
machine's opinion of a friend's joke.

### 7. The cache is the whole design

Machine translation is billed per character and a feed post is read by hundreds of
people. A translation is a pure function of (text, target language), so it is
stored exactly once — keyed by **sha256 of the trimmed source**, not by the row it
came from. That gives three things for free:

- two people who both post "Great game today" share one row
- an edited post is a different hash, so it is retranslated rather than answered
  with stale words
- nothing needs invalidating when a post is deleted

The client asks `cached_translation()` first — an index lookup, no money, no
network beyond Postgres. Only a miss reaches the `translate` edge function, which
translates, stores, and answers. The function re-checks the cache on arrival,
because two people opening the same post at the same moment both miss.

### 8. No provider is a normal answer

Which engine translates is a commercial decision with a key attached, and this
migration does not make it. `callProvider()` in `supabase/functions/translate` is
the single boundary: Google and DeepL are both written, and with neither key set
it answers `provider: 'none'` and the client leaves the original showing. The
button simply does not appear.

So this ships complete, tested and inert. Turning it on is one environment
variable — `GOOGLE_TRANSLATE_API_KEY` or `DEEPL_API_KEY` — with no client release
and no migration.

`store_translation()` is `service_role` only. A client that could write there
could put any words under anyone's post.

### 9. When the button is offered

`mightNeedTranslation()` is deliberately crude and local, because the honest
answer needs the provider's language detection and that costs money. It only
filters out the obviously silly: nothing to translate, or text plainly already in
the reader's script.

Latin-script languages cannot be told apart this way, so English, Spanish, French
and German readers are always offered it. Tapping it on text already in your
language costs one cached lookup and shows the same words — a much smaller
annoyance than never being offered it on the one post you needed.

Your own outgoing messages never get the line. Offering it on your own words looks
like the app does not know who is talking.

Under a truncated feed caption it is also withheld: swapping three visible lines
for a translation of the whole post replaces words the reader can see with words
they cannot check. It appears once the caption is expanded.

### 10. Housekeeping

`private.prune_translations(interval)` drops anything older than ninety days —
service-role only, and worth a scheduled job. A translation is cheap to recompute
and the table only grows.

---

## 11. Two things this work exposed

**The local harness never exercised RLS.** Hosted Supabase grants `authenticated`
access to tables in `public` by default; the local stand-in does not. So the read
policies on `challenges`, and every table added since, were never under test — the
table was simply unreadable and the tests passed for the wrong reason. `0909/01`
grants `SELECT` explicitly on both new tables, which makes the two environments
agree and makes the policy the thing being tested. **The 0907 tables still have
this gap** and it is worth closing the same way.

**A new function in `private` is callable unless you say otherwise.** `0907/06`
closed the schema with an `alter default privileges`, but that binds only objects
created by the role that ran it, and PostgreSQL still grants EXECUTE to PUBLIC on
every new function — which `anon` inherits. Three functions added here were
callable by any signed-in account before the whole-schema invariant test caught
it, one of them `prune_translations`, which deletes rows. Revoke explicitly in the
same migration; do not rely on the default.

---

## 12. Related documents

- [12 — Youth Safety](12-youth-safety.md) — rule 5, and the age machinery the gate reads
- [16 — Internationalisation](16-internationalisation.md) — the seven catalogues these strings live in
- [20 — Colour and motion](20-colour-and-motion.md) — the tab bar this feature reshaped
- [14 — Local Development](14-local-development.md) — the harness, and the RLS gap in §11
