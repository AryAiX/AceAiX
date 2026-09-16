-- ============================================================
-- Source-review security hardening
--
-- V2 cutover fixes. Direct third-party SELECT access to a minor's
-- athlete_profiles row is intentionally removed because it contains birth_date.
-- Supported clients use redacting RPCs that return only age_band for minors.
-- ============================================================

-- ------------------------------------------------------------
-- Hidden minors cannot be enumerated through broad table policies.
-- ------------------------------------------------------------
drop policy if exists up_select_authenticated on public.user_profiles;
create policy up_select_authenticated on public.user_profiles
  for select to authenticated
  using (
    id = auth.uid()
    or private.is_admin()
    or (
      not coalesce(is_suspended, false)
      and (
        not coalesce(is_minor, false)
        or coalesce(is_discoverable, false)
      )
    )
    or exists (
      select 1
      from public.guardian_consents g
      where g.minor_user_id = user_profiles.id
        and g.guardian_user_id = auth.uid()
        and g.status = 'granted'
    )
  );

/*
 * athlete_profiles.birth_date cannot be conditionally redacted by RLS. Keep
 * owners/admins/adults readable, and let a linked guardian read their child.
 * Every other view of a minor must use a redacting RPC. This protects exact
 * DOB even when discovery consent is granted.
 */
drop policy if exists ap_select_authenticated on public.athlete_profiles;
create policy ap_select_authenticated on public.athlete_profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or private.is_admin()
    or exists (
      select 1
      from public.user_profiles u
      where u.id = athlete_profiles.user_id
        and not coalesce(u.is_minor, false)
        and not coalesce(u.is_suspended, false)
    )
    or exists (
      select 1
      from public.guardian_consents g
      where g.minor_user_id = athlete_profiles.user_id
        and g.guardian_user_id = auth.uid()
        and g.status = 'granted'
    )
  );

-- ------------------------------------------------------------
-- Profile posts obey the same audience rules as the main feed.
-- ------------------------------------------------------------
create or replace function public.get_user_posts(
  p_user uuid,
  p_limit integer default 24,
  p_before timestamptz default null
)
returns table (
  id uuid, type text, caption text, media jsonb,
  like_count integer, comment_count integer, viewer_liked boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.type::text, coalesce(p.caption, p.text)::text, p.media,
         p.like_count, p.comments_count,
         exists (
           select 1 from public.post_likes l
           where l.post_id = p.id and l.user_id = auth.uid()
         ),
         p.created_at
  from public.posts p
  join public.user_profiles up on up.id = p.author_id
  where auth.uid() is not null
    and p.author_id = p_user
    and not p.is_hidden
    and p.moderation_state = 'visible'
    and not up.is_suspended
    and (
      not coalesce(up.is_minor, false)
      or coalesce(up.is_discoverable, false)
      or p.author_id = auth.uid()
      or private.is_admin()
      or exists (
        select 1 from public.guardian_consents g
        where g.minor_user_id = p.author_id
          and g.guardian_user_id = auth.uid()
          and g.status = 'granted'
      )
    )
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p_user)
         or (b.blocker_id = p_user and b.blocked_id = auth.uid())
    )
    and (
      p.author_id = auth.uid()
      or p.audience = 'public'
      or (
        p.audience = 'followers'
        and exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid() and f.following_id = p.author_id
        )
      )
      or (
        p.audience = 'connections'
        and exists (
          select 1
          from public.follows outgoing
          join public.follows incoming
            on incoming.follower_id = p.author_id
           and incoming.following_id = auth.uid()
          where outgoing.follower_id = auth.uid()
            and outgoing.following_id = p.author_id
        )
      )
    )
    and (p_before is null or p.created_at < p_before)
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 24), 50));
$$;

revoke all on function public.get_user_posts(uuid, integer, timestamptz)
  from public, anon;
grant execute on function public.get_user_posts(uuid, integer, timestamptz)
  to authenticated;

-- ------------------------------------------------------------
-- Consent state is the aggregate of every granted, unrevoked consent.
-- Revoking one row must not hide a child while another active consent remains.
-- ------------------------------------------------------------
drop index if exists public.idx_guardian_consents_active;

create or replace function private.apply_guardian_consent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_minor uuid;
begin
  v_minor := case when tg_op = 'DELETE'
    then old.minor_user_id else new.minor_user_id end;

  update public.user_profiles u
  set is_discoverable = case
    when not u.is_minor then u.is_discoverable
    else exists (
      select 1
      from public.guardian_consents g
      where g.minor_user_id = v_minor
        and g.status = 'granted'
        and g.allow_discovery
    )
  end
  where u.id = v_minor;
  return null;
end;
$$;

drop trigger if exists trg_guardian_consent_apply on public.guardian_consents;
create trigger trg_guardian_consent_apply
  after insert or update of status, allow_discovery or delete
  on public.guardian_consents
  for each row execute function private.apply_guardian_consent();

-- ------------------------------------------------------------
-- Existing under-13 rows are quarantined for manual remediation.
-- The age trigger prevents new rows; this handles legacy/imported records.
-- ------------------------------------------------------------
create table if not exists private.underage_account_quarantine (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,
  detected_date_of_birth date not null,
  detected_at timestamptz not null default now(),
  remediation_status text not null default 'pending_review'
    check (remediation_status in ('pending_review','account_deleted','dob_corrected')),
  remediated_at timestamptz,
  notes text
);

revoke all on private.underage_account_quarantine
  from public, anon, authenticated;
grant select, insert, update, delete on private.underage_account_quarantine
  to service_role;

create or replace function private.quarantine_underage_accounts()
returns integer
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_count integer;
begin
  if auth.role() <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  insert into private.underage_account_quarantine (
    user_id, detected_date_of_birth
  )
  select p.user_id, p.date_of_birth
  from public.user_private p
  where p.date_of_birth is not null
    and extract(year from age(p.date_of_birth)) < 13
  on conflict (user_id) do update
    set detected_date_of_birth = excluded.detected_date_of_birth,
        detected_at = case
          when private.underage_account_quarantine.detected_date_of_birth
               is distinct from excluded.detected_date_of_birth
          then now()
          else private.underage_account_quarantine.detected_at
        end;

  get diagnostics v_count = row_count;

  update public.guardian_consents g
  set status = 'revoked', revoked_at = coalesce(revoked_at, now())
  where g.status in ('pending','granted')
    and exists (
      select 1
      from private.underage_account_quarantine q
      where q.user_id = g.minor_user_id
        and q.remediation_status = 'pending_review'
    );

  update public.user_profiles u
  set is_minor = true,
      is_discoverable = false,
      is_suspended = true,
      suspended_reason = 'underage_account_pending_remediation',
      allow_messages_from = 'nobody'
  where exists (
    select 1
    from private.underage_account_quarantine q
    where q.user_id = u.id
      and q.remediation_status = 'pending_review'
  );

  insert into public.audit_logs (user_id, action, table_name, record_id, new_value)
  select null, 'account.under13_quarantined', 'user_profiles', q.user_id,
         jsonb_build_object(
           'reason', 'underage_account_pending_remediation',
           'data_preserved', true,
           'access_suspended', true
         )
  from private.underage_account_quarantine q
  where q.remediation_status = 'pending_review'
    and not exists (
      select 1 from public.audit_logs a
      where a.action = 'account.under13_quarantined'
        and a.record_id = q.user_id
    );

  return v_count;
end;
$$;

revoke all on function private.quarantine_underage_accounts()
  from public, anon, authenticated;
grant execute on function private.quarantine_underage_accounts()
  to service_role;

select private.quarantine_underage_accounts();

-- ------------------------------------------------------------
-- New SECURITY DEFINER RPCs default to PUBLIC execute. Remove that default.
-- ------------------------------------------------------------
revoke all on function public.search_teams(text, text, integer) from public, anon;
revoke all on function public.add_custom_team(text, text, text, text) from public, anon;
revoke all on function public.set_favorite_teams(uuid[]) from public, anon;
revoke all on function public.set_favorite_venue(text) from public, anon;
revoke all on function public.teams_of(uuid) from public, anon;
revoke all on function public.fans_of_team(uuid, integer, integer) from public, anon;
revoke all on function public.team_detail(uuid) from public, anon;
revoke all on function public.fandom_of(uuid) from public, anon;

revoke all on function public.create_challenge(
  text, text, text, timestamptz, text, text, text, text, integer, integer, uuid
) from public, anon;
revoke all on function public.open_challenges(text, integer, integer) from public, anon;
revoke all on function public.enter_challenge(uuid, uuid, numeric, text) from public, anon;
revoke all on function public.withdraw_challenge_entry(uuid) from public, anon;
revoke all on function public.judge_challenge_entry(uuid, boolean, numeric, text)
  from public, anon;
revoke all on function public.challenge_leaderboard(uuid, integer, integer)
  from public, anon;
revoke all on function public.my_clips() from public, anon;

-- ------------------------------------------------------------
-- Translation spend is reserved atomically before a provider call.
-- Every request is source-bound and receives the same practical allowance.
-- ------------------------------------------------------------
create table if not exists private.translation_user_usage (
  usage_date date not null default current_date,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  request_count integer not null default 0 check (request_count >= 0),
  character_count integer not null default 0 check (character_count >= 0),
  primary key (usage_date, user_id)
);

create table if not exists private.translation_project_usage (
  usage_date date primary key default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  character_count integer not null default 0 check (character_count >= 0)
);

revoke all on private.translation_user_usage,
              private.translation_project_usage
  from public, anon, authenticated;
grant select, insert, update, delete
  on private.translation_user_usage, private.translation_project_usage
  to service_role;

create or replace function public.consume_translation_quota(
  p_user uuid,
  p_characters integer,
  p_source_bound boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_chars integer;
  v_user_requests integer;
  v_project_chars integer;
  v_user_char_limit integer := case when p_source_bound then 40000 else 5000 end;
  v_user_request_limit integer := case when p_source_bound then 100 else 10 end;
  v_project_char_limit integer := 500000;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_user is null or p_characters < 1 or p_characters > 4000 then
    raise exception 'Invalid translation quota request' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('translation-quota:' || current_date::text));

  insert into private.translation_user_usage (
    usage_date, user_id, request_count, character_count
  ) values (current_date, p_user, 1, p_characters)
  on conflict (usage_date, user_id) do update
    set request_count = private.translation_user_usage.request_count + 1,
        character_count = private.translation_user_usage.character_count + excluded.character_count
  returning request_count, character_count
    into v_user_requests, v_user_chars;

  if v_user_requests > v_user_request_limit or v_user_chars > v_user_char_limit then
    raise exception 'Translation user quota exceeded'
      using errcode = 'P0001', hint = 'translation_user_quota';
  end if;

  insert into private.translation_project_usage (
    usage_date, request_count, character_count
  ) values (current_date, 1, p_characters)
  on conflict (usage_date) do update
    set request_count = private.translation_project_usage.request_count + 1,
        character_count = private.translation_project_usage.character_count + excluded.character_count
  returning character_count into v_project_chars;

  if v_project_chars > v_project_char_limit then
    raise exception 'Translation project quota exceeded'
      using errcode = 'P0001', hint = 'translation_project_quota';
  end if;

  return jsonb_build_object(
    'user_characters', v_user_chars,
    'user_character_limit', v_user_char_limit,
    'project_characters', v_project_chars,
    'project_character_limit', v_project_char_limit
  );
end;
$$;

revoke all on function public.consume_translation_quota(uuid, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.consume_translation_quota(uuid, integer, boolean)
  to service_role;

alter table public.guardian_consents
  add column if not exists delivery_day date,
  add column if not exists delivery_count integer not null default 0
    check (delivery_count >= 0),
  add column if not exists last_delivery_at timestamptz;

revoke select (delivery_day, delivery_count, last_delivery_at),
       update (delivery_day, delivery_count, last_delivery_at)
on public.guardian_consents from authenticated, anon;

create or replace function public.reserve_guardian_consent_delivery(
  p_consent uuid,
  p_minor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.guardian_consents;
  v_retry integer;
  v_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  select * into v_row
  from public.guardian_consents
  where id = p_consent and minor_user_id = p_minor
  for update;
  if not found or v_row.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'not_pending');
  end if;

  if v_row.last_delivery_at is not null
     and v_row.last_delivery_at > now() - interval '60 seconds' then
    v_retry := greatest(
      1,
      ceil(extract(epoch from (
        v_row.last_delivery_at + interval '60 seconds' - now()
      )))::integer
    );
    return jsonb_build_object('ok', false, 'code', 'cooldown', 'retry_after', v_retry);
  end if;

  v_count := case when v_row.delivery_day = current_date
    then v_row.delivery_count else 0 end;
  if v_count >= 5 then
    return jsonb_build_object('ok', false, 'code', 'daily_cap');
  end if;

  update public.guardian_consents
  set delivery_day = current_date,
      delivery_count = v_count + 1,
      last_delivery_at = now()
  where id = p_consent;

  return jsonb_build_object('ok', true, 'remaining_today', 4 - v_count);
end;
$$;
revoke all on function public.reserve_guardian_consent_delivery(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_guardian_consent_delivery(uuid, uuid)
  to service_role;

-- Reassert the V2 vocabulary on upgraded installations too.
alter table public.applications drop constraint if exists applications_status_check;
update public.applications set status = 'in_review' where status = 'viewed';
update public.applications set status = 'invited' where status = 'trial_offered';
update public.applications set status = 'rejected' where status = 'not_selected';
alter table public.applications
  add constraint applications_status_check
  check (status in (
    'applied', 'in_review', 'shortlisted', 'invited',
    'accepted', 'rejected', 'withdrawn'
  ));

create or replace function private.guard_application_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_org uuid;
  v_is_reviewer boolean;
begin
  if auth.role() = 'service_role' or private.is_admin() then return new; end if;
  if new.status is not distinct from old.status then return new; end if;

  select created_by_id, organization_id into v_owner, v_org
  from public.opportunities where id = new.opportunity_id;
  v_is_reviewer := auth.uid() = v_owner
    or (v_org is not null and private.is_org_member(
      v_org, array['owner','manager','scout','coach']));

  if auth.uid() = new.athlete_id then
    if not (
      (new.status = 'withdrawn' and old.status not in ('accepted','rejected','withdrawn'))
      or (old.status = 'withdrawn' and new.status = 'applied')
    ) then
      raise exception 'Only the club can change an application''s status'
        using errcode = '42501';
    end if;
  elsif not v_is_reviewer then
    raise exception 'Only the athlete or an authorized organization member can change this application'
      using errcode = '42501';
  elsif new.status = 'withdrawn' then
    raise exception 'Only the athlete can withdraw an application'
      using errcode = '42501';
  elsif old.status = 'withdrawn' then
    raise exception 'Only the athlete can reapply after withdrawing'
      using errcode = '42501';
  elsif not (
    (old.status = 'applied' and new.status in ('in_review','shortlisted','rejected'))
    or (old.status = 'in_review' and new.status in ('shortlisted','invited','rejected'))
    or (old.status = 'shortlisted' and new.status in ('in_review','invited','rejected'))
    or (old.status = 'invited' and new.status in ('accepted','rejected'))
  ) then
    raise exception 'Invalid application status transition' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Final source-review boundary reassertions
-- ------------------------------------------------------------

drop policy if exists am_select on public.athlete_media;
create or replace function private.viewer_can_see_public_media(p_athlete uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.athlete_profiles ap
    join public.user_profiles up on up.id = ap.user_id
    where ap.id = p_athlete
      and not coalesce(up.is_suspended, false)
      and (
        not coalesce(up.is_minor, false)
        or private.has_guardian_consent(up.id, 'media')
        or ap.user_id = auth.uid()
        or private.is_admin()
        or exists (
          select 1 from public.guardian_consents g
          where g.minor_user_id = up.id
            and g.guardian_user_id = auth.uid()
            and g.status = 'granted'
        )
      )
  );
$$;
revoke all on function private.viewer_can_see_public_media(uuid) from public;
grant execute on function private.viewer_can_see_public_media(uuid)
  to authenticated, service_role;

create policy am_select on public.athlete_media
for select to authenticated
using (
  private.owns_athlete(athlete_id)
  or private.is_admin()
  or (is_public and private.viewer_can_see_public_media(athlete_id))
);

create policy am_select_anon on public.athlete_media
for select to anon
using (
  is_public
  and exists (
    select 1
    from public.athlete_profiles ap
    join public.user_profiles up on up.id = ap.user_id
    where ap.id = athlete_media.athlete_id
      and not coalesce(up.is_minor, false)
      and not coalesce(up.is_suspended, false)
  )
);

-- The posts RLS hide-check must not query user_profiles as the viewer: a hidden
-- minor's profile row is itself invisible, which would make EXISTS fail open.
create or replace function private.viewer_can_see_author(p_author uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_profiles u
    where u.id = p_author
      and not coalesce(u.is_suspended, false)
      and (
        not coalesce(u.is_minor, false)
        or coalesce(u.is_discoverable, false)
        or p_author = auth.uid()
        or private.is_admin()
        or exists (
          select 1 from public.guardian_consents g
          where g.minor_user_id = u.id
            and g.guardian_user_id = auth.uid()
            and g.status = 'granted'
        )
      )
  );
$$;
revoke all on function private.viewer_can_see_author(uuid) from public;
grant execute on function private.viewer_can_see_author(uuid) to anon, authenticated, service_role;

-- The V2-only cutover keeps the posts bucket private (set in
-- 20260904000007_release_fixes.sql). Post rows and storage object reads must
-- both pass their audience-aware policies before the client can sign a URL.
drop policy if exists posts_public_select on public.posts;
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts
for select to authenticated
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
    and private.viewer_can_see_author(author_id)
    and (
      audience = 'public'
      or (audience = 'followers' and exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = posts.author_id))
      or (audience = 'connections' and exists (
        select 1 from public.follows outgoing
        join public.follows incoming
          on incoming.follower_id = posts.author_id
         and incoming.following_id = auth.uid()
        where outgoing.follower_id = auth.uid()
          and outgoing.following_id = posts.author_id))
    )
  )
);

create policy posts_public_select on public.posts
for select to anon
using (
  audience = 'public'
  and not is_hidden
  and moderation_state = 'visible'
  and private.viewer_can_see_author(author_id)
);

update storage.buckets set public = false where id in ('posts', 'stories');
drop policy if exists media_authenticated_read on storage.objects;
create policy media_authenticated_read
on storage.objects for select
to authenticated
using (
  (bucket_id in ('posts', 'stories')
   and (storage.foldername(name))[1] = auth.uid()::text)
  or (
    bucket_id = 'posts'
    and (
      exists (
        select 1 from public.posts p
        where (
          (storage.foldername(name))[1] is null
          or p.author_id::text = (storage.foldername(name))[1]
        )
          and (
            p.image_url = name
            or exists (
             select 1
             from jsonb_array_elements(coalesce(p.media, '[]'::jsonb)) item
             where item ->> 'url' = name or item ->> 'thumbnail' = name
           )
          )
      )
      or exists (
        select 1
        from public.athlete_media m
        join public.athlete_profiles ap on ap.id = m.athlete_id
        where (
          (storage.foldername(name))[1] is null
          or ap.user_id::text = (storage.foldername(name))[1]
        )
          and (m.storage_url = name or m.thumbnail_url = name)
      )
    )
  )
  or (
    bucket_id = 'stories'
    and exists (select 1 from public.stories s where s.media_url = name)
  )
);

drop policy if exists media_anon_public_athlete_read on storage.objects;
create policy media_anon_public_athlete_read
on storage.objects for select
to anon
using (
  bucket_id = 'posts'
  and exists (
    select 1
    from public.athlete_media m
    where m.storage_url = name or m.thumbnail_url = name
  )
);
grant select on storage.objects to anon;

create or replace function private.apply_guardian_consent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_minor uuid;
begin
  foreach v_minor in array (
    case when tg_op = 'INSERT' then array[new.minor_user_id]
         when tg_op = 'DELETE' then array[old.minor_user_id]
         else array[old.minor_user_id, new.minor_user_id] end
  ) loop
    update public.user_profiles u
    set is_discoverable = case
      when not u.is_minor then u.is_discoverable
      else exists (
        select 1 from public.guardian_consents g
        where g.minor_user_id = v_minor
          and g.status = 'granted'
          and g.allow_discovery
      )
    end
    where u.id = v_minor;
  end loop;
  return null;
end;
$$;

alter table private.underage_account_quarantine
  drop constraint if exists underage_account_quarantine_remediation_status_check;
alter table private.underage_account_quarantine
  add column if not exists appeal_requested_at timestamptz,
  add column if not exists appeal_requested_by uuid references public.user_profiles(id) on delete set null,
  add constraint underage_account_quarantine_remediation_status_check
    check (remediation_status in ('pending_review','appeal_requested','dob_corrected','access_restored'));

create or replace function public.request_underage_age_appeal(p_user uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare v_user uuid := coalesce(p_user, auth.uid());
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if v_user <> auth.uid()
     and not private.is_admin()
     and not exists (
       select 1 from public.guardian_consents g
       where g.minor_user_id = v_user
         and g.guardian_user_id = auth.uid()
     ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  update private.underage_account_quarantine
  set remediation_status = 'appeal_requested',
      appeal_requested_at = coalesce(appeal_requested_at, now()),
      appeal_requested_by = auth.uid()
  where user_id = v_user
    and remediation_status in ('pending_review', 'appeal_requested');
  if not found then
    raise exception 'No suspended age case found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('ok', true, 'status', 'appeal_requested');
end;
$$;
revoke all on function public.request_underage_age_appeal(uuid) from public, anon;
grant execute on function public.request_underage_age_appeal(uuid) to authenticated;

create or replace function public.resolve_underage_age_appeal(
  p_user uuid,
  p_corrected_dob date,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_age integer;
  v_case private.underage_account_quarantine;
begin
  if auth.role() <> 'service_role' and not private.is_admin() then
    raise exception 'Admin or service role required' using errcode = '42501';
  end if;
  if p_user is null or p_corrected_dob is null or p_corrected_dob > current_date then
    raise exception 'A valid corrected date of birth is required' using errcode = '22023';
  end if;
  v_age := extract(year from age(p_corrected_dob))::integer;
  if v_age < 13 then
    raise exception 'Corrected age must be at least 13' using errcode = '23514';
  end if;

  select * into v_case
  from private.underage_account_quarantine
  where user_id = p_user
    and remediation_status in ('pending_review', 'appeal_requested')
  for update;
  if not found then
    raise exception 'No open age appeal found' using errcode = 'P0002';
  end if;

  update public.user_private
  set date_of_birth = p_corrected_dob
  where user_id = p_user;
  if not found then
    raise exception 'Private account record not found' using errcode = 'P0002';
  end if;

  update public.user_profiles
  set is_suspended = false,
      suspended_reason = null,
      is_discoverable = case
        when v_age < 18 then private.has_guardian_consent(p_user, 'discovery')
        else true
      end,
      allow_messages_from = case when v_age < 18 then 'verified' else 'everyone' end
  where id = p_user;

  update private.underage_account_quarantine
  set remediation_status = 'dob_corrected',
      remediated_at = now(),
      notes = nullif(btrim(coalesce(p_notes, '')), '')
  where user_id = p_user;

  insert into public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
  values (
    auth.uid(), 'account.under13_age_corrected', 'user_profiles', p_user,
    jsonb_build_object('date_of_birth', v_case.detected_date_of_birth),
    jsonb_build_object(
      'date_of_birth', p_corrected_dob,
      'age_band', private.age_band_for(p_corrected_dob),
      'access_restored', true
    )
  );

  return jsonb_build_object('ok', true, 'status', 'dob_corrected');
end;
$$;
revoke all on function public.resolve_underage_age_appeal(uuid, date, text)
  from public, anon, authenticated;
grant execute on function public.resolve_underage_age_appeal(uuid, date, text)
  to service_role;
grant execute on function public.resolve_underage_age_appeal(uuid, date, text)
  to authenticated;

create or replace function public.translation_source(p_source_type text, p_source_id uuid)
returns text
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare v_text text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  case p_source_type
    when 'post' then
      select coalesce(p.caption, p.text) into v_text
      from public.posts p where p.id = p_source_id;
    when 'comment' then
      select c.body into v_text
      from public.post_comments c where c.id = p_source_id;
    when 'message' then
      select m.content into v_text
      from public.messages m where m.id = p_source_id;
    else
      raise exception 'Unsupported translation source' using errcode = '22023';
  end case;
  if v_text is null then
    raise exception 'Translation source not found' using errcode = 'P0002';
  end if;
  return v_text;
end;
$$;
revoke all on function public.translation_source(text, uuid) from public, anon;
grant execute on function public.translation_source(text, uuid) to authenticated;

create or replace function public.feed_author_facts(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when not private.viewer_can_see_author(p_user) then null
    else (
      select jsonb_build_object(
        'sport', ap.sport,
        'position', coalesce(ap.position_primary, ap.position),
        'score', coalesce(ts.overall, 0),
        'tier', coalesce(ts.tier::text, 'rising')
      )
      from public.athlete_profiles ap
      left join public.talent_scores ts on ts.athlete_id = ap.id
      where ap.user_id = p_user
    )
  end;
$$;
revoke all on function public.feed_author_facts(uuid) from public, anon;
grant execute on function public.feed_author_facts(uuid) to authenticated;

create or replace function public.web_athletes(
  p_id uuid default null,
  p_user_id uuid default null,
  p_limit integer default 200
)
returns setof jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (jsonb_build_object(
      'id', ap.id,
      'user_id', ap.user_id,
      'sport', ap.sport,
      'positions', ap.positions,
      'position', ap.position,
      'position_primary', ap.position_primary,
      'position_secondary', ap.position_secondary,
      'height_cm', ap.height_cm,
      'weight_kg', ap.weight_kg,
      'birth_date', case when coalesce(up.is_minor, false) then null else ap.birth_date end,
      'nationality', ap.nationality,
      'dominant_foot', ap.dominant_foot,
      'current_club_id', ap.current_club_id,
      'current_club', ap.current_club,
      'level', ap.level,
      'bio', ap.bio,
      'cover_url', ap.cover_url,
      'is_open_to_offers', ap.is_open_to_offers,
      'visibility_score', ap.visibility_score,
      'performance_score', ap.performance_score,
      'fitness_score', ap.fitness_score,
      'profile_completeness', ap.profile_completeness,
      'followers_count', ap.followers_count,
      'connections_count', ap.connections_count,
      'highlighted_stats', ap.highlighted_stats,
      'attributes', ap.attributes,
      'academy', ap.academy,
      'certifications', ap.certifications,
      'honors', ap.honors,
      'languages', ap.languages,
      'following', ap.following,
      'trajectory', ap.trajectory,
      'showcase_opt_in', ap.showcase_opt_in,
      'league', ap.league,
      'created_at', ap.created_at,
      'updated_at', ap.updated_at,
      'user', jsonb_build_object(
        'id', up.id,
        'role', up.role,
        'full_name', up.full_name,
        'avatar_url', up.avatar_url,
        'bio', up.bio,
        'city', up.city,
        'country', up.country,
        'locale', up.locale,
        'is_verified', up.is_verified,
        'subscription_tier', up.subscription_tier,
        'created_at', up.created_at,
        'updated_at', up.updated_at
      )
    ))
  from public.athlete_profiles ap
  join public.user_profiles up on up.id = ap.user_id
  where not coalesce(up.is_suspended, false)
    and (p_id is null or ap.id = p_id)
    and (p_user_id is null or ap.user_id = p_user_id)
    and (
      (auth.uid() is null and not coalesce(up.is_minor, false))
      or (
        auth.uid() is not null
        and (
          ap.user_id = auth.uid()
          or private.is_admin()
          or not coalesce(up.is_minor, false)
          or coalesce(up.is_discoverable, false)
          or exists (
            select 1 from public.guardian_consents g
            where g.minor_user_id = up.id
              and g.guardian_user_id = auth.uid()
              and g.status = 'granted'
          )
        )
      )
    )
    and (
      auth.uid() is null
      or not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = up.id)
           or (b.blocker_id = up.id and b.blocked_id = auth.uid())
      )
    )
  order by ap.visibility_score desc, ap.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 200));
$$;
revoke all on function public.web_athletes(uuid, uuid, integer) from public;
grant execute on function public.web_athletes(uuid, uuid, integer) to anon, authenticated;

create or replace function public.web_public_highlights(p_limit integer default 12)
returns setof jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select to_jsonb(m) || jsonb_build_object(
    'athlete',
    to_jsonb(ap) || jsonb_build_object(
      'birth_date', case when coalesce(up.is_minor, false) then null else ap.birth_date end,
      'user', jsonb_build_object(
        'id', up.id,
        'role', up.role,
        'full_name', up.full_name,
        'avatar_url', up.avatar_url,
        'bio', up.bio,
        'city', up.city,
        'country', up.country,
        'locale', up.locale,
        'is_verified', up.is_verified,
        'subscription_tier', up.subscription_tier,
        'created_at', up.created_at,
        'updated_at', up.updated_at
      )
    )
  )
  from public.athlete_media m
  join public.athlete_profiles ap on ap.id = m.athlete_id
  join public.user_profiles up on up.id = ap.user_id
  where m.is_public
    and not coalesce(up.is_suspended, false)
    and (
      (auth.uid() is null and not coalesce(up.is_minor, false))
      or (
        auth.uid() is not null
        and (
          ap.user_id = auth.uid()
          or private.is_admin()
          or not coalesce(up.is_minor, false)
          or (
            coalesce(up.is_discoverable, false)
            and private.has_guardian_consent(up.id, 'media')
          )
          or exists (
            select 1 from public.guardian_consents g
            where g.minor_user_id = up.id
              and g.guardian_user_id = auth.uid()
              and g.status = 'granted'
          )
        )
      )
    )
  order by m.views_count desc, m.created_at desc
  limit greatest(1, least(coalesce(p_limit, 12), 50));
$$;
revoke all on function public.web_public_highlights(integer) from public;
grant execute on function public.web_public_highlights(integer) to anon, authenticated;

revoke all on function public.cached_translation(text, text)
  from public, anon, authenticated;
grant execute on function public.cached_translation(text, text) to service_role;

revoke all on function public.mark_profile_views_seen() from public, anon;
revoke all on function public.profile_view_digest(integer) from public, anon;
revoke all on function public.simulate_talent_score(jsonb) from public, anon;

revoke all on function private.cap_favorite_teams() from public, anon, authenticated;
revoke all on function private.may_set_challenges(uuid) from public, anon, authenticated;
revoke all on function private.sync_challenge_entry_count() from public, anon, authenticated;
