-- ============================================================
-- Tell the child what their parent decided (QA-155)
--
-- A parent answers a consent request from the e-mail page, and until now
-- the child heard nothing: the app quietly started (or stopped) working.
-- A parent who took a permission back cancelled the child's sessions and
-- blocked sponsorship without the child being told why.
--
-- The child now gets one notice per decision:
--
--   pending  -> granted   "Your parent approved your account"
--                         ("… changed what you can do" when it replaces an
--                          approval the same parent gave before)
--   pending  -> revoked   "Your parent did not approve your request"
--   granted  -> revoked   "Your parent approval was withdrawn"
--   granted, a permission ticked or unticked   "… changed what you can do"
--
-- An approval that is merely superseded (granted -> expired) says nothing:
-- the new approval already did. Nobody is told about their own action, so a
-- child who withdraws their own request hears nothing. The channel is
-- 'safety', which notification settings cannot switch off.
-- Tapping the notice opens Settings -> Parent or guardian.
-- ============================================================

create or replace function private.on_guardian_consent_notice()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_type  text;
  v_title text;
  v_actor uuid;
begin
  if new.status = 'granted' and old.status is distinct from 'granted' then
    if exists (select 1 from public.guardian_consents g
               where g.minor_user_id = new.minor_user_id
                 and g.id <> new.id
                 and g.status = 'granted'
                 and lower(g.guardian_email) = lower(new.guardian_email)) then
      v_type := 'guardian_consent_changed';
      v_title := 'Your parent changed what you can do';
    else
      v_type := 'guardian_consent_granted';
      v_title := 'Your parent approved your account';
    end if;
  elsif old.status = 'pending' and new.status = 'revoked' then
    v_type := 'guardian_consent_revoked';
    v_title := 'Your parent did not approve your request';
  elsif old.status = 'granted' and new.status = 'revoked' then
    v_type := 'guardian_consent_revoked';
    v_title := 'Your parent approval was withdrawn';
  elsif old.status = 'granted' and new.status = 'granted'
        and (old.allow_discovery, old.allow_messaging, old.allow_media, old.allow_assessments,
             old.allow_sponsorship, old.allow_bookings, old.allow_mindset)
            is distinct from
            (new.allow_discovery, new.allow_messaging, new.allow_media, new.allow_assessments,
             new.allow_sponsorship, new.allow_bookings, new.allow_mindset) then
    v_type := 'guardian_consent_changed';
    v_title := 'Your parent changed what you can do';
  else
    return new;
  end if;

  /* The child acting on their own request is not news to them. Otherwise the
     notice shows the parent, when the parent has an account. */
  v_actor := case when auth.uid() = new.minor_user_id then new.minor_user_id
                  else new.guardian_user_id end;

  perform private.notify(new.minor_user_id, 'safety', v_type, v_title, null, v_actor,
    'guardian_consent', new.id::text, null,
    jsonb_build_object('consent_id', new.id, 'status', new.status));
  return new;
end;
$$;
revoke all on function private.on_guardian_consent_notice() from public, anon, authenticated;

drop trigger if exists trg_guardian_consents_notice on public.guardian_consents;
create trigger trg_guardian_consents_notice
after update of status, allow_discovery, allow_messaging, allow_media, allow_assessments,
                allow_sponsorship, allow_bookings, allow_mindset
on public.guardian_consents
for each row execute function private.on_guardian_consent_notice();
