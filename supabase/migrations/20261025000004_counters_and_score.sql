-- Counters are server-owned. A signed-in client could still set them on
-- insert, because INSERT on these tables is granted for the whole table,
-- and a view of a highlight was recomputing the Talent Score.
--
-- Re-runnable. Functions are replaced in place. Triggers are dropped and
-- created. Nothing here drops a function.

-- ------------------------------------------------------------
-- 1. athlete_media: authenticated may update the clip, not its counters.
--    posts already limits update to caption, text, media, tags, audience
--    and image_url (20260904000005). Leave that grant as it is.
-- ------------------------------------------------------------
revoke update on public.athlete_media from authenticated;
grant update (storage_url, thumbnail_url, title, description, is_featured, is_public)
  on public.athlete_media to authenticated;

-- ------------------------------------------------------------
-- 2. A client insert cannot arrive with a forged count.
--
-- SECURITY INVOKER so current_user is whoever ran the insert. anon and
-- authenticated are forced back to 0. A trigger or security definer
-- function inserts as its owner, and service_role inserts as itself, so
-- those writers keep the values they set.
--
-- Two functions, one per table, so neither statement names a column the
-- other table does not have. Same rule in both.
--
-- athlete_media counters: views_count, likes_count.
-- posts counters: view_count, like_count, comments_count, reactions_count,
-- save_count. There is no comment_count column and no share_count column.
-- comments_count is the comment counter.
-- ------------------------------------------------------------
create or replace function private.trg_zero_athlete_media_counters()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if current_user::text in ('anon', 'authenticated') then
    new.views_count := 0;
    new.likes_count := 0;
  end if;
  return new;
end;
$$;

create or replace function private.trg_zero_post_counters()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if current_user::text in ('anon', 'authenticated') then
    new.view_count := 0;
    new.like_count := 0;
    new.comments_count := 0;
    new.reactions_count := 0;
    new.save_count := 0;
  end if;
  return new;
end;
$$;

revoke all on function private.trg_zero_athlete_media_counters() from public, anon, authenticated;
revoke all on function private.trg_zero_post_counters() from public, anon, authenticated;
grant execute on function private.trg_zero_athlete_media_counters() to service_role;
grant execute on function private.trg_zero_post_counters() to service_role;

drop trigger if exists trg_athlete_media_zero_client_counters on public.athlete_media;
create trigger trg_athlete_media_zero_client_counters
  before insert on public.athlete_media
  for each row execute function private.trg_zero_athlete_media_counters();

drop trigger if exists trg_posts_zero_client_counters on public.posts;
create trigger trg_posts_zero_client_counters
  before insert on public.posts
  for each row execute function private.trg_zero_post_counters();

-- ------------------------------------------------------------
-- 3. A view must not recompute the Talent Score.
--    Insert, delete, and a change of what the score actually reads
--    (a public video, who it belongs to) still do.
--    views_count is summed into the media pillar, but nothing in this
--    database schedules that recompute: there is no pg_cron job. The new
--    total is picked up the next time another score trigger runs, or when
--    the athlete calls refresh_my_talent_score().
-- ------------------------------------------------------------
drop trigger if exists trg_score_media on public.athlete_media;
create trigger trg_score_media
  after insert or delete or update of media_type, is_public, athlete_id
  on public.athlete_media
  for each row execute function private.trg_refresh_score_by_athlete();

-- ------------------------------------------------------------
-- 4. The service_role revokes in 20261023000010 and 20261023000011 were
--    not intended. authenticated already has execute on both functions.
--
--    Hosted projects, supabase/seed.sql, and the test shim grant
--    service_role every table privilege on public. post_views still has
--    that set. athlete_media_views had it revoked; put the same set back.
--    anon and authenticated stay revoked on that table.
-- ------------------------------------------------------------
grant execute on function public.record_post_view(uuid) to service_role;
grant execute on function public.record_highlight_view(uuid) to service_role;

grant all privileges on table public.athlete_media_views to service_role;
