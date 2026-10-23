-- QA-107. Sending club papers with no licence attached still looked sent
-- in the app, but no verification_requests row was created, so no admin
-- ever saw it. Refuse the submit unless a document path is given.

create or replace function public.submit_club_verification(p_org uuid, p jsonb)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_doc    text := private.club_text(p, 'document_path', 500);
  v_status text;
  v_docs   jsonb;
begin
  perform private.require_org(p_org, 'manage');
  if coalesce((p ->> 'accept_terms')::boolean, false) is not true then
    raise exception 'Please accept the Terms and the Child Safety policy'
      using errcode = '22023', hint = 'club_terms_required';
  end if;
  if length(coalesce(private.club_text(p, 'contact_person_name', 120), '')) < 2 then
    raise exception 'Tell us who is filling this in' using errcode = '22023', hint = 'club_contact_person_required';
  end if;
  if v_doc is null then
    raise exception 'Attach your licence or registration document'
      using errcode = '22023', hint = 'club_document_required';
  end if;
  if v_doc is not null and split_part(v_doc, '/', 1) <> auth.uid()::text then
    raise exception 'Upload the document first' using errcode = '22023', hint = 'club_document_missing';
  end if;

  insert into public.organization_verification
    (organization_id, license_number, document_path, contact_person_name, contact_person_title,
     terms_accepted_at, submitted_by, submitted_at, updated_at)
  values (
    p_org, private.club_text(p, 'license_number', 80), v_doc,
    private.club_text(p, 'contact_person_name', 120), private.club_text(p, 'contact_person_title', 120),
    now(), auth.uid(), case when v_doc is not null then now() end, now()
  )
  on conflict (organization_id) do update set
    license_number       = coalesce(excluded.license_number, organization_verification.license_number),
    document_path        = coalesce(excluded.document_path, organization_verification.document_path),
    contact_person_name  = excluded.contact_person_name,
    contact_person_title = excluded.contact_person_title,
    terms_accepted_at    = now(),
    submitted_by         = auth.uid(),
    submitted_at         = coalesce(excluded.submitted_at, organization_verification.submitted_at),
    updated_at           = now();

  /* Into the admin portal's existing queue (web/ → Verification). One open
     request per page; a resubmission refreshes it. */
  if v_doc is not null then
    v_docs := jsonb_build_array(jsonb_build_object(
      'name', 'Trade licence' || coalesce(' ' || private.club_text(p, 'license_number', 80), '')
              || ' — ' || private.club_text(p, 'contact_person_name', 120)
              || coalesce(' (' || private.club_text(p, 'contact_person_title', 120) || ')', ''),
      'bucket', 'club-documents', 'path', v_doc,
      'license_number', private.club_text(p, 'license_number', 80)));
    update public.verification_requests
       set documents = v_docs, subject_user_id = auth.uid(), updated_at = now()
     where organization_id = p_org and status in ('pending', 'more_info');
    if not found then
      insert into public.verification_requests (subject_user_id, organization_id, type, status, documents)
      values (auth.uid(), p_org, 'club', 'pending', v_docs);
    else
      update public.verification_requests set status = 'pending'
       where organization_id = p_org and status = 'more_info';
    end if;
  end if;

  select verification_status::text into v_status from public.organizations where id = p_org;
  if v_status in ('rejected', 'more_info', 'expired') then
    perform set_config('aceaix.club_resubmit', 'on', true);
    update public.organizations set verification_status = 'pending', is_verified = false where id = p_org;
    perform set_config('aceaix.club_resubmit', 'off', true);
    v_status := 'pending';
  end if;
  return v_status;
end;
$$;
