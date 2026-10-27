import { inviteCodeFromPath } from '@/lib/invites/code';
import { savePendingInvite } from '@/lib/api.invites';
import { supabase } from '@/lib/supabase';

/**
 * Rewrites links the operating system hands the app before the router sees them.
 *
 * Invite links are `https://aceaix.com/app/i/<code>` (the `/app` prefix is what
 * the universal-link and Android intent configuration claim). The code is kept
 * only when nobody is signed in, or the signed-in profile has not finished
 * onboarding. The link opens the landing screen at `/i/<code>`.
 */
async function mayStorePendingInvite(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return false;
    const userId = data.session?.user?.id;
    if (!userId) return true;
    const { data: row, error: profileError } = await supabase
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) return false;
    if (!row) return true;
    return row.onboarding_completed === false;
  } catch {
    return false;
  }
}

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const code = inviteCodeFromPath(path);
    if (code) {
      void mayStorePendingInvite()
        .then((keep) => {
          if (keep) return savePendingInvite(code);
        })
        .catch(() => {});
      return `/i/${code}`;
    }
  } catch {
    // Never block an incoming link on our own bookkeeping.
  }
  return path;
}
