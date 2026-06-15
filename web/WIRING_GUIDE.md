# AceAiX — DB Wiring Guide (for page wiring)

Goal: replace ALL mock/hardcoded display data with real Supabase data via the typed `api/` layer + TanStack Query. Keep the existing visual JSX/Tailwind styling and layout intact — only swap the data source. Remove now-unused mock `const` arrays and `../data/*` imports.

## Hard rules
1. Use `@tanstack/react-query` `useQuery`/`useMutation` with functions from `src/api/*`. Never call `supabase` directly in a page if an api function exists; if you need a new query, add it to the relevant `src/api/*.ts` module.
2. Keep all className/style/layout/animations exactly as-is. Do not redesign.
3. Add sensible loading (skeleton or spinner) and empty states ("No … yet").
4. Remove unused imports and mock constants you replaced (avoid TS6133 unused errors). Run mentally through unused vars.
5. Don't change routing, design system, or `AuthContext` API.
6. Auth: current user via `useAuth()` → `{ user, profile, role }`. The athlete's own row: `useMyAthlete()` from `src/hooks/useAthlete` returns `{ data: athlete }` (athlete_profiles row + `.user`).
7. Get the athlete row id for the logged-in athlete from `useMyAthlete()` (athlete.id). For public pages the route param `:id` is the **athlete_profiles.id** (athletes), **coach_profiles? no** — coaches/clubs use the user id / org id respectively (see below).

## API modules (import from `../../api/<module>` — adjust depth)
- `athletes`: `listAthletes(filters?) -> (AthleteProfile & {user})[]`, `getAthleteById(id)`, `getAthleteByUserId(userId)`, `updateAthlete(id, patch)`. Filters: `{sport?, level?, q?, openToOffers?, minScore?, limit?}`.
- `profiles`: `getUserProfile(id)`, `updateUserProfile(id, patch)`, `getUserPrivate(userId)`, `updateUserPrivate(userId, patch)`.
- `portfolio`: `listMedia(athleteId, {publicOnly?})`, `createMedia`, `deleteMedia(id)`, `listMatches(athleteId, limit?)`, `createMatch`, `listAttributes(athleteId)`.
- `medical`: `listMedicalRecords(athleteId)`, `listClearances(athleteId)`, `latestClearance(athleteId)`, `listInjuries(athleteId)`.
- `network`: `listFollowing(userId)`, `listFollowers(userId)`, `followCount(userId)`, `isFollowing(a,b)`, `follow(a,b)`, `unfollow(a,b)`, `listEndorsements(athleteId)`, `listRecommendations(recipientId)`, `upsertRecommendation`, `deleteRecommendation(id)`, `searchUsers(q, excludeId?, limit?)`.
- `messaging`: `listConversations(userId)` (rows have `.other_user`), `getOrCreateConversation(userId, otherUserId)`, `listMessages(convId)`, `sendMessage(convId, senderId, content)`, `markMessagesRead(convId, userId)`.
- `opportunities`: `listOpportunities({sport?, type?, activeOnly?, limit?})` (rows have `.organization`), `getOpportunity(id)`.
- `watchlists`: `listWatchlists(userId)` (rows have `.athletes[]` each with `.athlete.user`), `createWatchlist(userId,name,desc?)`, `renameWatchlist(id,name)`, `deleteWatchlist(id)`, `addAthleteToWatchlist(wlId, athleteId, notes?)`, `removeAthleteFromWatchlist(id)`.
- `notifications`: `listNotifications(userId, limit?)`, `unreadCount(userId)`, `markNotificationRead(id)`, `markAllNotificationsRead(userId)`.
- `organizations`: `listOrganizations({type?, q?, limit?})`, `getOrganizationById(id)`.
- `coaches`: `listCoaches(limit?)`, `getCoachByUserId(userId)`, `getCoachById(id)`.
- `content`: `listSuccessStories({featured?, limit?})`, `getSuccessStory(slug)`, `listPosts({authorId?, athleteId?, limit?})` (rows have `.author`), `createPost`, `getCms<T>(key)`.
- `analytics`: `listProfileViews(athleteId, limit?)`, `profileViewCount(athleteId)`, `weeklyViews(athleteId, days?) -> {label,count}[]`.
- `admin`: `listUsers({role?, q?, limit?})`, `listVerificationRequests(status?)`, `decideVerification(id, 'approved'|'rejected', reason?)`, `platformStats() -> {users, athletes, organizations, opportunities, pendingVerifications}`.

## Key type fields (see src/types/index.ts)
- `AthleteProfile`: `id, user_id, sport, position, position_primary, nationality, dominant_foot, height_cm, weight_kg, level, current_club, cover_url, visibility_score, performance_score, fitness_score, profile_completeness, followers_count, connections_count, birth_date`. Rich JSONB arrays: `attributes: {label,value,endorsements,topEndorser,topEndorserVerified}[]`, `trajectory: {season,score?,forecast?}[]`, `academy[]`, `certifications[]`, `honors[]`, `languages[]`, `following[]`, `analytics`. `.user` is the UserProfile (full_name, avatar_url, city, country, is_verified).
- `Organization`: `name, short_name, initials, type, league, city, country, stadium, stadium_capacity, primary_color, secondary_color, cover_url, founded_year, followers_count, is_verified, description, values[], profile{trophies[],currentSeason[],coachingStaff[]}`.
- `CoachProfile`: `user_id, specialty, current_club, years_experience, score, win_rate, total_trophies, total_matches, philosophy, cover_url, coaching_spells[], licenses[], attributes[], honors[], languages[], activity[]`, `.user`.
- `AthleteMedia`: `title, media_type, storage_url, thumbnail_url, duration_seconds, is_featured, is_public, views_count, ai_tags[]`.
- `MatchRecord`: `match_date, opponent, competition, result, minutes_played, goals, assists, stats{rating?}`.
- `Opportunity`: `title, description, type, location, sport, position, salary_min, salary_max, currency, application_deadline, .organization`.
- `Notification`: `type, title, body, is_read, action_url, created_at`.

## Query pattern example
```tsx
import { useQuery } from '@tanstack/react-query';
import { listAthletes } from '../api/athletes';

const { data: athletes = [], isLoading } = useQuery({ queryKey: ['athletes', filters], queryFn: () => listAthletes(filters) });
```
Mutations: invalidate with `queryClient.invalidateQueries({ queryKey: [...] })` from `useQueryClient()`.

## CMS content keys (use `getCms(key)`)
- `home`: `{ heroStats:[{value,label}], pillars:[{title,desc,icon}], trustClubs:string[] }`
- `plans`: `{ plans:[{name,price,period,audience,highlighted?,features[],cta}], faqs:[{q,a}] }`
- `resources`: `{ categories:[{name,count}], articles:[{title,category,readTime,excerpt}] }`
- `about`: `{ values:[{title,desc}], team:[{name,role,avatar}], milestones:[{year,text}] }`

## Public profile route params
- `/athletes/:id` → `:id` = `athlete_profiles.id` → `getAthleteById(id)`. Use `athlete.attributes/trajectory/academy/...` (JSONB) + `listMedia`, `listMatches`, `listEndorsements`, `listRecommendations(athlete.user_id)`, `latestClearance`. Replace the `ATHLETE_PROFILES[id]` mock entirely.
- `/coaches/:id` → `:id` = `coach_profiles.id` → `getCoachById(id)`. Replace `COACH_PROFILES`. Similar coaches: `listCoaches()` filtered to others.
- `/clubs/:id` → `:id` = `organizations.id` → `getOrganizationById(id)`. Replace `CLUB_PROFILES`. Use `org.profile` JSONB for trophies/season/staff; squad/trials can use `listAthletes({})` and `listOpportunities({})` as needed.

## Demo data present (so pages have content)
13 athletes, 2 scouts, 1 coach (Ricardo Mendes), 1 medical partner, 1 admin, 6 orgs, 4 opportunities, watchlists, messages, posts, profile_views, 3 success stories, CMS for home/plans/resources/about. Demo login: athlete@aceaix.demo / scout@aceaix.demo / admin@aceaix.demo, password `demo123456`.

## After editing
Ensure your files have no TypeScript errors (especially unused imports TS6133). Do not run the dev server.
