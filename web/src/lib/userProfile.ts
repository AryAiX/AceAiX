import type { UserProfile } from '../types';

/** Joined profiles may be null or malformed when the row is deleted or hidden by RLS. */
export function isUserProfile(value: UserProfile | null | undefined): value is UserProfile {
  return typeof value?.id === 'string' && value.id.length > 0;
}
