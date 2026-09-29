# AceAiX Weekly Report

**Week Ending:** September 28, 2026

**Focus:** Store sign-up was broken for every new user on 2.0.0. The crash, the confirmation link, and the QA findings behind them are fixed on `main` and in production config. The **2.0.1** binary is ready to submit; this report does not cover the store upload itself.

## Executive Summary

The App Store and Play build of **2.0.0** could not create accounts. Tapping Create account failed with **"Cannot read property 'origin' of undefined"** on both iPhone and Android. The same read also broke Forgot password. Simulator QA had missed it: the development build polyfills `window.location`, and a Release build does not.

The fix is merged (**PR #20**, `4fe1e7c`) and the marketing version is **2.0.1** (**PR #21**, `8673d5b`). Production auth, the three new migrations, and the redesigned auth emails are already live, so people still on 2.0.0 get a confirmation link that opens the app. Auto sign-in from that link ships only with 2.0.1.

Earlier in the same gap since the 7 September report: the tested Expo SDK 57 / V2 app was promoted to `main` (**PR #15**), saved-post authorization was hardened (**PR #16**), multi-role QA coverage landed (**PR #17**), and a user-flow QA pass closed Discover, feed, onboarding, and shortlist gaps (**PR #19**).

---

## Releases

| Channel | Package / host | Version | Outcome |
| --- | --- | --- | --- |
| Apple App Store / TestFlight | `com.aryaix.aceaix.athlete` | **2.0.0** live; **2.0.1** on `main` | 2.0.1 not submitted in this cycle. Another pass owns the store build. |
| Google Play | `com.aryaix.aceaix.athlete` | **2.0.0** live; **2.0.1** on `main` | Same. Remote version source will mint the next iOS build number and Android `versionCode` on the production EAS profile. |
| Production Supabase | `qrunflotvjygllgvdcvy` | Config + migrations, not an app binary | Allow list, three migrations, `brand` bucket, and nine auth email templates applied 28 Sep |
| Web | https://aceaix.com | Unchanged by this hotfix | Web sign-up goes through the `signup-user` Edge Function and never hit the crash |

---

## Stats (this week)

### Merged delivery since the 7 September report

| Item | Detail |
| --- | --- |
| PR #15 | Consolidate tested Expo SDK 57 / V2 release into `main` — merged 21 Sep |
| PR #16 | Harden saved-post mutation authorization — merged 21 Sep |
| PR #17 | Harden multi-role flows and expand QA coverage — merged 22 Sep |
| PR #19 | User-flow QA fixes (Discover, feed, onboarding, shortlist, career) — merged 27 Sep |
| PR #20 | Store sign-up crash, confirmation deep link, themed emails, QA findings — merged 28 Sep (`4fe1e7c`, 83 files, +2196 / −147) |
| PR #21 | Marketing version **2.0.0 → 2.0.1** — merged 28 Sep |

### What #20 fixed

| Defect | Where | What changed |
| --- | --- | --- |
| Create account crashes in a store build | Mobile auth | `authRedirect.ts` no longer reads `window.location.origin` on native. Dev builds had a polyfill; Release builds do not. Password reset used the same read. |
| Confirmation email opens the website | Supabase Auth + mobile | `aceaix://` was missing from the redirect allow list, so Supabase fell back to the Site URL. Allow list updated on dev and production. |
| Tapping the link dumped the user on Welcome | Mobile | The entry route exchanges the link's `?code=` for a session. A new user lands in onboarding already signed in. Opened on another device, the app says the email is confirmed and sends them to sign in. |
| Auth emails were default Supabase HTML | Supabase Auth | Nine templates rebuilt in the AceAiX palette (logo, gradient button, AryAiX footer). Generator: `tools/auth-emails/build.mjs`. Logo hosted in a public read-only `brand` bucket because neither website serves the mark. |
| First Name field takes ~1s to accept typing | Mobile sign-up | It is the first text field in the flow, so the tap paid for the first keyboard plus the Contacts lookup. The field now focuses as the step appears. |
| Initials sat high in the photo-step circle | Mobile avatar | `title` asked for a 32px line on a font whose natural line is 44px, so iOS cropped from the baseline. Line height now matches the circle. Measured on the simulator: glyph centre within 0.5pt of the circle centre. |
| Visitor score card spoke in the first person | Mobile profile | A visitor sees the other-person copy and does not see ranking or delta rows. |
| Deadline countdown used UTC and closed the deadline day early | Mobile | Count is local calendar days. The deadline day stays open until it ends. |
| Opportunity owner saw the applicant safety footnote | Mobile | Footnote renders for applicants only. |
| Guardian step re-sent a request that was already pending | Mobile onboarding | Unchanged pending consent is not requested again. |
| Score tips were English server text | Mobile, 7 locales | Tips are rendered from `lib/scoreTips.ts`. |
| RTL controls ignored direction | Mobile | Shared RTL helpers for chevrons, headers, and inputs. |
| Athletes were notified about their own application changes | Supabase | Status notices go to the other party. A re-apply notifies the poster. |
| Recomputing an unchanged Talent Score wiped the delta | Supabase | `previous_overall` moves only when the score actually changes. |

### Verification

- Release build on a physical iPhone: sign-up with a new address no longer crashes. Owner confirmed sign-up works, then reported the website redirect, which was fixed in the same change.
- Photo-step initials measured on the iOS simulator after the line-height change.
- `tsc`, eslint, and 1591 mobile unit tests clean before merge.
- GitHub CI on #20 and #21: source hygiene, web, mobile, backend, and the tested web deploy all passed.
- Web sign-up was not retested. It does not use this code path.

---

## Details

### Why the store build failed and the simulator did not

`passwordResetRedirect` and `emailConfirmationRedirect` took `window.location.origin` as a default argument. That expression runs as soon as the function is called, on every platform. React Native sets `global.window = global`, so `window` exists and `window.location` does not. The dev client polyfills `location` from the Metro URL. A Release or store bundle does not. Unit tests always passed an origin in, so they never evaluated the default.

The bug has been in the tree since 14 September (`994687e`) and shipped in the 20 September store commit (`a82c90e`).

### Confirmation link

Native sign-up asks Supabase to return the user to `aceaix://`. The production allow list only had `aceaix://reset-password` and `https://aceaix.com/reset-password`. Anything else is replaced with the Site URL, which is why the email opened aceaix.com (and dev.aceaix.com against the dev project).

Production allow list now:

`aceaix://`, `aceaix://reset-password`, `https://aceaix.com/`, `https://aceaix.com/reset-password`, `https://www.aceaix.com/`, `https://www.aceaix.com/reset-password`

People on the current store build get an app link from this change alone. They still sign in by hand. 2.0.1 is what signs them in from the tap.

### Production database

Applied and recorded in `supabase_migrations.schema_migrations` on 28 September:

| Migration | Effect |
| --- | --- |
| `20260927000001` | Talent Score keeps `previous_overall` when a recompute does not change the score |
| `20260927000002` | Application notices go to the other party; a re-apply notifies the poster |
| `20260928000001` | Public read-only `brand` bucket for the email logo |

### Also since 7 September

- **PR #15** brought the tested Expo SDK 57 app onto `main`, kept the reviewed auth, accessibility, account-deletion, and challenge-gating fixes, and split preview deploys (`dev.aceaix.com`) from production (`aceaix.com`).
- **PR #16** stopped a saved-post mutation from succeeding for a user who does not own the row.
- **PR #17** added multi-role web and Expo coverage and blocked users from recreating a follow through a direct insert. Native iOS deployment target is 16.4. Production web app host for that work is `app.aceaix.com`.
- **PR #19** closed the user-flow QA list: Discover filters and age floor, video thumbnails, report confirmation, onboarding gates, feed errors and a shared mute, in-sheet form errors, scouting preferences, and a coach shortlist that hides blocked users and minors.

---

## Follow-ups

1. Submit **2.0.1** to the App Store and Play from `main` at `8673d5b`. Suggested review note: version 2.0.1 fixes a crash that prevents every new user from creating an account. Apple expedited review is a form in App Store Connect, not a CLI flag.
2. First Name focus and centred initials are in 2.0.1 only. The allow-list change is already helping 2.0.0.
3. A streak celebration can cover the onboarding wizard for an account that already has a streak. A brand-new sign-up does not hit it. Not fixed.
4. Dev still has database triggers that production does not, including a legacy message trigger that double-notifies in dev only. Left in place on purpose.

---

## References

- PR #20 — Fix store sign-up crash, confirmation deep link, and QA findings (`4fe1e7c`)
- PR #21 — Bump app version to 2.0.1 (`8673d5b`)
- PR #19 — User-flow QA fixes
- PR #17 — Multi-role QA coverage
- PR #15 — Expo SDK 57 / V2 on `main`
- Prior report: `docs/reports/2026-09-07-weekly-report.md`
