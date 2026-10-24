import { inviteCodeFromPath } from '@/lib/invites/code';
import { savePendingInvite } from '@/lib/api.invites';

/**
 * Rewrites links the operating system hands the app before the router sees them.
 *
 * Invite links are `https://aceaix.com/app/i/<code>` (the `/app` prefix is what
 * the universal-link and Android intent configuration claim). The code is kept
 * straight away — if the router then sends a signed-out visitor through sign-up
 * and onboarding, the invite still arrives — and the link opens the landing
 * screen at `/i/<code>`.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const code = inviteCodeFromPath(path);
    if (code) {
      savePendingInvite(code).catch(() => {});
      return `/i/${code}`;
    }
  } catch {
    // Never block an incoming link on our own bookkeeping.
  }
  return path;
}
