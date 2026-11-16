-- ============================================================
-- A parent account does not book coaching (QA-202)
--
-- A guardian could book a session for itself from Discover or
-- a coach's profile. The booking was made in the parent's own
-- name, so the coach saw the parent as the student and the
-- session never appeared under the child. Children book from
-- their own account, inside the bookings permission the parent
-- gives, and the parent is told and can cancel.
--
-- private.coaching_gate now answers 'guardian_account' for a
-- caller whose role is guardian. coach_booking_page passes
-- that to the screen and book_coaching_slot refuses with it
-- as the hint, so the rule holds even on an old app. The
-- check sits after the coach and block checks. Existing
-- bookings stay as they are. This only takes an action away
-- and shows nobody anything new.
--
-- NEEDS TOORAJ'S OK because it changes what a guardian account can do with bookings.
-- ============================================================

/* Why the caller cannot book this coach — or 'ok'. One word the client can
   branch on, and the same check the booking itself runs. */
create or replace function private.coaching_gate(p_coach uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me    public.user_profiles;
  v_coach public.user_profiles;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then return 'not_signed_in'; end if;
  select * into v_coach from public.user_profiles where id = p_coach;
  if not found or v_coach.role <> 'coach' or v_coach.is_suspended
     or private.users_are_blocked(v_me.id, p_coach) then
    return 'coach_unavailable';
  end if;
  if v_me.id = p_coach then return 'own_calendar'; end if;
  -- A parent account books nothing for itself. The child books (QA-202).
  if v_me.role = 'guardian' then return 'guardian_account'; end if;
  if v_me.is_suspended then return 'coach_unavailable'; end if;
  if not coalesce((select accepting from public.coaching_settings where user_id = p_coach), false) then
    return 'coach_not_accepting';
  end if;
  if v_me.is_minor then
    if not v_coach.is_verified then return 'minor_needs_verified_coach'; end if;
    if not private.has_guardian_consent(v_me.id, 'bookings') then return 'guardian_consent_required'; end if;
  end if;
  return 'ok';
end;
$$;
