begin;

drop policy if exists mr_write on match_records;

create policy mr_insert on match_records
  for insert
  to authenticated
  with check (private.owns_athlete(athlete_id) or private.is_admin());

create policy mr_update on match_records
  for update
  to authenticated
  using ((private.owns_athlete(athlete_id) and source <> 'verified'::record_source) or private.is_admin())
  with check ((private.owns_athlete(athlete_id) and source <> 'verified'::record_source) or private.is_admin());

create policy mr_delete on match_records
  for delete
  to authenticated
  using ((private.owns_athlete(athlete_id) and source <> 'verified'::record_source) or private.is_admin());

commit;