# 29 — Sponsorship

> Athletes ask for backing, sponsors offer it, and each side can find and answer the other.
> Source of truth: `supabase/migrations/20261008000001_sponsor_role.sql` and
> `20261008000002_sponsorship.sql`. Client: `mobile/app/sponsorship/`,
> `mobile/components/sponsorship/`, `mobile/lib/api.sponsorship.ts`, `mobile/lib/sponsorship.ts`.

---

## 1. The pieces

| Thing | Who makes it | What it is |
|-------|--------------|------------|
| **Request** | an athlete | "I need 4,000 AED for the Dubai Open in March": title, event, date, place, amount, what is needed, what the sponsor gets back. Up to three open at a time. |
| **Call** | a verified sponsor | "We back five individual-sport athletes in 2027": what is offered, a range, places, a deadline, and whether under-18s may apply. Up to ten open. |
| **Deal** | either side | A sponsor's **offer** on a request, or an athlete's **application** to a call. The other side accepts or declines. |

**No money moves through AceAiX.** An accepted deal means "we agree to talk". The contract and the
payment happen outside the app, and every screen that sends or accepts a deal says so.

## 2. The sponsor role

`sponsor` is a new value of `user_role`, offered at sign-up beside athlete, coach, club and guardian.
A sponsor gets a `sponsor_profiles` row (brand name, industry, website, about, sports, what they
offer, a private budget range).

The enum value is added in its own migration, because Postgres cannot use a new enum value in the
transaction that created it.

Verification uses the existing flow (`verification_requests`, type `sponsor`, approved in the admin
portal). **Unverified, a sponsor can** fill in the brand profile and read who is asking.
**They cannot** see amounts, post a call, make an offer or accept an application.

## 3. The rules

1. Only a **verified** sponsor posts calls and makes offers. Calls from a sponsor who loses
   verification disappear from the feed.
2. A sponsor can offer only on an **open request**. An athlete who has not said they are looking is
   not sent money offers.
3. A **minor** may ask, or apply, only while a guardian's consent carries the new `sponsorship`
   scope (`guardian_consents.allow_sponsorship`, a fifth box on the consent page, off unless
   ticked). Without it the request cannot be created; if the scope is withdrawn the request stops
   being listed and pending deals are closed.
4. A minor only sees calls marked **open to under-18s**.
5. Every offer to a minor, every application by one, and every answer is also sent to guardians who
   hold an account. A linked guardian can accept or decline an offer for the minor, and can decline
   an application the minor sent.
6. A sponsor is **not** one of the roles that may open a conversation with a minor
   (`private.is_verified_adult` is unchanged). The deal is the channel.
7. The **amount** an athlete asks for is shown to verified sponsors, the athlete, their guardians
   and admins. Everyone else who can see the profile sees that the athlete is looking, and for what.
8. The **list of seekers** is for sponsors (and admins). A coach or a club cannot browse it.
9. Blocks hide each side from the other everywhere: seekers, calls, the directory, the profile card.
10. Nothing is written by a client. Every table refuses direct writes; the RPCs check the above.

## 4. Where it lives in the app

- **Discover → Sponsors** (athletes, guardians, coaches, clubs, scouts): a card for the athlete's
  own status ("Ask for sponsorship" / "You are listed"), open calls with an Apply button, and the
  sponsor directory. The search bar filters calls and sponsors.
- **Discover, for a sponsor**: opens on "Seeking sponsors" — the requests, with search, sport chips
  and "Make an offer" — with Explore as the second tab.
- **The portal** (`/sponsorship`): one screen, three readers.
  - Athlete: what is waiting for an answer, my requests (edit, mark funded, close, reopen), and
    everything sent and answered.
  - Sponsor: the brand card, what is waiting, my calls (edit, close, reopen), everything else.
  - Guardian: offers and applications for the young people they are linked to.
- **Profiles**: an athlete's profile shows "Seeking sponsorship" with the open requests, and an
  offer button for a verified sponsor. A sponsor's profile shows the brand and its open calls.
- **Settings → Parent or guardian**: the scope is listed, and a minor can ask for it to be added.
- **Notifications**: `sponsorship_offer`, `sponsorship_application`, `sponsorship_response`, on the
  existing "opportunity" channel; each opens the portal.

## 5. Functions

| RPC | Caller |
|-----|--------|
| `save_sponsor_profile(jsonb)` | sponsor |
| `save_sponsorship_request(id, jsonb)`, `set_sponsorship_request_status(id, status)` | athlete |
| `save_sponsor_call(id, jsonb)`, `set_sponsor_call_active(id, bool)` | verified sponsor |
| `sponsor_make_offer(request, message, amount)` | verified sponsor |
| `apply_to_sponsor_call(call, message)` | athlete |
| `respond_sponsorship(deal, accept)`, `withdraw_sponsorship(deal)` | the other side / the opener |
| `sponsorship_seekers(...)` | sponsor |
| `sponsor_calls_feed(...)`, `sponsor_directory(...)`, `sponsorship_card(user)` | anyone signed in |
| `my_sponsorship()` | anyone signed in: the portal in one read |

Tags (needs, gives, offers) are allow-listed in the database; `mobile/lib/sponsorship.ts` mirrors
the lists.

## 6. A fix that came with it

`private.handle_new_user` listed the roles sign-up could **not** claim. `super_admin` was added to
the enum later and never to that list, so sign-up metadata of `{"role":"super_admin"}` produced a
super admin. The trigger now lists the roles sign-up **can** claim. There is a test for it. This
hole is on `main` today; this migration closes it.

## 7. Tests

- `supabase/tests/functional.sql` → "sponsorship": 49 assertions (sign-up, brand profile, requests,
  who sees what, offers, calls, applications, every minor rule, blocks, closing, lost verification).
- `mobile/tests/unit/sponsorship.test.ts`: amounts, ranges, form parsing, deal headings.
- `mobile/tests/e2e/pipelines.mjs`: eight steps against the demo accounts.

Demo accounts: `falcon.demo@aceaix.com` (verified sponsor) and `peak.demo@aceaix.com` (unverified).

## 8. Open items

1. **Legal.** Sponsorship of minors, and advertising rules by category (energy drinks, betting,
   alcohol), differ by country. Nothing here restricts a sponsor's industry. Needs a lawyer before
   launch, and probably an industry allow-list for calls open to under-18s.
2. **Guardians without an account** are not told about offers. Only linked accounts get
   notifications; an e-mail to the consent address is the fix.
3. A minor can accept an offer themselves once the scope is granted. Requiring the guardian's own
   tap would be safer, but only works for guardians with accounts.
4. A minor can still start a conversation with a verified adult they follow (an existing rule), and
   the adult can then reply. That now includes sponsors.
5. The admin portal needs "sponsor" in its verification filter, and a view of deals for disputes.
6. Amounts are free-form whole numbers in AED. Other currencies are stored but there is no picker.
7. No payments, contracts or escrow. If AceAiX wants a fee on deals, that is a separate project.
