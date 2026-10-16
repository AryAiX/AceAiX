-- QA-65. Two holes in the youth naming rule: club_match_page shortened a
-- name only when e.side = 'us', so opponents' children showed in full, and
-- is_youth_category missed labels such as "Under 14", "Boys U14", "2013 Boys"
-- and "تحت 14". Squads gain an explicit is_youth flag (default true). The
-- backfill uses the widened helper, so a squad already classified keeps that
-- result and the missed labels become youth. A match reads the flag from its
-- squad and shortens both sides.

create or replace function private.is_youth_category(p_category text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  -- Each age branch captures with one pattern, then compares that integer.
  -- \m keeps the token at a word start, so the "u" in "Stadium" cannot hit.
  -- A birth year is the leading whole word only, and only 2000-2099: "2013 Boys"
  -- counts, "Stadium 2000 League" and "1999 Boys" do not.
  select case
    when p_category is null then false
    when p_category ~* '(youth|junior|kids|mini|cadet|براعم|ناشئين|شباب)' then true
    when under_age.n is not null and under_age.n <= 18 then true
    when u_age.n is not null and u_age.n <= 18 then true
    when birth_year.n is not null and birth_year.n between 2000 and 2099 then true
    when taht_age.n is not null and taht_age.n <= 18 then true
    else false
  end
  from (select substring(p_category from '(?i)\munder\s*-?\s*([0-9]{1,2})\M')::integer as n) under_age,
       (select substring(p_category from '(?i)\mu\s*-?\s*([0-9]{1,2})\M')::integer as n) u_age,
       (select substring(p_category from '^\s*\m([0-9]{4})\M')::integer as n) birth_year,
       (select substring(p_category from 'تحت\s*-?\s*([0-9]{1,2})\M')::integer as n) taht_age;
$$;

alter table public.club_squads
  add column if not exists is_youth boolean not null default true;

update public.club_squads set is_youth = private.is_youth_category(category);

create or replace function public.club_match_page(p_match uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_m     public.club_matches;
  v_org   public.organizations;
  v_full  boolean;
  v_youth boolean;
begin
  select * into v_m from public.club_matches where id = p_match;
  if not found then return null; end if;
  select * into v_org from public.organizations where id = v_m.organization_id;
  v_full := private.org_can(v_m.organization_id, 'member');
  select is_youth into v_youth from public.club_squads
  where id = v_m.squad_id;
  if v_youth is null then
    v_youth := private.is_youth_category(v_m.category);
  end if;

  return jsonb_build_object(
    'match', private.club_match_json(v_m),
    'organization', jsonb_build_object('id', v_org.id, 'name', v_org.name, 'logo_url', v_org.logo_url,
                                       'is_verified', v_org.is_verified),
    'can_score', private.org_can(v_m.organization_id, 'score'),
    'can_edit', private.org_can(v_m.organization_id, 'content'),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'minute', e.minute, 'kind', e.kind, 'side', e.side, 'points', e.points,
        'detail', e.detail, 'created_at', e.created_at,
        'player_name', case
            when e.player_name is null then null
            when v_full then e.player_name
            when e.squad_member_id is not null then
              (select private.club_member_json(sm, v_youth, false) ->> 'display_name'
               from public.club_squad_members sm where sm.id = e.squad_member_id)
            when v_youth then private.short_person_name(e.player_name)
            else e.player_name end,
        'player_user_id', (select private.club_member_json(sm, v_youth, v_full) ->> 'user_id'
                           from public.club_squad_members sm where sm.id = e.squad_member_id)
      ) order by e.minute nulls last, e.created_at)
      from public.club_match_events e where e.match_id = p_match), '[]'::jsonb),
    'lineup', case when private.org_can(v_m.organization_id, 'score') and v_m.squad_id is not null then
      coalesce((select jsonb_agg(jsonb_build_object('id', sm.id, 'display_name', sm.display_name,
                                                    'shirt_number', sm.shirt_number)
                                 order by sm.shirt_number nulls last, sm.display_name)
                from public.club_squad_members sm
                where sm.squad_id = v_m.squad_id and sm.kind = 'player'), '[]'::jsonb)
      else null end
  );
end;
$$;

create or replace function public.club_squads_page(p_org uuid, p_season uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_full   boolean := private.org_can(p_org, 'member');
  v_season uuid;
begin
  v_season := coalesce(p_season,
    (select id from public.club_seasons where organization_id = p_org and is_current limit 1),
    (select id from public.club_seasons where organization_id = p_org order by created_at desc limit 1));

  return jsonb_build_object(
    'can_edit', private.org_can(p_org, 'content'),
    'season_id', v_season,
    'seasons', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'label', s.label, 'is_current', s.is_current)
                                          order by s.is_current desc, s.label desc)
                         from public.club_seasons s where s.organization_id = p_org), '[]'::jsonb),
    'squads', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'sport', q.sport, 'category', q.category, 'name', q.name,
        'is_youth', q.is_youth,
        'players', coalesce((select jsonb_agg(private.club_member_json(m, q.is_youth, v_full)
                                              order by m.sort, m.shirt_number nulls last, m.display_name)
                             from public.club_squad_members m where m.squad_id = q.id and m.kind = 'player'), '[]'::jsonb),
        'staff', coalesce((select jsonb_agg(private.club_member_json(m, q.is_youth, v_full)
                                            order by case m.staff_role when 'head_coach' then 0 when 'assistant_coach' then 1 else 2 end, m.sort)
                           from public.club_squad_members m where m.squad_id = q.id and m.kind = 'staff'), '[]'::jsonb)
      ) order by q.sport, q.category)
      from public.club_squads q
      where q.organization_id = p_org and q.season_id = v_season), '[]'::jsonb)
  );
end;
$$;
