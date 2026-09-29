import React, { useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { BrandSplash } from '@/components/common/BrandSplash';
import { useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { completeEmailConfirmation } from '@/lib/api.auth';
import { Routes } from '@/lib/routes';

/**
 * Entry route. The gate in `_layout.tsx` decides where to send the person
 * once the session and profile have loaded; this screen is just the moment
 * in between.
 *
 * It was a spinner on an empty page. The native splash has just shown the
 * logo, so a spinner reads as the app having lost it — this holds the same
 * logo instead, and the launch looks like one screen rather than three.
 *
 * It is also where a tapped confirmation e-mail arrives: Supabase sends the
 * person back to `aceaix://?code=…`. Exchanging that code signs them in, and
 * the gate then carries them into onboarding. Without this they landed on the
 * welcome screen and had to type the password they had just chosen.
 */
export default function Index() {
  const params = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const handled = useRef<string | null>(null);

  const code = typeof params.code === 'string' ? params.code : null;

  useEffect(() => {
    if (!code || handled.current === code) return;
    handled.current = code;
    completeEmailConfirmation(code).catch(() => {
      // The address is confirmed either way; only the sign-in could not be
      // done from here (typically a different device than the one that
      // signed up). Say so and hand over to the sign-in form.
      toast.success(t('auth.checkEmail.confirmedSignIn'));
      router.replace(Routes.auth.signIn);
    });
  }, [code, router, t, toast]);

  return <BrandSplash testID="entry-splash" />;
}
