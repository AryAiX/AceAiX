-- Additive INSERT policy on storage.objects for the medical-documents bucket.
-- Allows a verified medical partner with an active medical_partners row and
-- active consent from the athlete to upload into that athlete's folder.
-- Does not modify the existing athlete self-upload policy (med_docs_insert).

create policy med_docs_partner_insert
on storage.objects
for insert
with check (
  bucket_id = 'medical-documents'
  and private.is_verified_partner()
  and private.has_medical_consent(((storage.foldername(name))[1])::uuid)
  and exists (
    select 1 from medical_partners mp
    where mp.user_id = auth.uid()
  )
);