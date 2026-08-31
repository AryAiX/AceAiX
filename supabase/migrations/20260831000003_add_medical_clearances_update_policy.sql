-- Adds the missing UPDATE policy on medical_clearances.
-- Mirrors mcl_insert: admin can always update; a verified partner can
-- update only their own issued clearance, and only while the athlete's
-- medical consent is still active.

create policy mcl_update
on medical_clearances
for update
using (
  private.is_admin()
  or (
    private.is_verified_partner()
    and private.has_medical_consent(athlete_id)
    and exists (
      select 1 from medical_partners mp
      where mp.id = medical_clearances.partner_id
        and mp.user_id = auth.uid()
    )
  )
)
with check (
  private.is_admin()
  or (
    private.is_verified_partner()
    and private.has_medical_consent(athlete_id)
    and exists (
      select 1 from medical_partners mp
      where mp.id = medical_clearances.partner_id
        and mp.user_id = auth.uid()
    )
  )
);