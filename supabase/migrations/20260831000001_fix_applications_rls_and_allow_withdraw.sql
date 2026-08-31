begin;

drop policy if exists applications_insert on applications;
drop policy if exists applications_select on applications;

create policy applications_insert on applications
  for insert
  to authenticated
  with check (private.owns_athlete(athlete_id) or private.is_admin());

create policy applications_select on applications
  for select
  to authenticated
  using (private.owns_athlete(athlete_id) or private.is_admin());

create policy applications_withdraw on applications
  for update
  to authenticated
  using (private.owns_athlete(athlete_id))
  with check (private.owns_athlete(athlete_id) and status = 'withdrawn');

commit;