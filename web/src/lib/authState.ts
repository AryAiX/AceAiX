export type AuthIdentityTransition = 'same-user' | 'signed-in' | 'switched-user' | 'signed-out';

export function authIdentityTransition(
  currentUserId: string | null,
  nextUserId: string | null,
): AuthIdentityTransition {
  if (currentUserId === nextUserId && nextUserId !== null) return 'same-user';
  if (nextUserId === null) return 'signed-out';
  return currentUserId === null ? 'signed-in' : 'switched-user';
}
