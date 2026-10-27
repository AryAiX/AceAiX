-- ============================================================
-- Invites: a minor is not shown, and does not count, without
-- discovery consent
--
-- Replaces the bodies in 20261023000001_referrals.sql and
-- 20261024000001_invites_switch.sql. Those files are left as they
-- shipped. A minor athlete or coach can invite only with guardian
-- discovery consent. Anonymous visitors to an invite link learn
-- nothing about a minor inviter. A circle lists a minor friend only
-- once discovery is allowed; the counts still include them. A minor's
-- invite qualifies only with that same scope. Once qualified it stays
-- counted if the guardian later withdraws discovery (20261025000002);
-- the circle and the export hide the minor again.
-- ============================================================

create or replace function private.referral_can_invite(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.feature_enabled('invites') and exists (
    select 1 from public.user_profiles
    where id = p_user
      and role::text in ('athlete','coach')
      and not is_suspended
      and (not is_minor or private.has_guardian_consent(p_user, 'discovery'))
  );
$$;

create or replace function private.referral_person(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when u.id is null then null else jsonb_build_object(
    'first_name', coalesce(nullif(u.first_name, ''), split_part(coalesce(u.full_name, ''), ' ', 1)),
    'avatar_url', case
      when u.is_minor and not private.has_guardian_consent(p_user, 'discovery') then null
      else u.avatar_url
    end,
    'role', u.role,
    'is_minor', u.is_minor
  ) end
  from (select 1) one left join public.user_profiles u on u.id = p_user;
$$;

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
  /* A signed-out visitor must not learn who a minor is. The keys stay. */
  if auth.uid() is null and coalesce((v ->> 'is_minor')::boolean, false) then
    v := v || jsonb_build_object('first_name', null, 'avatar_url', null, 'role', null);
  end if;
  return v - 'is_minor';
end;
$$;

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
                where r.referrer_id = auth.uid() and r.status <> 'revoked'
                  and (
                    not coalesce((select u.is_minor from public.user_profiles u where u.id = r.referred_id), false)
                    or private.has_guardian_consent(r.referred_id, 'discovery')
                  )),
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
               or private.has_guardian_consent(u.id, 'discovery'));

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

drop trigger if exists trg_referral_consent on public.guardian_consents;
create trigger trg_referral_consent
  after insert or update of status, allow_discovery on public.guardian_consents
  for each row execute function private.on_referral_consent_change();
