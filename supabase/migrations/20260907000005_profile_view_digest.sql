-- ============================================================
-- 0907/05 — Who has been looking
--
-- `profile_views` has been collecting rows since the first release and nothing
-- has ever shown them to the person they are about. On a discovery platform
-- that is the wrong way round: "two coaches from Al Jadaf opened your profile
-- this week" is the sentence that makes someone come back, and unlike a streak
-- it is not a game — it is the product working.
--
-- Who gets named, and who does not:
--
--   * A verified coach, scout or club is named. They are professionals acting
--     professionally, on a profile the athlete published to be found.
--
--   * Everyone else is counted, never named. An unverified account and another
--     athlete both land in the total and nowhere else. Naming them would turn
--     a discovery feature into a surveillance one, and for a fifteen-year-old
--     it would mean handing over a list of strangers who looked at them.
-- ============================================================

create table if not exists public.view_digest_seen (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,
  seen_at timestamptz not null default now()
);
alter table public.view_digest_seen enable row level security;

drop policy if exists view_digest_seen_own on public.view_digest_seen;
create policy view_digest_seen_own on public.view_digest_seen
  for select to authenticated using (user_id = auth.uid());

revoke insert, update, delete on public.view_digest_seen from authenticated, anon;

-- ------------------------------------------------------------
-- The digest
-- ------------------------------------------------------------
create or replace function public.profile_view_digest(p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_athlete   uuid;
  v_since     timestamptz;
  v_seen      timestamptz;
  v_total     integer := 0;
  v_pro       integer := 0;
  v_clubs     integer := 0;
  v_new       integer := 0;
  v_named     jsonb   := '[]'::jsonb;
begin
  select id into v_athlete from public.athlete_profiles where user_id = auth.uid();
  if v_athlete is null then
    return jsonb_build_object('is_athlete', false);
  end if;

  v_since := now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)));
  select seen_at into v_seen from public.view_digest_seen where user_id = auth.uid();

  select
    count(*),
    count(*) filter (where v.viewer_role in ('coach','scout','club')),
    count(distinct v.viewer_org) filter (where v.viewer_org is not null),
    count(*) filter (where v_seen is null or v.created_at > v_seen)
  into v_total, v_pro, v_clubs, v_new
  from public.profile_views v
  where v.athlete_id = v_athlete
    and v.created_at >= v_since
    and coalesce(v.viewer_user_id, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid();

  select coalesce(jsonb_agg(row_to_json(d)), '[]'::jsonb)
  into v_named
  from (
    select
      up.id            as user_id,
      up.full_name,
      up.avatar_url,
      up.role,
      coalesce(max(v.viewer_org), org.name) as organization,
      count(*)::int    as views,
      max(v.created_at) as last_viewed_at
    from public.profile_views v
    join public.user_profiles up on up.id = v.viewer_user_id
    left join lateral (
      select o.name
      from public.organization_members m
      join public.organizations o on o.id = m.organization_id
      where m.user_id = up.id and m.status = 'active'
      order by m.created_at
      limit 1
    ) org on true
    where v.athlete_id = v_athlete
      and v.created_at >= v_since
      and up.id <> auth.uid()
      and up.role in ('coach','scout','club')
      and coalesce(up.is_verified, false)
      and coalesce(up.is_suspended, false) = false
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = up.id)
           or (b.blocker_id = up.id and b.blocked_id = auth.uid())
      )
    group by up.id, up.full_name, up.avatar_url, up.role, org.name
    order by max(v.created_at) desc
    limit 20
  ) d;

  return jsonb_build_object(
    'is_athlete',   true,
    'days',         greatest(1, least(coalesce(p_days, 7), 90)),
    'total',        v_total,
    'professional', v_pro,
    'clubs',        v_clubs,
    'new_since_seen', v_new,
    'named',        v_named,
    /* Everyone the digest counted but did not name, so the screen can say
       "and 4 others" honestly rather than implying the list is complete. */
    'unnamed',      greatest(0, v_total - coalesce(jsonb_array_length(v_named), 0))
  );
end;
$$;

create or replace function public.mark_profile_views_seen()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.view_digest_seen (user_id, seen_at)
  values (auth.uid(), now())
  on conflict (user_id) do update set seen_at = now();
$$;

grant execute on function
  public.profile_view_digest(integer),
  public.mark_profile_views_seen()
to authenticated;
