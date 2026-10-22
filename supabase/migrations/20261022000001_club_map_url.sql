-- Club map link (QA-96)
--
-- Sharing a place from the Google Maps app gives a short link
-- (maps.app.goo.gl/...). Followed, it leads to a page with the place's name
-- and an internal id, but no coordinates, so the map pin could not read it
-- and refused it. Keep the link itself, as meetups already do
-- (20261015000006_meetup_map_link.sql), next to latitude/longitude.
--
-- Same rule as meetups: https, at most 500 characters, Google Maps,
-- Apple Maps or Waze only. Written through set_club_map_url, with the same
-- permission as update_club_page ('manage': owner or manager, or an admin).

alter table public.organizations
  add column if not exists map_url text;

alter table public.organizations
  add constraint organizations_map_url_ok check (
    map_url is null or (
      length(map_url) <= 500
      and map_url ~* '^https://((www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?/maps|maps\.google\.[a-z]{2,3}(\.[a-z]{2})?/|maps\.app\.goo\.gl/|goo\.gl/maps/|maps\.apple\.com/|((www|ul)\.)?waze\.com/)'
    )
  );

create or replace function public.set_club_map_url(
  p_org uuid,
  p_url text
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
begin
  perform private.require_org(p_org, 'manage');

  if v_url is not null and (
       length(v_url) > 500
       or v_url !~* '^https://((www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?/maps|maps\.google\.[a-z]{2,3}(\.[a-z]{2})?/|maps\.app\.goo\.gl/|goo\.gl/maps/|maps\.apple\.com/|((www|ul)\.)?waze\.com/)'
     ) then
    raise exception 'Use a Google Maps, Apple Maps or Waze link'
      using errcode = '22023', hint = 'club_map_url_invalid';
  end if;

  update public.organizations
  set map_url = v_url,
      updated_at = now()
  where id = p_org;

  return v_url;
end;
$$;

revoke all on function public.set_club_map_url(uuid, text) from public, anon;
grant execute on function public.set_club_map_url(uuid, text) to authenticated;