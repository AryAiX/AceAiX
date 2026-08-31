-- Two nullable, additive columns for the Requests page:
-- request_type labels what kind of assessment a clearance request is for;
-- clearance_id links an uploaded medical record back to the specific
-- request it was uploaded against.

ALTER TABLE medical_clearances
  ADD COLUMN IF NOT EXISTS request_type varchar;

ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS clearance_id uuid REFERENCES medical_clearances(id);