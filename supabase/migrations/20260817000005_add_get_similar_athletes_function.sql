create or replace function get_similar_athletes(p_limit int default 5)
returns table (
  athlete_profile_id uuid,
  user_id uuid,
  full_name varchar,
  avatar_url varchar,
  "position" varchar,
  sport varchar,
  current_club varchar,
  performance_score int
)
language sql
security definer
set search_path = public
as $$
  select
    ap.id as athlete_profile_id,
    ap.user_id,
    up.full_name,
    up.avatar_url,
    ap.position,
    ap.sport,
    ap.current_club,
    ap.performance_score
  from athlete_profiles ap
  join user_profiles up on up.id = ap.user_id
  where ap.sport = (select sport from athlete_profiles where user_id = auth.uid())
    and ap.user_id != auth.uid()
    and ap.user_id not in (select following_id from follows where follower_id = auth.uid())
    and ap.user_id not in (select blocked_user_id from get_blocked_user_ids())
  order by abs(coalesce(ap.performance_score, 0) - (select coalesce(performance_score, 0) from athlete_profiles where user_id = auth.uid()))
  limit p_limit;
$$;

grant execute on function get_similar_athletes(int) to authenticated;