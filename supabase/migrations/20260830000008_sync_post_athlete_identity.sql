-- Keep the denormalized athlete reference aligned with the authenticated post
-- author so personalized feeds do not depend on a client-supplied identifier.
create or replace function private.sync_post_athlete_identity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select ap.id
    into new.athlete_id
  from public.athlete_profiles ap
  where ap.user_id = new.author_id
  limit 1;
  return new;
end;
$$;

revoke all on function private.sync_post_athlete_identity() from public;
revoke all on function private.sync_post_athlete_identity() from anon;
revoke all on function private.sync_post_athlete_identity() from authenticated;

drop trigger if exists trg_posts_sync_athlete_identity on public.posts;
create trigger trg_posts_sync_athlete_identity
before insert or update of author_id on public.posts
for each row execute function private.sync_post_athlete_identity();

update public.posts p
set athlete_id = ap.id
from public.athlete_profiles ap
where p.author_id = ap.user_id
  and p.athlete_id is distinct from ap.id;
