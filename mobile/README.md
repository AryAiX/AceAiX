# AceAiX Athlete Mobile

Native Expo app for the AceAiX athlete role.

## Scope

This app is intentionally athlete-only. It reuses the existing Supabase backend, RLS policies, `signup-user` Edge Function, and athlete tables from the web app.

Implemented mobile surfaces:

- Athlete-only sign in and signup
- Dashboard with live profile, score, views, media, matches, opportunities, and medical status
- Portfolio list and URL-based highlight creation
- Match logging through `match_records`
- Opportunity discovery from live `opportunities`
- Profile editing across `user_profiles` and `athlete_profiles`

## Setup

Copy the example env file and fill in public Supabase values:

```sh
cp .env.example .env
```

Required values:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Do not put service-role keys in the mobile app.

## Commands

```sh
npm run start
npm run ios
npm run android
npm run typecheck
```

## Backend Reuse

The mobile app uses the same backend contract as the web app:

- `user_profiles`
- `athlete_profiles`
- `athlete_media`
- `match_records`
- `opportunities`
- `medical_clearances`
- `profile_views`
- `signup-user` Edge Function

Native camera/gallery upload is not implemented yet. The first mobile portfolio pass uses the existing URL-based media workflow from the web app so it can ship against the current schema without adding storage migrations.
