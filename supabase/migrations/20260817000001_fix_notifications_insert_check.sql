ALTER POLICY ntf_insert ON notifications
WITH CHECK (user_id = auth.uid());