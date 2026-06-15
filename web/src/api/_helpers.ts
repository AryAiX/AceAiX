import { supabase } from '../lib/supabase';

export { supabase };

/** Unwrap a Supabase response, throwing on error (for use in react-query queryFns). */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const USER_FIELDS =
  'id, role, full_name, avatar_url, bio, city, country, is_verified, subscription_tier, created_at, updated_at';
