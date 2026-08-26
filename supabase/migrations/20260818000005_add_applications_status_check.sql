ALTER TABLE applications
ADD CONSTRAINT applications_status_check
CHECK (status IN ('applied', 'viewed', 'shortlisted', 'trial_offered', 'accepted', 'not_selected'));