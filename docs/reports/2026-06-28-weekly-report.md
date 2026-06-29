# AceAiX Weekly Report

**Week Ending:** June 28, 2026  
**Focus:** Mobile MVP rebuild, QA hardening, and Apple App Store submission

## Executive Summary

This week focused on turning the mobile prototype into a working Expo/React Native app backed by the existing Supabase platform, then preparing and submitting the iOS app for Apple review. The work replaced the prior mobile UI with the new MVP application design, connected core screens to live backend data, removed misleading hardcoded content, added release checks, produced App Store assets and metadata, and completed the App Store Connect submission package.

## Key Accomplishments

### Mobile MVP Rebuild

- Rebuilt the mobile app from the new AceAiX MVP prototype while preserving the existing Supabase backend as the system of record.
- Integrated the mobile app with Supabase Auth, persisted sessions using React Native storage, and reused the existing `signup-user` Edge Function for athlete account creation.
- Adapted the new mobile data services to the existing platform schema for posts, stories, notifications, opportunities, profiles, medical records, messaging, network connections, performance data, and Sportify-related flows.
- Added an additive Supabase compatibility migration for prototype-required mobile tables and columns without replacing the existing backend model.
- Removed obsolete prototype/runtime code that conflicted with the React Native app and TypeScript checks.

### Backend and Data Integrity

- Replaced hardcoded mobile screen data with live Supabase reads, profile-derived values, or explicit empty states.
- Updated profile, dashboard, career, network, discovery, medical, events, analytics, messages, opportunities, performance, and settings screens to avoid fake athlete/scout metrics.
- Added safer mobile Supabase configuration so native builds read public environment values from Expo config and fail with clearer errors when the public anon key is missing.
- Fixed the TestFlight signup error caused by missing or improperly passed Supabase API key values by normalizing EAS environment variables and explicitly passing required Edge Function headers.

### Mobile QA and Test Coverage

- Added TypeScript, Vitest, and Playwright coverage for the mobile project.
- Added broad e2e coverage for major public/authenticated flows and unit coverage for smaller utilities/components.
- Ran release checks across typecheck, unit tests, e2e tests, web export/build checks, and simulator-based verification.
- Performed simulator review with screenshots across the rebuilt mobile surfaces and fixed UI issues found during review, including signup date-of-birth field sizing and authenticated routing behavior.
- Created `mobile/QA_REPORT.md` documenting completed work, assumptions, QA coverage, and recommended follow-up work.

### iOS Release Configuration

- Configured Expo/EAS for iOS production builds and submission.
- Added the iOS bundle identifier, App Store metadata, permissions descriptions, encryption declaration, EAS project configuration, and submission profile.
- Generated a simplified App Store-compliant icon using a geometric AceAiX "A" mark with no text and no alpha channel.
- Produced App Store screenshot sets for iPhone and iPad display requirements.
- Built and submitted the iOS binary through EAS/TestFlight, then validated a TestFlight install with signup, login, and profile access.

### App Store Connect Submission

- Completed App Store Connect product metadata, review credentials, contact information, category, age rating, screenshots, pricing, availability, privacy policy URL, and privacy practices.
- Answered the App Privacy questionnaire for the data categories collected by the app, including account/contact information, health and fitness information, user content, coarse location, user ID, and product interaction.
- Set the app to free pricing and made it available in all App Store countries and regions on release.
- Added the submitted iOS version to review and completed final submission.
- Current Apple status is `Waiting for Review`.

### Public Website Readiness

- Added public website pages required for App Review:
  - `/privacy`
  - `/terms`
  - `/support`
- Updated public routing and homepage footer links so those pages are discoverable.
- Added Vercel SPA routing so direct links to legal/support pages resolve correctly.
- Deployed the website to Vercel production and verified the live legal/support URLs.
- Updated App Store Connect URLs to verified live Vercel pages while the `aceaix.com` DNS still points at the existing Squarespace placeholder.

## Current State

AceAiX now has a rebuilt mobile MVP aligned with the new prototype, connected to the existing Supabase backend, verified through automated and simulator QA, and submitted to Apple for review. The iOS version is waiting for App Review. The public legal/support pages are live on Vercel and the repository is pushed on the `release/apple-store-submission` branch.

## Notes and Decisions

- The temporary in-app age change to allow younger athlete signup was reverted after clarification that the age 6+ requirement was for App Store submission metadata only, not an app behavior change.
- `aceaix.com` still resolves to a Squarespace placeholder until DNS is updated. App Store Connect currently points to the verified Vercel URLs to reduce review risk.
- The mobile app remains focused on the athlete role for this first native submission.

## Recommended Next Focus

- Monitor App Store Review and respond quickly to any metadata, privacy, account, or binary questions from Apple.
- Update `aceaix.com` DNS to Vercel by setting `A aceaix.com 76.76.21.21` or moving nameservers to Vercel.
- After Apple review is stable, prepare the Android/Google Play submission path.
- Add post-review production monitoring for mobile signup, login, profile loading, and Supabase Edge Function errors.
- Continue replacing lower-priority placeholder workflows with complete product flows, especially account deletion, password update, comments, deeper opportunity applications, and push notifications.
