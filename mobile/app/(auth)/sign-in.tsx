import React, { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, Input, Screen, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { Routes } from '@/lib/routes';
import { toFriendlyError } from '@/lib/errors';
import { isValidEmail } from '@/components/onboarding/Shared';

export default function SignInScreen() {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const { signIn } = useAuth();

  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextEmailError = !email.trim()
      ? t('auth.emailRequired')
      : isValidEmail(email)
        ? null
        : t('auth.emailInvalid');
    const nextPasswordError = password.length === 0 ? t('auth.passwordRequired') : null;

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    return !nextEmailError && !nextPasswordError;
  };

  const submit = async () => {
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      await signIn(email, password);
      // The gate in app/_layout.tsx takes it from here.
    } catch (err) {
      const friendly = toFriendlyError(err);
      const message = friendly.message;

      // An unconfirmed address is a dead end on this screen — send them to the
      // one place where they can do something about it. The test is on Supabase's
      // own English error, not on `message`, which is in the reader's language.
      const raw = (friendly.raw as { message?: string } | null | undefined)?.message ?? '';
      if (raw.toLowerCase().includes('email not confirmed')) {
        toast.error(message);
        router.push({
          pathname: Routes.auth.checkEmail,
          params: { email: email.trim().toLowerCase() },
        });
        return;
      }

      setPasswordError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      keyboardAvoiding
      header={
        <Header
          back
          onBack={() => (router.canGoBack() ? router.back() : router.replace(Routes.auth.welcome))}
        />
      }
      testID="sign-in-screen"
    >
      <View style={{ gap: spacing.xs, marginBottom: spacing.xxl }}>
        <Text variant="title" accessibilityRole="header">
          {t('auth.signIn.title')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('auth.signIn.subtitle')}
        </Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Input
          label={t('auth.emailLabel')}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (emailError) setEmailError(null);
          }}
          error={emailError}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          icon={<Mail size={18} color={colors.textMuted} />}
          testID="sign-in-email"
        />

        <View style={{ gap: spacing.sm }}>
          <Input
            ref={passwordRef}
            label={t('auth.passwordLabel')}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError(null);
            }}
            error={passwordError}
            placeholder={t('auth.signIn.passwordPlaceholder')}
            password
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            icon={<Lock size={18} color={colors.textMuted} />}
            testID="sign-in-password"
          />

          <Pressable
            onPress={() => router.push(Routes.auth.forgotPassword)}
            accessibilityRole="link"
            accessibilityLabel={t('auth.signIn.forgotA11y')}
            hitSlop={8}
            style={({ pressed }) => ({
              alignSelf: 'flex-end',
              minHeight: theme.hit.min,
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
            testID="sign-in-forgot"
          >
            <Text variant="captionStrong" tone="primary">
              {t('auth.signIn.forgot')}
            </Text>
          </Pressable>
        </View>

        <Button
          label={t('auth.signIn.submit')}
          size="lg"
          fullWidth
          loading={submitting}
          onPress={submit}
          testID="sign-in-submit"
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.xs,
          marginTop: spacing.xxl,
        }}
      >
        <Text variant="caption" tone="muted">
          {t('auth.signIn.newHere', { app: t('common.appName') })}
        </Text>
        <Pressable
          onPress={() => router.replace(Routes.auth.signUp)}
          accessibilityRole="link"
          accessibilityLabel={t('auth.signIn.createAccount')}
          hitSlop={8}
          style={({ pressed }) => ({
            minHeight: theme.hit.min,
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
          testID="sign-in-create-account"
        >
          <Text variant="captionStrong" tone="primary">
            {t('auth.signIn.createAccount')}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
