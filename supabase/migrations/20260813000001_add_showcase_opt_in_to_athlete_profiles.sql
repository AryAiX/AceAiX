alter table athlete_profiles
add column if not exists showcase_opt_in boolean not null default false;

create policy perf_records_showcase_select
on performance_records
for select
to authenticated
using (
  exists (
    select 1 from athlete_profiles ap
    where ap.user_id = performance_records.athlete_id
    and ap.showcase_opt_in = true
  )
);