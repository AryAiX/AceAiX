CREATE OR REPLACE FUNCTION public.get_blocked_user_ids()
RETURNS TABLE(blocked_user_id uuid)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql STABLE
AS $$
  SELECT blocked_id FROM user_blocks WHERE blocker_id = auth.uid()
  UNION
  SELECT blocker_id FROM user_blocks WHERE blocked_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_blocked_user_ids() TO authenticated;