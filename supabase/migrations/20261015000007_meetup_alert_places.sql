-- Play phase 2 (no-coordinates version): besides their profile city, people
-- can list up to 5 extra places (city or area names) to get "new game" alerts
-- for. Text only; no location is read or stored.

alter table public.notification_preferences
  add column if not exists meetup_places text[] not null default '{}';

-- Clean the list: trim, drop blanks and duplicates (ignoring case), 2–80
-- characters each, at most 5.
create or replace function private.normalize_meetup_places()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_item  text;
  v_clean text[] := '{}';
  v_seen  text[] := '{}';
begin
  if new.meetup_places is null then
    new.meetup_places := '{}';
  end if;
  foreach v_item in array new.meetup_places loop
    v_item := btrim(coalesce(v_item, ''));
    if v_item = '' then continue; end if;
    if length(v_item) < 2 or length(v_item) > 80 then
      raise exception 'Each place must be 2 to 80 characters'
        using errcode = '22023', hint = 'meetup_place_invalid';
    end if;
    if lower(v_item) = any (v_seen) then continue; end if;
    v_seen  := v_seen || lower(v_item);
    v_clean := v_clean || v_item;
  end loop;
  if cardinality(v_clean) > 5 then
    raise exception 'You can add up to 5 places'
      using errcode = '22023', hint = 'meetup_places_limit';
  end if;
  new.meetup_places := v_clean;
  return new;
end;
$$;

revoke all on function private.normalize_meetup_places() from public, anon, authenticated;

drop trigger if exists trg_np_meetup_places on public.notification_preferences;
create trigger trg_np_meetup_places
  before insert or update of meetup_places on public.notification_preferences
  for each row execute function private.normalize_meetup_places();

-- The alert: Tooraj's reviewed version from 20261014000002, with ONE change:
-- the place rule is now "profile city OR one of the extra places
-- (matched against the game's city or area)".
create or replace function private.notify_meetup_nearby()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'open' then
    return new;
  end if;

  if (
    select count(*) from public.meetups m
    where m.host_id = new.host_id
      and m.created_at > now() - interval '24 hours'
  ) > 2 then
    return new;
  end if;

  -- A failure here must never stop the game from being posted.
  begin
    insert into public.notifications
      (user_id, type, title, body, data, actor_id, entity_type, entity_id, group_key)
    select
      up.id,
      'meetup_nearby',
      'New ' || new.sport || ' game in ' || new.city,
      new.title,
      jsonb_build_object(
        'meetup_id', new.id,
        'sport',     new.sport,
        'city',      new.city,
        'title',     new.title,
        'starts_at', new.starts_at
      ),
      new.host_id,
      'meetup',
      new.id,
      'meetup_new:' || new.id::text
    from public.user_profiles up
    join public.athlete_profiles ap on ap.user_id = up.id
    left join public.notification_preferences np on np.user_id = up.id
    where up.id <> new.host_id
      and coalesce(up.is_minor, true) = false
      and up.age_band in ('18_24', '25_plus')
      and coalesce(up.is_suspended, false) = false
      and ap.sport is not null
      and lower(btrim(ap.sport)) = lower(btrim(new.sport))
      and (
        (up.city is not null and lower(btrim(up.city)) = lower(btrim(new.city)))
        or exists (
          select 1 from unnest(coalesce(np.meetup_places, '{}'::text[])) as p(place)
          where lower(btrim(p.place)) = lower(btrim(new.city))
             or (new.area is not null and lower(btrim(p.place)) = lower(btrim(new.area)))
        )
      )
      and private.wants_notification(up.id, 'meetup')
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = up.id and b.blocked_id = new.host_id)
           or (b.blocker_id = new.host_id and b.blocked_id = up.id)
      )
      and (
        select count(*) from public.notifications n
        where n.user_id = up.id
          and n.type = 'meetup_nearby'
          and n.created_at > now() - interval '24 hours'
      ) < 3
      and not exists (
        select 1 from public.notifications n
        where n.user_id = up.id
          and n.type = 'meetup_nearby'
          and n.actor_id = new.host_id
          and n.created_at > now() - interval '24 hours'
      )
    limit 500
    on conflict do nothing;
  exception when others then
    raise warning 'meetup nearby alert failed: %', sqlerrm;
  end;

  return new;
end;
$$;

revoke all on function private.notify_meetup_nearby() from public, anon, authenticated;