-- ============================================================
-- Invites: a friend counts only when the account is real, and
-- stops counting when a parent withdraws discovery
--
-- The app already in the stores still finishes setup by setting
-- onboarding_completed. That write is left in place. The stamp
-- is applied only when the e-mail is confirmed and, for an
-- athlete, a sport is saved. A script that only flips the flag
-- gets neither the stamp nor a qualified invite.
-- complete_onboarding() is the same check, for the next app build.
--
-- A code can be claimed during the first 14 days, and only while
-- setup is unfinished or within a day of finishing. The shipped
-- app claims immediately after setup. Attaching an account that
-- has been set up for longer than a day is refused.
--
-- A minor who already counted goes back to pending when discovery
-- consent is withdrawn, and the token is given back. Granting
-- discovery again counts them once more, without a second
-- "joined" notice. A suspension still revokes, and only an admin
-- restores that.
--
-- A signed-out visitor gets the same empty answer for a minor's
-- code as for a code that does not exist.
--
-- The invites switch stays off. Turning it on is a separate step
-- after this is reviewed.
-- ============================================================

-- ------------------------------------------------------------
-- 1. What "finished setup" means
-- ------------------------------------------------------------
create or replace function private.onboarding_ready(
  p_user uuid,
  p_role text,
  p_first text,
  p_full text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
           select 1 from auth.users
            where id = p_user and email_confirmed_at is not null
         )
     and btrim(coalesce(nullif(p_first, ''), p_full, '')) <> ''
     and (
       p_role is distinct from 'athlete'
       or exists (
         select 1 from public.athlete_profiles
          where user_id = p_user
            and btrim(coalesce(sport, '')) <> ''
       )
     );
$$;

-- ------------------------------------------------------------
-- 2. The client flag only stamps a ready account
-- ------------------------------------------------------------
create or replace function private.stamp_onboarding_completed_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client boolean := coalesce(auth.role(), '') in ('authenticated', 'anon');
  v_ready  boolean;
begin
  if tg_op = 'INSERT' then
    v_ready := private.onboarding_ready(new.id, new.role::text, new.first_name, new.full_name);
    if new.onboarding_completed is true and (not v_client or v_ready) then
      new.onboarding_completed_at := now();
    else
      new.onboarding_completed := false;
      new.onboarding_completed_at := null;
    end if;
    return new;
  end if;

  /* Once stamped, the date stays. Turning completion off does not clear it. */
  if new.onboarding_completed is true and old.onboarding_completed_at is null then
    v_ready := private.onboarding_ready(new.id, new.role::text, new.first_name, new.full_name);
    if v_client and not v_ready then
      new.onboarding_completed := false;
      new.onboarding_completed_at := null;
    else
      new.onboarding_completed_at := now();
    end if;
  else
    new.onboarding_completed_at := old.onboarding_completed_at;
  end if;
  return new;
end;
$$;

create or replace function public.complete_onboarding()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  u public.user_profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select * into u from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  if u.onboarding_completed_at is not null then
    update public.user_profiles set onboarding_completed = true where id = u.id;
    return;
  end if;
  if not private.onboarding_ready(u.id, u.role::text, u.first_name, u.full_name) then
    raise exception 'Confirm your email and finish the required profile details first'
      using errcode = '22023', hint = 'onboarding_not_ready';
  end if;
  update public.user_profiles set onboarding_completed = true where id = u.id;
end;
$$;

-- ------------------------------------------------------------
-- 3. Qualify only a confirmed account. Withdrawn discovery un-counts.
-- ------------------------------------------------------------
create or replace function private.referral_evaluate(p_referred uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r     public.referrals;
  u     public.user_profiles;
  v_ok  boolean;
  v_mail boolean;
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

  select exists (
    select 1 from auth.users au
     where au.id = u.id and au.email_confirmed_at is not null
  ) into v_mail;

  v_ok := u.onboarding_completed_at is not null
          and v_mail
          and (not coalesce(u.is_minor, false)
               or private.has_guardian_consent(u.id, 'discovery'));

  if v_ok and r.status = 'pending' then
    update public.referrals set status = 'qualified', qualified_at = now() where id = r.id;
    if r.notified_at is null then
      perform private.notify(
        r.referrer_id, 'referral', 'referral_joined',
        coalesce((private.referral_person(p_referred) ->> 'first_name'), 'A friend') || ' joined through your invite',
        null,
        p_actor => p_referred,
        p_entity_type => 'referral',
        p_group_key => ('referral_joined:' || r.id::text));
      update public.referrals set notified_at = now() where id = r.id;
    end if;
    perform private.referral_sync_tokens(r.referrer_id);
  elsif r.status = 'qualified'
        and coalesce(u.is_minor, false)
        and not private.has_guardian_consent(u.id, 'discovery') then
    /* The parent withdrew discovery. The invite waits again, and the
       token follows. notified_at stays, so a later grant does not
       send "joined" a second time. */
    update public.referrals set status = 'pending', qualified_at = null where id = r.id;
    perform private.referral_sync_tokens(r.referrer_id);
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 4. Claim while setting up, or within a day of finishing
-- ------------------------------------------------------------
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
  if v_me.onboarding_completed_at is not null
     and v_me.onboarding_completed_at < now() - interval '24 hours' then
    raise exception 'A code can only be added while setting up, or within a day of finishing'
      using errcode = '22023', hint = 'referral_after_setup';
  end if;

  select user_id into v_referrer from public.referral_codes where code = v_code;
  if v_referrer is null or not private.referral_can_invite(v_referrer) then
    raise exception 'referral_unknown_code' using errcode = 'P0002', hint = 'referral_unknown_code';
  end if;
  if v_referrer = auth.uid() then
    raise exception 'referral_own_code' using errcode = '22023', hint = 'referral_own_code';
  end if;
  if exists (select 1 from public.referrals where referrer_id = auth.uid() and referred_id = v_referrer) then
    raise exception 'referral_own_code' using errcode = '22023', hint = 'referral_own_code';
  end if;
  if exists (select 1 from public.user_blocks b
              where (b.blocker_id = auth.uid() and b.blocked_id = v_referrer)
                 or (b.blocker_id = v_referrer and b.blocked_id = auth.uid())) then
    raise exception 'referral_unknown_code' using errcode = 'P0002', hint = 'referral_unknown_code';
  end if;
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

-- The circle's "enter a code" box follows the same window, so the
-- shipped app stops offering a code the server would refuse.
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
                      and v_me.created_at > now() - make_interval(days => private.referral_claim_days())
                      and (v_me.onboarding_completed_at is null
                           or v_me.onboarding_completed_at > now() - interval '24 hours'),
    'ledger', (select coalesce(jsonb_agg(jsonb_build_object(
                  'amount', l.amount, 'reason', l.reason, 'note', l.note, 'created_at', l.created_at)
                  order by l.created_at desc), '[]')
               from (select * from public.token_ledger where user_id = auth.uid()
                     order by created_at desc limit 20) l)
  );
end;
$$;

-- A signed-out visitor cannot tell a minor's code from an unknown one.
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
  if auth.uid() is null and coalesce((v ->> 'is_minor')::boolean, false) then
    return null;
  end if;
  return v - 'is_minor';
end;
$$;

revoke all on function private.onboarding_ready(uuid, text, text, text) from public, anon, authenticated;
revoke all on function private.stamp_onboarding_completed_at() from public, anon, authenticated;
revoke all on function private.referral_evaluate(uuid) from public, anon, authenticated;

revoke all on function public.complete_onboarding() from public, anon;
grant execute on function public.complete_onboarding() to authenticated;

revoke all on function public.referral_claim(text) from public, anon;
grant execute on function public.referral_claim(text) to authenticated;

revoke all on function public.referral_my_circle() from public, anon;
grant execute on function public.referral_my_circle() to authenticated;

revoke all on function public.referral_inviter(text) from public;
grant execute on function public.referral_inviter(text) to anon, authenticated;
