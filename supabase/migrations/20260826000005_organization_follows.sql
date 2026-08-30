create table if not exists public.organization_follows (
  follower_id uuid not null references public.user_profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, organization_id)
);

alter table public.organization_follows enable row level security;

drop policy if exists organization_follows_select on public.organization_follows;
create policy organization_follows_select
on public.organization_follows for select
to anon, authenticated
using (true);

drop policy if exists organization_follows_insert on public.organization_follows;
create policy organization_follows_insert
on public.organization_follows for insert
to authenticated
with check (follower_id = auth.uid());

drop policy if exists organization_follows_delete on public.organization_follows;
create policy organization_follows_delete
on public.organization_follows for delete
to authenticated
using (follower_id = auth.uid());

create or replace function private.sync_organization_followers_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid := coalesce(new.organization_id, old.organization_id);
begin
  update public.organizations
  set followers_count = (
    select count(*) from public.organization_follows
    where organization_id = v_organization_id
  )
  where id = v_organization_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists organization_follows_sync_count on public.organization_follows;
create trigger organization_follows_sync_count
after insert or delete on public.organization_follows
for each row execute function private.sync_organization_followers_count();

revoke execute on function private.sync_organization_followers_count() from public, anon, authenticated;
grant select on table public.organization_follows to anon;
grant select, insert, delete on table public.organization_follows to authenticated;
