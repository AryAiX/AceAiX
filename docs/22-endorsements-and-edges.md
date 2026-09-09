# 22 — Endorsements, and the edges

> One feature the app had been advertising without providing; three layout
> defects that all read as "the margins are wrong" from the outside; and two
> console warnings that could not be fixed where they appeared to come from.

---

## Part one: Endorsements

### 1. The tip nobody could follow

The Talent Score has said this to athletes since it shipped:

> Ask a coach to endorse you — one endorsement from a verified coach or club
> counts for a lot.

It is not an exaggeration. `compute_talent_score` gives endorsements up to
**45 of the 100 credibility points**:

```sql
least(30, v_verified_end * 10) + least(15, v_endorsements * 3)
```

And there has never been a way for the coach to do it. `getEndorsements` reads
them; nothing wrote them. Every endorsement in the product came from the seed
file. The advice was correct, prominent, worth a fifth of the whole score, and
impossible to act on.

`20260909000003_endorsements.sql` adds the write path. Two things had to be
fixed on the way, and both only started mattering the moment anybody could
actually reach the table.

### 2. `endorser_role` was whatever the client said it was

The insert policy was:

```sql
with check (endorser_id = auth.uid())
```

That constrains **who you claim to be** and nothing else about the row.
`endorser_role` was a plain column, so a client could write `'coach'` for
itself — and that column is precisely what the score reads to decide whether an
endorsement is an expert one:

```sql
count(*) filter (where e.endorser_role in ('coach','scout','club','federation'))
```

The join on `eu.is_verified` is what has been holding the line, and it holds it
well: an unverified account scores nothing whatever it claims. But that is one
condition away from a self-declared credential feeding a score, and a
self-declared credential is not a credential.

The role is now written by the server from `user_profiles.role`, and the column
is not writable by a client at all. The table follows the same shape as
everything added since 0904 — reads through RLS, writes through a function that
can enforce what a `with check` cannot express.

This is also why `private.handle_new_user` clamping `federation` and
`medical_partner` is load-bearing rather than tidiness: signup metadata is
written by the client, `federation` is one of the four expert roles, and
`endorse_athlete` reads that column. The demo seed assigns those two roles as
the service role afterwards, which is the path an administrator would use.

### 3. The same skill could be endorsed over and over

There was no unique constraint. `least(15, v_endorsements * 3)` counts rows, so
five copies of "Fast" from one coach was fifteen points, and enough copies of
anything reached the cap on both terms.

Now: one row per `(athlete, endorser, lower(btrim(skill)))`, enforced by a
unique index, so "Fast" and " fast " are one endorsement and endorsing again
edits the note instead of stacking. On top of that, six distinct skills per
endorser per athlete — a coach who genuinely rates somebody runs out of
distinct things to say long before six; a coach inflating a number does not.

The migration folds any existing duplicates first, keeping the oldest row of
each group and carrying a later note onto it, because the constraint would
otherwise refuse to build.

### 4. Where the button is

On the other person's profile, never on your own — endorsing is the one thing
on the Career tab you do to somebody else. On a second visit the action reads
"Edit" rather than "Endorse", because the row already exists.

The sheet lists what you have already said with a way to take each one back,
and the field below adds another. Withdrawing is the endorser's to do and only
theirs: an endorsement is a thing you said, so you can stop saying it, but the
athlete cannot delete an unflattering one and nobody can delete somebody
else's.

| Function | For |
|---|---|
| `endorse_athlete(athlete, skill, note)` | give one, or edit the one you gave |
| `withdraw_endorsement(id)` | take yours back |
| `my_endorsements_of(athlete)` | what the button and the sheet read |

Twelve assertions in `supabase/tests/functional.sql` cover it, including one
that drops to the `authenticated` role for a statement to prove a client cannot
insert directly — the suite otherwise runs as the superuser, and **a superuser
has every privilege regardless of what was revoked**, which is how a missing
REVOKE survives a green suite. The same trap as the RLS one in
[docs/21](21-meetups-and-translation.md) §11, from the other direction.

---

## Part two: the edges

The first three arrived as one report — "the right-hand margins are wrong" — and
none of them was in a margin.

### 5. A 3% breath on a full-width box

The create button floats above the tab bar, positioned `left: 0, right: 0` with
`alignItems: 'center'`, and breathes: a slow scale between 1 and 1.03. The
scale was on the positioning view.

That view is the width of the screen. Scaling a 414pt box by 3% makes it 426pt,
hanging six points past **both** edges. On a phone nothing shows for it. The web
build is a real document, so:

- the page becomes wider than the viewport
- the whole app can be dragged sideways under a finger
- a strip of bare page shows down the right-hand edge of **every** screen

Every margin in the app looks wrong at once, and the cause is nowhere near any
of them. Splitting it into two views — an outer one that positions, an inner one
that animates and is the width of the button — makes the same 3% grow a 56pt
circle by under a point, inside its own margin.

`tests/e2e/look.mjs` now measures `document.scrollWidth` against
`window.innerWidth` on every screen it visits, and names the widest offending
element when they differ. Nobody would find this one by reading the tab bar.

### 6. `Card padded={false}` plus `ListItem`

Each is right on its own and they are wrong together.

A card is unpadded so its dividers can run edge to edge, which leaves every row
inside it paying for its own margin. `ListItem` is flush because nearly all of
them live in a `Sheet` or a `SettingsGroup`, both of which already inset their
contents — padding it by default would push the text a third of the way across
the screen in twenty-four places.

Put the two together, as "Who looked at your profile" and the team fan list did,
and the avatar sits flat against the border while the card's own rounded corner
clips it. `ListItem` now takes `inset` for exactly that case, and
`tests/e2e/cards.mjs` measures every card-like surface in the built app against
everything drawn inside it, so the next instance is found rather than reported.

### 7. Two console warnings nobody could act on

The web build printed these on every launch:

```
[expo-notifications] Listening to push token changes is not yet fully
supported on web. Adding a listener will have no effect.

Animated: `useNativeDriver` is not supported because the native animated
module is missing. Falling back to JS-based animation.
```

Both describe correct behaviour and ask for nothing, which is the worst kind:
they train everybody reading the console to skim past warnings, and the next
one will be real.

The first could not be fixed by a guard. `expo-notifications` subscribes to
device push token changes **at module scope**, in
`DevicePushTokenAutoRegistration.fx`, so it warns the moment the module is
evaluated — long before any `Platform.OS === 'web'` check inside a function
could run. The only fix is not to import it on web, so everything that touches
it now goes through `lib/push.ts`, which has a `push.web.ts` twin that Metro
resolves first. That takes the notifications module and its abort-controller
polyfill out of the web bundle entirely, where neither could ever have worked:
**3.7 MB → 3.5 MB.**

It also retired a duplicate. `api.settings.ts` carried a push-permission bridge
written while the hook was still being built — a `require` of the hook with a
fallback that imported `expo-notifications` directly. The hook has existed for
some time; the fallback had quietly become a second copy of the rules with a
different failure default (it reported "granted" on error so the settings screen
would not nag, where the hook reported "denied"). One implementation now, and
the screen asks `pushSupported` instead, so it leaves the card out on web rather
than offering to turn on something a browser cannot receive.

The second was sixty-five literal `useNativeDriver: true`s. There is no native
animated module in a browser, and the JS fallback the warning describes is
exactly what we want there, so the flag is now `NATIVE_DRIVER` from
`lib/motion.ts` — `Platform.OS !== 'web'`. Nothing changes on a phone. The ten
places that need `useNativeDriver: false` because they animate a layout or
colour property stay written out as `false`, so the reason stays visible where
it applies.

`tests/e2e/console.mjs` signs in, walks five screens and fails on any warning or
error the app is responsible for. It currently reports **clean**. It also fails
outright if `expo-notifications` reappears in the web bundle, because that
particular regression is invisible: nothing breaks except the console.

### 8. What the audit still reports, and should

The `SegmentedControl` shows a 4px gutter around its active thumb. That is the
control's design — a pill inside a track — not a card edge, and the audit names
it every run rather than special-casing it, because a threshold with exceptions
baked in stops being a measurement.

---

## 9. The demo data this needed

Endorsements are given by one account to another, and follower lists are lists
of other people, so both were untestable against a seed with four roles in it.
`supabase/seeds/demo.sql` now carries **one account per role** — including the
scout, federation and medical partner that sign-up does not offer — and a follow
graph thick enough that Followers and Following are lists rather than empty
states. `start.sh` prints the lot.

The recorder's tour visits the follower screens too. It did not before, which is
why the preview answered every follower list with "You're not following anyone
yet" — a gap in the recording that read exactly like a bug in the app.

---

## 10. Related documents

- [11 — Talent Score](11-talent-score.md) — the 45 points this feature feeds
- [20 — Colour and motion](20-colour-and-motion.md) — the button that breathes
- [21 — Meetups and translation](21-meetups-and-translation.md) — the superuser trap, from the RLS side
- [14 — Local Development](14-local-development.md) — the seed and the harness
- [18 — Preview build](18-preview-build.md) — what the recorder captures
