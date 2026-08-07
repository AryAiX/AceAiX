create table if not exists saved_opportunities (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athlete_profiles(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (athlete_id, opportunity_id)
);

alter table saved_opportunities enable row level security;

create policy so_all on saved_opportunities for all
  to authenticated
  using (private.owns_athlete(athlete_id) or private.is_admin())
  with check (private.owns_athlete(athlete_id) or private.is_admin());

NOTIFY pgrst, 'reload schema';