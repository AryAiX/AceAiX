create or replace function public.sync_current_club_name()
returns trigger
language plpgsql
as $$
declare
  org_name text;
begin
  if new.current_club_id is not null then
    select name into org_name from public.organizations where id = new.current_club_id;
    if org_name is not null then
      new.current_club := org_name;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_current_club_name on public.athlete_profiles;

create trigger trg_sync_current_club_name
before insert or update of current_club_id on public.athlete_profiles
for each row
execute function public.sync_current_club_name();