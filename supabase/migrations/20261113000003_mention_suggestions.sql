-- ============================================================
-- Mention suggestions while typing @ (QA-187)
--
-- Typing @ on its own showed nobody. When a name was typed,
-- the list was ordered by the name, so someone you follow
-- could sit under a stranger.
--
-- An empty search now returns only the people you follow.
-- A search of up to 40 characters matches the name, and
-- \ % and _ are matched as ordinary characters. People you
-- follow come first, then names that start with what you
-- typed, then verified accounts, then the name itself.
-- At most 30 people are returned.
--
-- Who can appear is exactly who mention_candidates already
-- allows: not suspended, not a minor unless discoverable,
-- not blocked in either direction, and only when
-- can_mention allows it. The caller is never listed.
-- ============================================================

create or replace function public.mention_suggestions(
  p_query text default null,
  p_limit integer default 20
)
returns table (
  id          uuid,
  full_name   text,
  avatar_url  text,
  is_verified boolean,
  role        text,
  following   boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with needle as (
    select btrim(coalesce(p_query, '')) as raw
  ),
  prepared as (
    select
      raw,
      replace(replace(replace(raw, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') as literal
    from needle
  )
  select
    up.id,
    up.full_name::text,
    up.avatar_url::text,
    up.is_verified,
    up.role::text,
    (f.follower_id is not null) as following
  from public.user_profiles up
  cross join prepared p
  left join public.follows f
    on f.follower_id = auth.uid()
   and f.following_id = up.id
  where auth.uid() is not null
    and up.id <> auth.uid()
    and char_length(p.raw) <= 40
    and (
      (p.raw = '' and f.follower_id is not null)
      or (
        p.raw <> ''
        and up.full_name ilike ('%' || p.literal || '%') escape E'\\'
      )
    )
    and not coalesce(up.is_suspended, false)
    and (not coalesce(up.is_minor, false) or coalesce(up.is_discoverable, false))
    and not private.users_are_blocked(auth.uid(), up.id)
    and private.can_mention(auth.uid(), up.id)
  order by
    (f.follower_id is not null) desc,
    (up.full_name ilike (p.literal || '%') escape E'\\') desc nulls last,
    up.is_verified desc,
    up.full_name asc
  limit greatest(1, least(coalesce(p_limit, 20), 30));
$$;

revoke all on function public.mention_suggestions(text, integer) from public, anon;
grant execute on function public.mention_suggestions(text, integer) to authenticated;
