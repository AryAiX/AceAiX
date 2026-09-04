-- ============================================================
-- 0904/07 — Corrections found while building the new client
--
-- Three real defects, each of which would have shipped as a bug:
--   1. Post and highlight media was unreadable by anyone but its owner.
--   2. Four of the six application statuses the UI uses were rejected by a
--      CHECK constraint written against different vocabulary.
--   3. The Talent Score percentile compared an athlete against every sport
--      at once, so a chess player was ranked against sprinters.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Media in the `posts` bucket must be readable
--
-- The bucket was created private, and both the feed and profile highlights
-- build plain public URLs — so every image and clip 404'd for every viewer,
-- including the person who uploaded it.
--
-- Post media is content people publish to a feed, and object paths carry an
-- unguessable UUID, so the bucket is made public and reads go straight to the
-- CDN. Who can *find* a post is still decided by `posts.audience` and RLS.
-- `stories` stays private: it is ephemeral by design and is not used by the
-- 1.0 client.
-- ------------------------------------------------------------
update storage.buckets set public = true where id = 'posts';

drop policy if exists media_authenticated_read on storage.objects;
create policy media_posts_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id = 'posts');

create policy media_stories_authenticated_read
on storage.objects for select
to authenticated
using (bucket_id = 'stories');

-- ------------------------------------------------------------
-- 2. Application statuses
--
-- The constraint allowed applied | viewed | shortlisted | trial_offered |
-- accepted | not_selected. The client speaks applied | in_review |
-- shortlisted | invited | rejected | withdrawn — and had no way at all to
-- record a withdrawal, which App Store reviewers look for as a way out of a
-- submitted form.
--
-- The client vocabulary wins because it is the one people read on screen.
-- Existing rows are translated rather than dropped.
-- ------------------------------------------------------------
alter table public.applications drop constraint if exists applications_status_check;

update public.applications set status = 'in_review' where status = 'viewed';
update public.applications set status = 'invited'   where status in ('trial_offered', 'accepted');
update public.applications set status = 'rejected'  where status = 'not_selected';

alter table public.applications
  add constraint applications_status_check
  check (status in ('applied','in_review','shortlisted','invited','rejected','withdrawn'));

comment on column public.applications.status is
  'applied → in_review → shortlisted → invited, or rejected. withdrawn is athlete-initiated and terminal until they re-apply.';

-- An athlete may only withdraw; every other transition belongs to the club.
create or replace function private.guard_application_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_owner uuid;
begin
  if auth.role() = 'service_role' or private.is_admin() then return new; end if;
  if new.status is not distinct from old.status then return new; end if;

  select created_by_id into v_owner from public.opportunities where id = new.opportunity_id;

  if auth.uid() = new.athlete_id and new.status not in ('withdrawn', 'applied') then
    raise exception 'Only the club can change an application''s status'
      using errcode = '42501';
  end if;

  if auth.uid() = v_owner and new.status = 'withdrawn' then
    raise exception 'Only the athlete can withdraw an application'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_applications_status_guard on public.applications;
create trigger trg_applications_status_guard
  before update of status on public.applications
  for each row execute function private.guard_application_status();

-- ------------------------------------------------------------
-- 3. Percentile within the athlete's own sport
--
-- "Top 12%" is only a useful sentence if the comparison group is the one the
-- athlete competes in. Comparing across every sport at once made the number
-- meaningless, and the UI had to hedge the copy to stay honest.
--
-- Below ten scored athletes in a sport the sample is too small to say
-- anything, so the percentile is left null and the client hides the line.
-- ------------------------------------------------------------
create or replace function private.refresh_talent_score(p_athlete uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r         jsonb;
  v_prev    integer;
  v_pct     integer;
  v_sport   text;
  v_cohort  integer;
begin
  r := private.compute_talent_score(p_athlete);
  if r is null then return; end if;

  select overall into v_prev from public.talent_scores where athlete_id = p_athlete;
  select sport   into v_sport from public.athlete_profiles where id = p_athlete;

  select count(*) into v_cohort
  from public.talent_scores ts
  join public.athlete_profiles ap on ap.id = ts.athlete_id
  where v_sport is not null and ap.sport is not distinct from v_sport;

  if v_cohort >= 10 then
    select round(
      100.0 * (
        select count(*)
        from public.talent_scores ts
        join public.athlete_profiles ap on ap.id = ts.athlete_id
        where ap.sport is not distinct from v_sport
          and ts.overall <= (r ->> 'overall')::int
      ) / v_cohort
    )::int into v_pct;
  else
    v_pct := null;
  end if;

  insert into public.talent_scores as t (
    athlete_id, overall, tier,
    profile_score, performance_score, media_score, credibility_score, engagement_score,
    inputs, tips, percentile, previous_overall, computed_at, updated_at
  )
  values (
    p_athlete,
    (r ->> 'overall')::int,
    r ->> 'tier',
    (r ->> 'profile_score')::int,
    (r ->> 'performance_score')::int,
    (r ->> 'media_score')::int,
    (r ->> 'credibility_score')::int,
    (r ->> 'engagement_score')::int,
    r -> 'inputs',
    private.build_score_tips(r),
    v_pct,
    v_prev,
    now(),
    now()
  )
  on conflict (athlete_id) do update set
    overall           = excluded.overall,
    tier              = excluded.tier,
    profile_score     = excluded.profile_score,
    performance_score = excluded.performance_score,
    media_score       = excluded.media_score,
    credibility_score = excluded.credibility_score,
    engagement_score  = excluded.engagement_score,
    inputs            = excluded.inputs,
    tips              = excluded.tips,
    percentile        = excluded.percentile,
    previous_overall  = t.overall,
    computed_at       = now(),
    updated_at        = now();

  insert into public.talent_score_history (athlete_id, overall, tier, pillars, recorded_on)
  values (
    p_athlete,
    (r ->> 'overall')::int,
    r ->> 'tier',
    jsonb_build_object(
      'profile',     (r ->> 'profile_score')::int,
      'performance', (r ->> 'performance_score')::int,
      'media',       (r ->> 'media_score')::int,
      'credibility', (r ->> 'credibility_score')::int,
      'engagement',  (r ->> 'engagement_score')::int
    ),
    current_date
  )
  on conflict (athlete_id, recorded_on) do update set
    overall = excluded.overall,
    tier    = excluded.tier,
    pillars = excluded.pillars;

  update public.athlete_profiles
  set performance_score    = (r ->> 'performance_score')::int,
      visibility_score     = (r ->> 'overall')::int,
      profile_completeness = (r ->> 'profile_score')::int
  where id = p_athlete;
end;
$$;

-- ------------------------------------------------------------
-- 4. Housekeeping the new client relies on
-- ------------------------------------------------------------

-- The composer and the profile editor both write these; make sure the write
-- paths survived the column-level revokes in 0904/02 and /05.
grant update (storage_url, thumbnail_url, title, description, is_featured, is_public)
  on public.athlete_media to authenticated;

-- Live message arrival in a thread needs the table published; 0018 publishes
-- messages, but a fresh project may not have applied that list cleanly.
do $$
declare v_table text;
begin
  foreach v_table in array array['notifications','messages','conversations','post_comments','post_likes','follows']
  loop
    if to_regclass(format('public.%I', v_table)) is not null
      and not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
      ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;

-- Re-score everyone so percentiles are recomputed against their own sport.
do $$
declare r record;
begin
  for r in select id from public.athlete_profiles loop
    perform private.refresh_talent_score(r.id);
  end loop;
end;
$$;
