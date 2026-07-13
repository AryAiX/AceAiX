# AceAiX Weekly Report

**Week Ending:** July 12, 2026  
**Focus:** App Store resubmission, Google Play review and testing readiness, and production athlete AI recommendations

## Executive Summary

This week concentrated on two release-critical areas: resolving mobile app submission issues and delivering athlete-focused AI functionality on the production web app. The iOS submission was rebuilt and resubmitted with App Review fixes after an incorrect build had been submitted and expired. The Google Play listing was corrected after a metadata rejection, the Android app was verified on a local emulator without a startup crash, and the external closed-testing onboarding was completed. On the web, the placeholder AI Coach experience was replaced with explainable athlete recommendations powered by live Supabase data and server-side OpenAI personalization, then deployed and verified at `aceaix.com`.

## Key Accomplishments

### iOS App Store Fixes and Resubmission

- Audited the repository before rebuilding to confirm that the intended App Review fixes were present and unrelated changes had been reverted.
- Corrected the iOS submission sequence after build 9 was submitted incorrectly and later expired.
- Advanced the remote iOS build number to avoid the expired-build collision and produced build 11.
- Removed the previous build from the App Store version and attached build 11 to the submission.
- Updated the App Review reply with a concise explanation of the fixes and resubmitted the app for review.
- Made phone number entry optional during athlete signup and updated validation and payload handling accordingly.
- Removed the non-functional profile camera affordance and connected the Edit Profile action to Settings.
- Reworked camera permission handling in post and story creation so the native permission request is used directly and denied access is explained clearly.
- Verified the mobile changes with TypeScript, lint, unit tests, and repository checks before submission.

### Google Play Review and Closed Testing

- Investigated the Google Play rejection and identified the policy issue as a metadata rejection for unclear store-listing visuals.
- Replaced the rejected Android listing screenshots with the stronger iOS submission screenshots.
- Cropped the selected screenshots to an exact Google-compatible 9:16 ratio and uploaded the corrected set.
- Confirmed the corrected Google Play submission is distinct from the earlier rejected submission and remains under review.
- Configured the Alpha closed-testing track with the tester group and retained the public opt-in link:

`https://play.google.com/apps/testing/com.aryaix.aceaix.athlete`

- Completed the PrimeTestLab onboarding flow, including contact preference, testing link, signup access, free pricing, and tester instructions.
- Submitted the PrimeTestLab setup for review so the external testing process can begin when Google Play access is available.
- Launched the Android app locally through Expo Go, verified that the app reached the AceAiX UI without crashing, and confirmed navigation to signup.

### Athlete AI Recommendations

- Replaced the placeholder AI Coach responses with a production athlete recommendation experience at `/athlete/ai`.
- Added four recommendation categories:
  - Opportunity matches
  - Weekly athlete actions
  - Profile and visibility coaching
  - Development priorities
- Grounded recommendations in live Supabase athlete data, including profile readiness, recent matches, public media, endorsements, profile views, and active opportunities.
- Added explainable evidence to each recommendation so athletes can see why an action or opportunity was suggested.
- Moved opportunity scoring into a shared deterministic engine and replaced misleading “AI Match” labels with “Profile Match” terminology.
- Explicitly excluded medical records, injuries, clearance notes, contact information, and other sensitive data from AI context.
- Added an authenticated Vercel API function using structured OpenAI output, with deterministic fallback behavior when AI is unavailable.
- Added a Supabase-backed hourly usage quota to protect the production AI endpoint from uncontrolled generation costs.
- Added focused unit and UI tests for recommendation scoring, sparse-profile behavior, excluded fields, response contracts, and rendered evidence.

### Production AI Deployment

- Connected the Vercel CLI to the correct `aryaix/aceaix` project rather than the unrelated personal Vercel accounts.
- Stored the OpenAI credential as a sensitive Production environment variable.
- Added the required Supabase server and Vite production environment variables to the AceAiX Vercel project.
- Applied migration `0016_athlete_ai_quota.sql` to the AceAiX Supabase production database.
- Deployed the AI recommendation UI and API to `https://aceaix.com`.
- Detected and corrected a production-only Vercel function module-resolution failure during live verification.
- Verified the final unauthenticated endpoint rejects access with `401`.
- Verified an authenticated production request returns `200`, uses `ai` generation mode, and returns eight recommendations covering all four categories.

## Verification Completed

- Web TypeScript checks passed for both the Vite client and Vercel API.
- Web production build passed.
- All 24 web unit tests passed.
- Lint passed for all changed AI recommendation files.
- Athlete recommendation Playwright E2E coverage passed.
- The athlete recommendation screenshot was captured and reviewed.
- Android emulator launch and signup navigation completed without a crash.
- Production recommendation API authentication and real AI generation were verified after deployment.

## Current Submission State

### Apple

The corrected iOS build has been attached and resubmitted to App Review. The app is not yet approved; the next action is to monitor the current review and respond only if Apple requests additional evidence or changes.

### Google

The previous metadata rejection was addressed with corrected screenshots. The updated submission is in review, and the Alpha closed-testing path and external tester onboarding are configured. The app is not yet public.

### Web AI

Athlete recommendations are live in production at:

`https://aceaix.com/athlete/ai`

The experience remains useful if OpenAI is unavailable because it falls back to deterministic, evidence-based recommendations generated from the athlete's own Supabase data.

## Risks and Follow-Up

- The OpenAI key used during setup was shared in plaintext and should be rotated in OpenAI and replaced in Vercel.
- The AI feature was deployed from the local working tree; its source changes still need to be committed, reviewed, and merged to prevent production drift.
- Google Play production access still depends on satisfying the required closed-testing participation window and tester threshold applicable to the account.
- Testers must opt in with eligible Google accounts and continue participating for the full required period.
- Apple and Google review states should be monitored, but older rejection notifications must not be confused with the currently corrected submissions.

## Recommended Next Focus

- Rotate the OpenAI production key and verify AI mode again after replacement.
- Commit the AI feature, migration, tests, and this report to a reviewable branch and merge them into `main`.
- Monitor the current Apple review and Google corrected submission.
- Confirm that closed testers can install the approved Alpha build and begin the required continuous testing period.
- Collect tester participation evidence, device coverage, feedback, and resulting fixes for the Google production-access questionnaire.
- Add persistent opportunity save/apply state and recommendation refresh telemetry so athlete actions can be measured after launch.
