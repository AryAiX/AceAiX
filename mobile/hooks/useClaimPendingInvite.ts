import { useEffect, useRef } from 'react';

import { useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { claimInvite, takePendingInvite } from '@/lib/api.invites';

/**
 * Hands a kept invite code to the server once the account exists and has
 * finished onboarding, then forgets it. Mounted once, in the tab layout, which
 * is the first place a fully set-up account lands.
 *
 * Quiet on purpose: an invalid, late or already-used code is dropped without an
 * error — the person did nothing wrong by opening a stale link.
 */
export function useClaimPendingInvite() {
  const { profile } = useAuth();
  const toast = useToast();
  const t = useT();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !profile?.id || !profile.onboarding_completed) return;
    done.current = true;
    (async () => {
      const code = await takePendingInvite();
      if (!code) return;
      try {
        const out = await claimInvite(code);
        const name = out.inviter?.first_name;
        if (name) toast.success(t('invites.claimed', { name }));
      } catch {
        // Stale, unknown or already claimed: nothing to tell.
      }
    })();
  }, [profile?.id, profile?.onboarding_completed, toast, t]);
}
