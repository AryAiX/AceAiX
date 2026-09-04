import React, { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyRound, Lock } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, Input, Screen, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { Routes } from '@/lib/routes';
import { errorMessage } from '@/lib/errors';
import { beginPasswordRecovery } from '@/lib/api.auth';
import {
  MIN_PASSWORD_LENGTH,
  PasswordMeter,
  passwordStrength,
} from '@/components/onboarding/Shared';

/**
 * Reached from the `aceaix://reset-password` link in a recovery e-mail.
 *
 * The recovery token is only exchanged for a session when the new password is
 * submitted, not on mount. The routing gate sends any signed-in account
 * straight into the app, so signing in first would bounce the person off this
 * screen before they had typed anything.
 */
export default function ResetPasswordScreen() {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const { updatePassword } = useAuth();

  const params = useLocalSearchParams<{
    code?: string;
    token_hash?: string;
    access_token?: string;
    refresh_token?: string;
  }>();

  const confirmRef = useRef<TextInput>(null);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const asString = (value: string | string[] | undefined): string | undefined =>
    typeof value === 'string' && value.length > 0 ? value : undefined;

  const submit = async () => {
    if (saving) return;

    const nextPasswordError =
      password.length < MIN_PASSWORD_LENGTH
        ? t('auth.passwordMinLength', { count: MIN_PASSWORD_LENGTH })
        : null;
    const nextConfirmError =
      confirm.length === 0
        ? t('auth.resetPassword.repeatRequired')
        : confirm !== password
          ? t('auth.resetPassword.mismatch')
          : null;

    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);
    if (nextPasswordError || nextConfirmError) return;

    setSaving(true);
    try {
      await beginPasswordRecovery({
        code: asString(params.code),
        token_hash: asString(params.token_hash),
        access_token: asString(params.access_token),
        refresh_token: asString(params.refresh_token),
      });
      await updatePassword(password);
      toast.success(t('auth.resetPassword.success'));
      // The session now exists, so the gate takes over from here.
    } catch (err) {
      const message = errorMessage(err);
      setPasswordError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      keyboardAvoiding
      header={
        <Header
          back
          onBack={() => (router.canGoBack() ? router.back() : router.replace(Routes.auth.signIn))}
        />
      }
      testID="reset-password-screen"
    >
      <View style={{ gap: spacing.xl }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radii.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primarySoft,
          }}
        >
          <KeyRound size={28} color={colors.primary} />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text variant="title" accessibilityRole="header">
            {t('auth.resetPassword.title')}
          </Text>
          <Text variant="body" tone="secondary">
            {t('auth.resetPassword.subtitle')}
          </Text>
        </View>

        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <Input
              label={t('auth.resetPassword.newPasswordLabel')}
              required
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError(null);
              }}
              error={passwordError}
              placeholder={t('auth.passwordLengthPlaceholder', { count: MIN_PASSWORD_LENGTH })}
              password
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              icon={<Lock size={18} color={colors.textMuted} />}
              testID="reset-password-new"
            />
            {password.length > 0 ? <PasswordMeter strength={passwordStrength(password)} /> : null}
          </View>

          <Input
            ref={confirmRef}
            label={t('auth.resetPassword.repeatLabel')}
            required
            value={confirm}
            onChangeText={(text) => {
              setConfirm(text);
              if (confirmError) setConfirmError(null);
            }}
            error={confirmError}
            placeholder={t('auth.resetPassword.repeatPlaceholder')}
            password
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={submit}
            icon={<Lock size={18} color={colors.textMuted} />}
            testID="reset-password-confirm"
          />

          <Button
            label={t('auth.resetPassword.submit')}
            size="lg"
            fullWidth
            loading={saving}
            onPress={submit}
            testID="reset-password-submit"
          />
        </View>

        <Text variant="caption" tone="muted">
          {t('auth.resetPassword.expiredHint')}
        </Text>
      </View>
    </Screen>
  );
}
