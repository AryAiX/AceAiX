/**
 * Invite codes and links — pure, so they can be tested without a device.
 *
 * A code is 8 characters from an alphabet with no look-alikes (no 0, O, 1 or
 * I): people read them out loud and type them from a screenshot. The server makes
 * them and is the only judge of whether one is real (`referral_claim`).
 */
export const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE = /^[A-HJ-NP-Z2-9]{8}$/;

/** Where invite links point. Universal links on aceaix.com/app/* open the app. */
export const INVITE_HOST = 'https://aceaix.com';

/** Upper-cases and drops spaces and dashes, so "abcd-2345 wxyz" still reads. */
export function normalizeInviteCode(input: string | null | undefined): string {
  return (input ?? '').toUpperCase().replace(/[\s-]/g, '').slice(0, 8);
}

export function isInviteCode(input: string | null | undefined): boolean {
  return CODE.test(input ?? '');
}

export function inviteLink(code: string): string {
  return `${INVITE_HOST}/app/i/${code}`;
}

/**
 * The code in an incoming link or path, or null.
 * Accepts https://aceaix.com/app/i/CODE, aceaix://i/CODE, /app/i/CODE and /i/CODE.
 */
export function inviteCodeFromPath(pathOrUrl: string | null | undefined): string | null {
  const m = (pathOrUrl ?? '').match(/(?:^|\/)(?:app\/)?i\/([A-Za-z0-9-]{8,9})(?:[/?#]|$)/);
  if (!m) return null;
  const code = m[1].replace(/-/g, '').toUpperCase();
  return isInviteCode(code) ? code : null;
}

/** Progress toward the next token, for the ring: 0..1. */
export function tokenProgress(qualified: number, perToken: number): number {
  if (perToken <= 0) return 0;
  return (qualified % perToken) / perToken;
}
