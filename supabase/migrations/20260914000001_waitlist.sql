-- ============================================================================
-- The launch waitlist
--
-- One table, holding email addresses typed into the marketing site by people
-- who want to be told when the app is out.
--
-- The whole design follows from one fact: **the anon key is public.** It is in
-- the source of every page that talks to Supabase, and anybody can read it. So
-- a waitlist reachable with the anon key is a waitlist anybody can download —
-- and a list of email addresses is exactly the kind of thing that ends up on a
-- forum. This table therefore grants *nothing* to `anon` and nothing to
-- `authenticated`: no select, no insert, no update, no delete, and no policy
-- that would let either role do anything at all.
--
-- The only way in is `supabase/functions/waitlist-subscribe`, which holds the
-- service-role key server-side. That is also where the honeypot, the rate
-- limit and the 18+ check live, because none of them can be enforced by a
-- client that an attacker controls.
--
-- Admins can read it, through `private.is_admin()`, so the list is visible in
-- the console without anybody handling a service key.
--
-- See docs/25-the-waitlist.md.
-- ============================================================================

-- ── The list ────────────────────────────────────────────────────────────────

create table if not exists public.waitlist (
  id                uuid primary key default gen_random_uuid(),

  email             text        not null,
  /* Optional, and deliberately one field rather than two. A launch email is
     addressed "Hi Layla"; a surname buys nothing and makes the record more
     identifying. */
  first_name        text,

  /* pending  — typed in, not yet confirmed. Never emailed except to confirm.
     confirmed — clicked the link in the confirmation email. The only state
                 that may receive a campaign.
     unsubscribed — asked to stop. Kept, rather than deleted, so a later import
                 cannot silently resurrect them. */
  status            text        not null default 'pending'
                    check (status in ('pending', 'confirmed', 'unsubscribed')),

  /* Where the sign-up came from, so a campaign can be attributed without any
     tracking script: 'site-launch', 'site-footer', and so on. */
  source            text        not null default 'site',
  locale            text,

  /* Double opt-in. Until `confirmed_at` is set, the address is unproven — the
     defence against somebody typing in a colleague's address, and what most
     consent regimes expect. */
  confirm_token     uuid        not null default gen_random_uuid(),
  confirmed_at      timestamptz,
  confirm_sent_at   timestamptz,

  unsubscribe_token uuid        not null default gen_random_uuid(),
  unsubscribed_at   timestamptz,

  /* Consent evidence. `consent_text` stores the exact wording shown at the
     time, because "they agreed" is worth nothing without "to what" — and the
     wording on the page will change. */
  consent_at        timestamptz not null default now(),
  consent_text      text        not null,
  /* The person ticked an "I am 18 or over" box. The app is 13+, and a
     marketing list quietly full of fourteen-year-olds would contradict the
     strongest promise in the product (docs/12). Under-18s are sent to the app,
     where guardian consent is a real flow rather than a checkbox. */
  is_adult          boolean     not null default false check (is_adult),

  /* Peppered, never raw. Enough to rate-limit and to show a pattern of abuse;
     not a stored IP address against a name. */
  ip_hash           text,

  /* Whether the address reached the campaign tool. Null means no provider is
     configured, which is a normal state — see the edge function. */
  synced_at         timestamptz,
  sync_provider     text,
  sync_error        text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

/* One row per address. No citext in this database, so the index normalises the
   same way the endorsements one does — and the edge function stores the
   normalised form, so the two can never disagree. */
create unique index if not exists idx_waitlist_email
  on public.waitlist (lower(btrim(email)));

create index if not exists idx_waitlist_status  on public.waitlist (status, created_at desc);
create index if not exists idx_waitlist_confirm on public.waitlist (confirm_token);
create index if not exists idx_waitlist_unsub   on public.waitlist (unsubscribe_token);
/* Rate limiting asks "how many from this address recently", so it wants the
   time as well as the hash. */
create index if not exists idx_waitlist_ip      on public.waitlist (ip_hash, created_at desc)
  where ip_hash is not null;

comment on table public.waitlist is
  'Launch waitlist from the marketing site. Written only by the waitlist-subscribe edge function; anon and authenticated have no access at all.';

-- ── Keep `updated_at` honest ────────────────────────────────────────────────

create or replace function private.touch_waitlist()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_waitlist_touch on public.waitlist;
create trigger trg_waitlist_touch
  before update on public.waitlist
  for each row execute function private.touch_waitlist();

-- ── Access ──────────────────────────────────────────────────────────────────

alter table public.waitlist enable row level security;
/* Belt and braces. RLS alone is bypassed by a table owner; FORCE closes that
   for every role including the one that created the table. */
alter table public.waitlist force row level security;

/* Explicit, rather than relying on a default. The anon key is public: if this
   line is ever removed, everybody on the list is downloadable by anybody. */
revoke all on public.waitlist from anon, authenticated;

/* Exactly one policy, and it is a read for admins. There is deliberately no
   insert policy — the service role bypasses RLS, and nothing else may write.
   `to authenticated` matters: a policy granted `to public` would also be
   evaluated for `anon`. */
drop policy if exists waitlist_admin_select on public.waitlist;
create policy waitlist_admin_select on public.waitlist
  for select to authenticated
  using (private.is_admin());

grant select on public.waitlist to authenticated;  -- narrowed by the policy above

-- ── Confirm and unsubscribe ─────────────────────────────────────────────────
-- These are functions rather than updates written inside the edge function so
-- that "what confirming means" is stated once, in the database.
--
-- They live in `public` and not in `private` for a mechanical reason: PostgREST
-- exposes only `public` (`db-schemas` in the local harness, Exposed schemas in
-- the dashboard), so a `private` function cannot be reached by `rpc()` at all.
-- Being in `public` does not make them callable — EXECUTE is revoked from
-- `anon` and `authenticated` below, and granted to `service_role` only, which
-- is the edge function and nothing else.

create or replace function public.confirm_waitlist(p_token uuid)
returns text
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_status text;
begin
  update public.waitlist
     set status       = 'confirmed',
         confirmed_at = coalesce(confirmed_at, now())
   where confirm_token = p_token
     /* Confirming does not reanimate somebody who has since unsubscribed. */
     and status <> 'unsubscribed'
  returning status into v_status;

  /* A second click on the same link is a success, not an error — people
     double-click, and mail clients prefetch. */
  if v_status is null then
    select status into v_status from public.waitlist where confirm_token = p_token;
  end if;

  return v_status;  -- null only when the token is genuinely unknown
end;
$$;

create or replace function public.unsubscribe_waitlist(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_found boolean;
begin
  update public.waitlist
     set status          = 'unsubscribed',
         unsubscribed_at = coalesce(unsubscribed_at, now())
   where unsubscribe_token = p_token
  returning true into v_found;

  return coalesce(v_found, false);
end;
$$;

/* PostgreSQL grants EXECUTE on a new function to PUBLIC, which `anon`
   inherits. `0907/06` closed the schema with `alter default privileges`, but
   that binds only objects created by the role that ran it — so every new
   function here must revoke explicitly or it is callable by any visitor.
   This bit the meetup work; see docs/21. */
revoke all on function private.touch_waitlist()           from public, anon, authenticated;
revoke all on function public.confirm_waitlist(uuid)      from public, anon, authenticated;
revoke all on function public.unsubscribe_waitlist(uuid)  from public, anon, authenticated;

/* The edge function, and only the edge function. `service_role` bypasses RLS
   and is never handed to a browser. */
grant execute on function public.confirm_waitlist(uuid)     to service_role;
grant execute on function public.unsubscribe_waitlist(uuid) to service_role;
