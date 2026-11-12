-- ============================================================
-- An athlete can type a sport that is not on the list (QA-178)
--
-- The list has 30 sports. An athlete whose sport is not one
-- of them types the name. The name is saved as a request.
-- While a request is still waiting, asking again replaces
-- that request. The profile sport becomes Other and the
-- position is cleared until an admin decides.
--
-- Many athletes are minors, so the typed text stays private
-- until an admin decides. A signed-in athlete can read only
-- their own request. The table accepts no direct writes.
-- An admin reads the queue through a function.
--
-- An admin has three outcomes: approve the name, match it to
-- a name they choose, or reject the request. Approve and
-- match write the decided name onto the profile only when
-- the profile still says Other, so a sport the athlete
-- picked in the meantime stays. A rejection leaves the
-- profile as it is and tells the athlete.
--
-- An approved name shows on the profile only. It does not
-- become a filter or a leaderboard category.
--
-- NEEDS TOORAJ'S OK because user-typed text can reach a public profile after review.
-- ============================================================

create table public.sport_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.user_profiles(id) on delete cascade,
  requested_name text not null check (char_length(requested_name) between 2 and 40),
  status         text not null default 'pending'
                   check (status in ('pending', 'approved', 'matched', 'rejected')),
  decided_sport  text,
  admin_note     text check (admin_note is null or char_length(admin_note) <= 300),
  reviewed_by    uuid references public.user_profiles(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One waiting request per person. Decided requests can stack.
create unique index idx_sport_requests_one_pending
  on public.sport_requests (user_id)
  where status = 'pending';

create index idx_sport_requests_status_created
  on public.sport_requests (status, created_at);

create trigger trg_sport_requests_updated_at
  before update on public.sport_requests
  for each row execute function public.set_updated_at();

alter table public.sport_requests enable row level security;

revoke all on table public.sport_requests from public, anon, authenticated;
grant select on table public.sport_requests to authenticated;

-- The athlete can read their own request. Nobody else can.
create policy sport_requests_select
on public.sport_requests
for select
to authenticated
using (user_id = auth.uid());

-- ------------------------------------------------------------
-- Tidy a typed name, then decide whether it is usable.
-- ------------------------------------------------------------
create or replace function private.clean_sport_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    btrim(regexp_replace(p_name, '[[:space:]]+', ' ', 'g')),
    ''
  );
$$;

create or replace function private.valid_sport_name(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_name is not null
    and char_length(p_name) between 2 and 40
    and p_name ~ '^[[:alpha:]][[:alpha:] ''’-]*$',
    false
  );
$$;

revoke all on function private.clean_sport_name(text) from public, anon, authenticated;
revoke all on function private.valid_sport_name(text) from public, anon, authenticated;

-- ------------------------------------------------------------
-- The athlete asks. A second ask, while one is waiting,
-- replaces that waiting request.
-- ------------------------------------------------------------
create or replace function public.request_sport(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user   uuid := auth.uid();
  v_name   text;
  v_id     uuid;
  v_recent integer;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.athlete_profiles where user_id = v_user
  ) then
    raise exception 'Only athletes choose a sport' using errcode = '42501';
  end if;

  v_name := private.clean_sport_name(p_name);
  if not private.valid_sport_name(v_name) then
    raise exception 'Use 2 to 40 letters for the sport name'
      using errcode = '22023', hint = 'sport_name_invalid';
  end if;

  select id into v_id
  from public.sport_requests
  where user_id = v_user
    and status = 'pending'
  for update;

  if v_id is null then
    -- Replacing the waiting request is not a new row, so the
    -- daily cap is checked only when inserting.
    select count(*) into v_recent
    from public.sport_requests
    where user_id = v_user
      and created_at > now() - interval '1 day';

    if v_recent >= 5 then
      raise exception 'You can ask for a sport 5 times a day'
        using errcode = '22023', hint = 'sport_request_limit';
    end if;

    insert into public.sport_requests (user_id, requested_name)
    values (v_user, v_name)
    returning id into v_id;
  else
    update public.sport_requests
       set requested_name = v_name,
           created_at = now()
     where id = v_id;
  end if;

  update public.athlete_profiles
     set sport = 'Other',
         "position" = null,
         position_primary = null
   where user_id = v_user;

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- The queue. Oldest waiting request first.
-- ------------------------------------------------------------
create or replace function public.admin_sport_requests(p_status text default 'pending')
returns table (
  id             uuid,
  user_id        uuid,
  full_name      text,
  email          text,
  is_minor       boolean,
  current_sport  text,
  requested_name text,
  status         text,
  decided_sport  text,
  admin_note     text,
  created_at     timestamptz,
  reviewed_at    timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform private.require_admin();

  return query
  select
    r.id,
    r.user_id,
    up.full_name::text,
    au.email::text,
    up.is_minor,
    ap.sport::text,
    r.requested_name,
    r.status,
    r.decided_sport,
    r.admin_note,
    r.created_at,
    r.reviewed_at
  from public.sport_requests r
  join public.user_profiles up on up.id = r.user_id
  join auth.users au on au.id = r.user_id
  left join public.athlete_profiles ap on ap.user_id = r.user_id
  where p_status is null or r.status = p_status
  order by r.created_at, r.id
  limit 500;
end;
$$;

-- ------------------------------------------------------------
-- Approve, match, or reject one waiting request.
-- ------------------------------------------------------------
create or replace function public.admin_review_sport_request(
  p_id     uuid,
  p_action text,
  p_value  text default null,
  p_note   text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old    public.sport_requests;
  v_new    public.sport_requests;
  v_status text;
  v_sport  text;
  v_note   text;
  v_title  text;
  v_body   text;
begin
  perform private.require_admin();

  select * into v_old
  from public.sport_requests
  where id = p_id
  for update;

  if not found then
    raise exception 'Sport request not found' using errcode = 'P0002';
  end if;

  if v_old.status <> 'pending' then
    raise exception 'This sport request is already decided'
      using errcode = '22023', hint = 'sport_request_decided';
  end if;

  if p_action not in ('approve', 'match', 'reject') then
    raise exception 'Use approve, match or reject' using errcode = '22023';
  end if;

  v_note := nullif(btrim(p_note), '');
  if v_note is not null and char_length(v_note) > 300 then
    raise exception 'Keep the note to 300 characters' using errcode = '22023';
  end if;

  if p_action in ('approve', 'match') then
    v_sport := private.clean_sport_name(coalesce(p_value, v_old.requested_name));
    if not private.valid_sport_name(v_sport) then
      raise exception 'Use 2 to 40 letters for the sport name'
        using errcode = '22023', hint = 'sport_name_invalid';
    end if;
  end if;

  v_status := case p_action
    when 'approve' then 'approved'
    when 'match'   then 'matched'
    else 'rejected'
  end;

  update public.sport_requests
     set status = v_status,
         decided_sport = v_sport,
         admin_note = v_note,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = v_old.id
  returning * into v_new;

  -- A sport chosen after the request is left alone.
  if p_action in ('approve', 'match') then
    update public.athlete_profiles
       set sport = v_sport
     where user_id = v_old.user_id
       and sport = 'Other';
  end if;

  v_title := case p_action
    when 'approve' then 'Your sport was approved: ' || v_sport
    when 'match'   then 'Your sport was set to ' || v_sport
    else 'Your sport request was not approved'
  end;

  v_body := case
    when p_action = 'reject' then coalesce(
      v_note,
      'Please choose a sport from the list, or try another name.')
    else null
  end;

  perform private.notify(
    v_old.user_id,
    'account',
    'sport_request_' || v_status,
    v_title,
    v_body,
    null,
    'sport_request',
    v_old.id::text,
    null,
    jsonb_build_object(
      'request_id', v_old.id,
      'status', v_status,
      'sport', v_sport
    )
  );

  perform private.admin_audit(
    'sport_request.' || p_action,
    'sport_requests',
    v_old.user_id,
    to_jsonb(v_old),
    to_jsonb(v_new)
  );

  return to_jsonb(v_new);
end;
$$;

revoke all on function public.request_sport(text) from public, anon;
revoke all on function public.admin_sport_requests(text) from public, anon;
revoke all on function public.admin_review_sport_request(uuid, text, text, text) from public, anon;

grant execute on function public.request_sport(text) to authenticated;
grant execute on function public.admin_sport_requests(text) to authenticated;
grant execute on function public.admin_review_sport_request(uuid, text, text, text) to authenticated;
