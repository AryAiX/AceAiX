-- ============================================================
-- Parents for verified accounts only, and three tag fixes
-- (QA-221, QA-222, QA-223, from Tooraj's review of PR #52)
--
-- Verified accounts only (QA-221). Anyone can pick coach, club,
-- scout or sponsor at sign-up, so the role alone is not enough to
-- see parents or a parent-child link. private.is_verified_professional
-- is true for a coach, club, scout or sponsor who is not suspended
-- and is verified: the account has the verified badge, or, for a
-- club, the person is an active owner or manager of a verified club
-- page (a club page is verified on the page, not on the person).
-- It is used by search_people for parent accounts, by
-- private.can_see_family, and by browse_parents. Other parents keep
-- finding and browsing parents, as before.
--
-- The parent list respects a hidden child (QA-222). browse_parents
-- listed a parent who had switched the link on even when their
-- child was hidden, which showed the parent and revealed that they
-- have a child here. A parent is now listed only through a child
-- the viewer may see: private.can_see_family for a verified coach,
-- club, scout or sponsor, and for another parent
-- private.child_visible_to (the child is discoverable, nobody is
-- suspended and nobody has blocked anyone).
--
-- Tags (QA-223):
--   * A tag is hidden from everyone else once the post's author and
--     the tagged person block each other, in either direction.
--   * Removing and re-adding a tag no longer sends a new notice:
--     one notice per person per post, as for likes (QA-173).
--   * No notice about a post the tagged person cannot see, checked
--     with private.recipient_can_see_post, as for mentions.
--
-- search_people and set_post_tags are their current definitions
-- with only the lines above changed. CREATE OR REPLACE keeps the
-- existing grants. The tag policy is dropped and created again
-- with the extra block check.
--
-- NEEDS TOORAJ'S OK because it changes who can see parents, family links and tags.
-- ============================================================

-- ------------------------------------------------------------
-- A verified coach, club, scout or sponsor.
-- ------------------------------------------------------------
create or replace function private.is_verified_professional(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_profiles u
    where u.id = p_user
      and u.role::text in ('coach', 'club', 'scout', 'sponsor')
      and not coalesce(u.is_suspended, false)
      and (
        coalesce(u.is_verified, false)
        or (
          u.role::text = 'club'
          and exists (
            select 1
            from public.organization_members m
            join public.organizations o on o.id = m.organization_id
            where m.user_id = u.id
              and m.status = 'active'
              and m.member_role in ('owner', 'manager')
              and coalesce(o.is_verified, false)
          )
        )
      )
  );
$$;

revoke all on function private.is_verified_professional(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- The child is visible to this viewer, and nobody has blocked
-- anyone. Used for another parent browsing parents.
-- ------------------------------------------------------------
create or replace function private.child_visible_to(
  p_viewer   uuid,
  p_minor    uuid,
  p_guardian uuid
) returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p_viewer is not null
    and p_minor is not null
    and p_guardian is not null
    and exists (
      select 1 from public.user_profiles m
      where m.id = p_minor
        and not coalesce(m.is_suspended, false)
        and coalesce(m.is_discoverable, false)
    )
    and exists (
      select 1 from public.user_profiles g
      where g.id = p_guardian
        and not coalesce(g.is_suspended, false)
    )
    and not private.users_are_blocked(p_viewer, p_minor)
    and not private.users_are_blocked(p_viewer, p_guardian);
$$;

revoke all on function private.child_visible_to(uuid, uuid, uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Who may see the link between this child and this parent.
-- ------------------------------------------------------------
create or replace function private.can_see_family(
  p_viewer   uuid,
  p_minor    uuid,
  p_guardian uuid
) returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p_viewer is not null
    and p_minor is not null
    and p_guardian is not null
    and (
      p_viewer = p_minor
      or p_viewer = p_guardian
      or (
        private.is_verified_professional(p_viewer)
        and private.child_visible_to(p_viewer, p_minor, p_guardian)
      )
    );
$$;

revoke all on function private.can_see_family(uuid, uuid, uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Find people. Parent accounts only for parents and verified
-- professionals.
-- ------------------------------------------------------------
create or replace function public.search_people(p_query text, p_role text DEFAULT NULL::text, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, role text, full_name text, avatar_url text, bio text, city text, country text, is_verified boolean, is_minor boolean, followers_count integer, sport text, "position" text, talent_score integer, tier text, is_following boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    up.id,
    up.role::text,
    up.full_name::text,
    up.avatar_url::text,
    up.bio,
    up.city::text,
    up.country::text,
    up.is_verified,
    up.is_minor,
    up.followers_count,
    ap.sport::text,
    coalesce(ap.position_primary, ap.position)::text,
    coalesce(ts.overall, 0),
    coalesce(ts.tier, 'rising')::text,
    exists (select 1 from public.follows f
            where f.follower_id = auth.uid() and f.following_id = up.id)
  from public.user_profiles up
  left join public.athlete_profiles ap on ap.user_id = up.id
  left join public.talent_scores ts on ts.athlete_id = ap.id
  where auth.uid() is not null
    and coalesce(trim(p_query), '') <> ''
    and up.full_name ilike '%' || trim(p_query) || '%'
    and up.id <> auth.uid()
    and not coalesce(up.is_suspended, false)
    and (p_role is null or up.role::text = p_role)
    and (not coalesce(up.is_minor, false) or coalesce(up.is_discoverable, false))
    -- A parent account is found only by another parent, or by a
    -- verified coach, club, scout or sponsor (QA-205, QA-221).
    and (
      up.role::text <> 'guardian'
      or exists (
        select 1 from public.user_profiles me
        where me.id = auth.uid()
          and me.role::text = 'guardian'
          and not coalesce(me.is_suspended, false)
      )
      or private.is_verified_professional(auth.uid())
    )
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = up.id)
         or (b.blocker_id = up.id and b.blocked_id = auth.uid())
    )
  order by up.is_verified desc, coalesce(ts.overall, 0) desc, up.full_name asc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$function$;

-- ------------------------------------------------------------
-- Parents who chose to be contacted, listed only through a child
-- the viewer may see.
-- ------------------------------------------------------------
create or replace function public.browse_parents(
  p_limit  integer default 40,
  p_offset integer default 0
)
returns table (
  id              uuid,
  role            text,
  full_name       text,
  avatar_url      text,
  bio             text,
  city            text,
  country         text,
  is_verified     boolean,
  is_minor        boolean,
  followers_count integer,
  sport           text,
  "position"      text,
  talent_score    integer,
  tier            text,
  is_following    boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (
    select
      u.id,
      u.role::text = 'guardian' and not coalesce(u.is_suspended, false) as is_parent,
      private.is_verified_professional(u.id) as is_pro
    from public.user_profiles u
    where u.id = auth.uid()
  )
  select
    up.id,
    up.role::text,
    up.full_name::text,
    up.avatar_url::text,
    up.bio,
    up.city::text,
    up.country::text,
    up.is_verified,
    up.is_minor,
    up.followers_count,
    null::text,
    null::text,
    0,
    'rising'::text,
    exists (
      select 1 from public.follows f
      where f.follower_id = me.id and f.following_id = up.id
    )
  from me
  join public.user_profiles up
    on up.role::text = 'guardian'
   and up.id <> me.id
   and not coalesce(up.is_suspended, false)
  where (me.is_parent or me.is_pro)
    and not private.users_are_blocked(me.id, up.id)
    and exists (
      select 1 from public.guardian_consents gc
      where gc.guardian_user_id = up.id
        and gc.status = 'granted'
        and gc.show_on_profile
        and (
          (me.is_pro and private.can_see_family(me.id, gc.minor_user_id, up.id))
          or (me.is_parent and private.child_visible_to(me.id, gc.minor_user_id, up.id))
        )
    )
  order by up.is_verified desc, up.full_name asc nulls last, up.id
  limit greatest(1, least(coalesce(p_limit, 40), 50))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ------------------------------------------------------------
-- A tag is hidden once the author and the tagged person block
-- each other, in either direction.
-- ------------------------------------------------------------
drop policy if exists post_tags_select on public.post_tags;

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
        and not private.users_are_blocked(posts.author_id, post_tags.user_id)
    )
    and private.viewer_can_see_author(user_id)
    and not private.users_are_blocked(auth.uid(), user_id)
  )
);

-- ------------------------------------------------------------
-- Tagging: one notice per person per post, only about a post
-- they can see.
-- ------------------------------------------------------------
create or replace function public.set_post_tags(p_post uuid, p_users uuid[])
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

    -- One notice per person per post: removing and re-adding a tag
    -- stays quiet, the same as likes (QA-173). And never about a post
    -- the tagged person cannot see, the same as mentions (QA-223).
    if exists (
      select 1
      from public.notifications n
      where n.user_id = v_person
        and n.type = 'post_tag'
        and n.entity_type = 'post'
        and n.entity_id = p_post::text
    ) then
      continue;
    end if;

    if not private.recipient_can_see_post(p_post, v_person) then
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
$function$;
