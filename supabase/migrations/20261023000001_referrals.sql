-- ============================================================
-- Invites: a personal link, the circle it builds, and tokens
--
-- Athletes and coaches each get a personal invite code (8 characters) and a
-- link, https://aceaix.com/app/i/<code>. A friend who opens it, or types the
-- code within 14 days of signing up, is recorded as invited by them.
--
-- An invite COUNTS when the friend has finished onboarding — and, for a minor,
-- once a guardian has approved the account. Every 10 invites that count earn
-- the inviter 1 token. Tokens are in-app points only: no cash value, not
-- transferable, not purchasable. They live in a ledger so a later feature can
-- spend them, and so a token earned from an invite that is later revoked is
-- taken back.
--
-- Who sees what:
--   * the inviter sees their own circle: first names, avatars, role, whether
--     each invite counts yet. Nothing else about the people they invited.
--   * the invited person sees who invited them.
--   * everyone else sees at most a badge on the inviter's profile, in tiers
--     ("Brought 10+ players"), never names or exact numbers.
--   * admins see totals and can revoke an invite that looks fake.
--
-- Docs: docs/33-invites.md
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------
create table if not exists public.referral_codes (
  user_id    uuid primary key references public.user_profiles(id) on delete cascade,
  code       text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id             uuid primary key default gen_random_uuid(),
  referrer_id    uuid not null references public.user_profiles(id) on delete cascade,
  referred_id    uuid not null unique references public.user_profiles(id) on delete cascade,
  code           text not null,
  /* pending   = joined, not finished onboarding (or guardian not yet approved)
     qualified = counts toward tokens
     revoked   = an admin, or a suspension, took it back */
  status         text not null default 'pending' check (status in ('pending','qualified','revoked')),
  revoked_reason text,
  created_at     timestamptz not null default now(),
  qualified_at   timestamptz,
  check (referrer_id <> referred_id)
);

create index if not exists idx_referrals_referrer on public.referrals (referrer_id, status);

create table if not exists public.token_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.user_profiles(id) on delete cascade,
  amount     integer not null check (amount <> 0),
  reason     text not null check (reason in ('referrals','admin')),
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists idx_token_ledger_user on public.token_ledger (user_id, created_at desc);

alter table public.referral_codes enable row level security;
alter table public.referrals      enable row level security;
alter table public.token_ledger   enable row level security;

drop policy if exists referral_codes_own on public.referral_codes;
create policy referral_codes_own on public.referral_codes
  for select to authenticated using (user_id = auth.uid() or private.is_admin());

/* The rows themselves are read through the RPCs below, which decide what of
   the other person is shown. Directly, only admins read them. */
drop policy if exists referrals_admin on public.referrals;
create policy referrals_admin on public.referrals
  for select to authenticated using (private.is_admin());

drop policy if exists token_ledger_own on public.token_ledger;
create policy token_ledger_own on public.token_ledger
  for select to authenticated using (user_id = auth.uid() or private.is_admin());

revoke all on public.referral_codes, public.referrals, public.token_ledger from anon;
revoke insert, update, delete on public.referral_codes, public.referrals, public.token_ledger from authenticated;
grant select on public.referral_codes, public.referrals, public.token_ledger to authenticated;

-- ------------------------------------------------------------
-- 2. Rules
-- ------------------------------------------------------------
create or replace function private.referral_per_token()
returns integer language sql immutable set search_path = public, pg_temp as $$ select 10 $$;

/* Days after signing up during which a code can still be entered by hand. */
create or replace function private.referral_claim_days()
returns integer language sql immutable set search_path = public, pg_temp as $$ select 14 $$;

create or replace function private.referral_can_invite(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_profiles
    where id = p_user and role::text in ('athlete','coach') and not is_suspended
  );
$$;

create or replace function private.referral_new_code()
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  i int;
begin
  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.referral_codes where code = v_code);
  end loop;
  return v_code;
end;
$$;

/* First name only, for anything one person sees about another here. */
create or replace function private.referral_person(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when u.id is null then null else jsonb_build_object(
    'first_name', coalesce(nullif(u.first_name, ''), split_part(coalesce(u.full_name, ''), ' ', 1)),
    'avatar_url', u.avatar_url,
    'role', u.role,
    'is_minor', u.is_minor
  ) end
  from (select 1) one left join public.user_profiles u on u.id = p_user;
$$;

/* Bring an inviter's token balance in line with the invites that count. */
create or replace function private.referral_sync_tokens(p_referrer uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_qualified int;
  v_target    int;
  v_have      int;
begin
  select count(*) into v_qualified from public.referrals
   where referrer_id = p_referrer and status = 'qualified';
  v_target := v_qualified / private.referral_per_token();
  select coalesce(sum(amount), 0) into v_have from public.token_ledger
   where user_id = p_referrer and reason = 'referrals';

  if v_target > v_have then
    insert into public.token_ledger (user_id, amount, reason, note)
    values (p_referrer, v_target - v_have, 'referrals', v_qualified || ' friends joined');
    perform private.notify(
      p_referrer, 'referral', 'referral_token',
      'You earned a token',
      v_qualified || ' friends have joined AceAiX through your invite.',
      null, 'referral', null);
  elsif v_target < v_have then
    insert into public.token_ledger (user_id, amount, reason, note)
    values (p_referrer, v_target - v_have, 'referrals', 'An invite no longer counts');
  end if;
end;
$$;

/* Does this person's invite count yet? Called whenever something it depends on changes. */
create or replace function private.referral_evaluate(p_referred uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r    public.referrals;
  u    public.user_profiles;
  v_ok boolean;
begin
  select * into r from public.referrals where referred_id = p_referred for update;
  if not found or r.status = 'revoked' then return; end if;
  select * into u from public.user_profiles where id = p_referred;
  if not found then return; end if;

  if u.is_suspended then
    update public.referrals set status = 'revoked', revoked_reason = 'account suspended'
     where id = r.id;
    perform private.referral_sync_tokens(r.referrer_id);
    return;
  end if;

  v_ok := coalesce(u.onboarding_completed, false)
          and (not coalesce(u.is_minor, false)
               or exists (select 1 from public.guardian_consents g
                           where g.minor_user_id = u.id and g.status = 'granted'));

  if v_ok and r.status = 'pending' then
    update public.referrals set status = 'qualified', qualified_at = now() where id = r.id;
    perform private.notify(
      r.referrer_id, 'referral', 'referral_joined',
      coalesce((private.referral_person(p_referred) ->> 'first_name'), 'A friend') || ' joined through your invite',
      null, null, 'referral', null);
    perform private.referral_sync_tokens(r.referrer_id);
  elsif not v_ok and r.status = 'qualified' then
    update public.referrals set status = 'pending', qualified_at = null where id = r.id;
    perform private.referral_sync_tokens(r.referrer_id);
  end if;
end;
$$;

create or replace function private.on_referral_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.referrals where referred_id = new.id) then
    perform private.referral_evaluate(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_referral_profile on public.user_profiles;
create trigger trg_referral_profile
  after update of onboarding_completed, is_suspended, is_minor on public.user_profiles
  for each row execute function private.on_referral_profile_change();

create or replace function private.on_referral_consent_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.referrals where referred_id = new.minor_user_id) then
    perform private.referral_evaluate(new.minor_user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_referral_consent on public.guardian_consents;
create trigger trg_referral_consent
  after insert or update of status on public.guardian_consents
  for each row execute function private.on_referral_consent_change();

-- ------------------------------------------------------------
-- 3. The client API
-- ------------------------------------------------------------

/* Who sent this invite — shown on the landing screen before signing up, so
   callable without an account. First name and avatar only; a minor's avatar
   is not shown to someone who is not signed in. */
create or replace function public.referral_inviter(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid; v jsonb;
begin
  select c.user_id into v_user from public.referral_codes c where c.code = upper(btrim(coalesce(p_code, '')));
  if v_user is null or not private.referral_can_invite(v_user) then return null; end if;
  v := private.referral_person(v_user);
  if (v ->> 'is_minor')::boolean then v := v || '{"avatar_url": null}'::jsonb; end if;
  return v - 'is_minor';
end;
$$;

/* Record that I was invited. Once per account, within 14 days of signing up. */
create or replace function public.referral_claim(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code     text := upper(btrim(coalesce(p_code, '')));
  v_referrer uuid;
  v_me       public.user_profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select * into v_me from public.user_profiles where id = auth.uid();

  if exists (select 1 from public.referrals where referred_id = auth.uid()) then
    raise exception 'referral_already_claimed' using errcode = '22023', hint = 'referral_already_claimed';
  end if;
  if v_me.created_at < now() - make_interval(days => private.referral_claim_days()) then
    raise exception 'referral_too_late' using errcode = '22023', hint = 'referral_too_late';
  end if;

  select user_id into v_referrer from public.referral_codes where code = v_code;
  if v_referrer is null or not private.referral_can_invite(v_referrer) then
    raise exception 'referral_unknown_code' using errcode = 'P0002', hint = 'referral_unknown_code';
  end if;
  if v_referrer = auth.uid() then
    raise exception 'referral_own_code' using errcode = '22023', hint = 'referral_own_code';
  end if;
  /* Someone I invited cannot then claim me — no two-person loops. */
  if exists (select 1 from public.referrals where referrer_id = auth.uid() and referred_id = v_referrer) then
    raise exception 'referral_own_code' using errcode = '22023', hint = 'referral_own_code';
  end if;
  if exists (select 1 from public.user_blocks b
              where (b.blocker_id = auth.uid() and b.blocked_id = v_referrer)
                 or (b.blocker_id = v_referrer and b.blocked_id = auth.uid())) then
    raise exception 'referral_unknown_code' using errcode = 'P0002', hint = 'referral_unknown_code';
  end if;
  /* A burst of sign-ups on one code in a day is the shape of a script. */
  if (select count(*) from public.referrals
       where referrer_id = v_referrer and created_at > now() - interval '1 day') >= 50 then
    raise exception 'rate_limited' using errcode = '54000', hint = 'rate_limited';
  end if;

  insert into public.referrals (referrer_id, referred_id, code) values (v_referrer, auth.uid(), v_code);
  perform private.referral_evaluate(auth.uid());

  return jsonb_build_object(
    'inviter', private.referral_person(v_referrer) - 'is_minor',
    'status', (select status from public.referrals where referred_id = auth.uid()));
end;
$$;

/* My invite link and the circle it has built. */
create or replace function public.referral_my_circle()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_can   boolean;
  v_code  text;
  v_me    public.user_profiles;
  v_q     int;
  v_p     int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select * into v_me from public.user_profiles where id = auth.uid();
  v_can := private.referral_can_invite(auth.uid());

  if v_can then
    select code into v_code from public.referral_codes where user_id = auth.uid();
    if v_code is null then
      insert into public.referral_codes (user_id, code) values (auth.uid(), private.referral_new_code())
      on conflict (user_id) do nothing;
      select code into v_code from public.referral_codes where user_id = auth.uid();
    end if;
  end if;

  select count(*) filter (where status = 'qualified'), count(*) filter (where status = 'pending')
    into v_q, v_p
    from public.referrals where referrer_id = auth.uid();

  return jsonb_build_object(
    'can_invite', v_can,
    'code', v_code,
    'per_token', private.referral_per_token(),
    'qualified', v_q,
    'pending', v_p,
    'progress', v_q % private.referral_per_token(),
    'tokens', (select coalesce(sum(amount), 0) from public.token_ledger where user_id = auth.uid()),
    'members', (select coalesce(jsonb_agg(
                   (private.referral_person(r.referred_id) - 'is_minor')
                   || jsonb_build_object('status', r.status, 'joined_at', r.created_at, 'qualified_at', r.qualified_at)
                   order by r.created_at desc), '[]')
                from public.referrals r
                where r.referrer_id = auth.uid() and r.status <> 'revoked'),
    'invited_by', (select private.referral_person(r.referrer_id) - 'is_minor'
                    from public.referrals r where r.referred_id = auth.uid() and r.status <> 'revoked'),
    'can_enter_code', not exists (select 1 from public.referrals where referred_id = auth.uid())
                      and v_me.created_at > now() - make_interval(days => private.referral_claim_days()),
    'ledger', (select coalesce(jsonb_agg(jsonb_build_object(
                  'amount', l.amount, 'reason', l.reason, 'note', l.note, 'created_at', l.created_at)
                  order by l.created_at desc), '[]')
               from (select * from public.token_ledger where user_id = auth.uid()
                     order by created_at desc limit 20) l)
  );
end;
$$;

/* The public face: a tier, never a name or an exact number. */
create or replace function public.referral_badge(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_q int; v_tier int;
begin
  if auth.uid() is null then return null; end if;
  if not private.referral_can_invite(p_user) then return null; end if;
  if exists (select 1 from public.user_blocks b
              where (b.blocker_id = auth.uid() and b.blocked_id = p_user)
                 or (b.blocker_id = p_user and b.blocked_id = auth.uid())) then
    return null;
  end if;
  select count(*) into v_q from public.referrals where referrer_id = p_user and status = 'qualified';
  v_tier := case when v_q >= 100 then 100 when v_q >= 50 then 50 when v_q >= 25 then 25
                 when v_q >= 10 then 10 when v_q >= 5 then 5 else null end;
  return case when v_tier is null then null else jsonb_build_object('tier', v_tier) end;
end;
$$;

-- ------------------------------------------------------------
-- 4. Admin
-- ------------------------------------------------------------
create or replace function public.admin_referrals_overview()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'invites', (select count(*) from public.referrals),
    'qualified', (select count(*) from public.referrals where status = 'qualified'),
    'pending', (select count(*) from public.referrals where status = 'pending'),
    'revoked', (select count(*) from public.referrals where status = 'revoked'),
    'tokens', (select coalesce(sum(amount), 0) from public.token_ledger),
    'inviters', (select count(distinct referrer_id) from public.referrals),
    'by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'count', coalesce(c.n, 0)) order by d), '[]')
                 from generate_series(current_date - 29, current_date, interval '1 day') d
                 left join (select created_at::date as day, count(*) as n from public.referrals
                            where created_at > current_date - 30 group by 1) c on c.day = d::date),
    /* Many sign-ups that never finish onboarding is what fake accounts look like. */
    'top', (select coalesce(jsonb_agg(x order by (x ->> 'qualified')::int desc, (x ->> 'pending')::int desc), '[]') from (
              select jsonb_build_object(
                'user', private.admin_person(r.referrer_id),
                'qualified', count(*) filter (where r.status = 'qualified'),
                'pending', count(*) filter (where r.status = 'pending'),
                'revoked', count(*) filter (where r.status = 'revoked'),
                'tokens', (select coalesce(sum(amount), 0) from public.token_ledger l where l.user_id = r.referrer_id),
                'last_at', max(r.created_at),
                'flagged', count(*) filter (where r.status = 'pending' and r.created_at < now() - interval '3 days') >= 10
                           and count(*) filter (where r.status = 'pending') > 3 * count(*) filter (where r.status = 'qualified')
              ) as x
              from public.referrals r group by r.referrer_id
              order by count(*) filter (where r.status = 'qualified') desc limit 100) t),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object(
                  'id', r.id, 'status', r.status, 'revoked_reason', r.revoked_reason,
                  'created_at', r.created_at, 'qualified_at', r.qualified_at,
                  'referrer', private.admin_person(r.referrer_id),
                  'referred', private.admin_person(r.referred_id)) order by r.created_at desc), '[]')
               from (select * from public.referrals order by created_at desc limit 100) r)
  );
end;
$$;

/* Revoke an invite that looks fake, or restore one revoked by mistake. */
create or replace function public.admin_set_referral(p_referral uuid, p_revoke boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare r public.referrals;
begin
  perform private.require_admin();
  select * into r from public.referrals where id = p_referral for update;
  if not found then raise exception 'Invite not found' using errcode = 'P0002'; end if;

  if p_revoke then
    if coalesce(btrim(p_reason), '') = '' then raise exception 'Give a reason' using errcode = '22023'; end if;
    update public.referrals set status = 'revoked', revoked_reason = p_reason, qualified_at = null where id = r.id;
  else
    update public.referrals set status = 'pending', revoked_reason = null where id = r.id;
    perform private.referral_evaluate(r.referred_id);
  end if;
  perform private.referral_sync_tokens(r.referrer_id);

  perform private.admin_audit(case when p_revoke then 'referral.revoke' else 'referral.restore' end,
    'referrals', r.id, to_jsonb(r), jsonb_build_object('reason', p_reason));
end;
$$;

-- ------------------------------------------------------------
-- 5. "Download my data" includes invites and tokens
-- ------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'included_data', jsonb_build_array(
      'account profile', 'private account details', 'athlete profile',
      'authored posts', 'authored comments', 'following relationships',
      'opportunity applications', 'owned athlete media',
      'game intelligence results', 'sport fit answers and results',
      'invites and tokens'
    ),
    'account', jsonb_build_object(
      'id', v_user,
      'email', (select au.email from auth.users au where au.id = v_user)
    ),
    'profile', (select to_jsonb(up) from public.user_profiles up where up.id = v_user),
    'private', (select to_jsonb(pr) from public.user_private pr where pr.user_id = v_user),
    'athlete', (select to_jsonb(ap) from public.athlete_profiles ap where ap.user_id = v_user),
    'posts', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at)
      from public.posts p where p.author_id = v_user
    ), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.created_at)
      from public.post_comments c where c.author_id = v_user
    ), '[]'::jsonb),
    'following', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.created_at)
      from public.follows f where f.follower_id = v_user
    ), '[]'::jsonb),
    'applications', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.created_at)
      from public.applications a where a.athlete_id = v_user
    ), '[]'::jsonb),
    'media', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at)
      from public.athlete_media m
      join public.athlete_profiles ap on ap.id = m.athlete_id
      where ap.user_id = v_user
    ), '[]'::jsonb),
    'game_intelligence', jsonb_build_object(
      'profile', (select to_jsonb(g) from public.gi_profiles g where g.user_id = v_user),
      'results', coalesce((
        select jsonb_agg(to_jsonb(r) order by r.created_at)
        from public.gi_results r where r.user_id = v_user
      ), '[]'::jsonb)
    ),
    'sport_fit', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.created_at)
      from public.sport_fit_results s where s.user_id = v_user
    ), '[]'::jsonb),
    'invites', jsonb_build_object(
      'code', (select code from public.referral_codes where user_id = v_user),
      'invited_by', (select private.referral_person(referrer_id) - 'is_minor'
                       from public.referrals where referred_id = v_user),
      'invited', coalesce((select jsonb_agg(
                   (private.referral_person(r.referred_id) - 'is_minor' - 'avatar_url')
                   || jsonb_build_object('status', r.status, 'joined_at', r.created_at) order by r.created_at)
                 from public.referrals r where r.referrer_id = v_user), '[]'::jsonb),
      'tokens', coalesce((select jsonb_agg(to_jsonb(l) - 'user_id' order by l.created_at)
                 from public.token_ledger l where l.user_id = v_user), '[]'::jsonb)
    )
  );
end;
$$;

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
revoke all on function private.referral_per_token()          from public, anon, authenticated;
revoke all on function private.referral_claim_days()         from public, anon, authenticated;
revoke all on function private.referral_can_invite(uuid)     from public, anon, authenticated;
revoke all on function private.referral_new_code()           from public, anon, authenticated;
revoke all on function private.referral_person(uuid)         from public, anon, authenticated;
revoke all on function private.referral_sync_tokens(uuid)    from public, anon, authenticated;
revoke all on function private.referral_evaluate(uuid)       from public, anon, authenticated;
revoke all on function private.on_referral_profile_change()  from public, anon, authenticated;
revoke all on function private.on_referral_consent_change()  from public, anon, authenticated;

revoke all on function public.referral_inviter(text)  from public;
revoke all on function public.referral_claim(text)    from public, anon;
revoke all on function public.referral_my_circle()    from public, anon;
revoke all on function public.referral_badge(uuid)    from public, anon;
revoke all on function public.admin_referrals_overview()                  from public, anon;
revoke all on function public.admin_set_referral(uuid, boolean, text)     from public, anon;
grant execute on function public.referral_inviter(text) to anon, authenticated;
grant execute on function public.referral_claim(text)   to authenticated;
grant execute on function public.referral_my_circle()   to authenticated;
grant execute on function public.referral_badge(uuid)   to authenticated;
grant execute on function public.admin_referrals_overview()              to authenticated;
grant execute on function public.admin_set_referral(uuid, boolean, text) to authenticated;
