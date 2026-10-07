-- ============================================================
-- Sponsorship
--
-- Many young athletes, above all in individual sports, cannot pay for a
-- tournament; many companies would like to. This connects them, both ways:
--
--   an athlete posts a REQUEST   "I need 4,000 AED for the Dubai Open in March"
--   a sponsor posts a CALL       "We back five tennis players this season"
--   either side answers the other with a DEAL: an offer on a request, or an
--                                application to a call. The other side says
--                                yes or no.
--
-- No money moves through AceAiX. A deal that is accepted means "we agree to
-- talk"; the contract and the payment happen outside the app.
--
-- The safety rules, in one place:
--
--   * Only a VERIFIED sponsor may post a call or make an offer. An account
--     that says it is a brand is the oldest way there is to reach a teenager.
--   * A minor may ask for sponsorship, or apply to a call, only while a
--     guardian's consent carries the new `sponsorship` scope — and then the
--     request is visible to others at all.
--   * A sponsor can make an offer only on an open request. An athlete who has
--     not said they are looking is not sent money offers.
--   * A minor only sees calls the sponsor marked as open to under-18s.
--   * Every offer to a minor, and every answer, is also sent to the guardians
--     who hold an account; a linked guardian can answer for the minor.
--   * A sponsor is NOT added to the roles that may open a conversation with a
--     minor (private.is_verified_adult). The deal is the channel.
--   * The amount an athlete asks for is shown to verified sponsors, to the
--     athlete, to their guardians and to admins. Everybody else sees that the
--     athlete is looking, and for what — not how much.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Signup may pick `sponsor` — and may not pick anything it was never offered
--
-- The trigger used to list the roles signup could NOT claim. `super_admin`
-- was added to the enum later (0015) and never added to that list, so signup
-- metadata of {"role":"super_admin"} produced a super admin. A deny-list of
-- an enum that grows is wrong by construction; this is an allow-list.
-- ------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role      public.user_role;
  v_full_name text;
  v_first     text;
  v_last      text;
begin
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_first     := nullif(new.raw_user_meta_data ->> 'first_name', '');
  v_last      := nullif(new.raw_user_meta_data ->> 'last_name', '');

  if v_full_name = '' and (v_first is not null or v_last is not null) then
    v_full_name := trim(coalesce(v_first, '') || ' ' || coalesce(v_last, ''));
  end if;

  begin
    v_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  exception when others then
    v_role := 'athlete';
  end;

  -- Roles are never escalated through signup metadata: anything that is not a
  -- role a person may choose for themselves becomes an athlete.
  if v_role is null
     or v_role::text not in ('athlete', 'coach', 'club', 'scout', 'guardian', 'guest', 'sponsor') then
    v_role := 'athlete';
  end if;

  insert into public.user_profiles (id, role, full_name, first_name, last_name)
  values (new.id, v_role, nullif(v_full_name, ''), v_first, v_last)
  on conflict (id) do nothing;

  insert into public.user_private (user_id, email, phone)
  values (new.id, new.email, new.phone)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if v_role = 'athlete' then
    insert into public.athlete_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
  elsif v_role = 'coach' then
    insert into public.coach_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
  elsif v_role in ('scout','club') then
    insert into public.scout_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
    insert into public.match_preferences (user_id)
    values (new.id) on conflict (user_id) do nothing;
  elsif v_role::text = 'sponsor' then
    insert into public.sponsor_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 1. A fifth guardian scope
-- ------------------------------------------------------------
alter table public.guardian_consents
  add column if not exists allow_sponsorship boolean not null default false;

grant select (allow_sponsorship) on public.guardian_consents to authenticated;

create or replace function private.has_guardian_consent(p_user uuid, p_scope text default 'messaging')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.guardian_consents g
    where g.minor_user_id = p_user
      and g.status = 'granted'
      and case p_scope
            when 'messaging'   then g.allow_messaging
            when 'discovery'   then g.allow_discovery
            when 'media'       then g.allow_media
            when 'assessments' then g.allow_assessments
            when 'sponsorship' then g.allow_sponsorship
            else true
          end
  );
$$;

/* The confirm call gains the fifth decision, off unless ticked: approving a
   profile is not approving a commercial relationship with a company. */
drop function if exists public.confirm_guardian_consent(text, boolean, boolean, boolean, boolean);

create or replace function public.confirm_guardian_consent(
  p_token             text,
  p_allow_discovery   boolean default true,
  p_allow_messaging   boolean default true,
  p_allow_media       boolean default true,
  p_allow_assessments boolean default false,
  p_allow_sponsorship boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.guardian_consents;
begin
  select * into v_row from public.guardian_consents
  where token = p_token and status = 'pending';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_used_token');
  end if;
  if v_row.token_expires_at < now() then
    update public.guardian_consents set status = 'expired', updated_at = now()
    where id = v_row.id;
    return jsonb_build_object('ok', false, 'error', 'token_expired');
  end if;

  update public.guardian_consents
     set status = 'expired', updated_at = now()
   where minor_user_id = v_row.minor_user_id
     and status = 'granted'
     and id <> v_row.id
     and lower(guardian_email) = lower(v_row.guardian_email);

  update public.guardian_consents
  set status = 'granted',
      granted_at = now(),
      allow_discovery   = coalesce(p_allow_discovery, true),
      allow_messaging   = coalesce(p_allow_messaging, true),
      allow_media       = coalesce(p_allow_media, true),
      allow_assessments = coalesce(p_allow_assessments, false),
      allow_sponsorship = coalesce(p_allow_sponsorship, false),
      updated_at = now()
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'minor_user_id', v_row.minor_user_id,
    'allow_discovery', v_row.allow_discovery,
    'allow_messaging', v_row.allow_messaging,
    'allow_assessments', v_row.allow_assessments,
    'allow_sponsorship', v_row.allow_sponsorship
  );
end;
$$;

revoke all on function public.confirm_guardian_consent(text, boolean, boolean, boolean, boolean, boolean) from public;
grant execute on function public.confirm_guardian_consent(text, boolean, boolean, boolean, boolean, boolean)
  to anon, authenticated;

-- ------------------------------------------------------------
-- 2. Tables
-- ------------------------------------------------------------
create table if not exists public.sponsor_profiles (
  user_id      uuid primary key references public.user_profiles(id) on delete cascade,
  company_name text check (company_name is null or length(company_name) <= 80),
  industry     text check (industry is null or length(industry) <= 60),
  website      text check (website is null or (length(website) <= 200 and website ~* '^https?://')),
  about        text check (about is null or length(about) <= 600),
  sports       text[] not null default '{}',
  countries    text[] not null default '{}',
  offers       text[] not null default '{}',
  budget_min   integer check (budget_min is null or budget_min >= 0),
  budget_max   integer check (budget_max is null or budget_max >= 0),
  currency     text not null default 'AED' check (currency ~ '^[A-Z]{3}$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.sponsor_profiles enable row level security;

create table if not exists public.sponsorship_requests (
  id              uuid primary key default gen_random_uuid(),
  athlete_user_id uuid not null references public.user_profiles(id) on delete cascade,
  title           text not null check (length(btrim(title)) between 3 and 80),
  event_name      text check (event_name is null or length(event_name) <= 120),
  event_date      date,
  location        text check (location is null or length(location) <= 120),
  sport           text,
  needs           text[] not null default '{}',
  gives           text[] not null default '{}',
  amount          integer check (amount is null or amount > 0),
  currency        text not null default 'AED' check (currency ~ '^[A-Z]{3}$'),
  pitch           text check (pitch is null or length(pitch) <= 600),
  status          text not null default 'open' check (status in ('open', 'funded', 'closed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.sponsorship_requests enable row level security;
create index if not exists idx_sponsorship_requests_open
  on public.sponsorship_requests (created_at desc) where status = 'open';
create index if not exists idx_sponsorship_requests_athlete
  on public.sponsorship_requests (athlete_user_id);

create table if not exists public.sponsor_calls (
  id              uuid primary key default gen_random_uuid(),
  sponsor_user_id uuid not null references public.user_profiles(id) on delete cascade,
  title           text not null check (length(btrim(title)) between 3 and 80),
  description     text check (description is null or length(description) <= 800),
  sport           text,
  country         text,
  offers          text[] not null default '{}',
  amount_min      integer check (amount_min is null or amount_min >= 0),
  amount_max      integer check (amount_max is null or amount_max >= 0),
  currency        text not null default 'AED' check (currency ~ '^[A-Z]{3}$'),
  slots           integer not null default 1 check (slots between 1 and 500),
  deadline        date,
  open_to_minors  boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.sponsor_calls enable row level security;
create index if not exists idx_sponsor_calls_active
  on public.sponsor_calls (created_at desc) where is_active;

create table if not exists public.sponsorship_deals (
  id              uuid primary key default gen_random_uuid(),
  sponsor_user_id uuid not null references public.user_profiles(id) on delete cascade,
  athlete_user_id uuid not null references public.user_profiles(id) on delete cascade,
  request_id      uuid references public.sponsorship_requests(id) on delete set null,
  call_id         uuid references public.sponsor_calls(id) on delete set null,
  /* Who opened it: a sponsor's offer on a request, or an athlete's
     application to a call. The other side is the one who answers. */
  initiated_by    text not null check (initiated_by in ('sponsor', 'athlete')),
  message         text check (message is null or length(message) <= 600),
  amount          integer check (amount is null or amount > 0),
  currency        text not null default 'AED' check (currency ~ '^[A-Z]{3}$'),
  status          text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at      timestamptz not null default now(),
  responded_at    timestamptz
);
alter table public.sponsorship_deals enable row level security;
create index if not exists idx_sponsorship_deals_sponsor on public.sponsorship_deals (sponsor_user_id, created_at desc);
create index if not exists idx_sponsorship_deals_athlete on public.sponsorship_deals (athlete_user_id, created_at desc);
/* One live offer per sponsor per request, one live application per athlete per call. */
create unique index if not exists uq_sponsorship_deals_live_request
  on public.sponsorship_deals (sponsor_user_id, request_id) where status = 'pending' and request_id is not null;
create unique index if not exists uq_sponsorship_deals_live_call
  on public.sponsorship_deals (athlete_user_id, call_id) where status = 'pending' and call_id is not null;

-- ------------------------------------------------------------
-- 3. Row-level security: read your own; everything else goes through an RPC
--
-- No table here is written by a client. The RPCs below check what a policy
-- cannot say in one line (verified sponsor, guardian scope, open request).
-- ------------------------------------------------------------
revoke insert, update, delete on public.sponsor_profiles     from authenticated, anon;
revoke insert, update, delete on public.sponsorship_requests from authenticated, anon;
revoke insert, update, delete on public.sponsor_calls        from authenticated, anon;
revoke insert, update, delete on public.sponsorship_deals    from authenticated, anon;
revoke select on public.sponsor_profiles, public.sponsorship_requests,
                 public.sponsor_calls, public.sponsorship_deals from anon;

grant select on public.sponsor_profiles, public.sponsorship_requests,
                public.sponsor_calls, public.sponsorship_deals to authenticated;

drop policy if exists sponsor_profiles_select on public.sponsor_profiles;
create policy sponsor_profiles_select on public.sponsor_profiles
for select to authenticated
using (
  user_id = auth.uid()
  or private.is_admin()
  or (private.viewer_can_see_author(user_id) and not private.users_are_blocked(auth.uid(), user_id))
);

drop policy if exists sponsorship_requests_select on public.sponsorship_requests;
create policy sponsorship_requests_select on public.sponsorship_requests
for select to authenticated
using (
  athlete_user_id = auth.uid()
  or private.is_admin()
  or exists (
    select 1 from public.guardian_consents g
    where g.minor_user_id = sponsorship_requests.athlete_user_id
      and g.guardian_user_id = auth.uid()
      and g.status = 'granted'
  )
);

drop policy if exists sponsor_calls_select on public.sponsor_calls;
create policy sponsor_calls_select on public.sponsor_calls
for select to authenticated
using (sponsor_user_id = auth.uid() or private.is_admin());

drop policy if exists sponsorship_deals_select on public.sponsorship_deals;
create policy sponsorship_deals_select on public.sponsorship_deals
for select to authenticated
using (
  sponsor_user_id = auth.uid()
  or athlete_user_id = auth.uid()
  or private.is_admin()
  or exists (
    select 1 from public.guardian_consents g
    where g.minor_user_id = sponsorship_deals.athlete_user_id
      and g.guardian_user_id = auth.uid()
      and g.status = 'granted'
  )
);

-- ------------------------------------------------------------
-- 4. Private helpers — reached only through the RPCs below
-- ------------------------------------------------------------
/* May the caller see that this athlete is looking for a sponsor at all? */
create or replace function private.sponsorship_visible(p_athlete uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p_athlete = auth.uid()
    or private.is_admin()
    or exists (
      select 1 from public.guardian_consents g
      where g.minor_user_id = p_athlete and g.guardian_user_id = auth.uid() and g.status = 'granted'
    )
    or (
      auth.uid() is not null
      and private.viewer_can_see_author(p_athlete)
      and not private.users_are_blocked(auth.uid(), p_athlete)
      and exists (
        select 1 from public.user_profiles u
        where u.id = p_athlete
          and (not coalesce(u.is_minor, false) or private.has_guardian_consent(p_athlete, 'sponsorship'))
      )
    );
$$;

/* May the caller see how much the athlete is asking for? */
create or replace function private.sponsorship_sees_amount(p_athlete uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p_athlete = auth.uid()
    or private.is_admin()
    or exists (
      select 1 from public.guardian_consents g
      where g.minor_user_id = p_athlete and g.guardian_user_id = auth.uid() and g.status = 'granted'
    )
    or exists (
      select 1 from public.user_profiles me
      where me.id = auth.uid() and me.role::text = 'sponsor' and me.is_verified and not me.is_suspended
    );
$$;

/* The caller, if they are a sponsor allowed to act: verified, not suspended. */
create or replace function private.require_verified_sponsor()
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_me public.user_profiles;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if v_me.role::text <> 'sponsor' or v_me.is_suspended then
    raise exception 'Only a sponsor account can do this'
      using errcode = '42501', hint = 'sponsor_only';
  end if;
  if not v_me.is_verified then
    raise exception 'Your sponsor account has not been verified yet'
      using errcode = '42501', hint = 'sponsor_not_verified';
  end if;
end;
$$;

/* Keep only the tags the app knows; a client cannot invent one. */
create or replace function private.sponsorship_tags(p_value jsonb, p_allowed text[])
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(distinct t order by t), '{}')
  from jsonb_array_elements_text(case when jsonb_typeof(p_value) = 'array' then p_value else '[]'::jsonb end) t
  where t = any (p_allowed);
$$;

/* Tell the guardians who hold an account. */
create or replace function private.sponsorship_notify_guardians(
  p_minor uuid, p_type text, p_title text, p_actor uuid, p_deal uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_guardian uuid;
begin
  if not exists (select 1 from public.user_profiles where id = p_minor and is_minor) then
    return;
  end if;
  for v_guardian in
    select distinct g.guardian_user_id from public.guardian_consents g
    where g.minor_user_id = p_minor and g.status = 'granted' and g.guardian_user_id is not null
  loop
    perform private.notify(v_guardian, 'opportunity', p_type, p_title, null, p_actor,
                           'sponsorship', p_deal::text, null,
                           jsonb_build_object('deal_id', p_deal, 'minor_user_id', p_minor));
  end loop;
end;
$$;

revoke all on function private.sponsorship_visible(uuid)       from public, anon, authenticated;
revoke all on function private.sponsorship_sees_amount(uuid)   from public, anon, authenticated;
revoke all on function private.require_verified_sponsor()      from public, anon, authenticated;
revoke all on function private.sponsorship_tags(jsonb, text[]) from public, anon, authenticated;
revoke all on function private.sponsorship_notify_guardians(uuid, text, text, uuid, uuid)
  from public, anon, authenticated;

-- ------------------------------------------------------------
-- 5. The sponsor's brand profile
-- ------------------------------------------------------------
create or replace function public.save_sponsor_profile(p jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me  public.user_profiles;
  v_min integer := nullif(p ->> 'budget_min', '')::integer;
  v_max integer := nullif(p ->> 'budget_max', '')::integer;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found or v_me.role::text <> 'sponsor' then
    raise exception 'Only a sponsor account has a brand profile'
      using errcode = '42501', hint = 'sponsor_only';
  end if;
  if v_min is not null and v_max is not null and v_min > v_max then
    raise exception 'The budget range is upside down' using errcode = '22023', hint = 'sponsorship_range';
  end if;

  insert into public.sponsor_profiles as sp
    (user_id, company_name, industry, website, about, sports, countries, offers,
     budget_min, budget_max, currency, updated_at)
  values (
    v_me.id,
    nullif(btrim(p ->> 'company_name'), ''),
    nullif(btrim(p ->> 'industry'), ''),
    nullif(btrim(p ->> 'website'), ''),
    nullif(btrim(p ->> 'about'), ''),
    coalesce((select array_agg(distinct s) from jsonb_array_elements_text(
      case when jsonb_typeof(p -> 'sports') = 'array' then p -> 'sports' else '[]'::jsonb end) s
      where length(s) between 1 and 40), '{}'),
    coalesce((select array_agg(distinct c) from jsonb_array_elements_text(
      case when jsonb_typeof(p -> 'countries') = 'array' then p -> 'countries' else '[]'::jsonb end) c
      where length(c) between 1 and 60), '{}'),
    private.sponsorship_tags(p -> 'offers', array['cash', 'equipment', 'travel', 'coaching', 'nutrition']),
    v_min, v_max,
    coalesce(nullif(upper(btrim(p ->> 'currency')), ''), 'AED'),
    now()
  )
  on conflict (user_id) do update set
    company_name = excluded.company_name,
    industry     = excluded.industry,
    website      = excluded.website,
    about        = excluded.about,
    sports       = excluded.sports,
    countries    = excluded.countries,
    offers       = excluded.offers,
    budget_min   = excluded.budget_min,
    budget_max   = excluded.budget_max,
    currency     = excluded.currency,
    updated_at   = now();
end;
$$;

-- ------------------------------------------------------------
-- 6. The athlete's request
-- ------------------------------------------------------------
create or replace function public.save_sponsorship_request(p_id uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me  public.user_profiles;
  v_id  uuid;
  v_sport text;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if v_me.role <> 'athlete' or v_me.is_suspended then
    raise exception 'Only an athlete can ask for sponsorship'
      using errcode = '42501', hint = 'athlete_only';
  end if;
  if v_me.is_minor and not private.has_guardian_consent(v_me.id, 'sponsorship') then
    raise exception 'A parent or guardian has to approve sponsorship first'
      using errcode = '42501', hint = 'guardian_consent_required';
  end if;
  if length(btrim(coalesce(p ->> 'title', ''))) < 3 then
    raise exception 'Say what the sponsorship is for' using errcode = '22023', hint = 'sponsorship_title';
  end if;

  select sport into v_sport from public.athlete_profiles where user_id = v_me.id;

  if p_id is null then
    if (select count(*) from public.sponsorship_requests
        where athlete_user_id = v_me.id and status = 'open') >= 3 then
      raise exception 'Three open requests at a time'
        using errcode = '22023', hint = 'sponsorship_request_limit';
    end if;
    insert into public.sponsorship_requests
      (athlete_user_id, title, event_name, event_date, location, sport, needs, gives, amount, currency, pitch)
    values (
      v_me.id,
      btrim(p ->> 'title'),
      nullif(btrim(p ->> 'event_name'), ''),
      nullif(p ->> 'event_date', '')::date,
      nullif(btrim(p ->> 'location'), ''),
      v_sport,
      private.sponsorship_tags(p -> 'needs', array['entry_fee', 'travel', 'equipment', 'coaching', 'nutrition', 'other']),
      private.sponsorship_tags(p -> 'gives', array['logo_on_kit', 'social_posts', 'appearances', 'content', 'testimonial']),
      nullif(p ->> 'amount', '')::integer,
      coalesce(nullif(upper(btrim(p ->> 'currency')), ''), 'AED'),
      nullif(btrim(p ->> 'pitch'), '')
    )
    returning id into v_id;
  else
    update public.sponsorship_requests set
      title      = btrim(p ->> 'title'),
      event_name = nullif(btrim(p ->> 'event_name'), ''),
      event_date = nullif(p ->> 'event_date', '')::date,
      location   = nullif(btrim(p ->> 'location'), ''),
      sport      = v_sport,
      needs      = private.sponsorship_tags(p -> 'needs', array['entry_fee', 'travel', 'equipment', 'coaching', 'nutrition', 'other']),
      gives      = private.sponsorship_tags(p -> 'gives', array['logo_on_kit', 'social_posts', 'appearances', 'content', 'testimonial']),
      amount     = nullif(p ->> 'amount', '')::integer,
      currency   = coalesce(nullif(upper(btrim(p ->> 'currency')), ''), 'AED'),
      pitch      = nullif(btrim(p ->> 'pitch'), ''),
      updated_at = now()
    where id = p_id and athlete_user_id = v_me.id
    returning id into v_id;
    if v_id is null then
      raise exception 'Request not found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.set_sponsorship_request_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_me public.user_profiles;
begin
  if p_status not in ('open', 'funded', 'closed') then
    raise exception 'Unknown status' using errcode = '22023';
  end if;
  select * into v_me from public.user_profiles where id = auth.uid();
  /* Re-opening is a new ask to the world, so it passes the same gates. */
  if p_status = 'open' then
    if v_me.is_minor and not private.has_guardian_consent(v_me.id, 'sponsorship') then
      raise exception 'A parent or guardian has to approve sponsorship first'
        using errcode = '42501', hint = 'guardian_consent_required';
    end if;
    if (select count(*) from public.sponsorship_requests
        where athlete_user_id = auth.uid() and status = 'open' and id <> p_id) >= 3 then
      raise exception 'Three open requests at a time'
        using errcode = '22023', hint = 'sponsorship_request_limit';
    end if;
  end if;
  update public.sponsorship_requests set status = p_status, updated_at = now()
  where id = p_id and athlete_user_id = auth.uid();
  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  /* A request that is no longer open cannot be offered on: pending offers end. */
  if p_status <> 'open' then
    update public.sponsorship_deals set status = 'declined', responded_at = now()
    where request_id = p_id and status = 'pending' and initiated_by = 'sponsor';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 7. The sponsor's call
-- ------------------------------------------------------------
create or replace function public.save_sponsor_call(p_id uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id  uuid;
  v_min integer := nullif(p ->> 'amount_min', '')::integer;
  v_max integer := nullif(p ->> 'amount_max', '')::integer;
begin
  perform private.require_verified_sponsor();
  if length(btrim(coalesce(p ->> 'title', ''))) < 3 then
    raise exception 'Give the call a title' using errcode = '22023', hint = 'sponsorship_title';
  end if;
  if v_min is not null and v_max is not null and v_min > v_max then
    raise exception 'The amount range is upside down' using errcode = '22023', hint = 'sponsorship_range';
  end if;

  if p_id is null then
    if (select count(*) from public.sponsor_calls
        where sponsor_user_id = auth.uid() and is_active) >= 10 then
      raise exception 'Ten open calls at a time' using errcode = '22023', hint = 'sponsor_call_limit';
    end if;
    insert into public.sponsor_calls
      (sponsor_user_id, title, description, sport, country, offers, amount_min, amount_max,
       currency, slots, deadline, open_to_minors)
    values (
      auth.uid(),
      btrim(p ->> 'title'),
      nullif(btrim(p ->> 'description'), ''),
      nullif(btrim(p ->> 'sport'), ''),
      nullif(btrim(p ->> 'country'), ''),
      private.sponsorship_tags(p -> 'offers', array['cash', 'equipment', 'travel', 'coaching', 'nutrition']),
      v_min, v_max,
      coalesce(nullif(upper(btrim(p ->> 'currency')), ''), 'AED'),
      coalesce(nullif(p ->> 'slots', '')::integer, 1),
      nullif(p ->> 'deadline', '')::date,
      coalesce((p ->> 'open_to_minors')::boolean, false)
    )
    returning id into v_id;
  else
    update public.sponsor_calls set
      title          = btrim(p ->> 'title'),
      description    = nullif(btrim(p ->> 'description'), ''),
      sport          = nullif(btrim(p ->> 'sport'), ''),
      country        = nullif(btrim(p ->> 'country'), ''),
      offers         = private.sponsorship_tags(p -> 'offers', array['cash', 'equipment', 'travel', 'coaching', 'nutrition']),
      amount_min     = v_min,
      amount_max     = v_max,
      currency       = coalesce(nullif(upper(btrim(p ->> 'currency')), ''), 'AED'),
      slots          = coalesce(nullif(p ->> 'slots', '')::integer, 1),
      deadline       = nullif(p ->> 'deadline', '')::date,
      open_to_minors = coalesce((p ->> 'open_to_minors')::boolean, false),
      updated_at     = now()
    where id = p_id and sponsor_user_id = auth.uid()
    returning id into v_id;
    if v_id is null then
      raise exception 'Call not found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.set_sponsor_call_active(p_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_active then
    perform private.require_verified_sponsor();
  end if;
  update public.sponsor_calls set is_active = coalesce(p_active, false), updated_at = now()
  where id = p_id and sponsor_user_id = auth.uid();
  if not found then
    raise exception 'Call not found' using errcode = 'P0002';
  end if;
  if not coalesce(p_active, false) then
    update public.sponsorship_deals set status = 'declined', responded_at = now()
    where call_id = p_id and status = 'pending' and initiated_by = 'athlete';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 8. Deals: an offer, an application, and the answer
-- ------------------------------------------------------------
create or replace function public.sponsor_make_offer(
  p_request uuid, p_message text default null, p_amount integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_req  public.sponsorship_requests;
  v_id   uuid;
  v_name text;
begin
  perform private.require_verified_sponsor();
  select * into v_req from public.sponsorship_requests where id = p_request and status = 'open';
  /* The same answer for "no such request" and "not yours to see". */
  if not found or not private.sponsorship_visible(v_req.athlete_user_id) then
    raise exception 'That request is not open' using errcode = 'P0002', hint = 'sponsorship_request_closed';
  end if;
  if length(coalesce(p_message, '')) > 600 then
    raise exception 'Message too long' using errcode = '22023';
  end if;
  if exists (select 1 from public.sponsorship_deals
             where sponsor_user_id = auth.uid() and request_id = p_request and status = 'pending') then
    raise exception 'You already have an offer waiting on this request'
      using errcode = '23505', hint = 'sponsorship_already_sent';
  end if;

  insert into public.sponsorship_deals
    (sponsor_user_id, athlete_user_id, request_id, initiated_by, message, amount, currency)
  values (auth.uid(), v_req.athlete_user_id, p_request, 'sponsor',
          nullif(btrim(p_message), ''), p_amount, v_req.currency)
  returning id into v_id;

  select coalesce(sp.company_name, up.full_name, 'A sponsor') into v_name
  from public.user_profiles up left join public.sponsor_profiles sp on sp.user_id = up.id
  where up.id = auth.uid();

  perform private.notify(v_req.athlete_user_id, 'opportunity', 'sponsorship_offer',
    v_name || ' made a sponsorship offer for ' || v_req.title, null, auth.uid(),
    'sponsorship', v_id::text, null, jsonb_build_object('deal_id', v_id, 'request_id', p_request));
  perform private.sponsorship_notify_guardians(v_req.athlete_user_id, 'sponsorship_offer',
    v_name || ' made a sponsorship offer to your child', auth.uid(), v_id);
  return v_id;
end;
$$;

create or replace function public.apply_to_sponsor_call(p_call uuid, p_message text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me   public.user_profiles;
  v_call public.sponsor_calls;
  v_id   uuid;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if v_me.role <> 'athlete' or v_me.is_suspended then
    raise exception 'Only an athlete can apply' using errcode = '42501', hint = 'athlete_only';
  end if;

  select c.* into v_call
  from public.sponsor_calls c
  join public.user_profiles s on s.id = c.sponsor_user_id
  where c.id = p_call
    and c.is_active
    and (c.deadline is null or c.deadline >= current_date)
    and s.is_verified and not s.is_suspended
    and not private.users_are_blocked(auth.uid(), c.sponsor_user_id);
  if not found then
    raise exception 'That call is closed' using errcode = 'P0002', hint = 'sponsor_call_closed';
  end if;

  if v_me.is_minor then
    if not v_call.open_to_minors then
      raise exception 'That call is for adults' using errcode = '42501', hint = 'sponsor_call_adults_only';
    end if;
    if not private.has_guardian_consent(v_me.id, 'sponsorship') then
      raise exception 'A parent or guardian has to approve sponsorship first'
        using errcode = '42501', hint = 'guardian_consent_required';
    end if;
  end if;
  if length(coalesce(p_message, '')) > 600 then
    raise exception 'Message too long' using errcode = '22023';
  end if;
  if exists (select 1 from public.sponsorship_deals
             where athlete_user_id = v_me.id and call_id = p_call and status in ('pending', 'accepted')) then
    raise exception 'You have already applied' using errcode = '23505', hint = 'sponsorship_already_sent';
  end if;

  insert into public.sponsorship_deals
    (sponsor_user_id, athlete_user_id, call_id, initiated_by, message, currency)
  values (v_call.sponsor_user_id, v_me.id, p_call, 'athlete', nullif(btrim(p_message), ''), v_call.currency)
  returning id into v_id;

  perform private.notify(v_call.sponsor_user_id, 'opportunity', 'sponsorship_application',
    coalesce(v_me.full_name, 'An athlete') || ' applied to ' || v_call.title, null, v_me.id,
    'sponsorship', v_id::text, null, jsonb_build_object('deal_id', v_id, 'call_id', p_call));
  perform private.sponsorship_notify_guardians(v_me.id, 'sponsorship_application',
    'Your child applied to a sponsorship call: ' || v_call.title, v_me.id, v_id);
  return v_id;
end;
$$;

create or replace function public.respond_sponsorship(p_deal uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deal     public.sponsorship_deals;
  v_guardian boolean;
  v_status   text := case when p_accept then 'accepted' else 'declined' end;
  v_who      text;
  v_other    uuid;
begin
  select * into v_deal from public.sponsorship_deals where id = p_deal for update;
  if not found then
    raise exception 'Not found' using errcode = 'P0002';
  end if;

  v_guardian := exists (
    select 1 from public.guardian_consents g
    where g.minor_user_id = v_deal.athlete_user_id and g.guardian_user_id = auth.uid() and g.status = 'granted'
  );

  /* The side that did not open it answers. A linked guardian may answer in the
     minor's place, and may always say no. */
  if v_deal.initiated_by = 'sponsor' then
    if auth.uid() <> v_deal.athlete_user_id and not v_guardian then
      raise exception 'Not yours to answer' using errcode = '42501';
    end if;
  else
    if auth.uid() <> v_deal.sponsor_user_id and not (v_guardian and not p_accept) then
      raise exception 'Not yours to answer' using errcode = '42501';
    end if;
  end if;
  if v_deal.status <> 'pending' then
    raise exception 'Already answered' using errcode = '22023', hint = 'sponsorship_already_answered';
  end if;
  /* Saying yes to a sponsor is a new step in a commercial relationship; a
     minor's guardian must still be on board at that moment. */
  if p_accept
     and exists (select 1 from public.user_profiles where id = v_deal.athlete_user_id and is_minor)
     and not private.has_guardian_consent(v_deal.athlete_user_id, 'sponsorship') then
    raise exception 'A parent or guardian has to approve sponsorship first'
      using errcode = '42501', hint = 'guardian_consent_required';
  end if;
  if p_accept and auth.uid() = v_deal.sponsor_user_id then
    perform private.require_verified_sponsor();
  end if;

  update public.sponsorship_deals set status = v_status, responded_at = now() where id = p_deal;

  select coalesce(sp.company_name, up.full_name, 'Someone') into v_who
  from public.user_profiles up left join public.sponsor_profiles sp on sp.user_id = up.id
  where up.id = auth.uid();
  v_other := case when v_deal.initiated_by = 'sponsor' then v_deal.sponsor_user_id else v_deal.athlete_user_id end;

  perform private.notify(v_other, 'opportunity', 'sponsorship_response',
    v_who || case when p_accept then ' accepted your sponsorship ' else ' declined your sponsorship ' end
          || case when v_deal.initiated_by = 'sponsor' then 'offer' else 'application' end,
    null, auth.uid(), 'sponsorship', p_deal::text, null,
    jsonb_build_object('deal_id', p_deal, 'status', v_status));
  perform private.sponsorship_notify_guardians(v_deal.athlete_user_id, 'sponsorship_response',
    'A sponsorship ' || case when v_deal.initiated_by = 'sponsor' then 'offer' else 'application' end
      || ' for your child was ' || v_status, auth.uid(), p_deal);
  return v_status;
end;
$$;

create or replace function public.withdraw_sponsorship(p_deal uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.sponsorship_deals set status = 'withdrawn', responded_at = now()
  where id = p_deal
    and status = 'pending'
    and ((initiated_by = 'sponsor' and sponsor_user_id = auth.uid())
      or (initiated_by = 'athlete' and athlete_user_id = auth.uid()));
  if not found then
    raise exception 'Nothing to withdraw' using errcode = 'P0002';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 9. Finding each other
-- ------------------------------------------------------------
/* For sponsors: athletes with an open request. */
create or replace function public.sponsorship_seekers(
  p_sport text default null, p_country text default null, p_query text default null,
  p_limit integer default 20, p_offset integer default 0
)
returns table (
  request_id      uuid,
  athlete_user_id uuid,
  full_name       text,
  avatar_url      text,
  sport           text,
  athlete_position text,
  country         text,
  is_minor        boolean,
  talent_score    integer,
  tier            text,
  title           text,
  event_name      text,
  event_date      date,
  location        text,
  needs           text[],
  gives           text[],
  amount          integer,
  currency        text,
  pitch           text,
  created_at      timestamptz,
  my_offer_status text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_me public.user_profiles;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  /* The list of who needs money is for the people who might give it. */
  if v_me.role::text <> 'sponsor' and not private.is_admin() then
    raise exception 'Only sponsors can browse requests' using errcode = '42501', hint = 'sponsor_only';
  end if;

  return query
  select
    r.id, r.athlete_user_id, up.full_name::text, up.avatar_url::text,
    coalesce(r.sport, ap.sport)::text,
    coalesce(ap.position_primary, ap.position)::text,
    up.country::text,
    coalesce(up.is_minor, false),
    coalesce(ts.overall, 0),
    coalesce(ts.tier, 'rising')::text,
    r.title, r.event_name, r.event_date, r.location, r.needs, r.gives,
    case when private.sponsorship_sees_amount(r.athlete_user_id) then r.amount end,
    r.currency, r.pitch, r.created_at,
    (select d.status from public.sponsorship_deals d
     where d.request_id = r.id and d.sponsor_user_id = v_me.id
     order by d.created_at desc limit 1)
  from public.sponsorship_requests r
  join public.user_profiles up on up.id = r.athlete_user_id
  left join public.athlete_profiles ap on ap.user_id = r.athlete_user_id
  left join public.talent_scores ts on ts.athlete_id = ap.id
  where r.status = 'open'
    and r.athlete_user_id <> v_me.id
    and private.sponsorship_visible(r.athlete_user_id)
    and (p_sport is null or coalesce(r.sport, ap.sport) ilike p_sport)
    and (p_country is null or up.country ilike p_country)
    and (nullif(btrim(p_query), '') is null
         or up.full_name ilike '%' || btrim(p_query) || '%'
         or r.title ilike '%' || btrim(p_query) || '%'
         or r.event_name ilike '%' || btrim(p_query) || '%')
  order by r.created_at desc, r.id
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

/* For everyone: calls from verified sponsors. */
create or replace function public.sponsor_calls_feed(
  p_sport text default null, p_query text default null,
  p_limit integer default 20, p_offset integer default 0
)
returns table (
  call_id         uuid,
  sponsor_user_id uuid,
  sponsor_name    text,
  sponsor_avatar  text,
  company_name    text,
  industry        text,
  title           text,
  description     text,
  sport           text,
  country         text,
  offers          text[],
  amount_min      integer,
  amount_max      integer,
  currency        text,
  slots           integer,
  deadline        date,
  open_to_minors  boolean,
  created_at      timestamptz,
  is_mine         boolean,
  my_status       text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_me public.user_profiles;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  return query
  select
    c.id, c.sponsor_user_id, s.full_name::text, s.avatar_url::text,
    sp.company_name, sp.industry,
    c.title, c.description, c.sport, c.country, c.offers,
    c.amount_min, c.amount_max, c.currency, c.slots, c.deadline, c.open_to_minors, c.created_at,
    c.sponsor_user_id = v_me.id,
    (select d.status from public.sponsorship_deals d
     where d.call_id = c.id and d.athlete_user_id = v_me.id
     order by d.created_at desc limit 1)
  from public.sponsor_calls c
  join public.user_profiles s on s.id = c.sponsor_user_id
  left join public.sponsor_profiles sp on sp.user_id = c.sponsor_user_id
  where c.is_active
    and (c.deadline is null or c.deadline >= current_date)
    and s.is_verified and not s.is_suspended
    and not private.users_are_blocked(v_me.id, c.sponsor_user_id)
    and (not coalesce(v_me.is_minor, false) or c.open_to_minors)
    and (p_sport is null or c.sport is null or c.sport ilike p_sport)
    and (nullif(btrim(p_query), '') is null
         or c.title ilike '%' || btrim(p_query) || '%'
         or sp.company_name ilike '%' || btrim(p_query) || '%'
         or s.full_name ilike '%' || btrim(p_query) || '%')
  order by c.created_at desc, c.id
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

/* For everyone: the sponsors themselves. Verified first. */
create or replace function public.sponsor_directory(p_query text default null, p_limit integer default 30)
returns table (
  user_id      uuid,
  full_name    text,
  avatar_url   text,
  company_name text,
  industry     text,
  about        text,
  sports       text[],
  offers       text[],
  is_verified  boolean,
  open_calls   integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    up.id, up.full_name::text, up.avatar_url::text,
    sp.company_name, sp.industry, sp.about,
    coalesce(sp.sports, '{}'), coalesce(sp.offers, '{}'),
    up.is_verified,
    (select count(*)::integer from public.sponsor_calls c
     where c.sponsor_user_id = up.id and c.is_active
       and (c.deadline is null or c.deadline >= current_date))
  from public.user_profiles up
  left join public.sponsor_profiles sp on sp.user_id = up.id
  where auth.uid() is not null
    and up.role::text = 'sponsor'
    and not up.is_suspended
    and up.id <> auth.uid()
    and not private.users_are_blocked(auth.uid(), up.id)
    and (nullif(btrim(p_query), '') is null
         or up.full_name ilike '%' || btrim(p_query) || '%'
         or sp.company_name ilike '%' || btrim(p_query) || '%'
         or sp.industry ilike '%' || btrim(p_query) || '%')
  order by up.is_verified desc, 10 desc, coalesce(sp.company_name, up.full_name)
  limit greatest(1, least(coalesce(p_limit, 30), 60));
$$;

-- ------------------------------------------------------------
-- 10. The portal: everything of mine in one read
-- ------------------------------------------------------------
create or replace function public.my_sponsorship()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me public.user_profiles;
  v_gate text;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_gate := case
    when v_me.role::text = 'sponsor' and not v_me.is_verified then 'sponsor_not_verified'
    when v_me.role = 'athlete' and v_me.is_minor
         and not private.has_guardian_consent(v_me.id, 'sponsorship') then 'guardian_consent_required'
    else 'ok'
  end;

  return jsonb_build_object(
    'role', v_me.role::text,
    'gate', v_gate,
    'is_verified', v_me.is_verified,
    'profile', (
      select to_jsonb(sp) - 'created_at' - 'updated_at'
      from public.sponsor_profiles sp where sp.user_id = v_me.id
    ),
    'requests', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select r.id, r.title, r.event_name, r.event_date, r.location, r.sport, r.needs, r.gives,
               r.amount, r.currency, r.pitch, r.status, r.created_at,
               (select count(*) from public.sponsorship_deals d
                where d.request_id = r.id and d.status = 'pending') as pending_offers
        from public.sponsorship_requests r
        where r.athlete_user_id = v_me.id
      ) x), '[]'::jsonb),
    'calls', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select c.id, c.title, c.description, c.sport, c.country, c.offers, c.amount_min, c.amount_max,
               c.currency, c.slots, c.deadline, c.open_to_minors, c.is_active, c.created_at,
               (select count(*) from public.sponsorship_deals d
                where d.call_id = c.id and d.status = 'pending') as pending_applications
        from public.sponsor_calls c
        where c.sponsor_user_id = v_me.id
      ) x), '[]'::jsonb),
    /* Every deal I am part of — and, for a guardian, my children's. */
    'deals', coalesce((
      select jsonb_agg(to_jsonb(x) order by (x.status = 'pending') desc, x.created_at desc)
      from (
        select
          d.id, d.initiated_by, d.status, d.message, d.amount, d.currency, d.created_at, d.responded_at,
          d.request_id, d.call_id,
          r.title as request_title, c.title as call_title,
          case when d.sponsor_user_id = v_me.id then 'sponsor'
               when d.athlete_user_id = v_me.id then 'athlete'
               else 'guardian' end as my_side,
          d.athlete_user_id, a.full_name as athlete_name, a.avatar_url as athlete_avatar,
          coalesce(a.is_minor, false) as athlete_is_minor,
          d.sponsor_user_id, coalesce(sp.company_name, s.full_name) as sponsor_name,
          s.avatar_url as sponsor_avatar, s.is_verified as sponsor_verified,
          (d.status = 'pending' and (
             (d.initiated_by = 'sponsor' and d.sponsor_user_id <> v_me.id)
             or (d.initiated_by = 'athlete' and d.sponsor_user_id = v_me.id)
          )) as can_respond,
          (d.status = 'pending' and (
             (d.initiated_by = 'sponsor' and d.sponsor_user_id = v_me.id)
             or (d.initiated_by = 'athlete' and d.athlete_user_id = v_me.id)
          )) as can_withdraw
        from public.sponsorship_deals d
        join public.user_profiles a on a.id = d.athlete_user_id
        join public.user_profiles s on s.id = d.sponsor_user_id
        left join public.sponsor_profiles sp on sp.user_id = d.sponsor_user_id
        left join public.sponsorship_requests r on r.id = d.request_id
        left join public.sponsor_calls c on c.id = d.call_id
        where d.sponsor_user_id = v_me.id
           or d.athlete_user_id = v_me.id
           or exists (
             select 1 from public.guardian_consents g
             where g.minor_user_id = d.athlete_user_id
               and g.guardian_user_id = v_me.id and g.status = 'granted'
           )
        order by d.created_at desc
        limit 100
      ) x), '[]'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------
-- 11. The card on a profile
-- ------------------------------------------------------------
create or replace function public.sponsorship_card(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me   public.user_profiles;
  v_them public.user_profiles;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select * into v_them from public.user_profiles where id = p_user;
  if not found or v_them.is_suspended then
    return null;
  end if;

  if v_them.role::text = 'sponsor' then
    if p_user <> v_me.id and (
         not private.viewer_can_see_author(p_user) or private.users_are_blocked(v_me.id, p_user)) then
      return null;
    end if;
    return jsonb_build_object(
      'kind', 'sponsor',
      'is_verified', v_them.is_verified,
      'profile', (select to_jsonb(sp) - 'created_at' - 'updated_at' - 'budget_min' - 'budget_max'
                  from public.sponsor_profiles sp where sp.user_id = p_user),
      'calls', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'call_id', f.call_id, 'title', f.title, 'sport', f.sport, 'offers', f.offers,
                 'deadline', f.deadline, 'my_status', f.my_status) order by f.created_at desc)
        from public.sponsor_calls_feed(null, null, 50, 0) f
        where f.sponsor_user_id = p_user), '[]'::jsonb)
    );
  end if;

  if v_them.role <> 'athlete' or not private.sponsorship_visible(p_user) then
    return null;
  end if;

  return jsonb_build_object(
    'kind', 'athlete',
    'is_self', p_user = v_me.id,
    /* A verified sponsor can make an offer from here. */
    'can_offer', v_me.role::text = 'sponsor' and v_me.is_verified and not v_me.is_suspended and p_user <> v_me.id,
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'title', r.title, 'event_name', r.event_name, 'event_date', r.event_date,
               'location', r.location, 'needs', r.needs, 'gives', r.gives, 'pitch', r.pitch,
               'currency', r.currency,
               'amount', case when private.sponsorship_sees_amount(p_user) then r.amount end,
               'my_offer_status', (select d.status from public.sponsorship_deals d
                                   where d.request_id = r.id and d.sponsor_user_id = v_me.id
                                   order by d.created_at desc limit 1))
             order by r.created_at desc)
      from public.sponsorship_requests r
      where r.athlete_user_id = p_user and r.status = 'open'), '[]'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------
-- 12. A minor who loses the scope stops being listed
--
-- Visibility already reads the live consent, so a revoked scope hides the
-- request at once. Pending offers to them are closed too: nobody should be
-- waiting on an answer the guardian has just said cannot be given.
-- ------------------------------------------------------------
create or replace function private.on_sponsorship_consent_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.has_guardian_consent(new.minor_user_id, 'sponsorship') then
    update public.sponsorship_deals set status = 'declined', responded_at = now()
    where athlete_user_id = new.minor_user_id and status = 'pending';
  end if;
  return new;
end;
$$;
revoke all on function private.on_sponsorship_consent_change() from public, anon, authenticated;

drop trigger if exists trg_guardian_consents_sponsorship on public.guardian_consents;
create trigger trg_guardian_consents_sponsorship
after update of status, allow_sponsorship on public.guardian_consents
for each row execute function private.on_sponsorship_consent_change();

-- ------------------------------------------------------------
-- 13. Privileges, by name
-- ------------------------------------------------------------
revoke all on function public.save_sponsor_profile(jsonb)                          from public, anon;
revoke all on function public.save_sponsorship_request(uuid, jsonb)                from public, anon;
revoke all on function public.set_sponsorship_request_status(uuid, text)           from public, anon;
revoke all on function public.save_sponsor_call(uuid, jsonb)                       from public, anon;
revoke all on function public.set_sponsor_call_active(uuid, boolean)               from public, anon;
revoke all on function public.sponsor_make_offer(uuid, text, integer)              from public, anon;
revoke all on function public.apply_to_sponsor_call(uuid, text)                    from public, anon;
revoke all on function public.respond_sponsorship(uuid, boolean)                   from public, anon;
revoke all on function public.withdraw_sponsorship(uuid)                           from public, anon;
revoke all on function public.sponsorship_seekers(text, text, text, integer, integer) from public, anon;
revoke all on function public.sponsor_calls_feed(text, text, integer, integer)     from public, anon;
revoke all on function public.sponsor_directory(text, integer)                     from public, anon;
revoke all on function public.my_sponsorship()                                     from public, anon;
revoke all on function public.sponsorship_card(uuid)                               from public, anon;

grant execute on function public.save_sponsor_profile(jsonb)                          to authenticated;
grant execute on function public.save_sponsorship_request(uuid, jsonb)                to authenticated;
grant execute on function public.set_sponsorship_request_status(uuid, text)           to authenticated;
grant execute on function public.save_sponsor_call(uuid, jsonb)                       to authenticated;
grant execute on function public.set_sponsor_call_active(uuid, boolean)               to authenticated;
grant execute on function public.sponsor_make_offer(uuid, text, integer)              to authenticated;
grant execute on function public.apply_to_sponsor_call(uuid, text)                    to authenticated;
grant execute on function public.respond_sponsorship(uuid, boolean)                   to authenticated;
grant execute on function public.withdraw_sponsorship(uuid)                           to authenticated;
grant execute on function public.sponsorship_seekers(text, text, text, integer, integer) to authenticated;
grant execute on function public.sponsor_calls_feed(text, text, integer, integer)     to authenticated;
grant execute on function public.sponsor_directory(text, integer)                     to authenticated;
grant execute on function public.my_sponsorship()                                     to authenticated;
grant execute on function public.sponsorship_card(uuid)                               to authenticated;
