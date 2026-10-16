-- QA-58: a saved place matched a game's area with no city check, so a name
-- like "Downtown" alerted people about games in every city. The area match
-- now also requires the game's city to be the user's profile city.

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
             or (new.area is not null
                 and lower(btrim(p.place)) = lower(btrim(new.area))
                 and up.city is not null
                 and lower(btrim(up.city)) = lower(btrim(new.city)))
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
