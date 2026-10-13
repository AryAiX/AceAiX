# AceAiX Admin Console (`admin/`)

Web admin panel for the AceAiX mobile app. It runs on the **same Supabase project as the app**.
Admins sign in with a normal account whose role is `admin` or `super_admin`.

- **Front end:** this folder (Vite + React + TypeScript + Tailwind + TanStack Query).
- **Back end:** `supabase/migrations/20261013000001_admin_console.sql`. It adds 22 `admin_*` RPCs.
  Each one checks `private.is_admin()` on the server and writes to `audit_logs`.
- The browser never gets a service-role key. If someone who is not an admin signs in, every call is refused with `42501`.

## What it does

| Page | What an admin can do |
|------|----------------------|
| Dashboard | See every queue that needs action, plus growth numbers, a 30-day sign-up chart, users by role and reports by reason. |
| Reports | Work the queue of in-app reports. Child-safety and minor-related reports always come first. The admin sees the reported post, story, comment or message (with media) and can **Dismiss**, **Remove content**, **Warn**, **Suspend (1/3/7/30 days) or Ban**, or **Escalate**. One decision closes every duplicate report on the same item. |
| Account approval | Approve, reject or ask for more information on verification requests, with documents shown. Can also verify coaches, clubs, scouts and sponsors who never asked. Unverified sponsors cannot make offers. |
| Content | Browse posts, reels, stories, highlight clips and comments, including hidden ones. Can hide for review, remove (the author is told why) or restore. Can filter to content by minors. |
| Users | Search by name, email, country or id. Filter by role, suspended, unverified, minors or reported. |
| User detail | See the profile, activity, guardian consent and its scopes, reports against the user, and admin history. Can warn, verify or unverify, suspend, ban or reinstate. A super admin can also change the role. |
| Youth safety | See every minor with their consent state and guardian. See adult↔minor conversations as **metadata only** (counts, timing, flags). Message text appears only when a message is reported. |
| Sponsorship | See offers, sponsor calls and athlete requests. Can withdraw or close any of them. Flags a minor who has no sponsorship consent. |
| Coach bookings | See upcoming, past and cancelled sessions. Can cancel a session; the athlete, guardian and coach are notified. |
| Audit log | See every admin action with who, when, the reason, and before/after JSON. |

When a user is suspended, they are signed out (their `auth.sessions` are deleted). Their profile and content disappear from the app through the existing RLS.

## Deploy (for Tooraj / Abud)

1. Merge the branch. Apply the migration: `supabase db push`, or run
   `supabase/migrations/20261013000001_admin_console.sql`. It must run **after** the six migrations already in `HANDOVER.md`.
2. Make sure there is a super admin. If there is none, run from `web/`:
   `SB_URL=… SB_SVC=<service_role> SUPER_ADMIN_EMAIL=… SUPER_ADMIN_PASSWORD=… npm run create:super-admin`.
3. Open `admin/` and copy `.env.example` to `.env`. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Use the same values as the mobile app.
4. Run `npm install`, then `npm run build`. The output goes to `admin/dist`.
5. Deploy `admin/` to Vercel as its own project. Set the root directory to `admin` and add the two env vars. `vercel.json` already has the SPA rewrite and the noindex and no-frame headers.
6. Put it on a subdomain such as `admin.aceaix.com`. Optional: limit access by IP or with Vercel password protection, as a second layer.
7. Add more moderators: sign in as super admin, go to **Users**, open the person, and set **Role → Admin**.
8. Optional: schedule `select public.admin_lift_expired_suspensions();` hourly with pg_cron. The dashboard also runs it each time it loads.

## Run locally against the demo backend

1. From the repo root, run `./tools/local-supabase/start.sh`. It applies every migration, including the admin console one.
2. Run `psql -d aceaix_local -f supabase/seeds/admin-demo.sql`. This adds the admin accounts, sample reports and verification requests.
3. In `admin/.env.local`, set `VITE_SUPABASE_URL=http://localhost:8790` and `VITE_SUPABASE_ANON_KEY=<the key start.sh prints>`.
4. Run `npm install`, then `npm run dev`. Open http://localhost:5180.
5. Sign in as `admin.demo@aceaix.com` (super admin) or `mod.demo@aceaix.com` (admin). The password for both is `AceAiX-Demo-2026`.

Do **not** load `admin-demo.sql` into production.

## Tests

`./supabase/tests/run-all.sh` covers the new console in the **admin console** section. It checks that:

- non-admins are refused
- a report can be resolved with a suspension, and this removes the post
- the action is written to the audit log
- reinstatement works
- only a super admin can change a role
- an admin cannot suspend themselves

## Relationship to `web/`

`web/` is the old web platform. Its admin pages pre-date moderation, sponsorship and booking, and they write to tables directly, which RLS now blocks. This console replaces them. `web/` can be retired once this is live.
