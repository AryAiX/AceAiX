-- Allow a medical partner to read the clearances and records they issued.
-- Previously only the athlete owner, a consented grantee, or an admin could read
-- these rows, so the partner dashboard could never see its own issued data.

create or replace function private.owns_medical_partner(p_partner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.medical_partners mp
    where mp.id = p_partner and mp.user_id = auth.uid()
  );
$$;

drop policy if exists mcl_select on public.medical_clearances;
create policy mcl_select on public.medical_clearances
  for select
  using (
    private.owns_athlete(athlete_id)
    or private.has_medical_consent(athlete_id)
    or private.owns_medical_partner(partner_id)
    or private.is_admin()
  );

drop policy if exists med_select on public.medical_records;
create policy med_select on public.medical_records
  for select
  using (
    private.owns_athlete(athlete_id)
    or private.has_medical_consent(athlete_id)
    or private.owns_medical_partner(partner_id)
    or private.is_admin()
  );
