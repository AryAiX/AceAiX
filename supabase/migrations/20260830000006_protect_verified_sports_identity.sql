-- External provider identities determine which real-world stats are synced and
-- therefore must not be editable by the athlete whose profile receives them.
create or replace function private.prevent_sports_identity_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'service_role' or private.is_admin() then
    return new;
  end if;

  if new.football_api_player_id is distinct from old.football_api_player_id then
    raise exception 'Only administrators can assign verified sports identities'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_sports_identity_change() from public;
revoke all on function private.prevent_sports_identity_change() from anon;
revoke all on function private.prevent_sports_identity_change() from authenticated;

drop trigger if exists trg_athlete_profiles_sports_identity_guard
  on public.athlete_profiles;
create trigger trg_athlete_profiles_sports_identity_guard
before update of football_api_player_id on public.athlete_profiles
for each row execute function private.prevent_sports_identity_change();
