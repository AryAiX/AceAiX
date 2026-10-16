-- Play phase 2 (no-coordinates version): an organiser can add a link to the
-- exact pitch on Google Maps, Apple Maps or Waze. We store only the link the
-- organiser chose for the VENUE, never anyone's location, and only from these
-- map sites so nobody can post an arbitrary link. No coordinate columns
-- (see the header of 20260909000001_meetups.sql and docs/12).

alter table public.meetups add column if not exists map_url text;

alter table public.meetups drop constraint if exists meetup_map_url_ok;
alter table public.meetups add constraint meetup_map_url_ok check (
  map_url is null or (
    length(map_url) <= 500
    and map_url ~* '^https://((www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?/maps|maps\.google\.[a-z]{2,3}(\.[a-z]{2})?/|maps\.app\.goo\.gl/|goo\.gl/maps/|maps\.apple\.com/|((www|ul)\.)?waze\.com/)'
  )
);

-- Only the host of an open game can set or clear its link.
create or replace function public.set_meetup_map_url(p_meetup uuid, p_url text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if not private.may_meet() then
    raise exception 'Play is for adults only' using errcode = '42501', hint = 'meetups_adults_only';
  end if;
  if not exists (
    select 1 from public.meetups m
    where m.id = p_meetup and m.host_id = auth.uid() and m.status in ('open', 'full')
  ) then
    raise exception 'Only the host can change this game' using errcode = '42501';
  end if;
  if v_url is not null and (
       length(v_url) > 500
       or v_url !~* '^https://((www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?/maps|maps\.google\.[a-z]{2,3}(\.[a-z]{2})?/|maps\.app\.goo\.gl/|goo\.gl/maps/|maps\.apple\.com/|((www|ul)\.)?waze\.com/)'
     ) then
    raise exception 'Use a Google Maps, Apple Maps or Waze link'
      using errcode = '22023', hint = 'meetup_map_url_invalid';
  end if;

  update public.meetups set map_url = v_url where id = p_meetup;
end;
$$;

revoke all on function public.set_meetup_map_url(uuid, text) from public, anon;
grant execute on function public.set_meetup_map_url(uuid, text) to authenticated;