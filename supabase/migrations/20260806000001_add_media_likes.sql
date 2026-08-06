-- 1. A real record of who liked what
create table if not exists media_likes (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references athlete_media(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (media_id, user_id)
);

-- 2. A running total stored directly on each video, so listing videos stays a simple, fast query
alter table athlete_media add column if not exists likes_count integer not null default 0;

-- 3. Keep that total automatically correct whenever a like is added or removed
create or replace function sync_media_likes_count() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update athlete_media set likes_count = likes_count + 1 where id = new.media_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update athlete_media set likes_count = greatest(likes_count - 1, 0) where id = old.media_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists media_likes_count_trigger on media_likes;
create trigger media_likes_count_trigger
  after insert or delete on media_likes
  for each row execute function sync_media_likes_count();

-- 4. Access rules for the new table
alter table media_likes enable row level security;

create policy ml_select on media_likes for select
  to anon, authenticated
  using (true);

create policy ml_insert on media_likes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy ml_delete on media_likes for delete
  to authenticated
  using (user_id = auth.uid());

-- 5. One safe, atomic way to toggle a like on/off
create or replace function toggle_media_like(p_media_id uuid) returns boolean as $$
declare
  v_liked boolean;
begin
  if exists (select 1 from media_likes where media_id = p_media_id and user_id = auth.uid()) then
    delete from media_likes where media_id = p_media_id and user_id = auth.uid();
    v_liked := false;
  else
    insert into media_likes (media_id, user_id) values (p_media_id, auth.uid());
    v_liked := true;
  end if;
  return v_liked;
end;
$$ language plpgsql;

grant execute on function toggle_media_like(uuid) to authenticated;

NOTIFY pgrst, 'reload schema';