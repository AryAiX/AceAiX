import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BadgeCheck,
  Download,
  KeyRound,
  Mail,
  Trash2,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Badge,
  Button,
  Header,
  Input,
  Screen,
  Sheet,
  useToast,
} from '@/components/ui';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsGroup';
import { InfoNote } from '@/components/settings/Notes';
import { useAuth } from '@/providers/AuthProvider';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import {
  getMyVerificationRequest,
  requestVerification,
  shareDataExport,
  writeMyDataExport,
  type VerificationRequest,
} from '@/lib/api.settings';
import { errorMessage } from '@/lib/errors';
import { fullDate } from '@/lib/format';
import { COMPANY } from '@/lib/legal';
import { Routes } from '@/lib/routes';

const MIN_PASSWORD = 8;

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function verificationSummary(
  t: Translate,
  request: VerificationRequest | null,
  isVerified: boolean,
): { value: string; subtitle?: string; tappable: boolean } {
  if (isVerified) {
    return {
      value: t('common.verified'),
      subtitle: t('settings.verificationCheckedSubtitle'),
      tappable: false,
    };
  }
  if (!request) {
    return { value: '', subtitle: t('settings.verificationAskSubtitle'), tappable: true };
  }
  switch (request.status) {
    case 'pending':
      return {
        value: t('settings.verificationInReview'),
        subtitle: t('settings.verificationSentOn', { date: fullDate(request.created_at) }),
        tappable: false,
      };
    case 'approved':
      return {
        value: t('settings.verificationApproved'),
        subtitle: t('settings.verificationApprovedSubtitle'),
        tappable: false,
      };
    case 'rejected':
      return {
        value: t('settings.verificationRejected'),
        subtitle: request.decision_reason ?? t('settings.verificationRejectedSubtitle'),
        tappable: true,
      };
    default:
      // An unknown status is a database value; showing it raw beats guessing.
      return { value: request.status, tappable: false };
  }
}

export default function AccountSettingsScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { user, profile, updatePassword, signIn } = useAuth();

  const verification = useAsync(getMyVerificationRequest, [], { refetchOnFocus: true });

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  const [requesting, setRequesting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const email = user?.email ?? '';
  const status = verificationSummary(t, verification.data, !!profile?.is_verified);

  const closePasswordSheet = useCallback(() => {
    setPasswordOpen(false);
    setCurrent('');
    setNext('');
    setConfirm('');
    setPasswordError(null);
  }, []);

  const submitPassword = useCallback(async () => {
    setPasswordError(null);

    if (next.length < MIN_PASSWORD) {
      setPasswordError(t('settings.passwordTooShort', { count: MIN_PASSWORD }));
      return;
    }
    if (next !== confirm) {
      setPasswordError(t('settings.passwordsDoNotMatch'));
      return;
    }
    if (next === current) {
      setPasswordError(t('settings.passwordUnchanged'));
      return;
    }

    setChanging(true);
    try {
      // Prove the person at the keyboard is the account holder before the
      // password changes — Supabase does not ask for the old one.
      await signIn(email, current);
    } catch {
      setChanging(false);
      setPasswordError(t('settings.passwordCurrentWrong'));
      return;
    }

    try {
      await updatePassword(next);
      closePasswordSheet();
      toast.success(t('settings.passwordChanged'));
    } catch (err) {
      setPasswordError(errorMessage(err));
    } finally {
      setChanging(false);
    }
  }, [next, confirm, current, email, signIn, updatePassword, closePasswordSheet, toast, t]);

  const askForVerification = useCallback(async () => {
    setRequesting(true);
    try {
      const created = await requestVerification(profile?.role);
      verification.mutate(() => created);
      toast.success(t('settings.verificationRequestSent'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRequesting(false);
    }
  }, [profile?.role, verification, toast, t]);

  const downloadMyData = useCallback(async () => {
    setExporting(true);
    try {
      const file = await writeMyDataExport();
      const shared = await shareDataExport(file);
      if (shared) toast.success(t('settings.exportSaved', { name: file.name }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  }, [toast, t]);

  return (
    <Screen
      header={<Header title={t('settings.accountTitle')} back bordered />}
      testID="settings-account"
    >
      <View style={{ paddingTop: spacing.lg }}>
        <SettingsGroup
          title={t('settings.sectionSignIn')}
          footer={t('settings.signInFooter', { email: COMPANY.supportEmail })}
        >
          <SettingsRow
            title={t('settings.emailLabel')}
            subtitle={email || t('settings.notSignedIn')}
            icon={<Mail size={17} color={colors.text} />}
            right={
              profile?.is_verified ? (
                <Badge label={t('common.verified')} tone="info" />
              ) : undefined
            }
          />
          <SettingsRow
            title={t('settings.changePassword')}
            icon={<KeyRound size={17} color={colors.text} />}
            onPress={() => setPasswordOpen(true)}
            testID="change-password"
          />
        </SettingsGroup>

        <SettingsGroup
          title={t('settings.sectionVerification')}
          footer={t('safety.verificationFooter')}
        >
          <SettingsRow
            title={
              status.tappable
                ? t('settings.requestVerification')
                : t('settings.verificationTitle')
            }
            subtitle={status.subtitle}
            value={status.value || undefined}
            icon={<BadgeCheck size={17} color={colors.info} />}
            iconTone="info"
            onPress={status.tappable && !requesting ? askForVerification : undefined}
            disabled={requesting}
            testID="request-verification"
          />
        </SettingsGroup>

        <SettingsGroup title={t('settings.sectionYourData')} footer={t('settings.dataFooter')}>
          <SettingsRow
            title={exporting ? t('settings.preparingFile') : t('settings.downloadMyData')}
            subtitle={t('settings.downloadSubtitle')}
            icon={<Download size={17} color={colors.text} />}
            onPress={exporting ? undefined : downloadMyData}
            disabled={exporting}
            testID="download-my-data"
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            title={t('settings.deleteAccountTitle')}
            subtitle={t('settings.deleteAccountSubtitle')}
            icon={<Trash2 size={17} color={colors.danger} />}
            destructive
            onPress={() => router.push(Routes.deleteAccount)}
            testID="go-delete-account"
          />
        </SettingsGroup>
      </View>

      <Sheet
        visible={passwordOpen}
        onClose={closePasswordSheet}
        title={t('settings.changePassword')}
        subtitle={t('settings.changePasswordSubtitle')}
        footer={
          <View style={{ gap: spacing.sm }}>
            <Button
              label={t('settings.changePassword')}
              fullWidth
              loading={changing}
              onPress={submitPassword}
              testID="submit-password"
            />
            <Button
              label={t('common.cancel')}
              variant="ghost"
              fullWidth
              onPress={closePasswordSheet}
            />
          </View>
        }
      >
        <View style={{ gap: spacing.md }}>
          <Input
            label={t('settings.currentPassword')}
            password
            value={current}
            onChangeText={setCurrent}
            autoComplete="current-password"
            textContentType="password"
            placeholder={t('settings.currentPasswordPlaceholder')}
          />
          <Input
            label={t('settings.newPassword')}
            password
            value={next}
            onChangeText={setNext}
            autoComplete="new-password"
            textContentType="newPassword"
            hint={t('settings.newPasswordHint', { count: MIN_PASSWORD })}
            placeholder={t('settings.newPasswordPlaceholder')}
          />
          <Input
            label={t('settings.confirmNewPassword')}
            password
            value={confirm}
            onChangeText={setConfirm}
            autoComplete="new-password"
            textContentType="newPassword"
            error={passwordError}
            placeholder={t('settings.confirmNewPasswordPlaceholder')}
          />
          <InfoNote tone="neutral" icon="lock">
            {t('settings.passwordPhishingNote')}
          </InfoNote>
        </View>
      </Sheet>
    </Screen>
  );
}
