import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import {
  Ban,
  Bell,
  BookOpen,
  Info,
  Languages,
  LifeBuoy,
  LogOut,
  Palette,
  Scale,
  ShieldCheck,
  Target,
  UserCog,
  Users,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { ConfirmSheet, Header, Screen, Text, useToast } from '@/components/ui';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsGroup';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { COMPANY } from '@/lib/legal';

/** "1.0.0 (12)", or just the version when there is no native build number. */
function versionLabel(): string {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber ?? Constants.platform?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode != null
        ? String(Constants.expoConfig.android.versionCode)
        : null;

  return build ? `${version} (${build})` : version;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { profile, isRecruiter, isGuardian, signOut } = useAuth();

  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // A minor needs the consent screen; so does the guardian on the other end.
  const showGuardian = !!profile?.is_minor || isGuardian;

  const iconFor = useCallback(
    (Icon: typeof UserCog, color?: string) => <Icon size={17} color={color ?? colors.text} />,
    [colors.text],
  );

  const contactSupport = useCallback(() => {
    /* The subject and the diagnostic footer stay in English: they are read by
       the support inbox, not by the person writing. */
    const subject = encodeURIComponent('AceAiX support');
    const body = encodeURIComponent(
      `\n\n—\nApp version: ${versionLabel()}\nPlatform: ${Platform.OS}`,
    );
    Linking.openURL(`mailto:${COMPANY.supportEmail}?subject=${subject}&body=${body}`).catch(() => {
      toast.info(t('settings.supportFallback', { email: COMPANY.supportEmail }));
    });
  }, [toast, t]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      setConfirmSignOut(false);
      router.replace(Routes.auth.welcome);
    } finally {
      setSigningOut(false);
    }
  }, [signOut, router]);

  return (
    <Screen
      header={<Header title={t('settings.title')} back bordered />}
      testID="settings-index"
    >
      <View style={{ paddingTop: spacing.lg }}>
        <SettingsGroup title={t('settings.sectionAccount')}>
          <SettingsRow
            title={t('settings.accountTitle')}
            subtitle={t('settings.accountSubtitle')}
            icon={iconFor(UserCog)}
            onPress={() => router.push(Routes.settingsAccount)}
            testID="settings-account"
          />
          <SettingsRow
            title={t('language.settingsTitle')}
            subtitle={t('language.settingsSubtitle')}
            icon={iconFor(Languages)}
            onPress={() => router.push(Routes.settingsLanguage)}
            testID="settings-language-row"
          />
          <SettingsRow
            title={t('settings.appearanceTitle')}
            subtitle={t('settings.appearanceSubtitle')}
            icon={iconFor(Palette)}
            onPress={() => router.push(Routes.settingsAppearance)}
          />
          <SettingsRow
            title={t('settings.notificationsTitle')}
            subtitle={t('settings.notificationsSubtitle')}
            icon={iconFor(Bell)}
            onPress={() => router.push(Routes.settingsNotifications)}
          />
        </SettingsGroup>

        <SettingsGroup title={t('settings.sectionPrivacySafety')}>
          <SettingsRow
            title={t('settings.privacyTitle')}
            subtitle={t('settings.privacySubtitle')}
            icon={iconFor(ShieldCheck)}
            onPress={() => router.push(Routes.settingsPrivacy)}
          />
          <SettingsRow
            title={t('safety.blockedTitle')}
            icon={iconFor(Ban)}
            onPress={() => router.push(Routes.settingsBlocked)}
          />
          {showGuardian ? (
            <SettingsRow
              title={t('safety.guardianTitle')}
              subtitle={
                isGuardian
                  ? t('safety.guardianAthletesTitle')
                  : t('safety.guardianSubtitleMinor')
              }
              icon={iconFor(Users)}
              onPress={() => router.push(Routes.settingsGuardian)}
            />
          ) : null}
        </SettingsGroup>

        {isRecruiter ? (
          <SettingsGroup
            title={t('settings.sectionScouting')}
            footer={t('settings.scoutingFooter')}
          >
            <SettingsRow
              title={t('settings.scoutingTitle')}
              subtitle={t('settings.scoutingSubtitle')}
              icon={iconFor(Target)}
              onPress={() => router.push(Routes.settingsScouting)}
            />
          </SettingsGroup>
        ) : null}

        <SettingsGroup title={t('settings.sectionAbout')}>
          <SettingsRow
            title={t('common.communityGuidelines')}
            icon={iconFor(BookOpen)}
            onPress={() => router.push(Routes.guidelines)}
          />
          <SettingsRow
            title={t('common.terms')}
            icon={iconFor(Scale)}
            onPress={() => router.push(Routes.terms)}
          />
          <SettingsRow
            title={t('common.privacyPolicy')}
            icon={iconFor(ShieldCheck)}
            onPress={() => router.push(Routes.privacy)}
          />
          <SettingsRow
            title={t('common.childSafety')}
            icon={iconFor(Users)}
            onPress={() => router.push(Routes.childSafety)}
          />
          <SettingsRow
            title={t('settings.supportTitle')}
            subtitle={COMPANY.supportEmail}
            icon={iconFor(LifeBuoy)}
            onPress={contactSupport}
          />
          <SettingsRow
            title={t('settings.versionTitle')}
            icon={iconFor(Info)}
            value={versionLabel()}
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            title={t('settings.signOut')}
            icon={<LogOut size={17} color={colors.danger} />}
            destructive
            onPress={() => setConfirmSignOut(true)}
            testID="settings-sign-out"
          />
        </SettingsGroup>

        <Text variant="caption" tone="muted" align="center" style={{ marginTop: spacing.sm }}>
          {t('settings.productBy', { product: COMPANY.product, company: COMPANY.legalName })}
        </Text>
        <Text variant="caption" tone="muted" align="center">
          {COMPANY.address}
        </Text>
      </View>

      <ConfirmSheet
        visible={confirmSignOut}
        title={t('settings.signOutConfirmTitle')}
        message={t('settings.signOutConfirmBody')}
        confirmLabel={t('settings.signOut')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={signingOut}
        onConfirm={handleSignOut}
        onCancel={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}
