-- applications.athlete_id references user_profiles(id), which equals auth.uid()
-- for the signed-in user — not athlete_profiles(id). private.owns_athlete() checks
-- the latter, which is correct for the ~14 other tables that use it, so that shared
-- function is left untouched. Only the three applications_* policies are corrected
-- here to check athlete_id = auth.uid() directly.

ALTER POLICY applications_select ON public.applications
  USING (athlete_id = auth.uid() OR private.is_admin());

ALTER POLICY applications_insert ON public.applications
  WITH CHECK (athlete_id = auth.uid() OR private.is_admin());

ALTER POLICY applications_withdraw ON public.applications
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid() AND status = 'withdrawn');
