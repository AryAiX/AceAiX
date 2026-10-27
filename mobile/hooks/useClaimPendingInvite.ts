import { useEffect, useRef } from 'react';

import { useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { claimInvite, clearPendingInvite, takePendingInvite } from '@/lib/api.invites';

/**
 * Hands a kept invite code to the server once the account exists and has
 * finished onboarding, then forgets it. Mounted once, in the tab layout, which
 * is the first place a fully set-up account lands.
 *
 * An account that finished onboarding before the link was opened never claims
 * it. A failed claim uses the same message as adding the invite by hand.
 */
function timestampMs(value: string): number {
  const direct = Date.parse(value);
  if (Number.isFinite(direct)) return direct;
  return Date.parse(value.replace(/(\.\d{3})\d+/, '$1'));
}

const CLOCK_MARGIN_MS = 15 * 60 * 1000;

/**
 * True when onboarding has no stamp yet, or the stamp is later than the link
 * was stored. A phone clock up to 15 minutes fast still counts as later.
 */
function shouldClaimStoredInvite(completedAt: string | null | undefined, storedAt: number): boolean {
  if (completedAt == null) return true;
  const completedMs = timestampMs(completedAt);
  return Number.isFinite(completedMs) && completedMs > storedAt - CLOCK_MARGIN_MS;
}

export function useClaimPendingInvite() {
  const { profile } = useAuth();
  const toast = useToast();
  const t = useT();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !profile?.id || !profile.onboarding_completed) return;
    done.current = true;
    const userId = profile.id;
    (async () => {
      const pending = await takePendingInvite();
      if (!pending) return;
      let completedAt: string | null = null;
      let readFailed = false;
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('onboarding_completed_at')
          .eq('id', userId)
          .maybeSingle();
        if (error) readFailed = true;
        else if (typeof data?.onboarding_completed_at === 'string') {
          completedAt = data.onboarding_completed_at;
        }
      } catch {
        readFailed = true;
      }
      /* Without the completion date there is no telling whether the link was
         opened before onboarding finished, so the stored code is dropped. */
      if (readFailed || !shouldClaimStoredInvite(completedAt, pending.at)) {
        await clearPendingInvite();
        return;
      }
      try {
        const out = await claimInvite(pending.code);
        const name = out.inviter?.first_name;
        if (name) toast.success(t('invites.claimed', { name }));
      } catch (err) {
        toast.error(errorMessage(err));
      }
    })();
  }, [profile?.id, profile?.onboarding_completed, toast, t]);
}
