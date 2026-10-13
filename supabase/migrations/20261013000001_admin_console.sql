-- ============================================================
-- Admin console: the server side of admin.aceaix.com
--
-- The web admin console never writes to a table directly. Every read and every
-- action is one of the SECURITY DEFINER functions below, and each one:
--
--   1. refuses anyone who is not `admin` or `super_admin` (private.require_admin)
--   2. writes what it changed to public.audit_logs, old and new value, so every
--      moderation decision can be traced to the person who made it
--
-- Why RPCs and not RLS on the tables: moderation columns (posts.moderation_state,
-- moderation_reports.*) are deliberately not client-writable (see
-- 20260904000005), and a moderator must see content that RLS hides from
-- everyone else (a post under review, a suspended account's posts). One
-- function per action keeps both rules intact.
--
-- Covered:
--   §1  helpers (require_admin, audit)
--   §2  dashboard
--   §3  account approval (verification queue + decisions)
--   §4  reports queue + resolution (dismiss / remove / warn / suspend / escalate)
--   §5  content review (posts, reels, stories, highlight clips, comments)
--   §6  account control (search, detail, suspend / ban / lift, verify, role)
--   §7  youth safety (minors, consent state, adult↔minor conversations)
--   §8  sponsorship + coach booking oversight
--   §9  audit log
--   §10 storage: moderators can open media under review
-- ============================================================

-- ------------------------------------------------------------
-- §0  Columns the console needs
-- ------------------------------------------------------------
alter table public.user_profiles
  add column if not exists suspended_at    timestamptz,
  add column if not exists suspended_until timestamptz,   -- null + is_suspended = permanent ban
  add column if not exists suspended_by    uuid references public.user_profiles(id) on delete set null,
  add column if not exists warning_count   integer not null default 0;

-- An admin cancelling a booking is recorded as such.
alter table public.coaching_bookings drop constraint if exists coaching_bookings_cancelled_by_check;
alter table public.coaching_bookings
  add constraint coaching_bookings_cancelled_by_check
  check (cancelled_by is null or cancelled_by in ('athlete','coach','guardian','admin'));

create index if not exists idx_moderation_reports_status_created
  on public.moderation_reports(status, created_at desc);
create index if not exists idx_user_profiles_role_created
  on public.user_profiles(role, created_at desc);
create index if not exists idx_audit_logs_created
  on public.audit_logs(created_at desc);

-- ------------------------------------------------------------
-- §1  Helpers
-- ------------------------------------------------------------
create or replace function private.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.admin_audit(
  p_action text, p_table text, p_record uuid, p_old jsonb, p_new jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
  values (auth.uid(), p_action, p_table, p_record, p_old, p_new);
$$;

create or replace function private.try_uuid(p text)
returns uuid
language sql
immutable
as $$
  select case when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then p::uuid end;
$$;

/* A safety notice to one account. Sent directly, not through private.notify:
   a moderation notice must not be silenced by notification preferences. */
create or replace function private.admin_notice(p_user uuid, p_title text, p_body text, p_data jsonb default '{}')
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.notifications (user_id, type, title, body, entity_type, data, is_read, read)
  values (p_user, 'system', p_title, p_body, 'moderation', coalesce(p_data, '{}'::jsonb), false, false);
$$;

/* A compact person, the shape every list in the console uses. */
create or replace function private.admin_person(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when u.id is null then null else jsonb_build_object(
    'id', u.id,
    'full_name', u.full_name,
    'avatar_url', u.avatar_url,
    'role', u.role,
    'is_verified', u.is_verified,
    'is_minor', u.is_minor,
    'age_band', u.age_band,
    'is_suspended', u.is_suspended,
    'country', u.country
  ) end
  from (select 1) one
  left join public.user_profiles u on u.id = p_user;
$$;

-- ------------------------------------------------------------
-- §2  Dashboard
-- ------------------------------------------------------------
/* Lifts timed suspensions that have run out. Called by the dashboard so the
   console needs no scheduler; schedule it with pg_cron as well if you have it. */
create or replace function public.admin_lift_expired_suspensions()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_n integer;
begin
  perform private.require_admin();
  with lifted as (
    update public.user_profiles
       set is_suspended = false, suspended_reason = null, suspended_at = null,
           suspended_until = null, suspended_by = null
     where is_suspended and suspended_until is not null and suspended_until <= now()
    returning id
  )
  select count(*) into v_n from lifted;
  if v_n > 0 then
    perform private.admin_audit('user.suspension_expired', 'user_profiles', null, null,
                                jsonb_build_object('count', v_n));
  end if;
  return v_n;
end;
$$;

create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v jsonb;
begin
  perform private.require_admin();
  perform public.admin_lift_expired_suspensions();

  select jsonb_build_object(
    'users_total',          (select count(*) from public.user_profiles where role::text not in ('admin','super_admin')),
    'signups_7d',           (select count(*) from public.user_profiles where created_at > now() - interval '7 days'),
    'signups_prev_7d',      (select count(*) from public.user_profiles where created_at between now() - interval '14 days' and now() - interval '7 days'),
    'active_7d',            (select count(*) from public.user_profiles where last_active_at > now() - interval '7 days'),
    'minors',               (select count(*) from public.user_profiles where is_minor),
    'suspended',            (select count(*) from public.user_profiles where is_suspended),
    'pending_verifications',(select count(*) from public.verification_requests where status in ('pending','more_info')),
    'unverified_pros',      (select count(*) from public.user_profiles
                              where role::text in ('coach','club','scout','sponsor','federation','medical_partner','org_admin')
                                and not is_verified and not is_suspended),
    'open_reports',         (select count(*) from public.moderation_reports where status in ('open','reviewing','escalated')),
    'urgent_reports',       (select count(*) from public.moderation_reports
                              where status in ('open','reviewing','escalated')
                                and (severity = 'high' or is_minor_related or reason = 'child_safety')),
    'content_under_review', (select count(*) from public.posts where moderation_state = 'under_review'),
    'pending_consents',     (select count(*) from public.guardian_consents where status = 'pending'),
    'minors_without_consent',(select count(*) from public.user_profiles u
                              where u.is_minor and not exists (
                                select 1 from public.guardian_consents g
                                where g.minor_user_id = u.id and g.status = 'granted')),
    'posts_7d',             (select count(*) from public.posts where created_at > now() - interval '7 days'),
    'stories_live',         (select count(*) from public.stories where expires_at > now()),
    'deals_pending',        (select count(*) from public.sponsorship_deals where status = 'pending'),
    'bookings_upcoming',    (select count(*) from public.coaching_bookings b
                              join public.coaching_slots s on s.id = b.slot_id
                              where b.status = 'booked' and s.starts_at > now()),
    'roles', (select coalesce(jsonb_object_agg(role, n), '{}') from (
                select role::text as role, count(*) as n from public.user_profiles group by 1) r),
    'signups_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'count', coalesce(c.n, 0)) order by d), '[]')
                         from generate_series(current_date - 29, current_date, interval '1 day') d
                         left join (select created_at::date as day, count(*) as n from public.user_profiles
                                    where created_at > current_date - 30 group by 1) c on c.day = d::date),
    'reports_by_reason', (select coalesce(jsonb_object_agg(reason, n), '{}') from (
                select reason, count(*) as n from public.moderation_reports
                where created_at > now() - interval '30 days' group by 1) r)
  ) into v;
  return v;
end;
$$;

-- ------------------------------------------------------------
-- §3  Account approval
-- ------------------------------------------------------------
/* The approval queue: verification requests the app filed, plus professional
   accounts (coach, club, scout, sponsor…) that are unverified and never asked.
   Those can still be approved — a sponsor cannot make offers until they are. */
create or replace function public.admin_verification_queue(p_status text default 'pending')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_requests jsonb; v_unrequested jsonb;
begin
  perform private.require_admin();

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'type', r.type,
      'status', r.status,
      'documents', r.documents,
      'decision_reason', r.decision_reason,
      'created_at', r.created_at,
      'updated_at', r.updated_at,
      'reviewed_by', private.admin_person(r.reviewed_by),
      'user', private.admin_person(r.subject_user_id),
      'email', (select email from public.user_private where user_id = r.subject_user_id),
      'bio', (select bio from public.user_profiles where id = r.subject_user_id),
      'city', (select city from public.user_profiles where id = r.subject_user_id),
      'sponsor', (select jsonb_build_object('company_name', sp.company_name, 'industry', sp.industry, 'website', sp.website)
                    from public.sponsor_profiles sp where sp.user_id = r.subject_user_id),
      'coach', (select jsonb_build_object('specialty', cp.specialty, 'years_experience', cp.years_experience, 'licenses', cp.licenses, 'current_club', cp.current_club)
                    from public.coach_profiles cp where cp.user_id = r.subject_user_id),
      'organization', (select jsonb_build_object('id', o.id, 'name', o.name, 'type', o.type, 'country', o.country, 'website', o.website)
                    from public.organizations o where o.id = r.organization_id)
    ) order by r.created_at), '[]')
  into v_requests
  from public.verification_requests r
  where p_status = 'all'
     or (p_status = 'pending' and r.status in ('pending','more_info'))
     or r.status::text = p_status;

  select coalesce(jsonb_agg(jsonb_build_object(
      'user', private.admin_person(u.id),
      'email', (select email from public.user_private where user_id = u.id),
      'bio', u.bio,
      'city', u.city,
      'created_at', u.created_at,
      'sponsor', (select jsonb_build_object('company_name', sp.company_name, 'industry', sp.industry, 'website', sp.website)
                    from public.sponsor_profiles sp where sp.user_id = u.id),
      'coach', (select jsonb_build_object('specialty', cp.specialty, 'years_experience', cp.years_experience, 'licenses', cp.licenses, 'current_club', cp.current_club)
                    from public.coach_profiles cp where cp.user_id = u.id)
    ) order by u.created_at), '[]')
  into v_unrequested
  from public.user_profiles u
  where u.role::text in ('coach','club','scout','sponsor','federation','medical_partner','org_admin')
    and not u.is_verified
    and not u.is_suspended
    and not exists (select 1 from public.verification_requests r
                    where r.subject_user_id = u.id and r.status in ('pending','more_info'));

  return jsonb_build_object('requests', v_requests, 'unrequested', v_unrequested);
end;
$$;

create or replace function public.admin_decide_verification(
  p_request uuid,
  p_decision text,          -- approved | rejected | more_info
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_old public.verification_requests; v_new public.verification_requests;
begin
  perform private.require_admin();
  if p_decision not in ('approved','rejected','more_info') then
    raise exception 'Unknown decision' using errcode = '22023';
  end if;
  if p_decision in ('rejected','more_info') and coalesce(btrim(p_reason), '') = '' then
    raise exception 'Give the applicant a reason' using errcode = '22023';
  end if;

  select * into v_old from public.verification_requests where id = p_request for update;
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;

  update public.verification_requests
     set status = p_decision::public.verification_status,
         decision_reason = nullif(btrim(coalesce(p_reason, '')), ''),
         reviewed_by = auth.uid()
   where id = p_request
  returning * into v_new;

  if p_decision = 'approved' then
    if v_new.subject_user_id is not null then
      update public.user_profiles set is_verified = true where id = v_new.subject_user_id;
    end if;
    if v_new.organization_id is not null then
      update public.organizations set is_verified = true, verification_status = 'approved'
       where id = v_new.organization_id;
    end if;
  end if;

  if v_new.subject_user_id is not null then
    perform private.admin_notice(v_new.subject_user_id,
      case p_decision
        when 'approved'  then 'Your account is verified'
        when 'rejected'  then 'Verification not approved'
        else 'We need a little more information' end,
      case p_decision
        when 'approved' then 'Your profile now shows the verified badge.'
        else p_reason end,
      jsonb_build_object('verification_request_id', p_request, 'decision', p_decision));
  end if;

  perform private.admin_audit('verification.' || p_decision, 'verification_requests', p_request,
                              to_jsonb(v_old), to_jsonb(v_new));
end;
$$;

-- ------------------------------------------------------------
-- §4  Reports
-- ------------------------------------------------------------
/* What was reported, resolved to something a moderator can look at. */
create or replace function private.admin_report_target(p_type text, p_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid := private.try_uuid(p_id); v jsonb;
begin
  if v_id is null then return null; end if;
  case p_type
    when 'post' then
      select jsonb_build_object('kind','post','id',p.id,'text',coalesce(p.caption,p.text),'media',p.media,
                                'image_url',p.image_url,'type',p.type,'state',p.moderation_state,
                                'is_hidden',p.is_hidden,'created_at',p.created_at,
                                'author',private.admin_person(p.author_id))
        into v from public.posts p where p.id = v_id;
    when 'comment' then
      select jsonb_build_object('kind','comment','id',c.id,'text',c.body,'post_id',c.post_id,
                                'is_hidden',c.is_hidden,'created_at',c.created_at,
                                'author',private.admin_person(c.author_id))
        into v from public.post_comments c where c.id = v_id;
    when 'message' then
      select jsonb_build_object('kind','message','id',m.id,'text',m.content,'conversation_id',m.conversation_id,
                                'created_at',m.created_at,'author',private.admin_person(m.sender_id))
        into v from public.messages m where m.id = v_id;
    when 'story' then
      select jsonb_build_object('kind','story','id',s.id,'text',s.caption,'media_url',s.media_url,
                                'media_type',s.media_type,'card',s.card,'expires_at',s.expires_at,
                                'created_at',s.created_at,'author',private.admin_person(s.author_id))
        into v from public.stories s where s.id = v_id;
    when 'user' then
      select jsonb_build_object('kind','user','id',u.id,'text',u.bio,'author',private.admin_person(u.id),
                                'created_at',u.created_at)
        into v from public.user_profiles u where u.id = v_id;
    when 'opportunity' then
      select jsonb_build_object('kind','opportunity','id',o.id,'text',o.title || coalesce(E'\n' || o.description, ''),
                                'is_active',o.is_active,'created_at',o.created_at,
                                'author',private.admin_person(o.created_by_id))
        into v from public.opportunities o where o.id = v_id;
    else
      v := null;
  end case;
  return coalesce(v, jsonb_build_object('kind', p_type, 'id', v_id, 'deleted', true));
end;
$$;

create or replace function public.admin_list_reports(
  p_status text default 'open',    -- open (open+reviewing+escalated) | resolved | dismissed | all
  p_urgent_only boolean default false,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v jsonb;
begin
  perform private.require_admin();
  select coalesce(jsonb_agg(row order by urgent desc, created_at desc), '[]') into v
  from (
    select r.created_at,
           (r.severity = 'high' or r.is_minor_related or r.reason = 'child_safety') as urgent,
           jsonb_build_object(
             'id', r.id,
             'entity_type', r.reported_entity_type,
             'entity_id', r.reported_entity_id,
             'reason', r.reason,
             'details', r.details,
             'severity', r.severity,
             'status', r.status,
             'is_minor_related', r.is_minor_related,
             'resolution', r.resolution,
             'action_taken', r.action_taken,
             'created_at', r.created_at,
             'updated_at', r.updated_at,
             'urgent', (r.severity = 'high' or r.is_minor_related or r.reason = 'child_safety'),
             'reporter', private.admin_person(r.reporter_id),
             'reported_user', private.admin_person(r.reported_user_id),
             'resolved_by', private.admin_person(r.resolved_by),
             'target', private.admin_report_target(r.reported_entity_type, r.reported_entity_id),
             'duplicates', (select count(*) - 1 from public.moderation_reports d
                             where d.reported_entity_type = r.reported_entity_type
                               and d.reported_entity_id = r.reported_entity_id),
             'prior_reports_against_user', (select count(*) from public.moderation_reports d
                             where d.reported_user_id = r.reported_user_id and d.id <> r.id)
           ) as row
    from public.moderation_reports r
    where (p_status = 'all'
           or (p_status = 'open' and r.status in ('open','reviewing','escalated'))
           or r.status = p_status)
      and (not p_urgent_only or r.severity = 'high' or r.is_minor_related or r.reason = 'child_safety')
    order by (r.severity = 'high' or r.is_minor_related or r.reason = 'child_safety') desc, r.created_at desc
    limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset)
  ) q;
  return v;
end;
$$;

/* Take one piece of content out of circulation (or put it back). Shared by the
   reports queue and the content page so the two can never disagree. */
create or replace function private.admin_apply_content_action(
  p_kind text,      -- post | comment | story | clip | message | opportunity
  p_id uuid,
  p_action text,    -- remove | restore | hide
  p_reason text
)
returns jsonb       -- the old row, for the audit trail
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_old jsonb;
begin
  if p_kind = 'post' then
    select to_jsonb(p) into v_old from public.posts p where p.id = p_id;
    update public.posts set
      moderation_state = case p_action when 'restore' then 'visible'
                                       when 'hide' then 'under_review' else 'removed' end,
      is_hidden = (p_action <> 'restore'),
      removed_reason = case when p_action = 'restore' then null else p_reason end
    where id = p_id;

  elsif p_kind = 'comment' then
    select to_jsonb(c) into v_old from public.post_comments c where c.id = p_id;
    update public.post_comments set is_hidden = (p_action <> 'restore') where id = p_id;

  elsif p_kind = 'story' then
    -- Stories expire in a day and have no hidden state: removing deletes it.
    select to_jsonb(s) into v_old from public.stories s where s.id = p_id;
    if p_action <> 'restore' then
      delete from public.stories where id = p_id;
    end if;

  elsif p_kind = 'clip' then
    -- A profile highlight. Hiding takes it off Explore, Reels and the profile.
    select to_jsonb(m) into v_old from public.athlete_media m where m.id = p_id;
    if p_action = 'remove' then
      delete from public.athlete_media where id = p_id;
    else
      update public.athlete_media set is_public = (p_action = 'restore') where id = p_id;
    end if;

  elsif p_kind = 'message' then
    -- The text is kept in the audit log as evidence before the row goes.
    select to_jsonb(m) into v_old from public.messages m where m.id = p_id;
    if p_action = 'remove' then
      delete from public.messages where id = p_id;
    end if;

  elsif p_kind = 'opportunity' then
    select to_jsonb(o) into v_old from public.opportunities o where o.id = p_id;
    update public.opportunities set is_active = (p_action = 'restore') where id = p_id;

  else
    raise exception 'Unknown content kind' using errcode = '22023';
  end if;

  return v_old;
end;
$$;

create or replace function private.admin_suspend(p_user uuid, p_reason text, p_until timestamptz)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user = auth.uid() then
    raise exception 'You cannot suspend your own account' using errcode = '22023';
  end if;
  if exists (select 1 from public.user_profiles where id = p_user and role::text in ('admin','super_admin'))
     and not private.is_super_admin() then
    raise exception 'Only a super admin can suspend an admin' using errcode = '42501';
  end if;

  update public.user_profiles set
    is_suspended = true,
    suspended_reason = p_reason,
    suspended_at = now(),
    suspended_until = p_until,
    suspended_by = auth.uid()
  where id = p_user;

  -- Sign them out everywhere: their refresh tokens stop working at once.
  if to_regclass('auth.sessions') is not null then
    execute 'delete from auth.sessions where user_id = $1' using p_user;
  end if;
end;
$$;

create or replace function public.admin_resolve_report(
  p_report uuid,
  p_action text,             -- dismiss | remove_content | warn_user | suspend_user | ban_user | escalate | reviewing
  p_note text default null,
  p_suspend_days integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r          public.moderation_reports;
  v_kind     text;
  v_target   uuid;
  v_old      jsonb;
  v_status   text;
  v_closed   integer := 0;
begin
  perform private.require_admin();
  if p_action not in ('dismiss','remove_content','warn_user','suspend_user','ban_user','escalate','reviewing') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;

  select * into r from public.moderation_reports where id = p_report for update;
  if not found then raise exception 'Report not found' using errcode = 'P0002'; end if;

  v_kind := r.reported_entity_type;
  v_target := private.try_uuid(r.reported_entity_id);

  -- Content first.
  if p_action = 'dismiss' and v_kind in ('post','comment') and v_target is not null then
    -- A high-severity report hides content automatically; a dismissal restores it,
    -- unless a moderator removed it on purpose.
    if v_kind = 'comment' or exists (select 1 from public.posts where id = v_target and moderation_state = 'under_review') then
      v_old := private.admin_apply_content_action(v_kind, v_target, 'restore', null);
    end if;
  elsif p_action in ('remove_content','suspend_user','ban_user') and v_kind <> 'user' and v_target is not null then
    v_old := private.admin_apply_content_action(v_kind, v_target, 'remove',
               coalesce(nullif(btrim(p_note), ''), r.reason));
  end if;

  -- Then the account.
  if p_action = 'warn_user' and r.reported_user_id is not null then
    update public.user_profiles set warning_count = warning_count + 1 where id = r.reported_user_id;
    perform private.admin_notice(r.reported_user_id, 'Community Guidelines warning',
      coalesce(nullif(btrim(p_note), ''),
               'Something you shared broke the AceAiX Community Guidelines. Repeated breaks lead to suspension.'),
      jsonb_build_object('report_id', r.id, 'reason', r.reason));
  elsif p_action = 'suspend_user' and r.reported_user_id is not null then
    perform private.admin_suspend(r.reported_user_id, coalesce(nullif(btrim(p_note), ''), r.reason),
                                  now() + make_interval(days => greatest(1, coalesce(p_suspend_days, 7))));
  elsif p_action = 'ban_user' and r.reported_user_id is not null then
    perform private.admin_suspend(r.reported_user_id, coalesce(nullif(btrim(p_note), ''), r.reason), null);
  end if;

  v_status := case p_action
    when 'dismiss'   then 'dismissed'
    when 'escalate'  then 'escalated'
    when 'reviewing' then 'reviewing'
    else 'resolved' end;

  update public.moderation_reports set
    status = v_status,
    action_taken = case when p_action in ('escalate','reviewing') then action_taken else p_action end,
    resolution = coalesce(nullif(btrim(p_note), ''), resolution),
    resolved_by = case when v_status in ('resolved','dismissed') then auth.uid() else resolved_by end
  where id = r.id;

  -- Every other open report about the same thing is settled by the same decision.
  if v_status in ('resolved','dismissed') then
    with closed as (
      update public.moderation_reports set
        status = v_status, action_taken = p_action, resolved_by = auth.uid(),
        resolution = coalesce(nullif(btrim(p_note), ''), 'Settled with report ' || r.id)
      where reported_entity_type = r.reported_entity_type
        and reported_entity_id = r.reported_entity_id
        and id <> r.id
        and status in ('open','reviewing','escalated')
      returning id
    )
    select count(*) into v_closed from closed;
  end if;

  perform private.admin_audit('report.' || p_action, 'moderation_reports', r.id,
    jsonb_build_object('report', to_jsonb(r), 'content', v_old),
    jsonb_build_object('status', v_status, 'note', p_note, 'duplicates_closed', v_closed));

  return jsonb_build_object('status', v_status, 'duplicates_closed', v_closed);
end;
$$;

-- ------------------------------------------------------------
-- §5  Content review
-- ------------------------------------------------------------
create or replace function public.admin_list_content(
  p_kind text default 'post',        -- post | reel | story | clip | comment
  p_state text default 'all',        -- all | visible | under_review | removed | hidden
  p_q text default null,
  p_minors_only boolean default false,
  p_limit integer default 40,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v jsonb; v_q text := nullif(btrim(coalesce(p_q, '')), '');
begin
  perform private.require_admin();
  p_limit := greatest(1, least(p_limit, 100));
  p_offset := greatest(0, p_offset);

  if p_kind in ('post','reel') then
    select coalesce(jsonb_agg(x order by (x->>'created_at') desc), '[]') into v from (
      select jsonb_build_object(
        'kind','post','id',p.id,'type',p.type,'text',coalesce(p.caption,p.text),'media',p.media,
        'image_url',p.image_url,'audience',p.audience,'state',p.moderation_state,'is_hidden',p.is_hidden,
        'removed_reason',p.removed_reason,'like_count',p.like_count,'comment_count',p.comments_count,
        'view_count',p.view_count,'created_at',p.created_at,'author',private.admin_person(p.author_id),
        'open_reports',(select count(*) from public.moderation_reports r
                         where r.reported_entity_type='post' and r.reported_entity_id=p.id::text
                           and r.status in ('open','reviewing','escalated'))) as x
      from public.posts p
      join public.user_profiles u on u.id = p.author_id
      where (p_kind = 'post' or exists (select 1 from jsonb_array_elements(coalesce(p.media,'[]')) m
                                        where m->>'type' = 'video'))
        and (p_state = 'all' or p.moderation_state = p_state or (p_state = 'hidden' and p.is_hidden))
        and (not p_minors_only or u.is_minor)
        and (v_q is null or coalesce(p.caption,p.text,'') ilike '%'||v_q||'%' or u.full_name ilike '%'||v_q||'%')
      order by p.created_at desc limit p_limit offset p_offset) q;

  elsif p_kind = 'story' then
    select coalesce(jsonb_agg(x order by (x->>'created_at') desc), '[]') into v from (
      select jsonb_build_object(
        'kind','story','id',s.id,'text',s.caption,'media_url',s.media_url,'media_type',s.media_type,
        'card',s.card,'audience',s.audience,'state',case when s.expires_at > now() then 'live' else 'expired' end,
        'expires_at',s.expires_at,'created_at',s.created_at,'author',private.admin_person(s.author_id),
        'view_count',(select count(*) from public.story_views sv where sv.story_id = s.id)) as x
      from public.stories s
      join public.user_profiles u on u.id = s.author_id
      where (p_state = 'all' or (p_state = 'visible' and s.expires_at > now()))
        and (not p_minors_only or u.is_minor)
        and (v_q is null or coalesce(s.caption,'') ilike '%'||v_q||'%' or u.full_name ilike '%'||v_q||'%')
      order by s.created_at desc limit p_limit offset p_offset) q;

  elsif p_kind = 'clip' then
    select coalesce(jsonb_agg(x order by (x->>'created_at') desc), '[]') into v from (
      select jsonb_build_object(
        'kind','clip','id',m.id,'text',coalesce(m.title,'') || coalesce(E'\n'||m.description,''),
        'media_url',m.storage_url,'thumbnail_url',m.thumbnail_url,'media_type',m.media_type,
        'state',case when m.is_public then 'visible' else 'hidden' end,'view_count',m.views_count,
        'created_at',m.created_at,'author',private.admin_person(ap.user_id)) as x
      from public.athlete_media m
      join public.athlete_profiles ap on ap.id = m.athlete_id
      join public.user_profiles u on u.id = ap.user_id
      where (p_state = 'all' or (p_state = 'visible' and m.is_public) or (p_state = 'hidden' and not m.is_public))
        and (not p_minors_only or u.is_minor)
        and (v_q is null or coalesce(m.title,'') ilike '%'||v_q||'%' or u.full_name ilike '%'||v_q||'%')
      order by m.created_at desc limit p_limit offset p_offset) q;

  elsif p_kind = 'comment' then
    select coalesce(jsonb_agg(x order by (x->>'created_at') desc), '[]') into v from (
      select jsonb_build_object(
        'kind','comment','id',c.id,'text',c.body,'post_id',c.post_id,
        'state',case when c.is_hidden then 'hidden' else 'visible' end,
        'created_at',c.created_at,'author',private.admin_person(c.author_id)) as x
      from public.post_comments c
      join public.user_profiles u on u.id = c.author_id
      where (p_state = 'all' or (p_state = 'visible' and not c.is_hidden) or (p_state in ('hidden','removed') and c.is_hidden))
        and (not p_minors_only or u.is_minor)
        and (v_q is null or c.body ilike '%'||v_q||'%' or u.full_name ilike '%'||v_q||'%')
      order by c.created_at desc limit p_limit offset p_offset) q;
  else
    raise exception 'Unknown content kind' using errcode = '22023';
  end if;

  return v;
end;
$$;

create or replace function public.admin_moderate_content(
  p_kind text, p_id uuid, p_action text, p_reason text default null, p_notify boolean default true
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_old jsonb; v_author uuid;
begin
  perform private.require_admin();
  if p_action not in ('remove','restore','hide') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  if p_action = 'remove' and coalesce(btrim(p_reason), '') = '' then
    raise exception 'Give a reason for removing content' using errcode = '22023';
  end if;

  v_old := private.admin_apply_content_action(p_kind, p_id, p_action, p_reason);
  if v_old is null then raise exception 'Content not found' using errcode = 'P0002'; end if;

  v_author := coalesce((v_old->>'author_id')::uuid, (v_old->>'sender_id')::uuid, (v_old->>'created_by_id')::uuid,
                       (select ap.user_id from public.athlete_profiles ap where ap.id = (v_old->>'athlete_id')::uuid and p_kind = 'clip'));

  if p_action = 'remove' and p_notify and v_author is not null then
    perform private.admin_notice(v_author, 'Content removed',
      'Something you shared was removed for breaking the AceAiX Community Guidelines: ' || p_reason,
      jsonb_build_object('kind', p_kind, 'id', p_id));
  end if;

  perform private.admin_audit('content.' || p_kind || '.' || p_action,
    case p_kind when 'post' then 'posts' when 'comment' then 'post_comments' when 'story' then 'stories'
                when 'clip' then 'athlete_media' when 'message' then 'messages' else 'opportunities' end,
    p_id, v_old, jsonb_build_object('action', p_action, 'reason', p_reason));
end;
$$;

-- ------------------------------------------------------------
-- §6  Account control
-- ------------------------------------------------------------
create or replace function public.admin_list_users(
  p_q text default null,
  p_role text default null,
  p_status text default 'all',     -- all | active | suspended | unverified | verified | minors | reported
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_rows jsonb; v_total integer; v_q text := nullif(btrim(coalesce(p_q, '')), '');
begin
  perform private.require_admin();
  p_limit := greatest(1, least(p_limit, 200));

  with base as (
    select u.*, pv.email,
           (select count(*) from public.moderation_reports r where r.reported_user_id = u.id) as reports_against,
           (select count(*) from public.moderation_reports r where r.reported_user_id = u.id
              and r.status in ('open','reviewing','escalated')) as open_reports
    from public.user_profiles u
    left join public.user_private pv on pv.user_id = u.id
    where (p_role is null or p_role = '' or p_role = 'all' or u.role::text = p_role)
      and (v_q is null or u.full_name ilike '%'||v_q||'%' or pv.email ilike '%'||v_q||'%'
           or u.id::text = v_q or u.country ilike '%'||v_q||'%' or u.city ilike '%'||v_q||'%')
  ), filtered as (
    select * from base b
    where case p_status
      when 'active'     then not b.is_suspended
      when 'suspended'  then b.is_suspended
      when 'unverified' then not b.is_verified
      when 'verified'   then b.is_verified
      when 'minors'     then b.is_minor
      when 'reported'   then b.reports_against > 0
      else true end
  )
  select (select count(*) from filtered),
         coalesce((select jsonb_agg(jsonb_build_object(
            'id', f.id, 'full_name', f.full_name, 'avatar_url', f.avatar_url, 'role', f.role,
            'email', f.email, 'city', f.city, 'country', f.country,
            'is_verified', f.is_verified, 'is_minor', f.is_minor, 'age_band', f.age_band,
            'is_discoverable', f.is_discoverable,
            'is_suspended', f.is_suspended, 'suspended_reason', f.suspended_reason,
            'suspended_until', f.suspended_until, 'warning_count', f.warning_count,
            'followers_count', f.followers_count, 'last_active_at', f.last_active_at,
            'created_at', f.created_at, 'reports_against', f.reports_against, 'open_reports', f.open_reports)
            order by f.created_at desc)
          from (select * from filtered order by created_at desc limit p_limit offset greatest(0, p_offset)) f), '[]')
  into v_total, v_rows;

  return jsonb_build_object('total', v_total, 'rows', v_rows);
end;
$$;

create or replace function public.admin_get_user(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v jsonb; u public.user_profiles;
begin
  perform private.require_admin();
  select * into u from public.user_profiles where id = p_user;
  if not found then raise exception 'User not found' using errcode = 'P0002'; end if;

  select jsonb_build_object(
    'profile', to_jsonb(u),
    'email', (select email from public.user_private where user_id = u.id),
    'phone', (select phone from public.user_private where user_id = u.id),
    'date_of_birth', (select date_of_birth from public.user_private where user_id = u.id),
    'suspended_by', private.admin_person(u.suspended_by),
    'athlete', (select jsonb_build_object('id', ap.id, 'sport', ap.sport, 'position', coalesce(ap.position_primary, ap.position),
                                          'level', ap.level, 'club', ap.current_club, 'nationality', ap.nationality,
                                          'talent_score', (select overall from public.talent_scores t where t.athlete_id = ap.id),
                                          'tier', (select tier from public.talent_scores t where t.athlete_id = ap.id))
                from public.athlete_profiles ap where ap.user_id = u.id),
    'coach', (select jsonb_build_object('specialty', cp.specialty, 'years_experience', cp.years_experience,
                                        'licenses', cp.licenses, 'current_club', cp.current_club,
                                        'accepting', (select accepting from public.coaching_settings cs where cs.user_id = u.id))
              from public.coach_profiles cp where cp.user_id = u.id),
    'sponsor', (select to_jsonb(sp) - 'user_id' from public.sponsor_profiles sp where sp.user_id = u.id),
    'stats', jsonb_build_object(
      'posts', (select count(*) from public.posts where author_id = u.id),
      'posts_removed', (select count(*) from public.posts where author_id = u.id and moderation_state = 'removed'),
      'stories', (select count(*) from public.stories where author_id = u.id),
      'comments', (select count(*) from public.post_comments where author_id = u.id),
      'messages_sent', (select count(*) from public.messages where sender_id = u.id),
      'conversations', (select count(*) from public.conversations where participant_1_id = u.id or participant_2_id = u.id),
      'blocked_by', (select count(*) from public.user_blocks where blocked_id = u.id),
      'reports_filed', (select count(*) from public.moderation_reports where reporter_id = u.id),
      'followers', u.followers_count,
      'following', u.following_count),
    'guardian_consents', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', g.id, 'status', g.status, 'guardian_name', g.guardian_name, 'guardian_email', g.guardian_email,
          'relationship', g.relationship, 'guardian', private.admin_person(g.guardian_user_id),
          'allow_discovery', g.allow_discovery, 'allow_messaging', g.allow_messaging, 'allow_media', g.allow_media,
          'allow_assessments', g.allow_assessments, 'allow_sponsorship', g.allow_sponsorship, 'allow_bookings', g.allow_bookings,
          'granted_at', g.granted_at, 'revoked_at', g.revoked_at, 'created_at', g.created_at) order by g.created_at desc), '[]')
        from public.guardian_consents g where g.minor_user_id = u.id),
    'wards', (select coalesce(jsonb_agg(private.admin_person(g.minor_user_id)), '[]')
              from public.guardian_consents g where g.guardian_user_id = u.id and g.status = 'granted'),
    'reports_against', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', r.id, 'reason', r.reason, 'entity_type', r.reported_entity_type, 'status', r.status,
          'severity', r.severity, 'action_taken', r.action_taken, 'created_at', r.created_at) order by r.created_at desc), '[]')
        from (select * from public.moderation_reports where reported_user_id = u.id order by created_at desc limit 25) r),
    'verification_requests', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', r.id, 'type', r.type, 'status', r.status, 'decision_reason', r.decision_reason,
          'created_at', r.created_at) order by r.created_at desc), '[]')
        from public.verification_requests r where r.subject_user_id = u.id),
    'recent_posts', (select coalesce(jsonb_agg(jsonb_build_object(
          'kind','post','id', p.id, 'text', coalesce(p.caption, p.text), 'media', p.media, 'type', p.type,
          'state', p.moderation_state, 'created_at', p.created_at) order by p.created_at desc), '[]')
        from (select * from public.posts where author_id = u.id order by created_at desc limit 12) p),
    'history', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', a.id, 'action', a.action, 'created_at', a.created_at, 'by', private.admin_person(a.user_id),
          'note', a.new_value->>'reason') order by a.created_at desc), '[]')
        from (select * from public.audit_logs where record_id = u.id order by created_at desc limit 30) a)
  ) into v;
  return v;
end;
$$;

create or replace function public.admin_set_suspension(
  p_user uuid,
  p_suspend boolean,
  p_reason text default null,
  p_days integer default null     -- null with p_suspend = permanent ban
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_old jsonb;
begin
  perform private.require_admin();
  select to_jsonb(u) into v_old from public.user_profiles u where u.id = p_user;
  if v_old is null then raise exception 'User not found' using errcode = 'P0002'; end if;

  if p_suspend then
    if coalesce(btrim(p_reason), '') = '' then
      raise exception 'Give a reason' using errcode = '22023';
    end if;
    perform private.admin_suspend(p_user, p_reason,
      case when p_days is null then null else now() + make_interval(days => greatest(1, p_days)) end);
    perform private.admin_audit(case when p_days is null then 'user.ban' else 'user.suspend' end,
      'user_profiles', p_user, v_old, jsonb_build_object('reason', p_reason, 'days', p_days));
  else
    update public.user_profiles set is_suspended = false, suspended_reason = null, suspended_at = null,
                                    suspended_until = null, suspended_by = null
     where id = p_user;
    perform private.admin_notice(p_user, 'Your account is active again',
      coalesce(nullif(btrim(p_reason), ''), 'You can use AceAiX again. Please follow the Community Guidelines.'));
    perform private.admin_audit('user.reinstate', 'user_profiles', p_user, v_old,
      jsonb_build_object('reason', p_reason));
  end if;
end;
$$;

create or replace function public.admin_warn_user(p_user uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform private.require_admin();
  if coalesce(btrim(p_message), '') = '' then
    raise exception 'Write the warning' using errcode = '22023';
  end if;
  update public.user_profiles set warning_count = warning_count + 1 where id = p_user;
  if not found then raise exception 'User not found' using errcode = 'P0002'; end if;
  perform private.admin_notice(p_user, 'Community Guidelines warning', p_message);
  perform private.admin_audit('user.warn', 'user_profiles', p_user, null, jsonb_build_object('reason', p_message));
end;
$$;

create or replace function public.admin_set_verified(p_user uuid, p_verified boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_old boolean;
begin
  perform private.require_admin();
  select is_verified into v_old from public.user_profiles where id = p_user;
  if not found then raise exception 'User not found' using errcode = 'P0002'; end if;

  update public.user_profiles set is_verified = p_verified where id = p_user;

  -- Any request still waiting is settled by this decision.
  update public.verification_requests
     set status = case when p_verified then 'approved' else 'rejected' end::public.verification_status,
         decision_reason = coalesce(nullif(btrim(coalesce(p_reason, '')), ''), decision_reason),
         reviewed_by = auth.uid()
   where subject_user_id = p_user and status in ('pending','more_info');

  if p_verified and not coalesce(v_old, false) then
    perform private.admin_notice(p_user, 'Your account is verified', 'Your profile now shows the verified badge.');
  end if;

  perform private.admin_audit(case when p_verified then 'user.verify' else 'user.unverify' end,
    'user_profiles', p_user, jsonb_build_object('is_verified', v_old),
    jsonb_build_object('is_verified', p_verified, 'reason', p_reason));
end;
$$;

/* Changing a role is a super-admin act; the role guard trigger enforces it too. */
create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_old text;
begin
  perform private.require_admin();
  if not private.is_super_admin() then
    raise exception 'Only a super admin can change roles' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'You cannot change your own role' using errcode = '22023';
  end if;
  if p_role = 'super_admin' then
    raise exception 'Super admins are created from the server only' using errcode = '42501';
  end if;
  select role::text into v_old from public.user_profiles where id = p_user;
  if not found then raise exception 'User not found' using errcode = 'P0002'; end if;

  update public.user_profiles set role = p_role::public.user_role where id = p_user;
  perform private.admin_audit('user.role', 'user_profiles', p_user,
    jsonb_build_object('role', v_old), jsonb_build_object('role', p_role));
end;
$$;

-- ------------------------------------------------------------
-- §7  Youth safety
-- ------------------------------------------------------------
create or replace function public.admin_list_minors(p_filter text default 'all')  -- all | no_consent | pending | granted | revoked
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v jsonb;
begin
  perform private.require_admin();
  select coalesce(jsonb_agg(x order by (x->>'created_at') desc), '[]') into v from (
    select jsonb_build_object(
      'user', private.admin_person(u.id),
      'email', pv.email,
      'is_discoverable', u.is_discoverable,
      'created_at', u.created_at,
      'consent_state', coalesce(g.status, 'none'),
      'consent', case when g.id is null then null else jsonb_build_object(
          'id', g.id, 'guardian_name', g.guardian_name, 'guardian_email', g.guardian_email,
          'guardian', private.admin_person(g.guardian_user_id), 'relationship', g.relationship,
          'allow_discovery', g.allow_discovery, 'allow_messaging', g.allow_messaging, 'allow_media', g.allow_media,
          'allow_assessments', g.allow_assessments, 'allow_sponsorship', g.allow_sponsorship,
          'allow_bookings', g.allow_bookings, 'granted_at', g.granted_at, 'created_at', g.created_at,
          'delivery_count', g.delivery_count, 'last_delivery_at', g.last_delivery_at) end,
      'adult_conversations', (select count(*) from public.conversations c
          join public.user_profiles o on o.id = case when c.participant_1_id = u.id then c.participant_2_id else c.participant_1_id end
          where (c.participant_1_id = u.id or c.participant_2_id = u.id) and not o.is_minor),
      'open_reports', (select count(*) from public.moderation_reports r
          where r.reported_user_id = u.id and r.status in ('open','reviewing','escalated')),
      'deals', (select count(*) from public.sponsorship_deals d where d.athlete_user_id = u.id),
      'bookings', (select count(*) from public.coaching_bookings b where b.athlete_user_id = u.id and b.status = 'booked')
    ) as x
    from public.user_profiles u
    left join public.user_private pv on pv.user_id = u.id
    left join lateral (
      select * from public.guardian_consents g
      where g.minor_user_id = u.id
      order by (g.status = 'granted') desc, g.created_at desc limit 1
    ) g on true
    where u.is_minor
      and (p_filter = 'all'
           or (p_filter = 'no_consent' and coalesce(g.status, 'none') <> 'granted')
           or g.status = p_filter)
  ) q;
  return v;
end;
$$;

/* Adults in conversation with minors. Metadata only — a moderator reads a
   message's text only when someone reports it. */
create or replace function public.admin_minor_contacts(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v jsonb;
begin
  perform private.require_admin();
  select coalesce(jsonb_agg(x order by (x->>'last_message_at') desc nulls last), '[]') into v from (
    select jsonb_build_object(
      'conversation_id', c.id,
      'minor', private.admin_person(m.id),
      'adult', private.admin_person(a.id),
      'messages', (select count(*) from public.messages x where x.conversation_id = c.id),
      'messages_from_adult', (select count(*) from public.messages x where x.conversation_id = c.id and x.sender_id = a.id),
      'messages_from_minor', (select count(*) from public.messages x where x.conversation_id = c.id and x.sender_id = m.id),
      'last_message_at', c.last_message_at,
      'created_at', c.created_at,
      'is_guardian', exists (select 1 from public.guardian_consents g
                              where g.minor_user_id = m.id and g.guardian_user_id = a.id and g.status = 'granted'),
      'adult_verified', a.is_verified,
      'reports', (select count(*) from public.moderation_reports r
                   where r.reported_entity_type = 'message'
                     and r.reported_entity_id in (select x.id::text from public.messages x where x.conversation_id = c.id))
    ) as x
    from public.conversations c
    join public.user_profiles p1 on p1.id = c.participant_1_id
    join public.user_profiles p2 on p2.id = c.participant_2_id
    cross join lateral (select case when p1.is_minor then p1.id else p2.id end as id) mm
    join public.user_profiles m on m.id = mm.id
    join public.user_profiles a on a.id = case when p1.is_minor then p2.id else p1.id end
    where p1.is_minor <> p2.is_minor
    order by c.last_message_at desc nulls last
    limit greatest(1, least(p_limit, 500))
  ) q;
  return v;
end;
$$;

-- ------------------------------------------------------------
-- §8  Sponsorship and coach booking oversight
-- ------------------------------------------------------------
create or replace function public.admin_list_sponsorship(p_status text default 'all')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'deals', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id, 'status', d.status, 'initiated_by', d.initiated_by, 'message', d.message,
        'amount', d.amount, 'currency', d.currency, 'created_at', d.created_at, 'responded_at', d.responded_at,
        'sponsor', private.admin_person(d.sponsor_user_id),
        'company', (select company_name from public.sponsor_profiles where user_id = d.sponsor_user_id),
        'athlete', private.admin_person(d.athlete_user_id),
        'guardian_ok', case when not coalesce((select is_minor from public.user_profiles where id = d.athlete_user_id), false) then null
                            else exists (select 1 from public.guardian_consents g where g.minor_user_id = d.athlete_user_id
                                           and g.status = 'granted' and g.allow_sponsorship) end,
        'request_title', (select title from public.sponsorship_requests where id = d.request_id),
        'call_title', (select title from public.sponsor_calls where id = d.call_id)
      ) order by d.created_at desc), '[]')
      from public.sponsorship_deals d where p_status = 'all' or d.status = p_status),
    'requests', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id, 'title', r.title, 'event_name', r.event_name, 'event_date', r.event_date, 'sport', r.sport,
        'amount', r.amount, 'currency', r.currency, 'status', r.status, 'pitch', r.pitch, 'created_at', r.created_at,
        'athlete', private.admin_person(r.athlete_user_id)) order by r.created_at desc), '[]')
      from public.sponsorship_requests r),
    'calls', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'title', c.title, 'description', c.description, 'sport', c.sport, 'country', c.country,
        'amount_min', c.amount_min, 'amount_max', c.amount_max, 'currency', c.currency, 'slots', c.slots,
        'deadline', c.deadline, 'open_to_minors', c.open_to_minors, 'is_active', c.is_active, 'created_at', c.created_at,
        'sponsor', private.admin_person(c.sponsor_user_id),
        'company', (select company_name from public.sponsor_profiles where user_id = c.sponsor_user_id)) order by c.created_at desc), '[]')
      from public.sponsor_calls c)
  );
end;
$$;

create or replace function public.admin_sponsorship_action(p_kind text, p_id uuid, p_reason text)
returns void        -- p_kind: deal (withdraw) | call (close) | request (close)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_old jsonb;
begin
  perform private.require_admin();
  if coalesce(btrim(p_reason), '') = '' then raise exception 'Give a reason' using errcode = '22023'; end if;

  if p_kind = 'deal' then
    select to_jsonb(d) into v_old from public.sponsorship_deals d where d.id = p_id;
    update public.sponsorship_deals set status = 'withdrawn', responded_at = now()
     where id = p_id and status = 'pending';
    perform private.admin_notice((v_old->>'athlete_user_id')::uuid, 'A sponsorship offer was withdrawn by AceAiX', p_reason);
    perform private.admin_notice((v_old->>'sponsor_user_id')::uuid, 'A sponsorship offer was withdrawn by AceAiX', p_reason);
  elsif p_kind = 'call' then
    select to_jsonb(c) into v_old from public.sponsor_calls c where c.id = p_id;
    update public.sponsor_calls set is_active = false where id = p_id;
    perform private.admin_notice((v_old->>'sponsor_user_id')::uuid, 'Your sponsor call was closed by AceAiX', p_reason);
  elsif p_kind = 'request' then
    select to_jsonb(r) into v_old from public.sponsorship_requests r where r.id = p_id;
    update public.sponsorship_requests set status = 'closed' where id = p_id;
    perform private.admin_notice((v_old->>'athlete_user_id')::uuid, 'Your sponsorship request was closed by AceAiX', p_reason);
  else
    raise exception 'Unknown sponsorship item' using errcode = '22023';
  end if;
  if v_old is null then raise exception 'Not found' using errcode = 'P0002'; end if;

  perform private.admin_audit('sponsorship.' || p_kind || '.close', 'sponsorship', p_id, v_old,
                              jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.admin_list_bookings(p_scope text default 'upcoming')  -- upcoming | past | cancelled | all
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v jsonb;
begin
  perform private.require_admin();
  select coalesce(jsonb_agg(x order by (x->>'starts_at')), '[]') into v from (
    select jsonb_build_object(
      'id', b.id, 'status', b.status, 'cancelled_by', b.cancelled_by, 'note', b.note,
      'location', coalesce(b.location, sv.location), 'created_at', b.created_at, 'cancelled_at', b.cancelled_at,
      'starts_at', s.starts_at, 'ends_at', s.ends_at,
      'service', jsonb_build_object('title', sv.title, 'kind', sv.kind, 'price', sv.price, 'currency', sv.currency,
                                    'location_mode', sv.location_mode, 'duration_minutes', sv.duration_minutes),
      'coach', private.admin_person(b.coach_user_id),
      'athlete', private.admin_person(b.athlete_user_id),
      'guardian_ok', case when not coalesce((select is_minor from public.user_profiles where id = b.athlete_user_id), false) then null
                          else exists (select 1 from public.guardian_consents g where g.minor_user_id = b.athlete_user_id
                                         and g.status = 'granted' and g.allow_bookings) end
    ) as x
    from public.coaching_bookings b
    join public.coaching_slots s on s.id = b.slot_id
    left join public.coaching_services sv on sv.id = b.service_id
    where case p_scope
      when 'upcoming'  then b.status = 'booked' and s.starts_at >= now()
      when 'past'      then b.status = 'booked' and s.starts_at < now()
      when 'cancelled' then b.status = 'cancelled'
      else true end
    limit 300
  ) q;
  return v;
end;
$$;

create or replace function public.admin_cancel_booking(p_booking uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_old public.coaching_bookings;
begin
  perform private.require_admin();
  if coalesce(btrim(p_reason), '') = '' then raise exception 'Give a reason' using errcode = '22023'; end if;
  select * into v_old from public.coaching_bookings where id = p_booking for update;
  if not found then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  if v_old.status <> 'booked' then return; end if;

  update public.coaching_bookings set status = 'cancelled', cancelled_by = 'admin', cancelled_at = now()
   where id = p_booking;

  perform private.coaching_notify(v_old.athlete_user_id, 'coaching_cancelled',
    'AceAiX cancelled a coaching session: ' || p_reason, null, p_booking, v_old.athlete_user_id);
  perform private.admin_notice(v_old.coach_user_id, 'AceAiX cancelled a coaching session', p_reason,
    jsonb_build_object('booking_id', p_booking));
  perform private.admin_audit('booking.cancel', 'coaching_bookings', p_booking, to_jsonb(v_old),
    jsonb_build_object('reason', p_reason));
end;
$$;

-- ------------------------------------------------------------
-- §9  Audit log
-- ------------------------------------------------------------
create or replace function public.admin_audit_log(
  p_action_prefix text default null, p_limit integer default 100, p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v jsonb;
begin
  perform private.require_admin();
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'action', a.action, 'table_name', a.table_name, 'record_id', a.record_id,
      'old_value', a.old_value, 'new_value', a.new_value, 'created_at', a.created_at,
      'by', private.admin_person(a.user_id),
      'subject', case when a.table_name = 'user_profiles' then private.admin_person(a.record_id) end
    ) order by a.created_at desc), '[]') into v
  from (select * from public.audit_logs
        where p_action_prefix is null or p_action_prefix = '' or action like p_action_prefix || '%'
        order by created_at desc
        limit greatest(1, least(p_limit, 500)) offset greatest(0, p_offset)) a;
  return v;
end;
$$;

create or replace function public.admin_me()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform private.require_admin();
  return private.admin_person(auth.uid())
         || jsonb_build_object('is_super_admin', private.is_super_admin(),
                               'email', (select email from public.user_private where user_id = auth.uid()));
end;
$$;

-- ------------------------------------------------------------
-- Grants: callable by signed-in users (each refuses non-admins), never anon
-- ------------------------------------------------------------
do $$
declare f text;
begin
  for f in
    select p.oid::regprocedure::text
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%'
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- The private helpers are reached only through the public admin_* functions
-- above (which run as their owner), never directly by a client.
revoke all on function private.require_admin() from public, anon, authenticated;
revoke all on function private.admin_audit(text, text, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function private.admin_notice(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function private.admin_person(uuid) from public, anon, authenticated;
revoke all on function private.try_uuid(text) from public, anon, authenticated;
revoke all on function private.admin_report_target(text, text) from public, anon, authenticated;
revoke all on function private.admin_apply_content_action(text, uuid, text, text) from public, anon, authenticated;
revoke all on function private.admin_suspend(uuid, text, timestamptz) from public, anon, authenticated;

-- ------------------------------------------------------------
-- §10 Storage: a moderator can open media that RLS hides from everyone else
-- ------------------------------------------------------------
drop policy if exists media_admin_read on storage.objects;
create policy media_admin_read
on storage.objects for select
to authenticated
using (bucket_id in ('posts', 'stories', 'avatars') and private.is_admin());
