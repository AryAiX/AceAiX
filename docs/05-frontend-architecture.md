# 05 — Frontend Architecture

How the React SPA is structured, routed, and wired to data. Builds on the cleaned-up Bolt prototype.

---

## 1. Folder structure (`web/src/`)

Keep the prototype's structure, with additions for real data access:

```
src/
├─ main.tsx                 # entry; providers
├─ App.tsx                  # app shell
├─ Router.tsx               # route table + guards
├─ index.css                # Floodlight design system (see 04)
├─ lib/
│  ├─ supabase.ts           # typed Supabase client (single instance)
│  └─ queryClient.ts        # TanStack Query client (add)
├─ types/
│  ├─ index.ts              # domain TS types (hand-written today)
│  └─ database.ts           # GENERATED from Supabase (add — `supabase gen types`)
├─ context/
│  ├─ AuthContext.tsx       # session, profile, role, sign in/up/out
│  ├─ ThemeContext.tsx      # dark/light toggle
│  └─ I18nProvider.tsx      # react-i18next (P2)
├─ hooks/                   # data hooks (useAthlete, useWatchlists, ...) + useLenis
├─ api/                     # typed data-access layer wrapping supabase + edge fns
│  ├─ athletes.ts
│  ├─ medical.ts
│  ├─ messaging.ts
│  └─ ai.ts                 # calls AI edge function (SSE)
├─ components/
│  ├─ ui/                   # design-system primitives (see 04 §5)
│  ├─ profile/              # athlete profile sections
│  ├─ feed/                 # feed rails
│  ├─ AppLayout.tsx         # authenticated shell (sidebar + topbar)
│  └─ PublicHeader.tsx      # public/guest header
├─ pages/                   # route components, grouped by zone
│  ├─ (public)             # HomePage, AthletesPage, ClubsPage, DiscoverPage, ...
│  ├─ auth/
│  ├─ athlete/
│  ├─ recruiter/
│  ├─ partner/
│  └─ admin/
└─ data/                    # ⚠ prototype mock data — to be DELETED as pages go live
```

> **`src/data/` and inline mock arrays are temporary.** Each page currently hardcodes its data
> (e.g. `ATHLETES`, `TRAJECTORY`, `SCOUT_INTEREST`). Cleanup replaces these with `api/` + hooks. See
> [07](./07-prototype-audit.md).

---

## 2. Providers (composition in `main.tsx`)

```
<QueryClientProvider>        // TanStack Query (add)
  <ThemeProvider>
    <I18nProvider>           // P2
      <AuthProvider>         // session + profile + role
        <RouterProvider />   // or <Router/>
      </AuthProvider>
    </I18nProvider>
  </ThemeProvider>
</QueryClientProvider>
```

---

## 3. Routing & zones

The prototype's `Router.tsx` is the baseline. Routes are grouped into **zones**, each gated by role.
Align route paths to the design doc's consolidated route map (design doc §14.4):

| Zone | Base | Guard | Notes |
|------|------|-------|-------|
| Public | `/`, `/discover`, `/athletes`, `/clubs`, `/highlights`, `/plans`, `/resources`, `/about` | none | Guest-accessible |
| Auth | `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/verify-otp`, `/auth/onboarding` | none | Multi-step register |
| Athlete | `/athlete/*` | `athlete` | dashboard, profile, media, performance, medical, network, career, ai, messages, subscription, settings |
| Recruiter | `/recruiter/*` | `scout`, `club` | dashboard, search, recommendations, watchlists, outreach, roster (club), seats (club), opportunities, analytics, messages |
| Partner | `/partner/*` | `medical_partner` | dashboard, requests, records/new, commissions |
| Federation | `/federation/*` | `federation` | P3 |
| Admin | `/admin/*` | `admin` | dashboard, users, verification, plans, ai, content, finance, security, settings |
| System | `/404`, `/500`, `/maintenance`, `/access-denied` | none | error pages (add) |

**Guards:** `RequireAuth` (exists) redirects unauthenticated users to login and role-mismatched users
to `/access-denied` (today it bounces to `/dashboard` — change to a proper Access Denied page). Public
profile routes (`/athletes/:id`) must render for guests with **consent-aware** data (no medical unless
permitted).

**Route map gaps vs design doc to add:** `/recruiter/recommendations`, `/recruiter/outreach`,
`/recruiter/roster`, `/recruiter/seats`, `/recruiter/opportunities`, `/partner/records/new`,
`/partner/commissions`, `/athlete/subscription`, `/auth/forgot-password`, `/auth/verify-otp`, error pages.

---

## 4. State management

| Kind | Tool | Examples |
|------|------|----------|
| **Server state** | TanStack Query over Supabase | athletes, profiles, watchlists, messages, medical |
| **Realtime** | Supabase Realtime subscriptions → invalidate queries | messages, notifications, scout views |
| **Auth/session** | `AuthContext` | `user`, `session`, `profile`, `role`, `loading` |
| **UI/app** | local component state + small contexts | sidebar collapsed, modals, theme, locale |

**Rule:** no fetching inside random `useEffect`s scattered through pages (the prototype's pattern).
All reads/writes go through `api/` functions, consumed via `hooks/` that use TanStack Query. This gives
caching, loading/error states, retries, and cache invalidation after mutations.

Example hook contract:

```ts
// hooks/useAthlete.ts
export function useAthlete(athleteId: string) {
  return useQuery({
    queryKey: ['athlete', athleteId],
    queryFn: () => api.athletes.getById(athleteId),
  });
}
```

---

## 5. Data-access layer (`api/`)

Wrap Supabase calls in typed functions using generated DB types. This isolates the rest of the app from
query details and makes RLS-aware error handling consistent.

```ts
// api/athletes.ts
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export async function getById(id: string) {
  const { data, error } = await supabase
    .from('athlete_profiles')
    .select('*, user:user_profiles(*), media:athlete_media(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}
```

- **Generate types:** `supabase gen types typescript --linked > src/types/database.ts` (run in CI).
- AI and other privileged calls go through Edge Functions (see [06](./06-supabase-integration.md)),
  invoked via `supabase.functions.invoke()` or `fetch` for SSE streaming.

---

## 6. Auth flow (current → target)

Current (`AuthContext`): email/password sign-in; sign-up creates `auth.users` + inserts `user_profiles`
(+ `athlete_profiles` for athletes) **client-side**. Onboarding updates `athlete_profiles`.

**Target changes:**
- Move profile-row creation to a **DB trigger** on `auth.users` insert (or an Edge Function) so it can't
  be skipped or spoofed and isn't subject to client-side RLS timing.
- Add **OTP** (email + SMS via Twilio) and `/auth/verify-otp`; add `/auth/forgot-password`.
- Multi-step register: method → OTP → role → core profile → optional uploads → dashboard (design doc §14.1).
- Design the provider layer so **UAE Pass** (OIDC custom provider) plugs in at P3 without refactor.
- `RoleRedirect` after login routes to the correct zone (already implemented).

---

## 7. Performance practices

- **Code splitting:** lazy-load each zone's routes (`React.lazy` + `Suspense`); the prototype imports
  everything eagerly in `Router.tsx` — convert to dynamic imports.
- **Media:** lazy-load images with responsive `srcset` (WebP/AVIF); use adaptive-bitrate player for video.
- **Query caching:** sensible `staleTime` for public/browse data; realtime invalidation for live data.
- **Bundle hygiene:** keep `framer-motion`/`recharts`/`lenis`; audit for unused once cleanup is done.
- Meet NFR targets in [01](./01-product-requirements.md) §8 (LCP < 2s, nav < 300ms).

---

## 8. Conventions

- TypeScript strict; no `any` in `api/` or `types/`.
- Path alias `@/` → `src/` (add to `tsconfig` + Vite).
- Co-locate page-specific components under the page folder; promote to `ui/` when reused.
- ESLint + Prettier in CI (prototype has eslint config); add `typecheck` to CI (script exists).
- Tests: component tests for `ui/` primitives; integration tests for auth + a critical flow per zone.
