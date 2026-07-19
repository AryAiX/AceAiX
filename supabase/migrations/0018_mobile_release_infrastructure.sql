-- Mobile release infrastructure: media, realtime, counters, audience access,
-- and safe deletion helpers. This migration is idempotent where Supabase allows.

-- ---------------------------------------------------------------------------
-- Private media buckets and owner-scoped writes
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'posts',
    'posts',
    false,
    104857600,
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
  ),
  (
    'stories',
    'stories',
    false,
    104857600,
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists media_authenticated_read on storage.objects;
create policy media_authenticated_read
on storage.objects for select
to authenticated
using (bucket_id in ('posts', 'stories'));

drop policy if exists media_owner_insert on storage.objects;
create policy media_owner_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('posts', 'stories')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists media_owner_update on storage.objects;
create policy media_owner_update
on storage.objects for update
to authenticated
using (
  bucket_id in ('posts', 'stories')
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id in ('posts', 'stories')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists media_owner_delete on storage.objects;
create policy media_owner_delete
on storage.objects for delete
to authenticated
using (
  bucket_id in ('posts', 'stories')
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- Audience-aware post and story reads
-- ---------------------------------------------------------------------------
drop policy if exists posts_select on public.posts;
create policy posts_select
on public.posts for select
to authenticated
using (
  author_id = auth.uid()
  or audience = 'public'
  or (
    audience = 'followers'
    and exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid()
        and f.following_id = posts.author_id
    )
  )
  or (
    audience = 'connections'
    and exists (
      select 1
      from public.follows outgoing
      join public.follows incoming
        on incoming.follower_id = posts.author_id
       and incoming.following_id = auth.uid()
      where outgoing.follower_id = auth.uid()
        and outgoing.following_id = posts.author_id
    )
  )
);

drop policy if exists stories_select on public.stories;
create policy stories_select
on public.stories for select
to authenticated
using (
  author_id = auth.uid()
  or (
    expires_at > now()
    and (
      audience = 'public'
      or (
        audience = 'followers'
        and exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid()
            and f.following_id = stories.author_id
        )
      )
      or (
        audience = 'connections'
        and exists (
          select 1
          from public.follows outgoing
          join public.follows incoming
            on incoming.follower_id = stories.author_id
           and incoming.following_id = auth.uid()
          where outgoing.follower_id = auth.uid()
            and outgoing.following_id = stories.author_id
        )
      )
    )
  )
);

drop policy if exists post_comments_select on public.post_comments;
create policy post_comments_select
on public.post_comments for select
to authenticated
using (exists (select 1 from public.posts p where p.id = post_comments.post_id));

drop policy if exists post_views_update on public.post_views;
create policy post_views_update
on public.post_views for update
to authenticated
using (viewer_id = auth.uid())
with check (viewer_id = auth.uid());

drop policy if exists story_views_update on public.story_views;
create policy story_views_update
on public.story_views for update
to authenticated
using (viewer_id = auth.uid())
with check (viewer_id = auth.uid());

drop policy if exists pv_insert on public.profile_views;
create policy pv_insert
on public.profile_views for insert
to authenticated
with check (viewer_user_id = auth.uid());

-- A participant may only mutate the read flag on a message.
revoke update on table public.messages from authenticated;
grant update (is_read) on table public.messages to authenticated;

-- ---------------------------------------------------------------------------
-- Canonical counters
-- ---------------------------------------------------------------------------
create or replace function private.sync_post_counters()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_post_id uuid := coalesce(new.post_id, old.post_id);
begin
  update public.posts
  set like_count = (select count(*) from public.post_likes where post_id = v_post_id),
      reactions_count = (select count(*) from public.post_likes where post_id = v_post_id),
      save_count = (select count(*) from public.post_saves where post_id = v_post_id),
      comment_count = (select count(*) from public.post_comments where post_id = v_post_id),
      comments_count = (select count(*) from public.post_comments where post_id = v_post_id),
      view_count = (select count(*) from public.post_views where post_id = v_post_id)
  where id = v_post_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists post_likes_sync_counters on public.post_likes;
create trigger post_likes_sync_counters
after insert or delete on public.post_likes
for each row execute function private.sync_post_counters();

drop trigger if exists post_saves_sync_counters on public.post_saves;
create trigger post_saves_sync_counters
after insert or delete on public.post_saves
for each row execute function private.sync_post_counters();

drop trigger if exists post_comments_sync_counters on public.post_comments;
create trigger post_comments_sync_counters
after insert or delete on public.post_comments
for each row execute function private.sync_post_counters();

drop trigger if exists post_views_sync_counters on public.post_views;
create trigger post_views_sync_counters
after insert or delete on public.post_views
for each row execute function private.sync_post_counters();

create or replace function private.sync_comment_like_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_comment_id uuid := coalesce(new.comment_id, old.comment_id);
begin
  update public.post_comments
  set like_count = (select count(*) from public.comment_likes where comment_id = v_comment_id)
  where id = v_comment_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists comment_likes_sync_count on public.comment_likes;
create trigger comment_likes_sync_count
after insert or delete on public.comment_likes
for each row execute function private.sync_comment_like_count();

-- Keep legacy and current notification read columns synchronized.
create or replace function private.sync_notification_read_columns()
returns trigger
language plpgsql
as $$
begin
  if new.read is distinct from old.read then
    new.is_read := new.read;
  elsif new.is_read is distinct from old.is_read then
    new.read := new.is_read;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_sync_read_columns on public.notifications;
create trigger notifications_sync_read_columns
before update of read, is_read on public.notifications
for each row execute function private.sync_notification_read_columns();

-- ---------------------------------------------------------------------------
-- Realtime publication for the mobile listeners
-- ---------------------------------------------------------------------------
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'notifications',
    'messages',
    'conversations',
    'post_comments',
    'applications',
    'appointments'
  ]
  loop
    if to_regclass(format('public.%I', v_table)) is not null
      and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Transactional Sportify disconnect
-- ---------------------------------------------------------------------------
create or replace function public.disconnect_sportify()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.sportify_results where athlete_id = auth.uid();

  update public.sportify_consents
  set status = 'revoked',
      revoked_at = coalesce(revoked_at, now()),
      updated_at = now()
  where athlete_id = auth.uid()
    and status <> 'revoked';

  update public.athlete_profiles
  set sportify_linked = false,
      sportify_athlete_id = null,
      updated_at = now()
  where user_id = auth.uid();
end;
$$;

revoke all on function public.disconnect_sportify() from public;
grant execute on function public.disconnect_sportify() to authenticated;
