# AceAiX Weekly Report

**Week Ending:** July 19, 2026  
**Focus:** Full mobile release audit, iOS resubmission, Google Play closed-testing update, and production backend hardening

## Executive Summary

This week focused on resolving repeated mobile review failures through a broader release audit rather than another isolated rejection fix. The mobile app received functional repairs across messaging, profile editing, media, reels, events, career history, privacy, content safety, notifications, and production data handling. Supporting Supabase migrations were applied, the app was rebuilt and verified as an iPhone-focused release, and iOS build 14 was submitted to Apple with updated review notes. The same audited source was built for Android as version code 3 and submitted to Google Play's Alpha closed-testing track.

## Key Accomplishments

### Comprehensive Mobile Release Audit

- Audited all authenticated mobile routes and their visible controls instead of limiting verification to the previously rejected screen.
- Expanded authenticated end-to-end coverage for messaging, profile editing, opportunity actions, event lifecycle, post lifecycle, career milestones, video reels, and profile visibility persistence.
- Verified that every static route target exists and corrected navigation paths that previously opened read-only or incomplete screens.
- Replaced misleading simulated labels and unconditional trust indicators with values derived from production profile and Supabase data.
- Added explicit error handling to several destructive and persistence-sensitive actions so failed operations are not presented as successful.

### Messaging and Social Experience

- Implemented complete conversation opening, thread rendering, message sending, read-state updates, and new-conversation creation.
- Corrected ambiguous Supabase relationships that prevented newly published posts from appearing in the feed.
- Added video selection and playback for posts and reels using Expo video support.
- Added owner-controlled reel deletion with confirmation and backend error handling.
- Added media cleanup when posts, stories, or account-owned avatar files are deleted.
- Added functional content reporting and user-blocking infrastructure for user-generated content.

### Profiles, Career, and Data Accuracy

- Added a dedicated Edit Profile screen with persisted profile fields and avatar upload.
- Added career milestone creation and deletion with authenticated test coverage.
- Persisted the profile visibility preference instead of treating it as local-only UI state.
- Made verification, medical-clearance, opportunity, and performance indicators conditional on stored data.
- Replaced misleading AI-score wording with clearer performance and readiness terminology.
- Updated dashboard scout-view and opportunity metrics to use live Supabase counts.
- Corrected football and chess data mapping to match the repository's JSON-backed database schema.

### Privacy, Safety, and Account Lifecycle

- Added working Privacy Policy and Terms of Service links in signup and Settings.
- Added mobile content-safety policies for reporting, blocking, and viewer access.
- Updated account deletion to remove associated database records and uploaded avatar, post, and story media.
- Added transactional Sportify disconnection support so consent and imported data cleanup can be handled together.
- Added audience-aware policies for posts and stories.

### Supabase Release Infrastructure

- Applied `0017_mobile_content_safety.sql` to the AceAiX production project.
- Applied `0018_mobile_release_infrastructure.sql`, including media storage policies, audience controls, social counter triggers, realtime publication configuration, notification synchronization, and Sportify disconnection.
- Applied `0019_profile_media_storage.sql` for avatar storage and owner-scoped policies.
- Verified authenticated moderation-report insertion and cleaned up temporary validation data.

### iOS Build and App Store Submission

- Confirmed the release configuration is iPhone-focused with `supportsTablet: false`.
- Installed and configured Expo video, image picker, and notifications support with required permission descriptions.
- Updated the Apple provisioning profile to include Push Notifications and the `aps-environment` entitlement.
- Completed a local iPhone 16 Pro simulator build and clean launch verification.
- Produced EAS production build 14 and confirmed App Store processing state `VALID`.
- Attached build 14 to App Store version 1.0, replaced the unresolved rejected submission, and updated App Review notes with the full release-audit summary.
- Submitted the new review container successfully.

Current Apple status: **Waiting for Review**.

### Google Play Closed Testing

- Built the same audited source as Android version code 3, version 1.0.0.
- Updated EAS submission configuration so future Android submissions target the Alpha track.
- Uploaded version code 3 to `Closed testing - Alpha`.
- Added release notes describing the complete messaging, profile, media, privacy, safety, and stability update.
- Set the closed-testing rollout to 100% of eligible testers.
- Submitted the Alpha change through Publishing overview.

Current Google status: **Changes in review**, pending completion of Google's automated checks before delivery to the closed-testing group.

Tester opt-in link:

`https://play.google.com/apps/testing/com.aryaix.aceaix.athlete`

## Verification Completed

- TypeScript checks passed.
- Mobile unit tests passed.
- Authenticated Playwright release-gate coverage passed, including CRUD and persistence workflows.
- Expo Doctor and dependency checks were run after native dependency updates.
- CocoaPods installation completed with the current native dependencies.
- Local iPhone simulator compilation and launch completed successfully.
- Android production app bundle version code 3 completed successfully through EAS.
- App Store Connect API confirmed iOS build 14 as valid and the replacement submission as `WAITING_FOR_REVIEW`.
- Google Play Console confirmed version code 3 under `Closed testing - Alpha` and moved the change into review.

## Current Risks and Follow-Up

- The audited mobile changes and migrations remain uncommitted in the local working tree and must be reviewed, committed, and pushed to prevent release/source drift.
- `sync-chess` and `sync-football` are still invoked by the client but are not present under the checked-in Supabase Edge Functions; these controls require implementation or a release-safe unavailable state.
- Additional reconciliation is still needed for broad error swallowing and selected RLS/upsert edge cases identified by the late data-layer audits.
- Apple approval is not guaranteed until App Review completes its functional assessment of build 14.
- Google version code 3 will not reach the Alpha group until automated checks and review complete.
- Google production access still depends on the required number of opted-in testers participating continuously for the required testing period.
- The shared production review account and generated test content should be monitored so automated verification does not leave stale records or interfere with reviewer activity.

## Recommended Next Focus

- Monitor Apple build 14 and Google Alpha version code 3 without confusing older rejection records with the active submissions.
- Confirm version code 3 becomes available to every eligible Alpha tester after Google completes review.
- Reconcile the remaining data-layer findings against the submitted source, prioritizing missing sync functions, RLS conflict behavior, and surfaced retry states.
- Commit and push the audited mobile code, migrations, tests, and this report through a reviewable change.
- Track closed-tester opt-ins, install activity, retention, feedback, device coverage, and resulting fixes for the Google production-access questionnaire.
