-- Opportunity creation is authorized from database state, not mutable JWT
-- user_metadata. The poster must always identify themselves as the creator.

drop policy if exists opp_insert on public.opportunities;

create policy opp_insert on public.opportunities
  for insert to authenticated
  with check (
    created_by_id = auth.uid()
    and (
      private.is_admin()
      or (
        organization_id is null
        and exists (
          select 1
          from public.user_profiles up
          where up.id = auth.uid()
            and up.role in ('coach', 'club', 'scout')
        )
      )
      or (
        organization_id is not null
        and private.is_org_member(
          organization_id,
          array['owner', 'manager', 'scout', 'coach']
        )
      )
    )
  );
