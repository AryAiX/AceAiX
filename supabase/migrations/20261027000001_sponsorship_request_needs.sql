-- ------------------------------------------------------------
-- What an athlete needs covered, in their own words
--
-- "Other" was only a tag. Sponsors could not tell physio from kit.
-- needs_other holds that line. A request now also has to name at least
-- one need and a pitch of ten characters. Reopening (set_sponsorship_request_status)
-- is unchanged, so an older request with neither still comes back online.
-- ------------------------------------------------------------

alter table public.sponsorship_requests
  add column if not exists needs_other text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sponsorship_requests_needs_other_check'
      and conrelid = 'public.sponsorship_requests'::regclass
  ) then
    alter table public.sponsorship_requests
      add constraint sponsorship_requests_needs_other_check
      check (needs_other is null or char_length(btrim(needs_other)) between 2 and 60);
  end if;
end $$;

-- ------------------------------------------------------------
-- save_sponsorship_request — same signature, stricter body
-- ------------------------------------------------------------
create or replace function public.save_sponsorship_request(p_id uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me    public.user_profiles;
  v_id    uuid;
  v_sport text;
  v_needs text[];
  v_other text;
  v_pitch text;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if v_me.role <> 'athlete' or v_me.is_suspended then
    raise exception 'Only an athlete can ask for sponsorship'
      using errcode = '42501', hint = 'athlete_only';
  end if;
  if v_me.is_minor and not private.has_guardian_consent(v_me.id, 'sponsorship') then
    raise exception 'A parent or guardian has to approve sponsorship first'
      using errcode = '42501', hint = 'guardian_consent_required';
  end if;
  if length(btrim(coalesce(p ->> 'title', ''))) < 3 then
    raise exception 'Say what the sponsorship is for' using errcode = '22023', hint = 'sponsorship_title';
  end if;

  v_needs := private.sponsorship_tags(p -> 'needs', array['entry_fee', 'travel', 'equipment', 'coaching', 'nutrition', 'other']);
  if coalesce(cardinality(v_needs), 0) = 0 then
    raise exception 'Choose at least one thing the sponsorship should cover'
      using errcode = '22023', hint = 'sponsorship_needs';
  end if;

  v_other := nullif(btrim(coalesce(p ->> 'needs_other', '')), '');
  if 'other' = any (v_needs) then
    if v_other is null or char_length(v_other) < 2 or char_length(v_other) > 60 then
      raise exception 'Say what else you need, in 2 to 60 characters'
        using errcode = '22023', hint = 'sponsorship_needs_other';
    end if;
  else
    v_other := null;
  end if;

  v_pitch := nullif(btrim(coalesce(p ->> 'pitch', '')), '');
  if v_pitch is null or length(v_pitch) < 10 then
    raise exception 'Say why you, in at least ten characters'
      using errcode = '22023', hint = 'sponsorship_pitch';
  end if;

  select sport into v_sport from public.athlete_profiles where user_id = v_me.id;

  if p_id is null then
    if (select count(*) from public.sponsorship_requests
        where athlete_user_id = v_me.id and status = 'open') >= 3 then
      raise exception 'Three open requests at a time'
        using errcode = '22023', hint = 'sponsorship_request_limit';
    end if;
    insert into public.sponsorship_requests
      (athlete_user_id, title, event_name, event_date, location, sport, needs, needs_other, gives, amount, currency, pitch)
    values (
      v_me.id,
      btrim(p ->> 'title'),
      nullif(btrim(p ->> 'event_name'), ''),
      nullif(p ->> 'event_date', '')::date,
      nullif(btrim(p ->> 'location'), ''),
      v_sport,
      v_needs,
      v_other,
      private.sponsorship_tags(p -> 'gives', array['logo_on_kit', 'social_posts', 'appearances', 'content', 'testimonial']),
      nullif(p ->> 'amount', '')::integer,
      coalesce(nullif(upper(btrim(p ->> 'currency')), ''), 'AED'),
      v_pitch
    )
    returning id into v_id;
  else
    update public.sponsorship_requests set
      title       = btrim(p ->> 'title'),
      event_name  = nullif(btrim(p ->> 'event_name'), ''),
      event_date  = nullif(p ->> 'event_date', '')::date,
      location    = nullif(btrim(p ->> 'location'), ''),
      sport       = v_sport,
      needs       = v_needs,
      needs_other = v_other,
      gives       = private.sponsorship_tags(p -> 'gives', array['logo_on_kit', 'social_posts', 'appearances', 'content', 'testimonial']),
      amount      = nullif(p ->> 'amount', '')::integer,
      currency    = coalesce(nullif(upper(btrim(p ->> 'currency')), ''), 'AED'),
      pitch       = v_pitch,
      updated_at  = now()
    where id = p_id and athlete_user_id = v_me.id
    returning id into v_id;
    if v_id is null then
      raise exception 'Request not found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- my_sponsorship — athlete's own list, including the edit form
-- ------------------------------------------------------------
create or replace function public.my_sponsorship()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me public.user_profiles;
  v_gate text;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_gate := case
    when v_me.role::text = 'sponsor' and not v_me.is_verified then 'sponsor_not_verified'
    when v_me.role = 'athlete' and v_me.is_minor
         and not private.has_guardian_consent(v_me.id, 'sponsorship') then 'guardian_consent_required'
    else 'ok'
  end;

  return jsonb_build_object(
    'role', v_me.role::text,
    'gate', v_gate,
    'is_verified', v_me.is_verified,
    'profile', (
      select to_jsonb(sp) - 'created_at' - 'updated_at'
      from public.sponsor_profiles sp where sp.user_id = v_me.id
    ),
    'requests', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select r.id, r.title, r.event_name, r.event_date, r.location, r.sport, r.needs, r.needs_other, r.gives,
               r.amount, r.currency, r.pitch, r.status, r.created_at,
               (select count(*) from public.sponsorship_deals d
                where d.request_id = r.id and d.status = 'pending') as pending_offers
        from public.sponsorship_requests r
        where r.athlete_user_id = v_me.id
      ) x), '[]'::jsonb),
    'calls', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select c.id, c.title, c.description, c.sport, c.country, c.offers, c.amount_min, c.amount_max,
               c.currency, c.slots, c.deadline, c.open_to_minors, c.is_active, c.created_at,
               (select count(*) from public.sponsorship_deals d
                where d.call_id = c.id and d.status = 'pending') as pending_applications
        from public.sponsor_calls c
        where c.sponsor_user_id = v_me.id
      ) x), '[]'::jsonb),
    /* Every deal I am part of — and, for a guardian, my children's. */
    'deals', coalesce((
      select jsonb_agg(to_jsonb(x) order by (x.status = 'pending') desc, x.created_at desc)
      from (
        select
          d.id, d.initiated_by, d.status, d.message, d.amount, d.currency, d.created_at, d.responded_at,
          d.request_id, d.call_id,
          r.title as request_title, c.title as call_title,
          case when d.sponsor_user_id = v_me.id then 'sponsor'
               when d.athlete_user_id = v_me.id then 'athlete'
               else 'guardian' end as my_side,
          d.athlete_user_id, a.full_name as athlete_name, a.avatar_url as athlete_avatar,
          coalesce(a.is_minor, false) as athlete_is_minor,
          d.sponsor_user_id, coalesce(sp.company_name, s.full_name) as sponsor_name,
          s.avatar_url as sponsor_avatar, s.is_verified as sponsor_verified,
          (d.status = 'pending' and (
             (d.initiated_by = 'sponsor' and d.sponsor_user_id <> v_me.id)
             or (d.initiated_by = 'athlete' and d.sponsor_user_id = v_me.id)
          )) as can_respond,
          (d.status = 'pending' and (
             (d.initiated_by = 'sponsor' and d.sponsor_user_id = v_me.id)
             or (d.initiated_by = 'athlete' and d.athlete_user_id = v_me.id)
          )) as can_withdraw
        from public.sponsorship_deals d
        join public.user_profiles a on a.id = d.athlete_user_id
        join public.user_profiles s on s.id = d.sponsor_user_id
        left join public.sponsor_profiles sp on sp.user_id = d.sponsor_user_id
        left join public.sponsorship_requests r on r.id = d.request_id
        left join public.sponsor_calls c on c.id = d.call_id
        where d.sponsor_user_id = v_me.id
           or d.athlete_user_id = v_me.id
           or exists (
             select 1 from public.guardian_consents g
             where g.minor_user_id = d.athlete_user_id
               and g.guardian_user_id = v_me.id and g.status = 'granted'
           )
        order by d.created_at desc
        limit 100
      ) x), '[]'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------
-- sponsorship_card — needs_other follows location and event_date
--
-- A minor's free text says what they are short of. The same people who
-- may see when and where (the athlete, an admin, a guardian with granted
-- consent, or a verified sponsor) may see it. Everyone else still sees
-- the "Other" tag, not the words.
-- ------------------------------------------------------------
create or replace function public.sponsorship_card(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me   public.user_profiles;
  v_them public.user_profiles;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select * into v_them from public.user_profiles where id = p_user;
  if not found or v_them.is_suspended then
    return null;
  end if;

  if v_them.role::text = 'sponsor' then
    if p_user <> v_me.id and (
         not private.viewer_can_see_author(p_user) or private.users_are_blocked(v_me.id, p_user)) then
      return null;
    end if;
    return jsonb_build_object(
      'kind', 'sponsor',
      'is_verified', v_them.is_verified,
      'profile', (select to_jsonb(sp) - 'created_at' - 'updated_at' - 'budget_min' - 'budget_max'
                  from public.sponsor_profiles sp where sp.user_id = p_user),
      'calls', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'call_id', f.call_id, 'title', f.title, 'sport', f.sport, 'offers', f.offers,
                 'deadline', f.deadline, 'my_status', f.my_status) order by f.created_at desc)
        from public.sponsor_calls_feed(null, null, 50, 0) f
        where f.sponsor_user_id = p_user), '[]'::jsonb)
    );
  end if;

  if v_them.role <> 'athlete' or not private.sponsorship_visible(p_user) then
    return null;
  end if;

  return jsonb_build_object(
    'kind', 'athlete',
    'is_self', p_user = v_me.id,
    /* A verified sponsor can make an offer from here. */
    'can_offer', v_me.role::text = 'sponsor' and v_me.is_verified and not v_me.is_suspended and p_user <> v_me.id,
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'title', r.title, 'event_name', r.event_name,
               /* When and where a minor will be is for the people who may act on it. */
               'event_date', case when not coalesce(v_them.is_minor, false)
                                    or private.sponsorship_sees_amount(p_user) then r.event_date end,
               'location', case when not coalesce(v_them.is_minor, false)
                                  or private.sponsorship_sees_amount(p_user) then r.location end,
               'needs', r.needs,
               'needs_other', case when not coalesce(v_them.is_minor, false)
                                     or private.sponsorship_sees_amount(p_user) then r.needs_other end,
               'gives', r.gives, 'pitch', r.pitch,
               'currency', r.currency,
               'amount', case when private.sponsorship_sees_amount(p_user) then r.amount end,
               'my_offer_status', (select d.status from public.sponsorship_deals d
                                   where d.request_id = r.id and d.sponsor_user_id = v_me.id
                                   order by d.created_at desc limit 1))
             order by r.created_at desc)
      from public.sponsorship_requests r
      where r.athlete_user_id = p_user and r.status = 'open'), '[]'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------
-- sponsorship_seekers — dropped only because the return table grows
--
-- PostgreSQL refuses CREATE OR REPLACE when RETURNS TABLE gains a column.
-- The arguments are unchanged. needs_other follows location and event_date
-- in this function: those columns are not blanked per row. A minor's whole
-- request is left out unless the caller is a verified sponsor or an admin,
-- so the free text is hidden by that same filter.
-- ------------------------------------------------------------
drop function if exists public.sponsorship_seekers(text, text, text, integer, integer);

create or replace function public.sponsorship_seekers(
  p_sport text default null, p_country text default null, p_query text default null,
  p_limit integer default 20, p_offset integer default 0
)
returns table (
  request_id      uuid,
  athlete_user_id uuid,
  full_name       text,
  avatar_url      text,
  sport           text,
  athlete_position text,
  country         text,
  is_minor        boolean,
  talent_score    integer,
  tier            text,
  title           text,
  event_name      text,
  event_date      date,
  location        text,
  needs           text[],
  needs_other     text,
  gives           text[],
  amount          integer,
  currency        text,
  pitch           text,
  created_at      timestamptz,
  my_offer_status text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me       public.user_profiles;
  v_verified boolean;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  /* The list of who needs money is for the people who might give it. */
  if (v_me.role::text <> 'sponsor' or v_me.is_suspended) and not private.is_admin() then
    raise exception 'Only sponsors can browse requests' using errcode = '42501', hint = 'sponsor_only';
  end if;
  /* Anyone can sign up as a sponsor; minors are listed only to verified ones. */
  v_verified := private.is_admin() or v_me.is_verified;

  return query
  select
    r.id, r.athlete_user_id, up.full_name::text, up.avatar_url::text,
    coalesce(r.sport, ap.sport)::text,
    coalesce(ap.position_primary, ap.position)::text,
    up.country::text,
    coalesce(up.is_minor, false),
    coalesce(ts.overall, 0),
    coalesce(ts.tier, 'rising')::text,
    r.title, r.event_name, r.event_date, r.location, r.needs, r.needs_other, r.gives,
    case when private.sponsorship_sees_amount(r.athlete_user_id) then r.amount end,
    r.currency, r.pitch, r.created_at,
    (select d.status from public.sponsorship_deals d
     where d.request_id = r.id and d.sponsor_user_id = v_me.id
     order by d.created_at desc limit 1)
  from public.sponsorship_requests r
  join public.user_profiles up on up.id = r.athlete_user_id
  left join public.athlete_profiles ap on ap.user_id = r.athlete_user_id
  left join public.talent_scores ts on ts.athlete_id = ap.id
  where r.status = 'open'
    and r.athlete_user_id <> v_me.id
    and private.sponsorship_visible(r.athlete_user_id)
    and (v_verified or not coalesce(up.is_minor, false))
    and (p_sport is null or coalesce(r.sport, ap.sport) ilike p_sport)
    and (p_country is null or up.country ilike p_country)
    and (nullif(btrim(p_query), '') is null
         or up.full_name ilike '%' || btrim(p_query) || '%'
         or r.title ilike '%' || btrim(p_query) || '%'
         or r.event_name ilike '%' || btrim(p_query) || '%')
  order by r.created_at desc, r.id
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

-- Dropping the function dropped its grants. 20261008000002 revoked execute
-- from public and anon and granted it to authenticated only. service_role
-- was never granted on sponsorship_seekers, nor on the other sponsorship
-- RPCs in that file, so it is not granted here either.
revoke all on function public.sponsorship_seekers(text, text, text, integer, integer) from public, anon;
grant execute on function public.sponsorship_seekers(text, text, text, integer, integer) to authenticated;
