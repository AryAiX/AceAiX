-- ============================================================
-- Invites: a client cannot forge a completion, a token, or a restore
--
-- onboarding_completed_at is written by the server the first time
-- onboarding is completed, and an update never clears it or moves it.
-- A qualified invite stays qualified. Only a suspension, or an admin,
-- revokes it. referral_joined is sent once per invite. Token sync
-- takes a transaction lock, runs again when an invite row disappears,
-- and skips a referrer who is being deleted with that row. An admin
-- can restore only an invite that is already revoked.
--
-- referral_evaluate starts from 20261025000001_invites_minor_privacy.sql.
-- referral_sync_tokens and admin_set_referral start from
-- 20261023000001_referrals.sql. trg_referral_profile is left as it
-- stands: AFTER UPDATE OF onboarding_completed, is_suspended, is_minor.
-- The client sets onboarding_completed; the BEFORE trigger stamps the
-- date on that same row.
--
-- authenticated has no table-wide UPDATE on user_profiles. 0008, 0010
-- and 0012 granted it; 20260904000002 revoked it and granted a column
-- list. Later grants add favorite_venue and cover_url only. This
-- column is not added to that list.
-- ============================================================

-- ------------------------------------------------------------
-- 1. The completion date is server-set
-- ------------------------------------------------------------
alter table public.user_profiles
  add column if not exists onboarding_completed_at timestamptz;

-- Drop first so a re-run's backfill is not rewritten to now().
drop trigger if exists trg_user_profiles_onboarding_stamp on public.user_profiles;

-- The backfill must not look like a profile edit, and must not run the
-- minor guard. Both triggers fire on every update.
alter table public.user_profiles disable trigger trg_user_profiles_updated_at;
alter table public.user_profiles disable trigger trg_user_profiles_minor_guard;

update public.user_profiles
   set onboarding_completed_at = created_at
 where onboarding_completed
   and onboarding_completed_at is null;

alter table public.user_profiles enable trigger trg_user_profiles_minor_guard;
alter table public.user_profiles enable trigger trg_user_profiles_updated_at;

create or replace function private.stamp_onboarding_completed_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  /* Insert has no old row. Completing stamps now. Not completing does
     not keep a date a client sent with the insert. */
  if tg_op = 'INSERT' then
    if new.onboarding_completed is true then
      new.onboarding_completed_at := now();
    else
      new.onboarding_completed_at := null;
    end if;
    return new;
  end if;

  /* Once stamped, the date stays. Turning completion off does not clear it. */
  if new.onboarding_completed is true and old.onboarding_completed_at is null then
    new.onboarding_completed_at := now();
  else
    new.onboarding_completed_at := old.onboarding_completed_at;
  end if;
  return new;
end;
$$;

create trigger trg_user_profiles_onboarding_stamp
  before insert or update on public.user_profiles
  for each row execute function private.stamp_onboarding_completed_at();

-- ------------------------------------------------------------
-- 2. An invite remembers that the inviter was told
-- ------------------------------------------------------------
alter table public.referrals
  add column if not exists notified_at timestamptz;

update public.referrals
   set notified_at = qualified_at
 where status = 'qualified'
   and notified_at is null;

-- ------------------------------------------------------------
-- 3. Qualify from the server stamp. A qualified invite stays qualified.
-- ------------------------------------------------------------
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

  v_ok := u.onboarding_completed_at is not null
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
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 4. One token sync at a time, and the token notice is grouped
-- ------------------------------------------------------------
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
  perform pg_advisory_xact_lock(hashtextextended('referral:' || p_referrer::text, 0));

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
      null, 'referral', null,
      p_group_key => ('referral_token:' || p_referrer::text || ':' || v_target::text));
  elsif v_target < v_have then
    insert into public.token_ledger (user_id, amount, reason, note)
    values (p_referrer, v_target - v_have, 'referrals', 'An invite no longer counts');
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 5. Deleting an invite recounts tokens, unless the inviter is going too
-- ------------------------------------------------------------
create or replace function private.on_referral_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.user_profiles where id = old.referrer_id) then
    perform private.referral_sync_tokens(old.referrer_id);
  end if;
  return old;
end;
$$;

drop trigger if exists trg_referral_delete on public.referrals;
create trigger trg_referral_delete
  after delete on public.referrals
  for each row execute function private.on_referral_delete();

-- ------------------------------------------------------------
-- 6. Restore is only for an invite an admin, or a suspension, revoked
-- ------------------------------------------------------------
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
    if r.status <> 'revoked' then
      raise exception 'Only a revoked invite can be restored'
        using errcode = '22023', hint = 'referral_not_revoked';
    end if;
    update public.referrals set status = 'pending', revoked_reason = null where id = r.id;
    perform private.referral_evaluate(r.referred_id);
  end if;
  perform private.referral_sync_tokens(r.referrer_id);

  perform private.admin_audit(case when p_revoke then 'referral.revoke' else 'referral.restore' end,
    'referrals', r.id, to_jsonb(r), jsonb_build_object('reason', p_reason));
end;
$$;

revoke all on function private.stamp_onboarding_completed_at() from public, anon, authenticated;
revoke all on function private.referral_evaluate(uuid)         from public, anon, authenticated;
revoke all on function private.referral_sync_tokens(uuid)      from public, anon, authenticated;
revoke all on function private.on_referral_delete()            from public, anon, authenticated;

revoke all on function public.admin_set_referral(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_referral(uuid, boolean, text) to authenticated;
