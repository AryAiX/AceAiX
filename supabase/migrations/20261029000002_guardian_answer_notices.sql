-- ============================================================
-- What a parent's answer tells everyone else (QA-154)
--
-- A linked guardian can cancel a minor's coaching session and can answer a
-- sponsorship deal in the minor's place. Two gaps showed up in testing:
--
--   1. When a guardian answered a sponsorship deal, the minor was not told.
--      (A guardian's cancelled session already told the minor.) And when a
--      guardian withdrew the minor's application to a call, the notice went
--      to the minor instead of the sponsor, so the sponsor was never told.
--   2. The coach or sponsor read the guardian's own name ("Baba Ali declined
--      your sponsorship offer"), which does not say who that person is.
--      They now read "<child>'s parent …", and the minor reads "Your parent …".
--
-- Nothing else changes: who may cancel or answer, the statuses, and the
-- notices when the athlete, coach or sponsor acts themselves are as before.
-- CREATE OR REPLACE only; signatures and grants are unchanged.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Cancelling a coaching session
-- ------------------------------------------------------------
create or replace function public.cancel_coaching_booking(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_b     public.coaching_bookings;
  v_by    text;
  v_name  text;
  v_kid   text;
  v_title text;
begin
  select * into v_b from public.coaching_bookings where id = p_booking for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  v_by := case
    when auth.uid() = v_b.athlete_user_id then 'athlete'
    when auth.uid() = v_b.coach_user_id then 'coach'
    when exists (select 1 from public.guardian_consents g
                 where g.minor_user_id = v_b.athlete_user_id and g.guardian_user_id = auth.uid()
                   and g.status = 'granted') then 'guardian'
  end;
  if v_by is null then
    raise exception 'Not yours to cancel' using errcode = '42501';
  end if;
  if v_b.status <> 'booked' then return; end if;

  update public.coaching_bookings
     set status = 'cancelled', cancelled_by = v_by, cancelled_at = now()
   where id = p_booking;

  select coalesce(full_name, 'Someone') into v_name from public.user_profiles where id = auth.uid();
  select title into v_title from public.coaching_services where id = v_b.service_id;

  if v_by = 'guardian' then
    /* The coach and any other guardian learn whose parent it was. */
    select coalesce(full_name, 'The athlete') into v_kid
    from public.user_profiles where id = v_b.athlete_user_id;
    perform private.coaching_notify(v_b.coach_user_id, 'coaching_cancelled',
      v_kid || '''s parent cancelled ' || coalesce(v_title, 'a session'),
      auth.uid(), p_booking, v_b.athlete_user_id);
    /* A guardian's cancellation is news to the minor as well. */
    perform private.notify(v_b.athlete_user_id, 'opportunity', 'coaching_cancelled',
      'Your parent cancelled ' || coalesce(v_title, 'a session'), null, auth.uid(),
      'coaching', p_booking::text, null, jsonb_build_object('booking_id', p_booking));
  else
    perform private.coaching_notify(
      case when v_by = 'coach' then v_b.athlete_user_id else v_b.coach_user_id end,
      'coaching_cancelled', v_name || ' cancelled ' || coalesce(v_title, 'a session'),
      auth.uid(), p_booking, v_b.athlete_user_id);
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 2. Answering a sponsorship deal
-- ------------------------------------------------------------
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
  v_kid      text;
  v_brand    text;
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

  if v_guardian and auth.uid() not in (v_deal.athlete_user_id, v_deal.sponsor_user_id) then
    /* A parent answered for their child: the sponsor and the child are told. */
    select coalesce(full_name, 'The athlete') into v_kid
    from public.user_profiles where id = v_deal.athlete_user_id;
    select coalesce(sp.company_name, up.full_name, 'a sponsor') into v_brand
    from public.user_profiles up left join public.sponsor_profiles sp on sp.user_id = up.id
    where up.id = v_deal.sponsor_user_id;

    perform private.notify(v_deal.sponsor_user_id, 'opportunity', 'sponsorship_response',
      v_kid || '''s parent '
        || case when v_deal.initiated_by = 'sponsor'
                then v_status || ' your sponsorship offer'
                else 'withdrew the application to your call' end,
      null, auth.uid(), 'sponsorship', p_deal::text, null,
      jsonb_build_object('deal_id', p_deal, 'status', v_status));
    perform private.notify(v_deal.athlete_user_id, 'opportunity', 'sponsorship_response',
      'Your parent '
        || case when v_deal.initiated_by = 'sponsor'
                then v_status || ' the sponsorship offer from ' || v_brand
                else 'withdrew your application to ' || v_brand end,
      null, auth.uid(), 'sponsorship', p_deal::text, null,
      jsonb_build_object('deal_id', p_deal, 'status', v_status));
  else
    select coalesce(sp.company_name, up.full_name, 'Someone') into v_who
    from public.user_profiles up left join public.sponsor_profiles sp on sp.user_id = up.id
    where up.id = auth.uid();
    v_other := case when v_deal.initiated_by = 'sponsor' then v_deal.sponsor_user_id else v_deal.athlete_user_id end;

    perform private.notify(v_other, 'opportunity', 'sponsorship_response',
      v_who || case when p_accept then ' accepted your sponsorship ' else ' declined your sponsorship ' end
            || case when v_deal.initiated_by = 'sponsor' then 'offer' else 'application' end,
      null, auth.uid(), 'sponsorship', p_deal::text, null,
      jsonb_build_object('deal_id', p_deal, 'status', v_status));
  end if;

  /* Every guardian with an account hears about it; the one who acted is skipped. */
  perform private.sponsorship_notify_guardians(v_deal.athlete_user_id, 'sponsorship_response',
    'A sponsorship ' || case when v_deal.initiated_by = 'sponsor' then 'offer' else 'application' end
      || ' for your child was ' || v_status, auth.uid(), p_deal);
  return v_status;
end;
$$;

revoke all on function public.cancel_coaching_booking(uuid) from public, anon;
grant execute on function public.cancel_coaching_booking(uuid) to authenticated;
revoke all on function public.respond_sponsorship(uuid, boolean) from public, anon;
grant execute on function public.respond_sponsorship(uuid, boolean) to authenticated;
