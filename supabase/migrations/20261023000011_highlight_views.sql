-- QA-118. A highlight clip never grew views_count, and the Talent Score
-- reads the sum of that column. One row per viewer. The insert trigger
-- adds 1, so a count that was already there is kept.
--
-- Who counts: the same gates as private.visible_highlight_clips. The clip
-- is public and a video or highlight_reel, the caller passes both
-- private.viewer_can_see_public_media (media consent for a minor, or the
-- owner, an admin, or a guardian) and private.viewer_can_see_author
-- (discoverable, or the owner, an admin, or a guardian), and neither
-- person has blocked the other. The owner's own watch does not count.

create table if not exists public.athlete_media_views (
  media_id  uuid not null references public.athlete_media(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (media_id, viewer_id)
);

alter table public.athlete_media_views enable row level security;

revoke all on table public.athlete_media_views from public, anon, authenticated, service_role;

create or replace function private.trg_highlight_view_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.athlete_media
  set views_count = views_count + 1
  where id = new.media_id;
  return new;
end;
$$;

revoke all on function private.trg_highlight_view_count() from public, anon, authenticated;

drop trigger if exists trg_athlete_media_views_count on public.athlete_media_views;
create trigger trg_athlete_media_views_count
  after insert on public.athlete_media_views
  for each row execute function private.trg_highlight_view_count();

create or replace function public.record_highlight_view(p_media uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_athlete uuid;
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select am.athlete_id, ap.user_id
    into v_athlete, v_owner
  from public.athlete_media am
  join public.athlete_profiles ap on ap.id = am.athlete_id
  where am.id = p_media
    and am.is_public
    and am.media_type in ('video', 'highlight_reel');

  if v_owner is null or v_owner = auth.uid() then
    return;
  end if;

  if not private.viewer_can_see_public_media(v_athlete)
     or not private.viewer_can_see_author(v_owner) then
    return;
  end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = v_owner)
       or (b.blocker_id = v_owner and b.blocked_id = auth.uid())
  ) then
    return;
  end if;

  insert into public.athlete_media_views (media_id, viewer_id)
  values (p_media, auth.uid())
  on conflict do nothing;
end;
$$;

revoke all on function public.record_highlight_view(uuid) from public, anon, service_role;
grant execute on function public.record_highlight_view(uuid) to authenticated;
