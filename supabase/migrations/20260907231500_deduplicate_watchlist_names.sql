-- Consolidate case-insensitive duplicate watchlists before enforcing uniqueness.
--
-- Deterministic precedence:
--   * The oldest watchlist (created_at, then id) is canonical.
--   * Every non-empty description is retained in oldest-list order and separated
--     by a visible merge delimiter. Exact duplicate descriptions are stored once.
--   * Every non-empty athlete note is retained with its source watchlist name.
--   * The scalar rating uses the newest non-null membership rating
--     (added_at, then membership id). If source ratings conflict, every source
--     value is also appended to notes so no rating is silently discarded.
--   * added_at keeps the earliest membership timestamp.
--
-- Consolidation is completed before duplicate rows are deleted and before the
-- normalized-name unique index is created.
--
-- Supabase applies migrations transactionally. Hold these locks through commit
-- so inserts/renames cannot introduce a new duplicate and membership writes
-- cannot race consolidation or be lost when duplicate parents cascade-delete.
-- Ordinary reads remain available.
lock table public.watchlists, public.watchlist_athletes
  in share row exclusive mode;

with ranked_watchlists as (
  select
    id,
    name,
    created_at,
    first_value(id) over (
      partition by user_id, lower(btrim(name))
      order by created_at, id
    ) as canonical_id,
    count(*) over (
      partition by user_id, lower(btrim(name))
    ) as duplicate_count
  from public.watchlists
),
membership_sources as (
  select
    ranked.canonical_id,
    ranked.id as source_watchlist_id,
    ranked.name as source_watchlist_name,
    ranked.created_at as source_watchlist_created_at,
    athlete.id as membership_id,
    athlete.athlete_id,
    athlete.notes,
    athlete.rating,
    athlete.added_at
  from ranked_watchlists ranked
  join public.watchlist_athletes athlete on athlete.watchlist_id = ranked.id
  where ranked.duplicate_count > 1
),
merged_memberships as (
  select
    canonical_id as watchlist_id,
    athlete_id,
    case
      when count(*) = 1 then
        (array_agg(notes order by source_watchlist_created_at, source_watchlist_id, added_at, membership_id))[1]
      when count(*) filter (where notes is not null and btrim(notes) <> '') = 0
       and count(distinct rating) <= 1
        then null
      else concat_ws(
        E'\n\n',
        string_agg(
          format('[From watchlist "%s"] %s', source_watchlist_name, notes),
          E'\n\n'
          order by source_watchlist_created_at, source_watchlist_id, added_at, membership_id
        ) filter (where notes is not null and btrim(notes) <> ''),
        case
          when count(distinct rating) > 1 then
            '[Merged rating history] ' || string_agg(
              format('%s=%s', source_watchlist_name, rating),
              '; '
              order by source_watchlist_created_at, source_watchlist_id, added_at, membership_id
            ) filter (where rating is not null)
        end
      )
    end as notes,
    (
      array_agg(rating order by added_at desc, membership_id desc)
        filter (where rating is not null)
    )[1] as rating,
    min(added_at) as added_at
  from membership_sources
  group by canonical_id, athlete_id
)
insert into public.watchlist_athletes (watchlist_id, athlete_id, notes, rating, added_at)
select watchlist_id, athlete_id, notes, rating, added_at
from merged_memberships
on conflict (watchlist_id, athlete_id) do update
set
  notes = excluded.notes,
  rating = excluded.rating,
  added_at = excluded.added_at;

with ranked_watchlists as (
  select
    id,
    first_value(id) over (
      partition by user_id, lower(btrim(name))
      order by created_at, id
    ) as canonical_id,
    row_number() over (
      partition by user_id, lower(btrim(name))
      order by created_at, id
    ) as duplicate_rank,
    count(*) over (
      partition by user_id, lower(btrim(name))
    ) as duplicate_count
  from public.watchlists
),
description_sources as (
  select
    ranked.canonical_id,
    watchlist.description,
    min(watchlist.created_at) as first_created_at,
    (array_agg(watchlist.id order by watchlist.created_at, watchlist.id))[1] as first_id
  from ranked_watchlists ranked
  join public.watchlists watchlist on watchlist.id = ranked.id
  where watchlist.description is not null
    and btrim(watchlist.description) <> ''
  group by ranked.canonical_id, watchlist.description
),
merged_descriptions as (
  select
    source.canonical_id,
    string_agg(
      source.description,
      E'\n\n--- Merged from duplicate watchlist ---\n\n'
      order by source.first_created_at, source.first_id
    ) as description
  from description_sources source
  group by source.canonical_id
),
merged_metadata as (
  select
    ranked.canonical_id,
    descriptions.description,
    max(watchlist.updated_at) as updated_at
  from ranked_watchlists ranked
  join public.watchlists watchlist on watchlist.id = ranked.id
  left join merged_descriptions descriptions on descriptions.canonical_id = ranked.canonical_id
  where ranked.duplicate_count > 1
  group by ranked.canonical_id, descriptions.description
)
update public.watchlists canonical
set
  description = coalesce(merged.description, canonical.description),
  updated_at = greatest(canonical.updated_at, merged.updated_at)
from merged_metadata merged
where canonical.id = merged.canonical_id;

with ranked_watchlists as (
  select
    id,
    row_number() over (
      partition by user_id, lower(btrim(name))
      order by created_at, id
    ) as duplicate_rank
  from public.watchlists
)
delete from public.watchlists duplicate
using ranked_watchlists ranked
where duplicate.id = ranked.id
  and ranked.duplicate_rank > 1;

alter table public.watchlists
  add column name_normalized text
  generated always as (lower(btrim(name))) stored;

create unique index watchlists_user_normalized_name_uidx
  on public.watchlists (user_id, name_normalized);
