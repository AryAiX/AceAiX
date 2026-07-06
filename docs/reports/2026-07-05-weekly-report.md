# AceAiX Weekly Report

**Week Ending:** July 5, 2026  
**Focus:** Supabase-backed admin portal, super admin access, and Google Play testing submission

## Executive Summary

This week focused on moving AceAiX from app-store preparation into operational readiness. The main work delivered a production admin portal backed by the existing Supabase database, added a protected super admin role for platform management, deployed the admin experience to `aceaix.com`, and advanced the Android release through Google Play internal and closed testing setup. The week ended with the Google Play closed testing release in review and the tester opt-in path ready for the required production-access testing window.

## Key Accomplishments

### Admin Portal Integration

- Integrated the admin portal into the existing web app under `/admin`, with `/admim` preserved as a redirect alias.
- Ported the admin dashboard UI while replacing prototype-only data with Supabase-backed reads, derived metrics, or explicit empty states.
- Added admin sections for platform overview, users, verification, sports, leagues, competitions, content, AI, moderation, subscriptions, finance, security, system configuration, and analytics.
- Added shared admin UI primitives for cards, stats, badges, loading states, empty states, and data lists.
- Updated routing, app layout, public header, and feed navigation so `admin` and `super_admin` users resolve to the admin workspace correctly.

### Supabase Admin Backend

- Added admin-support migrations for feature flags, moderation reports, billing events, data requests, sports catalog, and competitions catalog.
- Added the `super_admin` role to the Supabase role model.
- Added guarded role-management logic so only super admins can promote other users to admin.
- Added the `promote_user_to_admin` RPC and role-change protection trigger.
- Updated signup handling so public signup cannot self-assign privileged roles such as `admin`, `super_admin`, or `org_admin`.

### Super Admin Provisioning

- Created the `superadmin@aceaix.com` account in the AceAiX Supabase project.
- Confirmed the account email, set the requested password, and verified password login.
- Verified the profile row is marked as `super_admin` and `is_verified`.
- Verified production `/admin` loads as `AceAiX Super Admin` after deployment.

### Production Web Deployment

- Deployed the merged admin portal and super admin frontend changes to the Aryaix Vercel production project.
- Verified `aceaix.com` serves the new production bundle containing `super_admin`, `/admin`, and `promote_user_to_admin` support.
- Verified the live admin dashboard at `https://aceaix.com/admin`.
- Confirmed the admin portal shows live Supabase-backed platform data and full admin navigation in production.

### Google Play Submission and Testing

- Prepared the Android release path in Google Play Console.
- Confirmed internal testing release `2 (1.0.0)` was available to internal testers.
- Set up the `Closed testing - Alpha` track, which is required for production access on newer Google Play developer accounts.
- Added Android app bundle version code `2`, version `1.0.0`, to the Alpha closed testing release.
- Added closed-testing release notes describing the initial Android test build.
- Submitted/restarted Google review so the Alpha closed testing release and tester configuration are included.
- Added the `Aryaix` tester email list with 6 testers and attached it to the Alpha track.
- Confirmed Publishing overview shows `Closed testing - Alpha` in review with testers managed by the `Aryaix` list.

## Current State

The admin portal is live in production at `https://aceaix.com/admin` and is accessible with the configured super admin account. The AceAiX Supabase backend has the required admin tables, role protections, and super admin promotion workflow.

The Android app is not yet public. Google Play internal testing is available, and closed testing is configured through the `Alpha` track. The Alpha release is in review with the `Aryaix` tester list attached. The tester opt-in link is:

`https://play.google.com/apps/testing/com.aryaix.aceaix.athlete`

## Notes and Decisions

- Google Play production access likely requires at least 12 opted-in testers for 14 continuous days, so the current 6 testers in `Aryaix` are not enough yet.
- Testers must opt in through the Google Play testing link; adding emails to the tester list alone does not start the 14-day clock.
- The earlier internal testing track is useful for quick access, but the closed testing track is the path that matters for production access.
- The Play Console currently uses `Aryaix` as the selected tester list for closed testing.

## Recommended Next Focus

- Add at least 6 more real Gmail testers to the `Aryaix` tester list, preferably more than 12 total to protect against drop-offs.
- Send testers the opt-in link and confirm they join with the same Gmail addresses added to the list.
- Track the 14 continuous days after at least 12 testers have opted in.
- Collect tester feedback, issues found, device details, and fixes made for the Google production-access questionnaire.
- Monitor Google Play review status for the Alpha closed testing release and any policy or metadata questions.
- Continue admin portal hardening with real operational workflows, especially moderation actions, finance exports, feature flag editing, and audit-log review.
