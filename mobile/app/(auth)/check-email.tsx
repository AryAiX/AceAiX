import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MailCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Screen, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { errorMessage } from '@/lib/errors';
import { resendSignupConfirmation } from '@/lib/api.auth';

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * The account exists but the address has not been confirmed yet.
 *
 * There is no way forward from here inside the app, so the screen's whole job
 * is to say that clearly and give two honest options: send it again, or go back
 * and sign in once the link has been clicked.
 */
export default function CheckEmailScreen() {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;
  const router = useRouter();
  const toast = useToast();

  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // One shared countdown: it starts on arrival (the first mail was just sent)
  // and restarts after every resend.
  useEffect(() => {
    timer.current = setInterval(() => {
      setCooldown((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const resend = async () => {
    if (sending || cooldown > 0 || !email) return;
    setSending(true);
    try {
      await resendSignupConfirmation(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(t('auth.checkEmail.resendSuccess'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen testID="check-email-screen">
      <View style={{ paddingTop: spacing.giant, gap: spacing.xl }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radii.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primarySoft,
          }}
        >
          <MailCheck size={32} color={colors.primary} />
        </View>

        <View style={{ gap: spacing.md }}>
          <Text variant="title" accessibilityRole="header">
            {t('auth.checkYourEmail')}
          </Text>
          <Text variant="body" tone="secondary">
            {t('auth.checkEmail.body')}
          </Text>
        </View>

        {email ? (
          <Card tone="alt">
            <Text variant="overline" tone="muted">
              {t('auth.sentTo')}
            </Text>
            <Text variant="bodyStrong" selectable style={{ marginTop: spacing.xs }}>
              {email}
            </Text>
          </Card>
        ) : null}

        <Text variant="caption" tone="muted">
          {t('auth.checkEmail.spamHint')}
        </Text>

        <View style={{ gap: spacing.md }}>
          <Button
            label={
              cooldown > 0
                ? t('auth.checkEmail.resendCountdown', { count: cooldown })
                : t('auth.checkEmail.resend')
            }
            size="lg"
            fullWidth
            variant="secondary"
            disabled={cooldown > 0 || !email}
            loading={sending}
            onPress={resend}
            testID="check-email-resend"
          />
          <Button
            label={t('auth.backToSignIn')}
            variant="ghost"
            fullWidth
            onPress={() => router.replace(Routes.auth.signIn)}
            testID="check-email-sign-in"
          />
        </View>
      </View>
    </Screen>
  );
}
