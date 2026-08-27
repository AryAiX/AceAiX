create unique index if not exists medical_consents_unique_active_grant
  on medical_consents (athlete_id, grantee_user_id)
  where status = 'granted' and grantee_user_id is not null;