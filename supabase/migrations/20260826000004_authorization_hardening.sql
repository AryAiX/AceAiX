-- Prevent users from forging verification and paid subscription state.
create or replace function private.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'service_role' or private.is_admin() then
    return new;
  end if;

  if new.is_verified is distinct from old.is_verified
    or new.subscription_tier is distinct from old.subscription_tier then
    raise exception 'Only administrators can change verification or subscription state'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_profiles_privilege_guard on public.user_profiles;
create trigger trg_user_profiles_privilege_guard
before update of is_verified, subscription_tier on public.user_profiles
for each row execute function private.prevent_profile_privilege_escalation();

-- Participants are immutable after a conversation is created.
create or replace function private.prevent_conversation_participant_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role'
    and (
      new.participant_1_id is distinct from old.participant_1_id
      or new.participant_2_id is distinct from old.participant_2_id
    ) then
    raise exception 'Conversation participants cannot be changed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_conversations_participant_guard on public.conversations;
create trigger trg_conversations_participant_guard
before update of participant_1_id, participant_2_id on public.conversations
for each row execute function private.prevent_conversation_participant_change();

-- A partner may append medical data only for an athlete who granted that
-- partner access, and may not impersonate a different issuing partner.
drop policy if exists med_insert on public.medical_records;
create policy med_insert
on public.medical_records for insert
to authenticated
with check (
  private.is_admin()
  or (
    private.is_verified_partner()
    and private.has_medical_consent(athlete_id)
    and exists (
      select 1 from public.medical_partners mp
      where mp.id = partner_id and mp.user_id = auth.uid()
    )
  )
);

drop policy if exists mcl_insert on public.medical_clearances;
create policy mcl_insert
on public.medical_clearances for insert
to authenticated
with check (
  private.is_admin()
  or (
    private.is_verified_partner()
    and private.has_medical_consent(athlete_id)
    and exists (
      select 1 from public.medical_partners mp
      where mp.id = partner_id and mp.user_id = auth.uid()
    )
  )
);

drop policy if exists inj_insert on public.injuries;
create policy inj_insert
on public.injuries for insert
to authenticated
with check (
  private.is_admin()
  or (
    private.is_verified_partner()
    and private.has_medical_consent(athlete_id)
    and exists (
      select 1 from public.medical_partners mp
      where mp.id = partner_id and mp.user_id = auth.uid()
    )
  )
);

-- Audit records shown to administrators may only be attributed to the
-- administrator who submitted them.
drop policy if exists al_insert on public.audit_logs;
create policy al_insert
on public.audit_logs for insert
to authenticated
with check (private.is_admin() and user_id = auth.uid());

-- Storage reads must follow the audience policy of the row that owns the media.
drop policy if exists media_authenticated_read on storage.objects;
create policy media_authenticated_read
on storage.objects for select
to authenticated
using (
  (
    bucket_id in ('posts', 'stories')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  or (
    bucket_id = 'posts'
    and exists (
      select 1
      from public.posts p
      where p.image_url = name
        or exists (
          select 1
          from jsonb_array_elements(coalesce(p.media, '[]'::jsonb)) item
          where item ->> 'url' = name
        )
    )
  )
  or (
    bucket_id = 'stories'
    and exists (
      select 1
      from public.stories s
      where s.media_url = name
    )
  )
);

revoke execute on function private.prevent_profile_privilege_escalation() from public, anon, authenticated;
revoke execute on function private.prevent_conversation_participant_change() from public, anon, authenticated;
