-- ============================================================
-- 0024 — Moderation, blocking, and the profile read path
--
-- Two jobs:
--
--   1. The safety surface Apple and Google require for user-generated
--      content: report, block, hide, suspend — plus rate limits so a
--      compromised account cannot flood the network.
--
--   2. One authoritative RPC for reading a profile. Tapping an avatar used
--      to fan out into several unguarded queries whose shapes disagreed,
--      which is how a profile tap ended on a blank or broken screen. Now the
--      client asks one question and gets one typed answer, or a clean error.
-- ============================================================

-- ------------------------------------------------------------
-- Post moderation state
-- ------------------------------------------------------------
alter table public.posts
  add column if not exists is_hidden boolean not null default false,
  add column if not exists moderation_state text not null default 'visible'
      check (moderation_state in ('visible','under_review','removed')),
  add column if not exists removed_reason text;

alter table public.post_comments
  add column if not exists is_hidden boolean not null default false;

alter table public.moderation_reports
  add column if not exists reported_user_id uuid references public.user_profiles(id) on delete set null,
  add column if not exists action_taken text;

create index if not exists idx_moderation_reports_entity
  on public.moderation_reports(reported_entity_type, reported_entity_id);

-- ------------------------------------------------------------
-- Reporting
-- ------------------------------------------------------------
create or replace function public.report_content(
  p_entity_type text,        -- post | comment | user | message | opportunity | story
  p_entity_id   text,
  p_reason      text,        -- spam | harassment | nudity | violence | hate |
                             -- impersonation | child_safety | scam | other
  p_details     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id        uuid;
  v_target    uuid;
  v_minor     boolean := false;
  v_severity  text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_entity_type not in ('post','comment','user','message','opportunity','story') then
    raise exception 'Unknown report target' using errcode = '22023';
  end if;
  if p_reason not in ('spam','harassment','nudity','violence','hate',
                      'impersonation','child_safety','scam','other') then
    raise exception 'Unknown report reason' using errcode = '22023';
  end if;

  -- Resolve the account behind the reported object so moderators can act.
  v_target := case p_entity_type
    when 'user'        then p_entity_id::uuid
    when 'post'        then (select author_id from public.posts where id = p_entity_id::uuid)
    when 'comment'     then (select author_id from public.post_comments where id = p_entity_id::uuid)
    when 'message'     then (select sender_id from public.messages where id = p_entity_id::uuid)
    when 'story'       then (select author_id from public.stories where id = p_entity_id::uuid)
    when 'opportunity' then (select created_by_id from public.opportunities where id = p_entity_id::uuid)
  end;

  if v_target is not null then
    select is_minor into v_minor from public.user_profiles where id = v_target;
  end if;
  v_minor := coalesce(v_minor, false)
             or coalesce((select is_minor from public.user_profiles where id = auth.uid()), false);

  /* Anything touching a minor, or flagged as a child-safety concern, enters
     the queue at high severity and is reviewed first. */
  v_severity := case
    when p_reason = 'child_safety' then 'high'
    when v_minor then 'high'
    when p_reason in ('harassment','nudity','violence','hate') then 'medium'
    else 'low'
  end;

  insert into public.moderation_reports (
    reporter_id, reported_entity_type, reported_entity_id, reported_user_id,
    reason, details, severity, status, is_minor_related
  )
  values (
    auth.uid(), p_entity_type, p_entity_id, v_target,
    p_reason, left(coalesce(p_details, ''), 2000), v_severity, 'open', v_minor
  )
  returning id into v_id;

  /* A child-safety report takes the content out of circulation immediately
     and it stays down until a human clears it. */
  if p_reason = 'child_safety' or v_severity = 'high' then
    if p_entity_type = 'post' then
      update public.posts
      set moderation_state = 'under_review', is_hidden = true
      where id = p_entity_id::uuid;
    elsif p_entity_type = 'comment' then
      update public.post_comments set is_hidden = true where id = p_entity_id::uuid;
    end if;
  end if;

  return v_id;
end;
$$;

revoke all on function public.report_content(text, text, text, text) from public, anon;
grant execute on function public.report_content(text, text, text, text) to authenticated;

-- ------------------------------------------------------------
-- Blocking
-- ------------------------------------------------------------
create or replace function public.block_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'You cannot block yourself' using errcode = '22023';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (auth.uid(), p_user)
  on conflict (blocker_id, blocked_id) do nothing;

  -- A block ends the relationship in both directions.
  delete from public.follows
  where (follower_id = auth.uid() and following_id = p_user)
     or (follower_id = p_user and following_id = auth.uid());

  delete from public.notifications
  where (user_id = auth.uid() and actor_id = p_user)
     or (user_id = p_user and actor_id = auth.uid());
end;
$$;

create or replace function public.unblock_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.user_blocks where blocker_id = auth.uid() and blocked_id = p_user;
end;
$$;

revoke all on function public.block_user(uuid)   from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
grant execute on function public.block_user(uuid)   to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;

-- ------------------------------------------------------------
-- Feed hygiene: blocked, suspended and removed content never appears
-- ------------------------------------------------------------
drop policy if exists posts_select on public.posts;
create policy posts_select
on public.posts for select
to authenticated
using (
  author_id = auth.uid()
  or (
    not is_hidden
    and moderation_state = 'visible'
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = posts.author_id)
         or (b.blocker_id = posts.author_id and b.blocked_id = auth.uid())
    )
    and not exists (
      select 1 from public.user_profiles u
      where u.id = posts.author_id and u.is_suspended
    )
    and (
      audience = 'public'
      or (audience = 'followers' and exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = posts.author_id))
      or (audience = 'connections' and exists (
        select 1
        from public.follows outgoing
        join public.follows incoming
          on incoming.follower_id = posts.author_id
         and incoming.following_id = auth.uid()
        where outgoing.follower_id = auth.uid()
          and outgoing.following_id = posts.author_id))
    )
  )
);

drop policy if exists post_comments_select on public.post_comments;
create policy post_comments_select
on public.post_comments for select
to authenticated
using (
  author_id = auth.uid()
  or (
    not is_hidden
    and exists (select 1 from public.posts p where p.id = post_comments.post_id)
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = post_comments.author_id)
         or (b.blocker_id = post_comments.author_id and b.blocked_id = auth.uid())
    )
  )
);

-- Moderation state, counters and read flags are not client-writable. Column
-- privileges rather than a trigger, so the SECURITY DEFINER paths above
-- (report_content, mark_notifications_read) still work and no crafted request
-- can talk its way around the rule.
revoke update on public.posts from authenticated, anon;
grant update (caption, text, media, tags, audience, image_url)
  on public.posts to authenticated;

revoke update on public.post_comments from authenticated, anon;
grant update (body) on public.post_comments to authenticated;

revoke update on public.notifications from authenticated, anon;
grant update (is_read, read) on public.notifications to authenticated;

revoke update on public.moderation_reports from authenticated, anon;

-- ------------------------------------------------------------
-- Rate limits — a compromised or scripted account cannot flood the network
-- ------------------------------------------------------------
create or replace function private.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_actor uuid := auth.uid();
begin
  if v_actor is null or auth.role() = 'service_role' then return new; end if;

  if tg_table_name = 'messages' then
    select count(*) into v_count from public.messages
    where sender_id = v_actor and created_at > now() - interval '1 minute';
    if v_count >= 30 then
      raise exception 'You are sending messages too quickly. Take a short break.'
        using errcode = '54000', hint = 'rate_limited';
    end if;

  elsif tg_table_name = 'posts' then
    select count(*) into v_count from public.posts
    where author_id = v_actor and created_at > now() - interval '1 hour';
    if v_count >= 20 then
      raise exception 'You have reached the hourly posting limit.'
        using errcode = '54000', hint = 'rate_limited';
    end if;

  elsif tg_table_name = 'post_comments' then
    select count(*) into v_count from public.post_comments
    where author_id = v_actor and created_at > now() - interval '1 minute';
    if v_count >= 15 then
      raise exception 'You are commenting too quickly.'
        using errcode = '54000', hint = 'rate_limited';
    end if;

  elsif tg_table_name = 'follows' then
    select count(*) into v_count from public.follows
    where follower_id = v_actor and created_at > now() - interval '1 hour';
    if v_count >= 120 then
      raise exception 'You have followed too many accounts in a short time.'
        using errcode = '54000', hint = 'rate_limited';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_messages_rate_limit on public.messages;
create trigger trg_messages_rate_limit before insert on public.messages
  for each row execute function private.enforce_rate_limit();

drop trigger if exists trg_posts_rate_limit on public.posts;
create trigger trg_posts_rate_limit before insert on public.posts
  for each row execute function private.enforce_rate_limit();

drop trigger if exists trg_comments_rate_limit on public.post_comments;
create trigger trg_comments_rate_limit before insert on public.post_comments
  for each row execute function private.enforce_rate_limit();

drop trigger if exists trg_follows_rate_limit on public.follows;
create trigger trg_follows_rate_limit before insert on public.follows
  for each row execute function private.enforce_rate_limit();

-- ------------------------------------------------------------
-- Follow / unfollow as one idempotent call
-- ------------------------------------------------------------
create or replace function public.toggle_follow(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_following boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'You cannot follow yourself' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = p_user)
       or (b.blocker_id = p_user and b.blocked_id = auth.uid())
  ) then
    raise exception 'This account is not available' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.follows
    where follower_id = auth.uid() and following_id = p_user
  ) into v_following;

  if v_following then
    delete from public.follows where follower_id = auth.uid() and following_id = p_user;
  else
    insert into public.follows (follower_id, following_id)
    values (auth.uid(), p_user)
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'following', not v_following,
    'followers_count', (select followers_count from public.user_profiles where id = p_user)
  );
end;
$$;

revoke all on function public.toggle_follow(uuid) from public, anon;
grant execute on function public.toggle_follow(uuid) to authenticated;

-- ------------------------------------------------------------
-- One profile read to rule them all
-- ------------------------------------------------------------
create or replace function public.get_profile_bundle(p_user uuid)
returns jsonb
language plpgsql
/* Volatile on purpose: reading a profile also records scout interest. */
security definer
set search_path = public, pg_temp
as $$
declare
  v_viewer  uuid := auth.uid();
  up        record;
  ap        record;
  cp        record;
  ts        record;
  v_blocked boolean;
  v_org     jsonb;
begin
  if v_viewer is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into up from public.user_profiles where id = p_user;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_viewer and b.blocked_id = p_user)
       or (b.blocker_id = p_user and b.blocked_id = v_viewer)
  ) into v_blocked;

  if v_blocked and v_viewer <> p_user then
    return jsonb_build_object(
      'user', jsonb_build_object('id', up.id, 'full_name', up.full_name),
      'blocked', true,
      'viewer', jsonb_build_object('is_self', false)
    );
  end if;

  if up.is_suspended and v_viewer <> p_user and not private.is_admin() then
    return jsonb_build_object(
      'user', jsonb_build_object('id', up.id, 'full_name', up.full_name),
      'suspended', true,
      'viewer', jsonb_build_object('is_self', false)
    );
  end if;

  select * into ap from public.athlete_profiles where user_id = p_user;
  select * into cp from public.coach_profiles   where user_id = p_user;
  if ap.id is not null then
    select * into ts from public.talent_scores where athlete_id = ap.id;
  end if;

  select to_jsonb(o) - 'branding' into v_org
  from public.organizations o
  where o.id = coalesce(ap.current_club_id, cp.current_club_id);

  /* Log scout interest, but never for self-views and never for a viewer who
     is a fellow athlete — an athlete browsing does not mean scout interest. */
  if ap.id is not null and v_viewer <> p_user then
    insert into public.profile_views (
      athlete_id, viewer_user_id, viewer_name, viewer_role, viewer_org, viewer_verified
    )
    select ap.id, v_viewer, vu.full_name, vu.role::text,
           (select name from public.organizations org where org.id = private.my_organization()),
           vu.is_verified
    from public.user_profiles vu
    where vu.id = v_viewer;
  end if;

  return jsonb_build_object(
    'user', jsonb_build_object(
      'id', up.id,
      'role', up.role,
      'full_name', up.full_name,
      'first_name', up.first_name,
      'last_name', up.last_name,
      'avatar_url', up.avatar_url,
      'bio', up.bio,
      'city', up.city,
      'country', up.country,
      'is_verified', up.is_verified,
      'is_minor', up.is_minor,
      'followers_count', up.followers_count,
      'following_count', up.following_count,
      'allow_messages_from', up.allow_messages_from,
      'created_at', up.created_at
    ),
    'athlete', case when ap.id is null then null else jsonb_build_object(
      'id', ap.id,
      'sport', ap.sport,
      'position', coalesce(ap.position_primary, ap.position),
      'position_secondary', ap.position_secondary,
      'level', ap.level,
      'league', ap.league,
      'club', ap.current_club,
      'club_id', ap.current_club_id,
      'nationality', ap.nationality,
      'dominant_foot', ap.dominant_foot,
      'height_cm', ap.height_cm,
      'weight_kg', ap.weight_kg,
      /* Never expose a minor's exact date of birth — age band only. */
      'age', case when ap.birth_date is null then null
                  when up.is_minor then null
                  else extract(year from age(ap.birth_date))::int end,
      'age_band', up.age_band,
      'is_open_to_offers', ap.is_open_to_offers,
      'honors', ap.honors,
      'languages', ap.languages,
      'certifications', ap.certifications
    ) end,
    'coach', case when cp.id is null then null else jsonb_build_object(
      'id', cp.id,
      'specialty', cp.specialty,
      'years_experience', cp.years_experience,
      'philosophy', cp.philosophy,
      'licenses', cp.licenses,
      'current_club', cp.current_club,
      'is_open_to_opportunities', cp.is_open_to_opportunities
    ) end,
    'score', case when ts.athlete_id is null then null else jsonb_build_object(
      'overall', ts.overall,
      'tier', ts.tier,
      'percentile', ts.percentile,
      'previous_overall', ts.previous_overall,
      'pillars', jsonb_build_object(
        'profile', ts.profile_score,
        'performance', ts.performance_score,
        'media', ts.media_score,
        'credibility', ts.credibility_score,
        'engagement', ts.engagement_score
      ),
      'computed_at', ts.computed_at
    ) end,
    'organization', v_org,
    'stats', jsonb_build_object(
      'posts', (select count(*) from public.posts where author_id = p_user),
      'media', (select count(*) from public.athlete_media
                where athlete_id = ap.id and is_public),
      'matches', (select count(*) from public.match_records where athlete_id = ap.id),
      'endorsements', (select count(*) from public.endorsements where athlete_id = ap.id)
    ),
    'viewer', jsonb_build_object(
      'is_self', v_viewer = p_user,
      'is_following', exists (
        select 1 from public.follows
        where follower_id = v_viewer and following_id = p_user),
      'follows_you', exists (
        select 1 from public.follows
        where follower_id = p_user and following_id = v_viewer),
      'can_message', private.can_message(v_viewer, p_user),
      'has_blocked', false
    )
  );
end;
$$;

revoke all on function public.get_profile_bundle(uuid) from public, anon;
grant execute on function public.get_profile_bundle(uuid) to authenticated;

-- ------------------------------------------------------------
-- Provisioning: every new account gets the rows the app expects
-- ------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role      public.user_role;
  v_full_name text;
  v_first     text;
  v_last      text;
begin
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_first     := nullif(new.raw_user_meta_data ->> 'first_name', '');
  v_last      := nullif(new.raw_user_meta_data ->> 'last_name', '');

  if v_full_name = '' and (v_first is not null or v_last is not null) then
    v_full_name := trim(coalesce(v_first, '') || ' ' || coalesce(v_last, ''));
  end if;

  begin
    v_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  exception when others then
    v_role := 'athlete';
  end;

  -- Roles are never escalated through signup metadata.
  if v_role is null or v_role in ('admin','org_admin','medical_partner','federation') then
    v_role := 'athlete';
  end if;

  insert into public.user_profiles (id, role, full_name, first_name, last_name)
  values (new.id, v_role, nullif(v_full_name, ''), v_first, v_last)
  on conflict (id) do nothing;

  insert into public.user_private (user_id, email, phone)
  values (new.id, new.email, new.phone)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if v_role = 'athlete' then
    insert into public.athlete_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
  elsif v_role = 'coach' then
    insert into public.coach_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
  elsif v_role in ('scout','club') then
    insert into public.scout_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
    insert into public.match_preferences (user_id)
    values (new.id) on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

-- Backfill preference rows for accounts created before this migration.
insert into public.notification_preferences (user_id)
select id from public.user_profiles
on conflict (user_id) do nothing;
