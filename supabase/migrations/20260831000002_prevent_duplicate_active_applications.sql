create unique index if not exists applications_unique_active
  on applications (athlete_id, opportunity_id)
  where status = 'applied';