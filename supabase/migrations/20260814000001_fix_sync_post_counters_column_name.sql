create or replace function private.sync_post_counters()
returns trigger
language plpgsql
as $$
declare
  v_post_id uuid := coalesce(new.post_id, old.post_id);
begin
  update public.posts
  set like_count = (select count(*) from public.post_likes where post_id = v_post_id),
      reactions_count = (select count(*) from public.post_likes where post_id = v_post_id),
      save_count = (select count(*) from public.post_saves where post_id = v_post_id),
      comments_count = (select count(*) from public.post_comments where post_id = v_post_id),
      view_count = (select count(*) from public.post_views where post_id = v_post_id)
  where id = v_post_id;
  return coalesce(new, old);
end;
$$;