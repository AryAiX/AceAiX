-- ============================================================
-- Challenges a person set, including ones that have finished (QA-193)
--
-- The number on a coach, club or scout profile counted every challenge
-- they had ever set. The Mine tab read open_challenges, which leaves a
-- challenge out once its status is closed, and again 7 days after it
-- closes. A finished challenge was counted, then could not be found.
--
-- my_set_challenges returns every challenge the signed-in user created,
-- in any status, with no 7-day cut-off. The columns match open_challenges
-- so the same card can render a row. Challenges that are still live come
-- first, soonest closing first. Everything else follows, most recently
-- closed first.
-- ============================================================

create or replace function public.my_set_challenges(
  p_limit  integer default 50,
  p_offset integer default 0
)
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
  v_limit  integer;
  v_offset integer;
begin
  if v_viewer is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset := greatest(coalesce(p_offset, 0), 0);

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
    -- Kept so the rows match open_challenges. A setter never enters their own.
    null::uuid,
    null::text
  from public.challenges c
  join public.user_profiles su on su.id = c.created_by
  left join public.organizations o on o.id = c.organization_id
  where c.created_by = v_viewer
  order by
    (c.status = 'open' and c.closes_at > now()) desc,
    case
      when c.status = 'open' and c.closes_at > now() then c.closes_at
    end asc,
    c.closes_at desc,
    c.id
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.my_set_challenges(integer, integer) from public, anon;
grant execute on function public.my_set_challenges(integer, integer) to authenticated;
