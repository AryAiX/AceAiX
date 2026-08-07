Create this new file exactly as given.

alter table public.user_profiles
  add column if not exists first_name character varying,
  add column if not exists middle_name character varying,
  add column if not exists last_name character varying;

do $$
declare
  r record;
  parts text[];
  part_count int;
begin
  for r in select id, full_name from public.user_profiles
           where full_name is not null
             and trim(full_name) <> ''
             and first_name is null
  loop
    parts := regexp_split_to_array(trim(r.full_name), '\s+');
    part_count := array_length(parts, 1);

    if part_count = 1 then
      update public.user_profiles
        set first_name = parts[1]
        where id = r.id;
    else
      update public.user_profiles
        set first_name = parts[1],
            last_name = parts[part_count],
            middle_name = case
              when part_count > 2 then array_to_string(parts[2:part_count-1], ' ')
              else null
            end
        where id = r.id;
    end if;
  end loop;
end $$;

create or replace function public.sync_user_full_name()
returns trigger
language plpgsql
as $$
begin
  if new.first_name is not null or new.last_name is not null or new.middle_name is not null then
    new.full_name := trim(regexp_replace(
      coalesce(new.first_name, '') || ' ' || coalesce(new.middle_name, '') || ' ' || coalesce(new.last_name, ''),
      '\s+', ' ', 'g'
    ));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_user_full_name on public.user_profiles;

create trigger trg_sync_user_full_name
before insert or update of first_name, middle_name, last_name on public.user_profiles
for each row
execute function public.sync_user_full_name();