begin;

insert into storage.buckets (id, name, public)
values ('medical-documents', 'medical-documents', false)
on conflict (id) do nothing;

create policy med_docs_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'medical-documents'
    and private.owns_athlete((storage.foldername(name))[1]::uuid)
  );

create policy med_docs_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'medical-documents'
    and (
      private.owns_athlete((storage.foldername(name))[1]::uuid)
      or private.has_medical_consent((storage.foldername(name))[1]::uuid)
      or private.is_admin()
    )
  );

create policy med_docs_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'medical-documents'
    and (
      private.owns_athlete((storage.foldername(name))[1]::uuid)
      or private.is_admin()
    )
  );

commit;