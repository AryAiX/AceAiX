-- ============================================================
-- Repair: objects that existed only in the hosted database
--
-- Several trigger functions and one table were created directly against the
-- hosted project and never written into the migration chain. As a result
-- `supabase db reset` failed at 20260826000001, which pins their search_path
-- — so no fresh environment (local, staging, CI) could be stood up from this
-- repository at all.
--
-- Everything here is `create ... if not exists` / `create or replace`, so on
-- the existing production database this migration is a no-op.
-- ============================================================

-- ------------------------------------------------------------
-- Split-name columns (also asserted later by 20260830000007)
-- ------------------------------------------------------------
alter table public.user_profiles
  add column if not exists first_name  text,
  add column if not exists middle_name text,
  add column if not exists last_name   text;

create or replace function public.sync_user_full_name()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.first_name is not null or new.middle_name is not null or new.last_name is not null then
    new.full_name := regexp_replace(
      trim(both ' ' from
        coalesce(new.first_name, '') || ' ' ||
        coalesce(new.middle_name, '') || ' ' ||
        coalesce(new.last_name, '')),
      '\s+', ' ', 'g');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_sync_full_name on public.user_profiles;
create trigger trg_user_profiles_sync_full_name
before insert or update of first_name, middle_name, last_name on public.user_profiles
for each row execute function public.sync_user_full_name();

-- ------------------------------------------------------------
-- Denormalised club name follows the linked organisation
-- ------------------------------------------------------------
create or replace function public.sync_current_club_name()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.current_club_id is not null then
    select o.name into new.current_club
    from public.organizations o
    where o.id = new.current_club_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_athlete_profiles_sync_club_name on public.athlete_profiles;
create trigger trg_athlete_profiles_sync_club_name
before insert or update of current_club_id on public.athlete_profiles
for each row execute function public.sync_current_club_name();

-- ------------------------------------------------------------
-- notifications.read mirrors notifications.is_read
-- (0012 added `read` for the mobile client; both must stay in step)
-- ------------------------------------------------------------
create or replace function private.sync_notification_read_columns()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    new.read := coalesce(new.read, new.is_read, false);
    new.is_read := new.read;
  else
    if new.is_read is distinct from old.is_read then
      new.read := new.is_read;
    elsif new.read is distinct from old.read then
      new.is_read := new.read;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifications_sync_read on public.notifications;
create trigger trg_notifications_sync_read
before insert or update on public.notifications
for each row execute function private.sync_notification_read_columns();

-- ------------------------------------------------------------
-- Media likes (referenced by toggle_media_like in 20260826000003)
-- ------------------------------------------------------------
alter table public.athlete_media
  add column if not exists likes_count integer not null default 0;

create table if not exists public.media_likes (
  media_id   uuid not null references public.athlete_media(id) on delete cascade,
  user_id    uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (media_id, user_id)
);
alter table public.media_likes enable row level security;
create index if not exists idx_media_likes_media on public.media_likes(media_id);

drop policy if exists media_likes_select on public.media_likes;
create policy media_likes_select on public.media_likes
  for select to authenticated using (true);

drop policy if exists media_likes_insert on public.media_likes;
create policy media_likes_insert on public.media_likes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists media_likes_delete on public.media_likes;
create policy media_likes_delete on public.media_likes
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.sync_media_likes_count()
returns trigger
language plpgsql
security definer
as $$
declare v_media uuid := coalesce(new.media_id, old.media_id);
begin
  update public.athlete_media
  set likes_count = (select count(*) from public.media_likes where media_id = v_media)
  where id = v_media;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_media_likes_sync_count on public.media_likes;
create trigger trg_media_likes_sync_count
after insert or delete on public.media_likes
for each row execute function public.sync_media_likes_count();

grant select, insert, delete on table public.media_likes to authenticated;
grant select on table public.media_likes to anon;
