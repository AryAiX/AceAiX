-- A guardian's approve and decline can arrive together (two tabs, a
-- double tap, the e-mail page and the app). Decline only revokes a row
-- that is still pending; approve now locks the pending row first, so
-- whichever commits first wins and the other is told the link was used.
-- Same signature and grants as 20261019000001_sport_fit.sql.

create or replace function public.confirm_guardian_consent(
  p_token             text,
  p_allow_discovery   boolean default true,
  p_allow_messaging   boolean default true,
  p_allow_media       boolean default true,
  p_allow_assessments boolean default false,
  p_allow_sponsorship boolean default false,
  p_allow_bookings    boolean default false,
  p_allow_mindset     boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.guardian_consents;
begin
  -- Lock the row: a decline committed after this read would otherwise be
  -- overwritten by the update below, which only re-checks the id.
  select * into v_row from public.guardian_consents
  where token = p_token and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_used_token');
  end if;
  if v_row.token_expires_at < now() then
    update public.guardian_consents set status = 'expired', updated_at = now()
    where id = v_row.id;
    return jsonb_build_object('ok', false, 'error', 'token_expired');
  end if;

  -- Grant before expiring the guardian's previous consent: the scope triggers
  -- read live consent, and in between the minor would hold none, cancelling
  -- every booking and offer even when the guardian re-ticked every box.
  update public.guardian_consents
  set status = 'granted',
      granted_at = now(),
      allow_discovery   = coalesce(p_allow_discovery, true),
      allow_messaging   = coalesce(p_allow_messaging, true),
      allow_media       = coalesce(p_allow_media, true),
      allow_assessments = coalesce(p_allow_assessments, false),
      allow_sponsorship = coalesce(p_allow_sponsorship, false),
      allow_bookings    = coalesce(p_allow_bookings, false),
      allow_mindset     = coalesce(p_allow_mindset, false),
      updated_at = now()
  where id = v_row.id
  returning * into v_row;

  update public.guardian_consents
     set status = 'expired', updated_at = now()
   where minor_user_id = v_row.minor_user_id
     and status = 'granted'
     and id <> v_row.id
     and lower(guardian_email) = lower(v_row.guardian_email);

  return jsonb_build_object(
    'ok', true,
    'minor_user_id', v_row.minor_user_id,
    'allow_discovery', v_row.allow_discovery,
    'allow_messaging', v_row.allow_messaging,
    'allow_assessments', v_row.allow_assessments,
    'allow_sponsorship', v_row.allow_sponsorship,
    'allow_bookings', v_row.allow_bookings,
    'allow_mindset', v_row.allow_mindset
  );
end;
$$;

revoke all on function public.confirm_guardian_consent(text, boolean, boolean, boolean, boolean, boolean, boolean, boolean) from public;
grant execute on function public.confirm_guardian_consent(text, boolean, boolean, boolean, boolean, boolean, boolean, boolean)
  to anon, authenticated;
