# 23 — Does the backend actually work?

> Three suites already said yes. None of them was answering the question.

---

## 1. What the existing tests could not tell you

| Suite | Runs where | Answers |
|---|---|---|
| `mobile/tests/unit` | node, no network | is this function's logic right |
| `supabase/tests/functional.sql` | **inside Postgres, as the superuser** | is this rule right |
| `tests/e2e/look.mjs`, `cards.mjs`, `console.mjs` | a browser over the recorded preview | does it look right |

Every one of those is worth having and none of them proves that a coach posting
a trial puts that trial in front of an athlete. The SQL suite comes closest and
still misses the whole delivery path: it has already skipped PostgREST, the anon
key, the JWT, the `authenticated` role and — because a superuser bypasses it —
row-level security. A rule can be perfect and the pipeline still broken, because
the pipeline is everything between the rule and the person.

Two suites now answer the other question.

---

## 2. `pipelines.mjs` — a write by one person, read by another

```bash
./tools/local-supabase/start.sh     # in another shell
cd mobile && npm run test:pipelines
```

It signs in as the demo accounts over HTTP with the anon key, exactly as the app
does, writes as one of them, and then asks a *different* account whether the
result arrived. Twenty-nine steps across eight journeys:

| Journey | What it proves |
|---|---|
| **A coach posts an opportunity** | the trial appears in an athlete's `recommended_opportunities` with a match percentage; she applies; the application reaches the poster's applicant list; shortlisting her produces a notification she can read |
| **Play** | a meetup is created; a stranger finds it by searching the city; asking to join does **not** take a spot; the host sees the request; accepting moves `spots_taken` for a third party watching |
| **The age gate** | a fourteen-year-old finds nothing and is refused when hosting — through RLS and the function gate, not the hidden tab |
| **A post** | reaches a follower's Following feed; a like moves the counter *and* notifies the author; a comment is visible to a third party |
| **Following** | the follower count moves and the followed person is notified |
| **Endorsements** | the endorsement is visible on the athlete's profile to someone else, carries `endorser_role = 'coach'` written by the server, and moves the credibility score; self-endorsement is refused |
| **Messaging** | the conversation and the message body arrive for the recipient; an unverified adult still cannot message a minor |
| **Profile views** | opening a profile is itself a write — it lands in the viewed athlete's digest |

The last one is worth knowing about before writing any test: `get_profile_bundle`
inserts a `profile_views` row and fires a notification. **Reading a profile is
not a read.**

It writes to the local development database and does not clean up. Everything it
creates is tagged `[pipe-<run>]` so runs do not collide and nothing is
confusable with seed data. Do not point it at a database anybody cares about.

---

## 3. `contract.mjs` — does the call exist on the other end?

```bash
cd mobile && npm run test:contract
```

`pipelines.mjs` walks eight journeys. The client makes 60 RPC calls, 54 selects
and 28 writes, and the ones it does not walk break in exactly one way:

```
Could not find the function public.get_notifications(p_limit) in the schema cache
```

TypeScript cannot catch that. `supabase.rpc('x', { p_y: z })` is a string and an
untyped object; the compiler is equally happy with a name that has never
existed. So this reads every call site in the client, asks PostgREST for its
OpenAPI document — the same schema cache the error message is complaining
about — and prints the difference:

- an RPC the database does not have, or does not have under that argument name
- a table or column selected that does not exist
- a column written that does not exist

Three things about it are load-bearing, and each was a bug in the checker first:

**Ask with a bearer token.** PostgREST returns the spec for whoever is asking,
and almost everything in this schema is granted to `authenticated` only. Asked
with the anon key alone it answers with 26 functions instead of 74 and reports
most of the app as missing — a false alarm shaped exactly like a catastrophe.

**A chain has one `.from`, so the next one ends it.** A fixed-size window
swallows the following query's `.select` and reports its columns as missing from
a table nobody asked about. That was forty imaginary failures.

**Shorthand counts.** `.insert({ conversation_id, content })` writes two columns
and names neither with a colon. A parser that only looks for `key:` reads that
insert as writing nothing and passes — the precise shape of a check that
succeeds because it did not look.

And when it cannot read a payload at all — `.update(patch)`, where the object is
a variable — it says so rather than skipping in silence, because a clean run
that quietly ignored two writes is worse than one that names them.

---

## 4. What they found

Everything passed on the second run. The first run failed eleven steps, and all
eleven were the *test* being wrong rather than the app — which is itself the
finding worth writing down, because each mistake is one a person would make
reading the same code:

- `opportunities` has no `city` or `deadline` column; the app writes `location`
  and `application_deadline`. Column names for a write belong in the client, not
  in a test's imagination.
- `getNotifications`, `getComments`, `getMessages` and `getMyTalentScore` are
  **table selects through RLS, not RPCs.** A test that invents an RPC for them
  tests nothing.
- `can_message_user` takes `p_recipient`, not `p_user`.
- **`athlete_id` means two different things one join apart.** On the
  `applications` table it is the *user* id. In `opportunity_applicants` the
  column of that name is the *athlete_profiles* id, and the user id is
  `athlete_user_id`. The client gets this right; a review screen that linked to a
  profile using `athlete_id` would open nothing, and nothing would tell you.

That last one is the kind of thing this pair of suites exists to surface.

---

## 5. CI

`db:test`, `test:contract` and `test:pipelines` now run on every pull request in
a third job. **The SQL suite was not in CI before this** — the workflow had two
jobs, web and mobile, and nothing that touched a database. Every migration in
the repo was verified by somebody running the script on a laptop.

The job installs PostgreSQL 16, pgvector and a PostgREST binary the same way a
laptop does, because the local stack is deliberately Docker-free (see
[docs/14](14-local-development.md)). It applies all 43 migrations from scratch,
seeds thirteen demo accounts and runs the three suites in order: rules, then
contract, then delivery.

`npm run test:backend` runs the same three locally.

---

## 6. What is still not covered

Honest list, so nobody reads a green run as more than it is:

- **Storage.** `uploadAvatar`, `uploadPostMedia` and `addAthleteMedia` push to
  buckets. The local shim serves them, but no pipeline step uploads a file and
  reads it back as somebody else.
- **Edge functions.** `talent-insights`, `guardian-consent` and `translate` are
  reachable locally; only the translation cache is asserted, and that in the SQL
  suite rather than end to end.
- **Push delivery.** `registerPushToken` stores a token. Whether Expo delivers
  anything is not testable from here at all.
- **The two unreadable writes** the contract checker names — `updateUserProfile`
  and `updateAthleteProfile` both take a `patch` object built by a screen, so
  their columns cannot be checked statically. They are checked at runtime by
  `pipelines.mjs` only insofar as it happens to write through them, which it
  does not.
- **Realtime.** Nothing in the app subscribes yet; when something does, this is
  where its test belongs.

---

## 7. Related documents

- [14 — Local Development](14-local-development.md) — the Docker-free stack these run against
- [12 — Youth Safety](12-youth-safety.md) — the rules the age-gate steps assert
- [21 — Meetups and translation](21-meetups-and-translation.md) — the three gates, and why the SQL suite drops role for one statement
- [22 — Endorsements and the edges](22-endorsements-and-edges.md) — the write path added just before this
