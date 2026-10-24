-- ============================================================
-- Invites switch
--
-- Invites (20261023000001_referrals.sql) ship switched off until the
-- aceaix.com/app/i/* landing page exists and tokens are decided.
-- platform_settings 'features' holds the switch; an admin turns it on with
--
--   update public.platform_settings
--      set value = jsonb_set(value, '{invites}', 'true')
--    where key = 'features';
--
-- referral_can_invite gates every invite path: the profile card and the
-- invite screen (referral_my_circle.can_invite), the landing screen
-- (referral_inviter) and claiming a code (referral_claim). Off means nobody
-- can invite, be shown an inviter, or claim.
-- ============================================================

insert into public.platform_settings (key, value)
values ('features', jsonb_build_object('invites', false))
on conflict (key) do update
  set value = jsonb_build_object('invites', false) || public.platform_settings.value;

create or replace function private.feature_enabled(p_feature text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select (value ->> p_feature)::boolean
    from public.platform_settings
    where key = 'features'
  ), false);
$$;

create or replace function private.referral_can_invite(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.feature_enabled('invites') and exists (
    select 1 from public.user_profiles
    where id = p_user and role::text in ('athlete','coach') and not is_suspended
  );
$$;

revoke all on function private.feature_enabled(text) from public, anon, authenticated;
