-- QA-70. A club verification decision produced two notifications for the
-- same event. The status update fires private.sync_club_verification_decision,
-- which notifies every active owner and manager, and admin_decide_verification
-- also called private.admin_notice. That system row still says "Your account
-- is verified", which is stale since QA-68: approving an organisation does
-- not verify the person. The notice now goes out only for a person request
-- (subject_user_id set and organization_id null). An organisation request is
-- organisation business, and the club team is already notified by the trigger.

create or replace function public.admin_decide_verification(
  p_request uuid,
  p_decision text,          -- approved | rejected | more_info
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_old public.verification_requests; v_new public.verification_requests;
begin
  perform private.require_admin();
  if p_decision not in ('approved','rejected','more_info') then
    raise exception 'Unknown decision' using errcode = '22023';
  end if;
  if p_decision in ('rejected','more_info') and coalesce(btrim(p_reason), '') = '' then
    raise exception 'Give the applicant a reason' using errcode = '22023';
  end if;

  select * into v_old from public.verification_requests where id = p_request for update;
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
  if v_old.subject_user_id = auth.uid()
     or (v_old.organization_id is not null and exists (
           select 1 from public.organization_members om
            where om.organization_id = v_old.organization_id and om.user_id = auth.uid())) then
    raise exception 'You cannot decide your own verification' using errcode = '42501';
  end if;

  update public.verification_requests
     set status = p_decision::public.verification_status,
         decision_reason = nullif(btrim(coalesce(p_reason, '')), ''),
         reviewed_by = auth.uid()
   where id = p_request
  returning * into v_new;

  if p_decision = 'approved' then
    if v_new.subject_user_id is not null and v_new.organization_id is null then
      update public.user_profiles set is_verified = true where id = v_new.subject_user_id;
    end if;
    if v_new.organization_id is not null then
      update public.organizations set is_verified = true, verification_status = 'approved'
       where id = v_new.organization_id;
    end if;
  end if;

  if v_new.subject_user_id is not null and v_new.organization_id is null then
    perform private.admin_notice(v_new.subject_user_id,
      case p_decision
        when 'approved'  then 'Your account is verified'
        when 'rejected'  then 'Verification not approved'
        else 'We need a little more information' end,
      case p_decision
        when 'approved' then 'Your profile now shows the verified badge.'
        else p_reason end,
      jsonb_build_object('verification_request_id', p_request, 'decision', p_decision));
  end if;

  perform private.admin_audit('verification.' || p_decision, 'verification_requests', p_request,
                              to_jsonb(v_old), to_jsonb(v_new));
end;
$$;
