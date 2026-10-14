-- Feature 1 (phase 1): "New game near you" alert.
-- When a Play game is posted, notify adult athletes with the same main
-- sport in the same city (country not checked yet, see QA-52). Never the host, minors (unknown age
-- counts as minor), suspended users, blocked users (either direction), or
-- anyone with Play alerts off. Max 3 of these alerts per person per 24h.
-- In-app only; real push comes later.

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
    where up.id <> new.host_id
      and coalesce(up.is_minor, true) = false
      and coalesce(up.is_suspended, false) = false
      and ap.sport is not null
      and lower(btrim(ap.sport))   = lower(btrim(new.sport))
      and up.city is not null
      and lower(btrim(up.city))    = lower(btrim(new.city))
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
    limit 500
    on conflict do nothing;
  exception when others then
    raise warning 'meetup nearby alert failed: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists trg_meetup_nearby_alert on public.meetups;
create trigger trg_meetup_nearby_alert
  after insert on public.meetups
  for each row execute function private.notify_meetup_nearby();