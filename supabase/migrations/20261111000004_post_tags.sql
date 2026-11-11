-- ============================================================
-- Tagging people on a post (QA-169)
--
-- A mention is text inside a caption or comment. A tag is
-- different: it attaches a person to the post itself, whether
-- or not their name is written in the caption.
--
-- Who can be tagged follows private.can_mention, the same rule
-- as a mention. Someone that rule rejects is left off and the
-- save continues, and the author is not told why. The author
-- is never tagged on their own post. Nulls and duplicates are
-- dropped. More than 20 people is refused. Only the author
-- sets the list, and a tagged person can take only their own
-- tag off. Nobody writes public.post_tags directly.
--
-- A signed-in user can read a tag when they are the tagged
-- person, or when all of these are true: they can see the post
-- (the posts row policy), private.viewer_can_see_author says
-- they can see that person, and private.users_are_blocked says
-- there is no block either way. A direct read of user_blocks
-- would miss a block the other person made, because the viewer
-- is not allowed to see that row.
--
-- A new tag tells that person once, on the mention preference,
-- with the type post_tag. A hidden post sends nothing, and
-- neither does a person already listed in the post's mentions,
-- so nobody is told twice. get_tagged_posts lists the posts one
-- person is tagged on. It runs as the viewer, so the row
-- policies on posts and post_tags decide what comes back.
--
-- NEEDS TOORAJ'S OK because it shows tagged names on posts and adds a profile section.
-- ============================================================

create table public.post_tags (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.user_profiles(id) on delete cascade,
  tagged_by  uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index idx_post_tags_user_created
  on public.post_tags (user_id, created_at desc);

alter table public.post_tags enable row level security;

revoke all on table public.post_tags from public, anon, authenticated;
grant select on table public.post_tags to authenticated;

-- The exists on posts runs as the viewer, so posts_select applies.
create policy post_tags_select
on public.post_tags
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    exists (
      select 1
      from public.posts
      where posts.id = post_tags.post_id
    )
    and private.viewer_can_see_author(user_id)
    and not private.users_are_blocked(auth.uid(), user_id)
  )
);

-- ------------------------------------------------------------
-- Replace the whole list. The author is the only writer.
-- ------------------------------------------------------------
create or replace function public.set_post_tags(p_post uuid, p_users uuid[])
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_author    uuid;
  v_hidden    boolean;
  v_excerpt   text;
  v_mentions  jsonb;
  v_clean     uuid[];
  v_kept      uuid[];
  v_person    uuid;
  v_inserted  uuid;
  v_mentioned boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select p.author_id, p.is_hidden, coalesce(p.caption, p.text), p.mentions
    into v_author, v_hidden, v_excerpt, v_mentions
  from public.posts p
  where p.id = p_post;

  if not found or v_author is distinct from auth.uid() then
    raise exception 'Not permitted' using errcode = '42501';
  end if;

  -- Nulls, duplicates, and the author. First occurrence keeps its place.
  select coalesce(array_agg(person order by first_ord), '{}'::uuid[])
    into v_clean
  from (
    select u as person, min(ord) as first_ord
    from unnest(coalesce(p_users, '{}'::uuid[])) with ordinality as t(u, ord)
    where u is not null
      and u <> v_author
    group by u
  ) deduped;

  if coalesce(cardinality(v_clean), 0) > 20 then
    raise exception 'You can tag up to 20 people'
      using errcode = '22023', hint = 'post_tags_limit';
  end if;

  -- Same quiet drop as a mention: a block, a minor, or a suspended
  -- account is left off, and the author is not told which.
  select coalesce(array_agg(person order by ord), '{}'::uuid[])
    into v_kept
  from unnest(v_clean) with ordinality as t(person, ord)
  where private.can_mention(v_author, person);

  delete from public.post_tags
  where post_id = p_post
    and not (user_id = any(v_kept));

  foreach v_person in array v_kept
  loop
    v_inserted := null;
    insert into public.post_tags (post_id, user_id, tagged_by)
    values (p_post, v_person, v_author)
    on conflict (post_id, user_id) do nothing
    returning user_id into v_inserted;

    -- A conflict returns no row, so an existing tag is not told again.
    if v_inserted is null or v_hidden then
      continue;
    end if;

    v_mentioned := false;
    if jsonb_typeof(v_mentions) = 'array' then
      select exists (
        select 1
        from jsonb_array_elements(v_mentions) elem
        where jsonb_typeof(elem) = 'object'
          and (elem->>'user_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and (elem->>'user_id')::uuid = v_person
      )
      into v_mentioned;
    end if;

    if v_mentioned then
      continue;
    end if;

    perform private.notify(
      v_person,
      'mention',
      'post_tag',
      private.display_name(v_author) || ' tagged you in a post',
      left(v_excerpt, 120),
      v_author,
      'post',
      p_post::text,
      null,
      jsonb_build_object('post_id', p_post)
    );
  end loop;

  return v_kept;
end;
$$;

-- The tagged person takes their own name off. Nothing else.
create or replace function public.remove_post_tag(p_post uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  delete from public.post_tags
  where post_id = p_post
    and user_id = auth.uid();
end;
$$;

-- Same columns as get_user_posts, then the author. Runs as the
-- viewer: posts and post_tags row policies are the visibility check.
create or replace function public.get_tagged_posts(
  p_user uuid,
  p_limit integer default 24,
  p_before timestamptz default null
)
returns table (
  id uuid,
  type text,
  caption text,
  media jsonb,
  like_count integer,
  comment_count integer,
  viewer_liked boolean,
  created_at timestamptz,
  author_id uuid
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select p.id, p.type::text, coalesce(p.caption, p.text)::text, p.media,
         p.like_count, p.comments_count,
         exists (
           select 1 from public.post_likes l
           where l.post_id = p.id and l.user_id = auth.uid()
         ),
         p.created_at,
         p.author_id
  from public.post_tags t
  join public.posts p on p.id = t.post_id
  where auth.uid() is not null
    and t.user_id = p_user
    and not p.is_hidden
    and p.moderation_state = 'visible'
    and (p_before is null or p.created_at < p_before)
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 24), 50));
$$;

revoke all on function public.set_post_tags(uuid, uuid[]) from public, anon;
revoke all on function public.remove_post_tag(uuid) from public, anon;
revoke all on function public.get_tagged_posts(uuid, integer, timestamptz) from public, anon;

grant execute on function public.set_post_tags(uuid, uuid[]) to authenticated;
grant execute on function public.remove_post_tag(uuid) to authenticated;
grant execute on function public.get_tagged_posts(uuid, integer, timestamptz) to authenticated;
