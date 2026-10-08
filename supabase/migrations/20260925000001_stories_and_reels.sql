-- ============================================================
-- 0925/01 — Stories and Reels
--
-- Stories: 24-hour posts shown as a rail of rings at the top of Home. Three
-- kinds — a photo, a short video, or a "card" (text on one of the app's
-- gradients with a sport sticker), which needs no upload and is how most
-- athletes will post a result or a PB.
--
-- Reels: the video posts that already exist, served full-screen and
-- vertical. There is no second table and no second set of rules: `get_reels`
-- reads through `get_feed`, so every gate the feed applies — audience, blocks,
-- suspensions, the minor discovery gate — applies to reels without being
-- written twice.
--
-- The `stories` table has existed since the prototype (0012) with a read
-- policy of "any signed-in account, until it expires". That was harmless while
-- nothing wrote stories. It is not harmless once something does: a minor whose
-- guardian has not approved discovery would have been readable by any adult,
-- and the storage policy for the `stories` bucket decides who may fetch the
-- image by asking whether that row is visible. So the read policy is replaced
-- before the first story can be posted.
-- ============================================================

-- ------------------------------------------------------------
-- 1. The table grows a kind and a card
-- ------------------------------------------------------------
alter table public.stories alter column media_url drop not null;
alter table public.stories
  add column if not exists card jsonb not null default '{}'::jsonb;

/* NOT VALID: prototype rows, if any survive, keep whatever they had. Every row
   written from here on is checked. */
alter table public.stories drop constraint if exists stories_kind_check;
alter table public.stories
  add constraint stories_kind_check
  check (media_type in ('photo', 'video', 'card')
         and (media_type = 'card' or media_url is not null))
  not valid;

alter table public.stories drop constraint if exists stories_audience_check;
alter table public.stories
  add constraint stories_audience_check
  check (audience in ('public', 'followers', 'connections'))
  not valid;

create index if not exists idx_stories_author_live on public.stories (author_id, expires_at desc);

-- ------------------------------------------------------------
-- 2. Who may see a story — one predicate, used by the policy and every RPC
-- ------------------------------------------------------------
create or replace function private.viewer_can_see_story(p_author uuid, p_audience text, p_expires timestamptz)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p_author = auth.uid()
    or (
      p_expires > now()
      and private.viewer_can_see_author(p_author)
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = p_author)
           or (b.blocker_id = p_author and b.blocked_id = auth.uid())
      )
      and (
        p_audience = 'public'
        or (p_audience = 'followers' and exists (
              select 1 from public.follows f
              where f.follower_id = auth.uid() and f.following_id = p_author))
        or (p_audience = 'connections' and exists (
              select 1 from public.follows o
              join public.follows i on i.follower_id = p_author and i.following_id = auth.uid()
              where o.follower_id = auth.uid() and o.following_id = p_author))
      )
    );
$$;

comment on function private.viewer_can_see_story(uuid, text, timestamptz) is
  'Named in the stories read policy, so it must stay executable by authenticated. '
  'Read-only; answers a question about the caller.';

revoke all on function private.viewer_can_see_story(uuid, text, timestamptz) from public, anon;
grant execute on function private.viewer_can_see_story(uuid, text, timestamptz) to authenticated;

drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories
  for select to authenticated
  using (private.viewer_can_see_story(author_id, audience, expires_at));

/* Writes go through create_story, which can check what a policy cannot. */
drop policy if exists stories_insert on public.stories;
drop policy if exists stories_update on public.stories;
revoke insert, update on public.stories from authenticated, anon;
grant select, delete on public.stories to authenticated;

drop policy if exists story_views_insert on public.story_views;
revoke insert, update, delete on public.story_views from authenticated, anon;

-- ------------------------------------------------------------
-- 3. Posting one
-- ------------------------------------------------------------
create or replace function public.create_story(
  p_kind      text,
  p_media_url text default null,
  p_caption   text default null,
  p_card      jsonb default '{}'::jsonb,
  p_audience  text default 'followers'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me     public.user_profiles;
  v_card   jsonb := coalesce(p_card, '{}'::jsonb);
  v_text   text;
  v_recent integer;
  v_id     uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select * into v_me from public.user_profiles where id = auth.uid();
  if coalesce(v_me.is_suspended, false) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;

  if p_kind not in ('photo', 'video', 'card') then
    raise exception 'Unknown story kind' using errcode = '22023';
  end if;
  if coalesce(p_audience, '') not in ('public', 'followers', 'connections') then
    raise exception 'Unknown audience' using errcode = '22023';
  end if;
  if p_caption is not null and length(btrim(p_caption)) > 200 then
    raise exception 'Keep the caption under 200 characters' using errcode = '22023';
  end if;

  if p_kind = 'card' then
    v_text := nullif(btrim(coalesce(v_card ->> 'text', '')), '');
    if v_text is null or length(v_text) > 140 then
      raise exception 'A card needs some text, up to 140 characters'
        using errcode = '22023', hint = 'story_card_text';
    end if;
    if coalesce(v_card ->> 'background', 'hero')
       not in ('hero', 'action', 'cool', 'warm', 'party', 'score') then
      raise exception 'Unknown card background' using errcode = '22023';
    end if;
    /* Only the keys the client renders are kept. */
    v_card := jsonb_build_object(
      'text', v_text,
      'background', coalesce(v_card ->> 'background', 'hero'),
      'sticker', left(coalesce(v_card ->> 'sticker', ''), 24),
      'stat', left(coalesce(v_card ->> 'stat', ''), 16)
    );
  else
    /* Uploaded media lives under the author's own folder, as posts do. A
       minor needs the guardian's "photos and clips" scope, exactly as for
       profile media. */
    if p_media_url is null or split_part(p_media_url, '/', 1) <> auth.uid()::text then
      raise exception 'Upload the file first' using errcode = '22023', hint = 'story_media_missing';
    end if;
    if coalesce(v_me.is_minor, false) and not private.has_guardian_consent(auth.uid(), 'media') then
      raise exception 'A parent or guardian needs to approve photos and clips first'
        using errcode = '42501', hint = 'guardian_consent_required';
    end if;
    v_card := '{}'::jsonb;
  end if;

  select count(*) into v_recent from public.stories
   where author_id = auth.uid() and created_at > now() - interval '24 hours';
  if v_recent >= 30 then
    raise exception 'That is a lot of stories for one day' using errcode = '54000', hint = 'rate_limited';
  end if;

  insert into public.stories (author_id, media_url, media_type, caption, card, audience)
  values (
    auth.uid(),
    case when p_kind = 'card' then null else p_media_url end,
    p_kind,
    nullif(btrim(coalesce(p_caption, '')), ''),
    v_card,
    p_audience
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- 4. Reading them
-- ------------------------------------------------------------

/*
 * The rail: me first, then people I follow with something new, then people I
 * follow I have already caught up with. Verified clubs, coaches and the
 * federation appear too when their story is public — a young player with
 * three follows should not open the app to an empty rail.
 */
create or replace function public.story_rail(p_limit integer default 30)
returns table (
  author_id   uuid,
  name        text,
  avatar_url  text,
  role        text,
  is_verified boolean,
  is_self     boolean,
  stories     integer,
  unseen      integer,
  latest_at   timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.author_id,
    up.full_name::text,
    up.avatar_url::text,
    up.role::text,
    up.is_verified,
    s.author_id = auth.uid(),
    count(*)::integer,
    count(*) filter (where not exists (
      select 1 from public.story_views v where v.story_id = s.id and v.viewer_id = auth.uid()
    ))::integer,
    max(s.created_at)
  from public.stories s
  join public.user_profiles up on up.id = s.author_id
  where auth.uid() is not null
    and s.expires_at > now()
    and private.viewer_can_see_story(s.author_id, s.audience, s.expires_at)
    and (
      s.author_id = auth.uid()
      or exists (select 1 from public.follows f
                 where f.follower_id = auth.uid() and f.following_id = s.author_id)
      or (s.audience = 'public' and up.is_verified
          and up.role in ('coach', 'club', 'federation', 'scout'))
    )
  group by s.author_id, up.full_name, up.avatar_url, up.role, up.is_verified
  order by
    (s.author_id = auth.uid()) desc,
    (count(*) filter (where not exists (
      select 1 from public.story_views v where v.story_id = s.id and v.viewer_id = auth.uid()
    )) > 0) desc,
    max(s.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 30), 60));
$$;

create or replace function public.user_stories(p_author uuid)
returns table (
  id         uuid,
  kind       text,
  media_url  text,
  caption    text,
  card       jsonb,
  audience   text,
  created_at timestamptz,
  expires_at timestamptz,
  seen       boolean,
  view_count integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.id,
    s.media_type::text,
    s.media_url::text,
    s.caption::text,
    s.card,
    s.audience::text,
    s.created_at,
    s.expires_at,
    exists (select 1 from public.story_views v where v.story_id = s.id and v.viewer_id = auth.uid()),
    /* How many people saw it — for the author only. */
    case when s.author_id = auth.uid()
         then (select count(*)::integer from public.story_views v where v.story_id = s.id)
    end
  from public.stories s
  where auth.uid() is not null
    and s.author_id = p_author
    and s.expires_at > now()
    and private.viewer_can_see_story(s.author_id, s.audience, s.expires_at)
  order by s.created_at asc;
$$;

create or replace function public.mark_story_viewed(p_story uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_s public.stories;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select * into v_s from public.stories where id = p_story;
  if v_s.id is null or not private.viewer_can_see_story(v_s.author_id, v_s.audience, v_s.expires_at) then
    return;   -- nothing to mark, and nothing to learn from the answer
  end if;
  if v_s.author_id = auth.uid() then return; end if;
  insert into public.story_views (story_id, viewer_id) values (p_story, auth.uid())
  on conflict do nothing;
end;
$$;

create or replace function public.delete_story(p_story uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.stories where id = p_story and author_id = auth.uid();
  if not found then
    raise exception 'Not your story' using errcode = '42501';
  end if;
end;
$$;

/*
 * Reels are the feed's video posts. Reading through get_feed means the
 * audience, block, suspension and minor gates are the feed's own; this adds
 * only "has a video", and keeps the feed's order.
 */
create or replace function public.get_reels(p_limit integer default 12, p_before timestamptz default null)
returns table (
  id              uuid,
  author_id       uuid,
  author_name     text,
  author_avatar   text,
  author_role     text,
  author_verified boolean,
  author_score    integer,
  author_tier     text,
  athlete_sport   text,
  athlete_position text,
  type            text,
  caption         text,
  media           jsonb,
  tags            jsonb,
  like_count      integer,
  comment_count   integer,
  view_count      integer,
  viewer_liked    boolean,
  viewer_saved    boolean,
  viewer_follows  boolean,
  created_at      timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select f.*
  from public.get_feed('for_you', null, 50, p_before) f
  where exists (
    select 1 from jsonb_array_elements(coalesce(f.media, '[]'::jsonb)) m
    where m ->> 'type' = 'video'
  )
  limit greatest(1, least(coalesce(p_limit, 12), 30));
$$;

-- ------------------------------------------------------------
-- 5. Privileges, by name
-- ------------------------------------------------------------
revoke all on function public.create_story(text, text, text, jsonb, text) from public, anon;
revoke all on function public.story_rail(integer)                        from public, anon;
revoke all on function public.user_stories(uuid)                         from public, anon;
revoke all on function public.mark_story_viewed(uuid)                    from public, anon;
revoke all on function public.delete_story(uuid)                         from public, anon;
revoke all on function public.get_reels(integer, timestamptz)            from public, anon;

grant execute on function public.create_story(text, text, text, jsonb, text) to authenticated;
grant execute on function public.story_rail(integer)                         to authenticated;
grant execute on function public.user_stories(uuid)                          to authenticated;
grant execute on function public.mark_story_viewed(uuid)                     to authenticated;
grant execute on function public.delete_story(uuid)                          to authenticated;
grant execute on function public.get_reels(integer, timestamptz)             to authenticated;
