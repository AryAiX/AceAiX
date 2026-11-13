-- ============================================================
-- Hashtag suggestions while typing (QA-185)
--
-- There is no hint that #baby already exists, so the same
-- subject gets split across spellings.
--
-- A tag is # plus one or more letters, numbers or underscores.
-- The # starts a tag only at the beginning of the text, or
-- after a character that is not itself part of a tag, the
-- same rule as mobile/lib/hashtags.ts. x#baby is not a tag.
-- Stored tags are the lower-case word, at most 50 characters.
--
-- Only public, visible posts are counted. A post counts when
-- its audience is public, it is not hidden, and its moderation
-- state is visible.
-- ============================================================

-- ------------------------------------------------------------
-- One row per tag on a post. Clients do not read or write it.
-- ------------------------------------------------------------
create table public.post_hashtags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag     text not null check (char_length(tag) between 1 and 50),
  primary key (post_id, tag)
);

create index idx_post_hashtags_tag
  on public.post_hashtags (tag text_pattern_ops);

alter table public.post_hashtags enable row level security;

revoke all on table public.post_hashtags from public, anon, authenticated, service_role;

-- ------------------------------------------------------------
-- The tags in a caption. Distinct, lower case, at most 50
-- characters. The same boundary as mobile/lib/hashtags.ts.
-- ------------------------------------------------------------
create or replace function private.hashtags_in(p_text text)
returns text[]
language sql
immutable
set search_path = pg_catalog, pg_temp
as $$
  select coalesce(array_agg(distinct lower(m[1])), '{}'::text[])
  from regexp_matches(
    coalesce(p_text, ''),
    '(?:^|[^[:alnum:]_])#([[:alnum:]_]+)',
    'g'
  ) as m
  where char_length(m[1]) <= 50;
$$;

revoke all on function private.hashtags_in(text) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Keep post_hashtags in step with caption and text.
-- ------------------------------------------------------------
create or replace function private.on_post_hashtags()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and new.caption is not distinct from old.caption
     and new.text is not distinct from old.text then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    delete from public.post_hashtags where post_id = new.id;
  end if;

  insert into public.post_hashtags (post_id, tag)
  select new.id, found.tag
  from unnest(private.hashtags_in(coalesce(new.caption, new.text))) as found(tag);

  return new;
end;
$$;

revoke all on function private.on_post_hashtags() from public, anon, authenticated, service_role;

drop trigger if exists trg_post_hashtags on public.posts;
create trigger trg_post_hashtags
  after insert or update of caption, text on public.posts
  for each row execute function private.on_post_hashtags();

-- Posts that already exist. The trigger covers inserts after this.
insert into public.post_hashtags (post_id, tag)
select p.id, found.tag
from public.posts p
cross join lateral unnest(private.hashtags_in(coalesce(p.caption, p.text))) as found(tag)
on conflict do nothing;

-- ------------------------------------------------------------
-- Prefixes for the box the author is typing in.
-- ------------------------------------------------------------
create or replace function public.hashtag_suggestions(
  p_prefix text,
  p_limit integer default 8
)
returns table (tag text, post_count integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with cleaned as (
    select lower(btrim(coalesce(p_prefix, ''), '# ')) as raw
  )
  select h.tag, count(distinct h.post_id)::integer as post_count
  from public.post_hashtags h
  join public.posts p on p.id = h.post_id
  cross join cleaned c
  where auth.uid() is not null
    and char_length(c.raw) between 1 and 50
    and h.tag like (
      replace(replace(replace(c.raw, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
    ) escape E'\\'
    and p.audience = 'public'
    and p.is_hidden = false
    and p.moderation_state = 'visible'
  group by h.tag
  order by count(distinct h.post_id) desc, h.tag
  limit least(greatest(coalesce(p_limit, 8), 1), 20);
$$;

revoke all on function public.hashtag_suggestions(text, integer) from public, anon;
grant execute on function public.hashtag_suggestions(text, integer) to authenticated;
