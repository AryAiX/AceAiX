# 31 — Sport Fit

> A short mindset questionnaire (22 statements, about 4 minutes) and the sports it points to. The
> player gets their three best-fitting sports, the reasons each one fits, and one thing to develop,
> plus a fit for every other sport in the catalogue. It sits beside Game Intelligence and uses its
> results when the player has them.
>
> Source of truth: `supabase/migrations/20261019000001_sport_fit.sql`. Client:
> `mobile/app/sport-fit/`, `mobile/components/sportfit/`, `mobile/lib/sportfit/catalogue.ts`,
> `mobile/lib/api.sportfit.ts`, `mobile/i18n/locales/*/sportFit.ts`.

---

## 1. What the player sees

```
Profile tab ─ Sport Fit card ─▶ /sport-fit
                                  │
     consent not ok ◀─────────────┤  (guardian "mindset" scope, date of birth, not an athlete)
     intro ─ "Start" ─────────────┤  (nudge to play Game Intelligence first, if they have not)
                                  ▼
                       /sport-fit/questions
     one statement per screen, five answers, auto-advance, Back steps back
     → submit → quality not ok: "Let's try that again"
              → ok: /sport-fit?fresh=1 (confetti, then the result)
```

The result screen shows the top three sports as cards (fit %, what the sport asks of a player, why it
fits, one thing to develop), every other sport as a bar, the mindset dimensions as bars, team-or-solo
as a spectrum, the two Game Intelligence signals when used, "Find coaches", the retake date, a
privacy note with **Delete my answers**, and the footnote: a suggestion to explore, not a verdict.

The profile card shows "Best fit: Handball — then Basketball and Football · Only you can see this".

## 2. The statements

Seven dimensions, three statements each, Likert 1–5 (strongly disagree → strongly agree), plus one
attention check. One statement per dimension is reverse-worded (scored 6 − answer). The order is
interleaved so neighbours never measure the same thing.

| Dimension | Measures | Example |
|-----------|----------|---------|
| drive | wanting to train and improve for its own sake | "I train even when nobody is checking on me." |
| composure | staying calm when it matters | "Nerves before a competition often make me play worse." (reverse) |
| focus | sustained attention | "I can spend a whole session working on one small detail." |
| resilience | recovering from mistakes and setbacks | "After a mistake, I quickly focus on the next action." |
| boldness | enjoying duels, contact and risk | "I enjoy one-on-one battles with an opponent." |
| discipline | enjoying routine and repetition | "I can repeat the same drill many times to get it right." |
| team | preference for a team over your own result (a preference, not a skill) | "A win feels better when I share it with teammates." |

**The statements are AceAiX's own.** No licensed instrument (ACSI-28, SMS-II, SCAT, MTQ48, Grit-S…)
is reproduced, which keeps docs/26 §7 item 8 (licences) out of the way. In exchange, they are
**unvalidated**: see §6.

Quality rules (stored, but no result shown): under 45 seconds → `too_fast`; attention check not
answered "Agree" → `check_failed`; the same answer to every scored statement → `straight_line`.

## 3. Scoring — on the server

`private.sf_dimensions` turns answers into seven values on 0–1. When the player has a Game
Intelligence profile, two more are added: **reading** = mean of pitch decision, anticipation and
tracking; **speed** = mean of reaction and Go/No-Go.

`public.sport_fit_sports` holds, per sport, a weight 0–3 for each dimension (how much the sport asks
for it) and a `team_target` (0 alone, 0.5 a partner, 1 a team). For each sport:

```
fit = 0.25 × (1 − |team − team_target|) + 0.75 × Σ(weight × value) / Σ(weight)
```

Dimensions the player has no value for (reading and speed without Game Intelligence) drop out of
both sums. **Strengths** are the two dimensions adding most to that sport's fit (weight ≥ 2 and
value ≥ 0.6). **Develop** is the heaviest-weighted dimension under 0.5. The twelve sports are the
app's own catalogue (`sports.*`), so a result can link straight into the rest of the app.

Sanity check from the seed: a solo, calm, disciplined, focused profile ranks swimming, chess,
athletics and tennis first; a team-minded, bold profile ranks handball, basketball and football; a
bold, resilient solo competitor ranks martial arts and tennis.

## 4. Consent

Same age rule as Game Intelligence (self-consent from 15 by default, per country in
`assessment_consent_ages`; `age_unknown` is treated as a minor), but a **separate guardian scope**,
`guardian_consents.allow_mindset`, unticked by default. A parent who approved the games has not
approved a questionnaire about how their child feels under pressure, so every existing guardian
approval starts without it.

- `confirm_guardian_consent` gains an eighth argument, `p_allow_mindset`.
- The guardian e-mail page (`functions/guardian-consent`) has a new **Sport Fit** checkbox. Redeploy it.
- A minor whose guardian approved the profile but not Sport Fit is sent to
  `/settings/guardian?add=mindset`, which pre-fills a new request to the same guardian.
- A 15–17-year-old who answered on their own consent: any guardian with an AceAiX account gets a
  `sport_fit_completed` notification once ("told, not asked").

## 5. Who sees what

| Viewer | Sees |
|--------|------|
| the player | everything, and can delete it all (`sport_fit_delete_mine`) |
| a guardian | that it was completed (notification), never the answers or result |
| clubs, scouts, coaches, other users | nothing; there is no "their" card and no RPC that reads another person's result |
| admins | the rows exist (RLS allows admins, as for Game Intelligence); the console does not show them |

`sport_fit_results` is owner-readable only and not writable by any client. One valid result per
**60 days**; at most five submissions a day. "Download my data" (`export_my_data`) now includes Game
Intelligence and Sport Fit.

## 6. Open items — before launch

1. **Expert review.** A sports psychologist should review the 22 statements and the twelve-sport
   weight matrix (`sport_fit_sports.reviewed_by` stays NULL until then). The weights are AceAiX's
   reasoned starting point, not research.
2. **Translations of the statements** (`item.*` in six languages) need a native-speaking sports
   psychologist's review: wording changes meaning, and reverse-worded items must stay reversed.
3. **Pilot.** 300+ players: internal consistency per dimension (Cronbach's α ≥ 0.7, or replace items),
   test–retest after 4–6 weeks, and whether athletes already in a sport score that sport near the top.
4. **Legal review.** Mindset answers from minors are sensitive personal data. Confirm consent ages and
   the privacy policy text per market (UAE first), and add Sport Fit to the in-app Privacy Policy.
5. **Guardians without an AceAiX account are not told** (same gap as docs/26 §7.2).
6. **Physical and fitness tests** (requested for later) would fill the biggest gap: the fit says
   nothing about body, speed or strength today, and the copy says so.
7. Possible later: an opt-in to share the top three sports with a chosen coach; "Find coaches"
   filtered by the sport.
