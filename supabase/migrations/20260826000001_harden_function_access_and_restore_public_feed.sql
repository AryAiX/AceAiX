-- Keep the public feed readable without exposing follower- or connection-only posts.
drop policy if exists posts_public_select on public.posts;
create policy posts_public_select
on public.posts for select
to anon
using (audience = 'public');

-- Pin lookup paths for trigger and RPC functions so objects cannot be shadowed.
alter function private.sync_notification_read_columns() set search_path = public, pg_temp;
alter function private.sync_post_counters() set search_path = public, pg_temp;
alter function public.sync_media_likes_count() set search_path = public, pg_temp;
alter function public.sync_user_full_name() set search_path = public, pg_temp;
alter function public.sync_current_club_name() set search_path = public, pg_temp;

-- Trigger functions are invoked by their triggers, never directly through PostgREST.
revoke execute on function private.sync_notification_read_columns() from public, anon, authenticated;
revoke execute on function private.sync_post_counters() from public, anon, authenticated;
revoke execute on function public.sync_media_likes_count() from public, anon, authenticated;
revoke execute on function public.sync_user_full_name() from public, anon, authenticated;
revoke execute on function public.sync_current_club_name() from public, anon, authenticated;

-- These security-definer RPCs use auth.uid() and must never be callable anonymously.
revoke execute on function public.consume_athlete_ai_quota() from public, anon;
revoke execute on function public.disconnect_sportify() from public, anon;
revoke execute on function public.get_blocked_user_ids() from public, anon;
revoke execute on function public.get_similar_athletes(integer) from public, anon;
revoke execute on function public.update_own_profile(
  text, text, text, text, text, text, text, text, text, text, text, text, text, date
) from public, anon;

grant execute on function public.consume_athlete_ai_quota() to authenticated;
grant execute on function public.disconnect_sportify() to authenticated;
grant execute on function public.get_blocked_user_ids() to authenticated;
grant execute on function public.get_similar_athletes(integer) to authenticated;
grant execute on function public.update_own_profile(
  text, text, text, text, text, text, text, text, text, text, text, text, text, date
) to authenticated;
