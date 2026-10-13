# 30 — Booking a coach

> A coach says they are taking students, lists what they offer and opens times. An athlete finds
> them, sees the free places and books one. The coach sees every booking in a calendar.
> Source of truth: `supabase/migrations/20261009000001_coach_booking.sql`. Client:
> `mobile/app/coaching/`, `mobile/components/coaching/`, `mobile/lib/api.coaching.ts`,
> `mobile/lib/coaching.ts`.

---

## 1. The pieces

| Table | What it holds |
|-------|---------------|
| `coaching_settings` | "I am taking students", and one line about the coaching |
| `coaching_services` | What can be booked: kind, length, places, price, where |
| `coaching_slots` | When: one row per bookable time |
| `coaching_bookings` | Who: one row per person per slot |

**Kinds:** a one-to-one **session**, a **consultation**, or a **class**. Only a class has more than
one place (2–100); the database forces the other two to one.

**Where:**

| Mode | Meaning |
|------|---------|
| `fixed` | The coach names the venue. Required. |
| `flexible` | The athlete names the place when booking. Required then. |
| `online` | No place; the coach sends a link. |

The place is copied onto the booking, so a later edit to the service does not move a session that
is already booked.

**A booking is confirmed at once.** The open calendar is the coach's standing yes. Either side can
cancel, and the other is told. **No money moves through AceAiX**: the price is shown so nobody is
surprised, and is paid to the coach directly.

## 2. The rules

1. Only a `coach` account (an adult) can take students, add services or open times.
2. A coach who is not taking students shows no calendar and cannot be booked.
3. The last place goes to one person: the slot row is locked while places are counted.
4. A coach cannot be in two places: a new time that overlaps one of their own open times is skipped.
5. Other people see **how many places are left**, never who took them. Names, notes and the chosen
   place are for the coach, the athlete, their guardian and admins.
6. A **minor** can book only a **verified** coach, and only while a guardian's consent carries the
   new `bookings` scope (`guardian_consents.allow_bookings`, a sixth box, off unless ticked). A
   minor is never listed an unverified coach.
7. Guardians with an account are told about every booking and cancellation, see the bookings, and
   can cancel one. If the scope is withdrawn, the minor's bookings ahead are cancelled.
8. A block in either direction hides the calendar and the listing, and refuses the booking.
9. Retiring a service keeps what is already booked; empty future times are cancelled.
10. Nothing is written by a client. Every table refuses direct writes.

## 3. Where it lives in the app

- **Coach's profile** (as a visitor sees it): a Coaching card with "Taking students", what is
  offered, the next free time and **Book a session**.
- **Booking page** (`/coaching/<coach id>`): choose what, choose a day, choose a time, name the
  place if it is flexible, add a note, book. A refusal (not taking students, guardian needed,
  unverified coach) is explained before the form.
- **Discover → Coaches**: a "Taking students" chip lists bookable coaches, soonest free time first,
  with a link to "My sessions".
- **Coaching screen** (`/coaching`), reached from the profile:
  - **Coach:** the "Taking students" switch and headline; services (add, edit, stop offering, open
    times); the calendar, as a strip of days with the number of bookings on each, and under it each
    time with who is coming, their note and their chosen place. A time can be cancelled.
  - **Everyone:** sessions coming up (cancel), and earlier or cancelled ones.
  - **Guardian:** the same list for the young people they are linked to.
- **Open times** (`/coaching/slots`): tick days in the next two weeks, tick start times (every half
  hour, 06:00–21:30), optionally repeat weekly for 2, 4 or 8 weeks.
- **Settings → Parent or guardian**: the scope is listed, and a minor can ask for it to be added.
- **Notifications**: `coaching_booked`, `coaching_cancelled`; each opens the Coaching screen.

Times are stored as instants and shown in the phone's own time zone.

## 4. Functions

| RPC | Caller |
|-----|--------|
| `set_coaching_status(accepting, headline)` | coach |
| `save_coaching_service(id, jsonb)`, `set_coaching_service_active(id, bool)` | coach |
| `add_coaching_slots(service, starts[])` → count added | coach |
| `cancel_coaching_slot(slot)` | coach |
| `coach_booking_page(coach)` | anyone signed in |
| `book_coaching_slot(slot, note, location)` | anyone the gate allows |
| `cancel_coaching_booking(booking)` | the athlete, the coach, a linked guardian |
| `my_coaching()` | anyone signed in: calendar and bookings in one read |
| `bookable_coaches(query, limit)` | anyone signed in |

`private.coaching_gate(coach)` is the one answer to "may this viewer book this coach", used by the
page and by the booking itself.

## 5. Tests

- `supabase/tests/functional.sql` → "booking a coach": 37 assertions.
- `mobile/tests/unit/coaching.test.ts`: days, grouping, building times, places.
- `mobile/tests/e2e/pipelines.mjs`: seven steps against the demo accounts.

Demo: `marco.demo@aceaix.com` is taking students with three services and two weeks of times;
`layla.demo@aceaix.com` has two sessions booked.

## 6. Open items

1. **No payment, deposit or no-show rule.** A coach who needs a deposit has to arrange it.
2. **No cancellation window.** Either side can cancel up to the start time.
3. **No reminders.** A push the evening before needs a scheduled job.
4. **Guardians without an account** are not told. An e-mail to the consent address is the fix.
5. **Recurring availability** is "repeat these times weekly for N weeks", created up front. There
   is no standing weekly template that keeps rolling.
6. **Time zones.** A coach and an athlete in different zones each see their own clock. The booking
   page does not say so.
7. **Coaches, clubs and scouts** find a coach through their profile; the "Taking students" list is
   on the athlete's side of Discover only.
8. **Safeguarding of in-person sessions with minors** (venue rules, a second adult, DBS-style
   checks) is policy, not software. Worth a lawyer's and a safeguarding lead's review before launch.
