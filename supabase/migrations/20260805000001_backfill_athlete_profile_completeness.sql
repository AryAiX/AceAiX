update athlete_profiles ap
set profile_completeness = round(
  (
    (case when up.full_name is not null and up.full_name <> '' then 1 else 0 end) +
    (case when ap.bio is not null and ap.bio <> '' then 1 else 0 end) +
    (case when ap.nationality is not null and ap.nationality <> '' then 1 else 0 end) +
    (case when ap.sport is not null and ap.sport <> '' then 1 else 0 end) +
    (case when ap.position_primary is not null and ap.position_primary <> '' then 1 else 0 end) +
    (case when ap.current_club is not null and ap.current_club <> '' then 1 else 0 end) +
    (case when ap.height_cm is not null then 1 else 0 end) +
    (case when ap.weight_kg is not null then 1 else 0 end)
  )::numeric / 8 * 100
)
from user_profiles up
where up.id = ap.user_id;