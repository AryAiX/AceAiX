# 25 — The launch waitlist

> A form that collects email addresses is a form that collects a liability.
> Most of this document is about the second half of that sentence.

---

## 1. What it is

One form, in the closing section of the marketing site.

It went through three shapes, and the last one is the point. It began as "be
told the day it lands": a name, an email, two checkboxes, **18+ only** for the
reasons in §4. Then it grew a page of its own at `/early-access` that asked
more and admitted minors through a guardian. Now there is no separate page —
that fuller form simply *is* the site's call to action, standing where the App
Store and Google Play buttons used to be.

That last move was not a simplification for its own sake. Those buttons led to
listings that do not exist until 1 October, so the page's most prominent
control pointed at two dead pages while the only thing a visitor could actually
do sat beneath it looking like an afterthought. The buttons are not deleted —
they are `hidden`, and the countdown reveals them and retires the form the
moment the date passes.

The form asks role (athlete, parent, coach, club, scout), first name, sport,
country, age band and email. Under-18s are welcome, because a sign-up form for
a youth sports app that turns away everybody under eighteen turns away most of
the demand it exists to measure. A minor signs up with a parent's address, and
that is the address that is stored and written to; the child's own is never
collected — choosing "I'm under 18" **relabels the existing field** rather than
adding a second one, since two boxes invite a child to fill in both.

It puts a row in `public.waitlist`, sends a confirmation link, and — once that
link is clicked — pushes the address to whichever campaign tool is configured.
Or it does the much simpler thing in §2, which is what happens if nothing is
set up at all.

What it offers is **"get in on day one"**, never "get a discount". The app is
free; the line directly below the form says so. A discount on a free product is
a promise that cannot be kept, and it is the same category of error as the
"12,400+ Athletes" the site used to claim before anybody had signed up. The
same test applies to the copy that replaced it: "one email when AceAiX opens,
and nothing before it" is a promise, and the unsubscribe link and the absence
of any analytics script on the page are what make it one that can be kept.

---

## 2. Two backends, and neither is a placeholder

The form can post to either of two places, chosen by one line at the top of
`site/index.html`:

```html
<script>window.ACEAIX_NOTIFY_URL = '';</script>
```

**Empty: Netlify Forms.** The page posts a normal urlencoded form to its own
path and Netlify captures it as `early-access`. Nothing is deployed, nothing is configured, no
database exists. Sign-ups appear under **Forms** in the site dashboard and
Netlify emails each one to the addresses listed under *Form notifications*.
This is what runs the moment the folder is dragged onto Netlify.

**Filled in: the edge function.** Everything the rest of this document
describes.

This was not the original design. The first version said *"the sign-up is not
connected yet"* when the URL was empty, on the reasoning in §3 — that a form
which silently swallows addresses is worse than one that admits it is broken.
That reasoning is still right about *silence*; it was wrong to conclude that
the only honest alternative was a dead form. Netlify Forms is a real backend.
It stores the submission, it emails it, and it exports to CSV. What it cannot
do is the part that needs a database.

So the split is:

|                                            | Netlify Forms | Edge function |
|--------------------------------------------|---------------|---------------|
| Address is stored                          | yes           | yes           |
| Somebody is told about it                  | yes           | yes           |
| Address is proved real (double opt-in)     | **no**        | yes           |
| A minor's row is *refused* without a guardian's address | **no** | yes |
| Rate limited                                | Netlify's own spam filter | per IP, 5/hour |
| Pushed to the campaign tool                | by hand       | on confirmation |

The consequences of the two "no"s are worth stating plainly rather than
leaving in a table. On the Netlify route the form still asks whether the person
is under eighteen and labels the submission
`UNDER 18 — the address above is a parent or guardian`, but that label is a
courtesy to whoever reads the email, not an enforcement: nothing stops a
fifteen-year-old typing their own address and ticking "I'm under 18". The
database constraint in `20260915000001_waitlist_guardian_and_segments.sql` is
what actually makes that impossible, and it is not in play until the URL is
filled in.

Two things follow from that, and both are already in the code:

- **The confirmation wording differs by route.** Only the edge function sends
  a confirmation email, so only it says "check your inbox and click the link".
  The Netlify route says "you are on the list". Telling somebody to click a
  link that will never arrive is a small lie that reads, to them, as a sign-up
  that failed.
- **Netlify parses the form markup at deploy time**, not at submit time. The
  `name`, `data-netlify="true"` and hidden `form-name` on each `<form>`, and a
  `name` on every field, are load-bearing. An edit that drops one stops the
  capture **silently** — the page still says thank you, and nothing is stored.
  `site/index.html` carries a comment saying so above the form tag, and the
  deploy-time markup is asserted in `mobile/tests/unit/siteForms.test.ts`.

Switching is one line and it is reversible. The simple route today does not
close the door on the strict one later — which is the point, because the
strict one is what §4 argues is eventually necessary.

One consequence of there being a single page now: the form's Netlify name is
`early-access`, not the old `launch-notify`. A site deployed before this change
has submissions filed under the old name; they are not lost, but they are in a
different list in the dashboard, and the notification rule has to be set again
on the new one.

---

## 3. Why there is an edge function in the middle

The obvious implementation is an `insert` straight from the page with the anon
key. It is two lines and it is wrong, for one reason that leads to four:

**The anon key is public.** It is in the source of every page that talks to
Supabase. Anybody can read it, and anybody can use it.

So a table that `anon` may insert into is a table anybody may insert into, at
any rate, with any content. And if a later migration ever loosens the select
side — which is exactly the kind of thing that happens by accident, and has
happened in this repository twice — the entire mailing list becomes
downloadable by anybody who views source.

`public.waitlist` therefore grants **nothing** to `anon` and nothing to
`authenticated`: no select, no insert, no update, no delete, and no policy
either role can satisfy. The single policy on the table is a read for admins,
via `private.is_admin()`.

The only door is `supabase/functions/waitlist-subscribe`, which holds the
service-role key server-side. Three things follow that a client cannot do:

- **a rate limit an attacker cannot skip** — five sign-ups per IP per hour
- **a secret for the campaign tool** — a Brevo key in the page is a Brevo key
  in everybody's hands
- **a confirmation email**, which is the only thing that makes an address real

Verified over real HTTP, not just in SQL:

```
anon  GET  /rest/v1/waitlist          → 401  permission denied for table waitlist
anon  POST /rest/v1/waitlist          → 401
anon  POST /rest/v1/rpc/confirm_waitlist → 401
```

---

## 4. The 18+ gate, and why it is not optional

**AceAiX is a 13+ product.** Minors will fill in this form — that is not a risk,
it is a certainty, because the whole site is about young athletes.

Collecting a child's name and email for marketing is a materially different
legal question from collecting an adult's, under both GDPR (the site is in
seven languages and reachable from the EU) and the UAE PDPL. More to the point,
it would contradict the strongest promise the product makes:
[docs/12](12-youth-safety.md) is built on a minor being invisible until a
guardian consents. A marketing list quietly containing fourteen-year-olds makes
that promise partly untrue.

So the list is 18+, and that is enforced in three places, because a checkbox is
not enforcement:

| Where | What it does |
|---|---|
| the page | an unticked "I am 18 or over" box, and a note pointing under-18s at the app |
| the function | rejects `is_adult !== true` with `hint: "under_18"` |
| the database | `check (is_adult)` — a row that does not assert it cannot exist |

The note matters as much as the gate. Under-18s are not turned away; they are
sent to the app, where a guardian approves the account through a real flow
rather than a tickbox.

---

## 5. Double opt-in

Nothing is emailed to an address until somebody clicks the link sent to it.
`status` goes `pending → confirmed`, and **only `confirmed` rows reach the
campaign tool.**

This is not ceremony. It is the only defence against somebody typing in a
colleague's address, and it is what makes the consent record mean anything.

`consent_text` stores the exact sentence shown at the time, because "they
agreed" is worth nothing without "to what" — and that sentence will be
reworded. The page sends the wording it actually displayed rather than a
constant, so the two cannot drift.

`unsubscribed` rows are kept rather than deleted, so a later import cannot
silently resurrect somebody who asked to be left alone.

---

## 6. The campaign tool

`syncToProvider()` is one function with **Brevo and Mailchimp both written**,
and neither required. With no key set it answers `provider: "none"`, the row is
still saved, the sign-up still succeeds, and `synced_at` stays null so the
back-fill knows exactly which rows never reached the tool.

Same shape as `translate` in [docs/21](21-meetups-and-translation.md), for the
same reason: which vendor gets the contract is a commercial decision, and it
should not be able to block a deploy.

**Brevo is the better default here.** Its free tier does not cap contacts,
it is an EU company — which is the easier answer when the question is GDPR —
and it costs less at the volumes this will see. Mailchimp is written because it
is the one most people have already used.

Turning it on:

```
BREVO_API_KEY=...        BREVO_LIST_ID=...
# or
MAILCHIMP_API_KEY=...    MAILCHIMP_LIST_ID=...
```

One environment variable. No site deploy, no migration, no client release.

---

## 7. Deploying it

```bash
supabase functions deploy waitlist-subscribe
supabase secrets set SITE_URL=https://aceaix.com
supabase secrets set WAITLIST_IP_PEPPER="$(openssl rand -hex 32)"
```

**`verify_jwt = false` for this function is load-bearing**, and it is set in
`supabase/config.toml`. Supabase verifies a JWT *before* any function code runs,
and the default is on — so with that block missing, every sign-up comes back
401, and it does so only once deployed, never locally. That is a bad afternoon
waiting to happen.

It does not leave the endpoint unguarded. It moves the guarding into the
function, where it has to be anyway: the honeypot, the per-IP rate limit, the
18+ check and the email validation all run there, and a JWT would prove nothing
about a stranger signing up for a mailing list. The service-role key stays
server-side either way. Every *other* function in the project keeps
`verify_jwt = true`, because they are called by a signed-in app.

Then paste the function URL into the **one** marked place in
`site/index.html` — a `<script>` block just after `<body>`, with a comment
block above it saying what to put there.

Left empty, the form tells the visitor it is not connected rather than
pretending to work. That is deliberate: a form that silently swallows addresses
is indistinguishable from one that works, right up until launch day when the
list is empty.

`WAITLIST_IP_PEPPER` is optional and worth setting. Without it no IP is stored
at all and the rate limit does nothing; with it, the column holds a salted hash
— enough to count repeats, useless as a record of who was where.

---

## 8. Who hears about a sign-up

Set `WAITLIST_NOTIFY_EMAIL` and each sign-up is forwarded to whoever owns
marketing — name, email address, role, sport, country — so the list reaches a
person without anybody opening the database.

```bash
supabase secrets set WAITLIST_NOTIFY_EMAIL=masi.k@aryaix.com
```

Two details in that mail are deliberate and should stay:

- **A minor's row is labelled as a guardian's address**, in capitals, rather
  than presented as the athlete's. `Reply-To` is set to the same address. The
  failure this prevents is somebody replying to what they think is a
  fifteen-year-old and reaching a parent instead — or worse, assuming the
  reverse.
- **The unsubscribe token is never included.** Anybody who is forwarded one of
  these mails would otherwise be able to unsubscribe the person it is about.

It rides on Brevo's transactional API, so it needs no second vendor and does
nothing until Brevo is configured. It is fire-and-forget and silent on failure
— **a sign-up must never fail because a notification could not be sent**, and
the person signing up has no idea it exists. Verified by pointing it at a
deliberately invalid key: both the adult and guardian sign-ups returned `ok`,
both rows landed, and the failures appeared only in the log.

One consequence worth stating plainly, since it is a choice rather than an
oversight: these mails put contact details into an inbox, where a copy cannot
be revoked the way a Brevo seat or a Supabase login can. That is the trade
being made for reach.

## 9. Reading the list

Admins, in the console or through the API, via the one policy on the table.
Nobody needs to handle a service key to see who signed up:

```sql
select email, first_name, status, created_at
  from public.waitlist
 where status = 'confirmed'
 order by created_at desc;
```

---

## 10. What is checked

Twelve assertions in `supabase/tests/functional.sql`, under "the waitlist".
Every one of them **drops role for the statement it makes** — the suite runs as
the superuser, which bypasses row-level security *and* ignores revoked
privileges, so an assertion written without `set local role` would pass against
a table that is wide open. That is not hypothetical; it is how the `challenges`
read policies went untested for a month (docs/21).

The four that matter most:

- anon cannot read the list
- anon cannot write to it
- anon cannot call `confirm_waitlist` with a guessed token
- a signed-in **non-admin** sees an empty table — which does not raise, and so
  would never look like a bug if it were wrong

The last one is the shape to watch for. An ordinary athlete downloading the
mailing list would produce no error anywhere.

The two RPCs live in `public` rather than `private` for a mechanical reason:
PostgREST exposes only `public`, so a `private` function cannot be reached by
`rpc()` at all. Being in `public` is exactly why `EXECUTE` has to be revoked
explicitly — PostgreSQL grants it to `PUBLIC` on every new function, and `anon`
inherits `PUBLIC`. Three functions shipped callable by any visitor this way
once already.

---

## 11. Still outstanding

- **No confirmation email is sent yet.** The row is created and the token
  exists, but nothing delivers it until a campaign provider is configured —
  so until then every row sits at `pending` and the list cannot be mailed.
  `confirm_sent_at` is null on exactly those rows. It is a decision, not code.

  This stopped being *the* blocker for 1 October when the Netlify route was
  added (§2): a site that ships with `ACEAIX_NOTIFY_URL` empty collects
  sign-ups from the minute it is deployed, with no Supabase project, no
  migration and no provider key. What is still true is that the Netlify route
  does not prove an address is real and does not enforce the guardian rule, so
  this remains the blocker for **the edge-function route specifically** — and
  that route is the one that has to be live before anything is mailed to a
  list containing minors' guardians.
- **No admin screen.** The list is readable by SQL and by the API, but there is
  no page in `web/` that shows it.
- **No export.** Getting the list into the campaign tool by hand means a query
  and a CSV.
- **The site is not deployed from CI.** `site/` is now in the repository, but
  publishing it is still a manual drag-and-drop.

---

## 12. Related documents

- [12 — Youth safety](12-youth-safety.md) — why this list is 18+
- [21 — Meetups and translation](21-meetups-and-translation.md) — the provider boundary this copies, and the `private` schema trap
- [23 — Backend pipelines](23-backend-pipelines.md) — why a green SQL suite is not proof of a working path
