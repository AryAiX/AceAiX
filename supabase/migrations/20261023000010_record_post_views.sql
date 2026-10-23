-- QA-114. Watching a reel or a feed video never wrote a row, so
-- posts.view_count stayed 0. One row per viewer; the existing
-- post_views trigger recounts it into posts.view_count.
--
-- Which posts count: posts_select (20260910000001). This function runs
-- as the caller, so that policy is the read. It hides a post that is
-- hidden, not moderation-visible, blocked, or the wrong audience, and
-- it calls private.viewer_can_see_author for suspension and for minors
-- (discoverable, the author, an admin, or a guardian with consent).
-- get_feed inlines those same checks. A post the policy does not return
-- is not counted, and neither is the author's own watch.

create or replace function public.record_post_view(p_post uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_author uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select p.author_id into v_author
  from public.posts p
  where p.id = p_post;

  if v_author is null or v_author = auth.uid() then
    return;
  end if;

  insert into public.post_views (post_id, viewer_id)
  values (p_post, auth.uid())
  on conflict do nothing;
end;
$$;

revoke all on function public.record_post_view(uuid) from public, anon, service_role;
grant execute on function public.record_post_view(uuid) to authenticated;
