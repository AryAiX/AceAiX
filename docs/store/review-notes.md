# Notes for the reviewer — AceAiX

Paste into **App Store Connect → App Review Information → Notes** and into
**Play Console → App content → App access**. Put `layla.demo@aceaix.com` /
`AceAiX-Demo-2026` in the sign-in fields as well.

---

AceAiX is a sports talent-discovery app. Athletes build a sporting profile, receive
an AI Talent Score out of 100, post highlight clips, and are found by verified
coaches and clubs who post trials and scholarships.

**Minimum age is 13, enforced in the database.** A date of birth under 13 is refused
by a server-side rule, so a modified client cannot create the account. Accounts aged
13–17 are treated as minors: hidden from discovery until a parent or guardian
approves them, and contactable only by verified adult professionals.

## Demo accounts

Every account below uses the password **`AceAiX-Demo-2026`**.

| Account | Role | What to look at |
|---|---|---|
| `layla.demo@aceaix.com` | Athlete, 19 | Start here. Complete profile, Talent Score with its five-pillar breakdown, highlight clips, feed. |
| `marco.demo@aceaix.com` | Coach, **verified** | The recruiter side: Discover, search filters, an opportunity with applicants, and messaging an athlete. |
| `academy.demo@aceaix.com` | Club, **verified** | Al Jadaf Academy — posts trials and scholarships, and reviews applications. |
| `parent.demo@aceaix.com` | Guardian | Settings → Athletes you look after shows a child (Mina, 14) waiting for approval. For a granted consent this screen also lists who the young person is talking to — names and message counts only, never the messages. |
| `hana.demo@aceaix.com` | Coach, **not verified** | Use this to see the minor protections refuse an action. |
| `mina.demo@aceaix.com` | Athlete, 14, **consent pending** | Her profile is hidden from search because no guardian has approved it yet. She is also absent from the leaderboard and from name search, not only from the recruiter filter. |
| `omar.demo@aceaix.com` / `yusuf.demo@aceaix.com` | Athletes, 17 and 15, consent granted | Minors who are discoverable, with an age band shown instead of an age — the exact age is not sent to the client at all. |

## Where the required controls are

- **Report** — tap the ⋯ on any post, comment, profile, opportunity or conversation.
  The reason list always includes **Child safety**. A child-safety report hides the
  content immediately, before a human reviews it.
- **Block** — the same ⋯ menu, on a profile or in a chat. Immediate and mutual.
  Managed at Settings → Privacy & safety → Blocked accounts.
- **Delete account** — Settings → Account → Delete account. Type `DELETE`, then
  confirm. Permanent, and it removes the photos and clips the account uploaded as
  well as its data.
- **Download my data** — Settings → Account → Download my data. Writes a JSON export.
- **Legal documents** — Settings → About: Community Guidelines, Terms of Service,
  Privacy Policy, Child Safety Standards. All four are shipped inside the binary and
  readable with no account and no network.
- **Who can contact you** — Settings → Privacy. A minor's inbox cannot be set to
  "everyone"; the server holds it at "verified coaches and clubs" or stricter.

## How guardian consent works, and how to see it

A 13–17 athlete enters a parent or guardian's name and email during onboarding. We
email that guardian a one-time link, valid for 14 days, to a page where they approve
or refuse **three things separately**: appearing in searches, receiving messages, and
sharing photos and clips. Until consent is granted, the profile does not appear in
discovery and no adult can open a conversation with it. Either side can withdraw
consent at any time, and the profile is hidden again immediately.

The seed leaves one minor — **Mina, 14** — with consent **pending**, so the blocked
state is visible:

1. Sign in as `marco.demo@aceaix.com` (verified coach) and search Discover. Omar and
   Yusuf appear; **Mina does not**, because her guardian has not approved her. The
   same is true of the leaderboard on Discover and of searching for her by name —
   the gate is applied by the database in every one of those queries, not by the
   screen.
2. Sign in as `mina.demo@aceaix.com` and open Settings → Parent or guardian to see
   the pending request and the "resend the email" action.
3. Sign in as `parent.demo@aceaix.com` and open Settings → Athletes you look after to
   see Mina listed as awaiting approval. A guardian account is linked to a consent by
   the email address the request was sent to, so a parent who signs up after
   approving still sees the child they approved.
4. To see the guardian's approval page itself, open:
   `<CONSENT_PAGE_URL>?token=demo-token-mina-0000000000000000000000`
   Approving on that page makes Mina discoverable, which is the behaviour under test.

> **OPEN — before pasting, replace `<CONSENT_PAGE_URL>` with the deployed function
> URL: `https://<project-ref>.supabase.co/functions/v1/guardian-consent`.**

## Seeing a minor protection refuse an action

Sign in as `hana.demo@aceaix.com` (a coach who is **not** verified) and open Yusuf's
profile (15, consent granted). The Message button carries a padlock; tapping it
explains that only verified coaches and clubs can start a conversation with an
under-18 athlete. The same attempt as `marco.demo@aceaix.com` (verified) succeeds.
The rule is in the database (`private.can_message`), not in the client.

## Three things that often get asked

- **A minor's age is never sent to another user.** For any account under 18 the
  server returns an age band — "Age 13–15" — and never the date of birth or the age
  in years. A recruiter can still filter by age range; that filter is evaluated on
  the server against the real date of birth, which is not returned. Adults do show an
  exact age.
- **No location is collected.** The app has no location permission on either
  platform; GPS permissions are explicitly blocked in the Android manifest. The only
  location on a profile is a city the user types and can leave blank.
- **No purchases, no ads.** AceAiX is free for athletes and contains no billing or
  advertising SDK. Sign-in is email and password only — there is no third-party or
  social login, so Sign in with Apple does not apply.

Questions during review: **support@aceaix.com**. Child safety: **safety@aceaix.com**.

AryAiX · Dilan Tower, Al Jadaf, Dubai, United Arab Emirates · Trade Licence 1610838
