-- ============================================================
-- Club event and fixture notices arrive one by one (QA-198)
--
-- save_club_event and save_club_match passed one group key per
-- club to private.club_notify_audience. private.notify turned a
-- second notice with the same key into an update of the first
-- row, which changed the title but not entity_id or data. Each
-- follower got one row that named the second event but opened
-- the first one. New fixtures did the same. A second pop-up
-- that arrived while the first was on screen was also dropped.
--
-- Both functions now pass a null group key, so every new event
-- and fixture is its own row and its own pop-up and opens the
-- right page. The live score and the final result keep one row
-- per match on purpose, because those updates are about the
-- same match. Rows that are already grouped stay as they are.
-- ============================================================

create or replace function public.save_club_event(p_org uuid, p_id uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id     uuid;
  v_kind   text := coalesce(p ->> 'kind', 'trial');
  v_title  text := private.club_text(p, 'title', 120);
  v_starts timestamptz := nullif(p ->> 'starts_at', '')::timestamptz;
  v_ends   timestamptz := nullif(p ->> 'ends_at', '')::timestamptz;
  v_name   text;
begin
  perform private.require_org(p_org, 'content');
  if v_kind not in ('trial','camp','clinic','tournament','open_day','showcase','other') then
    raise exception 'Unknown event type' using errcode = '22023';
  end if;
  if length(coalesce(v_title, '')) < 4 then
    raise exception 'Give the event a title' using errcode = '22023', hint = 'club_event_title';
  end if;
  if v_starts is null or (p_id is null and v_starts < now()) then
    raise exception 'Pick a start time in the future' using errcode = '22023', hint = 'club_event_starts';
  end if;
  if v_ends is not null and v_ends <= v_starts then
    raise exception 'It has to end after it starts' using errcode = '22023', hint = 'club_event_ends';
  end if;

  if p_id is null then
    insert into public.club_events (organization_id, created_by, kind, title, description, sport, category,
      starts_at, ends_at, location, age_min, age_max, capacity, registration_open, price, currency)
    values (p_org, auth.uid(), v_kind, v_title, private.club_text(p, 'description', 2000),
      private.club_text(p, 'sport', 40), private.club_text(p, 'category', 30),
      v_starts, v_ends, private.club_text(p, 'location', 200),
      nullif(p ->> 'age_min', '')::integer, nullif(p ->> 'age_max', '')::integer,
      nullif(p ->> 'capacity', '')::integer,
      coalesce((p ->> 'registration_open')::boolean, true),
      nullif(p ->> 'price', '')::integer,
      coalesce(nullif(upper(btrim(p ->> 'currency')), ''), 'AED'))
    returning id into v_id;

    select name into v_name from public.organizations where id = p_org;
    perform private.club_notify_audience(p_org, 'followers', 'club_event_new',
      v_name || ': ' || v_title, null, 'club_event', v_id::text,
      null, jsonb_build_object('event_id', v_id));
  else
    update public.club_events set
      kind = v_kind, title = v_title, description = private.club_text(p, 'description', 2000),
      sport = private.club_text(p, 'sport', 40), category = private.club_text(p, 'category', 30),
      starts_at = v_starts, ends_at = v_ends, location = private.club_text(p, 'location', 200),
      age_min = nullif(p ->> 'age_min', '')::integer, age_max = nullif(p ->> 'age_max', '')::integer,
      capacity = nullif(p ->> 'capacity', '')::integer,
      registration_open = coalesce((p ->> 'registration_open')::boolean, true),
      price = nullif(p ->> 'price', '')::integer,
      currency = coalesce(nullif(upper(btrim(p ->> 'currency')), ''), 'AED'),
      updated_at = now()
    where id = p_id and organization_id = p_org
    returning id into v_id;
    if v_id is null then
      raise exception 'Event not found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.save_club_match(p_org uuid, p_id uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id      uuid;
  v_kick    timestamptz := nullif(p ->> 'kickoff_at', '')::timestamptz;
  v_opp     text := private.club_text(p, 'opponent_name', 120);
  v_sport   text := private.club_text(p, 'sport', 40);
  v_squad   uuid := nullif(p ->> 'squad_id', '')::uuid;
  v_cat     text := private.club_text(p, 'category', 30);
  v_name    text;
  v_status  text := coalesce(p ->> 'status', 'scheduled');
begin
  perform private.require_org(p_org, 'content');
  if v_opp is null or length(v_opp) < 2 then
    raise exception 'Who is the opponent?' using errcode = '22023', hint = 'club_match_opponent';
  end if;
  if v_sport is null then
    raise exception 'Pick a sport' using errcode = '22023', hint = 'club_match_sport';
  end if;
  if v_kick is null then
    raise exception 'Pick the date and time' using errcode = '22023', hint = 'club_match_kickoff';
  end if;
  if v_squad is not null then
    select coalesce(v_cat, category) into v_cat from public.club_squads
    where id = v_squad and organization_id = p_org;
    if not found then raise exception 'Squad not found' using errcode = 'P0002'; end if;
  end if;
  if v_status not in ('scheduled','postponed','cancelled') then
    v_status := 'scheduled';
  end if;

  if p_id is null then
    insert into public.club_matches (organization_id, created_by, sport, squad_id, category, competition,
      opponent_name, is_home, venue, kickoff_at, stream_url, notes)
    values (p_org, auth.uid(), v_sport, v_squad, v_cat, private.club_text(p, 'competition', 120),
      v_opp, coalesce((p ->> 'is_home')::boolean, true), private.club_text(p, 'venue', 200), v_kick,
      private.club_stream_url(p ->> 'stream_url'), private.club_text(p, 'notes', 1000))
    returning id into v_id;

    if v_kick > now() then
      select name into v_name from public.organizations where id = p_org;
      perform private.club_notify_audience(p_org, 'followers', 'club_match_scheduled',
        v_name || ' vs ' || v_opp, null, 'club_match', v_id::text,
        null, jsonb_build_object('match_id', v_id));
    end if;
  else
    update public.club_matches set
      sport = v_sport, squad_id = v_squad, category = v_cat,
      competition = private.club_text(p, 'competition', 120), opponent_name = v_opp,
      is_home = coalesce((p ->> 'is_home')::boolean, true),
      venue = private.club_text(p, 'venue', 200), kickoff_at = v_kick,
      stream_url = private.club_stream_url(p ->> 'stream_url'),
      notes = private.club_text(p, 'notes', 1000),
      status = case when status in ('live','half_time','finished') then status else v_status end,
      updated_at = now()
    where id = p_id and organization_id = p_org
    returning id into v_id;
    if v_id is null then raise exception 'Match not found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end;
$$;
