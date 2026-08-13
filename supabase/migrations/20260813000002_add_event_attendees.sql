create table if not exists event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references athlete_events(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table event_attendees enable row level security;

create policy event_attendees_select
on event_attendees
for select
to authenticated
using (
  exists (
    select 1 from athlete_events ae
    where ae.id = event_attendees.event_id
    and ae.is_public = true
  )
  or user_id = auth.uid()
);

create policy event_attendees_insert
on event_attendees
for insert
to authenticated
with check (user_id = auth.uid());

create policy event_attendees_delete
on event_attendees
for delete
to authenticated
using (user_id = auth.uid());