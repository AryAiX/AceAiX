import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, MailCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Header, Input, Screen, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { Routes } from '@/lib/routes';
import { errorMessage } from '@/lib/errors';
import { isValidEmail } from '@/components/onboarding/Shared';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (sending) return;

    const nextError = !email.trim()
      ? t('auth.emailRequired')
      : isValidEmail(email)
        ? null
        : t('auth.emailInvalid');
    setError(nextError);
    if (nextError) return;

    setSending(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace(Routes.auth.signIn));

  if (sent) {
    return (
      <Screen header={<Header back onBack={back} />} testID="forgot-password-sent">
        <View style={{ gap: spacing.xl, paddingTop: spacing.xl }}>
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
              {t('auth.forgotPassword.sentBody')}
            </Text>
          </View>

          <Card tone="alt">
            <Text variant="overline" tone="muted">
              {t('auth.sentTo')}
            </Text>
            <Text variant="bodyStrong" selectable style={{ marginTop: spacing.xs }}>
              {email.trim().toLowerCase()}
            </Text>
          </Card>

          <Button
            label={t('auth.backToSignIn')}
            size="lg"
            fullWidth
            onPress={() => router.replace(Routes.auth.signIn)}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen keyboardAvoiding header={<Header back onBack={back} />} testID="forgot-password-screen">
      <View style={{ gap: spacing.xs, marginBottom: spacing.xxl }}>
        <Text variant="title" accessibilityRole="header">
          {t('auth.forgotPassword.title')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('auth.forgotPassword.subtitle')}
        </Text>
      </View>

      <View style={{ gap: spacing.xl }}>
        <Input
          label={t('auth.emailLabel')}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError(null);
          }}
          error={error}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={submit}
          icon={<Mail size={18} color={colors.textMuted} />}
          testID="forgot-password-email"
        />

        <Button
          label={t('auth.forgotPassword.submit')}
          size="lg"
          fullWidth
          loading={sending}
          onPress={submit}
          testID="forgot-password-submit"
        />
      </View>
    </Screen>
  );
}
