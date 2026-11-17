-- ============================================================
-- One challenge, including one that has finished (QA-194)
--
-- Opening a finished challenge showed "Something went wrong". The
-- screen loaded open_challenges and looked for the id in that list.
-- open_challenges drops a challenge once it is closed, and again 7
-- days after it closes, and it stops at 50. An older challenge opened
-- from Mine, a notification, or a club page was not in the list.
--
-- challenge_detail reads that one challenge in any status, with no
-- time cut-off, and includes the caller's own entry. Every signed-in
-- user can already read public.challenges (the challenges_read policy),
-- so nothing new becomes visible. A suspended setter is still hidden
-- from everyone except themselves, the same rule as open_challenges.
-- ============================================================

create or replace function public.challenge_detail(p_id uuid)
returns table (
  id              uuid,
  title           text,
  brief           text,
  sport           text,
  metric_label    text,
  metric_unit     text,
  metric_better   text,
  closes_at       timestamptz,
  status          text,
  entry_count     integer,
  age_min         integer,
  age_max         integer,
  setter_id       uuid,
  setter_name     text,
  setter_avatar   text,
  setter_verified boolean,
  org_id          uuid,
  org_name        text,
  my_entry_id     uuid,
  my_entry_status text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_viewer uuid := auth.uid();
begin
  if v_viewer is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.title::text,
    c.brief::text,
    c.sport::text,
    c.metric_label::text,
    c.metric_unit::text,
    c.metric_better::text,
    c.closes_at,
    c.status::text,
    c.entry_count,
    c.age_min,
    c.age_max,
    c.created_by,
    su.full_name::text,
    su.avatar_url::text,
    coalesce(su.is_verified, false),
    c.organization_id,
    o.name::text,
    e.id,
    e.status::text
  from public.challenges c
  join public.user_profiles su on su.id = c.created_by
  left join public.organizations o on o.id = c.organization_id
  left join public.athlete_profiles me on me.user_id = v_viewer
  left join public.challenge_entries e
         on e.challenge_id = c.id and e.athlete_id = me.id
  where c.id = p_id
    and (
      c.created_by = v_viewer
      or coalesce(su.is_suspended, false) = false
    )
  limit 1;
end;
$$;

revoke all on function public.challenge_detail(uuid) from public, anon;
grant execute on function public.challenge_detail(uuid) to authenticated;
