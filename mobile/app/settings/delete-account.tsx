import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Download, EyeOff, Trash2 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Card,
  ConfirmSheet,
  Divider,
  Header,
  Input,
  Screen,
  Text,
  useToast,
} from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/i18n';
import { deleteOwnAccount, setDiscoverable } from '@/lib/api';
import { shareDataExport, writeMyDataExport } from '@/lib/api.settings';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';

/** Each line of what deletion actually removes. */
const REMOVED_KEYS = [
  'settings.removedProfile',
  'settings.removedPosts',
  'settings.removedMessages',
  'settings.removedApplications',
  'settings.removedScore',
  'settings.removedFollows',
];

export default function DeleteAccountScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { profile, refreshProfile } = useAuth();

  const [typed, setTyped] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [exporting, setExporting] = useState(false);

  /* The word is translated, so the comparison has to be too — and it is
     case-insensitive in whatever locale the person is typing in. */
  const confirmWord = t('settings.deleteConfirmWord');
  const canDelete = useMemo(
    () => typed.trim().toLocaleUpperCase() === confirmWord.toLocaleUpperCase(),
    [typed, confirmWord],
  );
  const discoverable = !!profile?.is_discoverable;

  const takeABreak = useCallback(async () => {
    setHiding(true);
    try {
      await setDiscoverable(false);
      await refreshProfile();
      toast.success(t('settings.hiddenFromSearchToast'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setHiding(false);
    }
  }, [refreshProfile, toast, t]);

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

  const confirmDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteOwnAccount();
      setConfirming(false);
      router.replace(Routes.auth.welcome);
    } catch (err) {
      setDeleting(false);
      setConfirming(false);
      toast.error(errorMessage(err));
    }
  }, [router, toast]);

  return (
    <Screen
      header={<Header title={t('settings.deleteAccountTitle')} back bordered />}
      testID="settings-delete"
    >
      <View style={{ paddingTop: spacing.lg, gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="heading">{t('settings.deleteCannotUndoTitle')}</Text>
          <Text variant="caption" tone="secondary">
            {t('settings.deleteCannotUndoBody')}
          </Text>
        </View>

        {/* ── The two things most people actually want ─────────────── */}
        <View style={{ gap: spacing.md }}>
          <Text variant="overline" tone="muted">
            {t('settings.beforeYouGo')}
          </Text>

          <Card padded="sm">
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <EyeOff size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: spacing.sm }}>
                <Text variant="bodyStrong">{t('settings.takeABreakTitle')}</Text>
                <Text variant="caption" tone="muted">
                  {t('settings.takeABreakBody')}
                </Text>
                <Button
                  label={
                    discoverable
                      ? t('settings.turnOffDiscovery')
                      : t('settings.discoveryAlreadyOff')
                  }
                  variant="secondary"
                  size="sm"
                  disabled={!discoverable}
                  loading={hiding}
                  onPress={takeABreak}
                  style={{ marginTop: spacing.xs }}
                  testID="take-a-break"
                />
              </View>
            </View>

            <Divider style={{ marginVertical: spacing.md }} />

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Download size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: spacing.sm }}>
                <Text variant="bodyStrong">{t('settings.downloadMyData')}</Text>
                <Text variant="caption" tone="muted">
                  {t('settings.deleteExportBody')}
                </Text>
                <Button
                  label={
                    exporting ? t('settings.preparingShort') : t('settings.downloadMyData')
                  }
                  variant="secondary"
                  size="sm"
                  loading={exporting}
                  onPress={downloadMyData}
                  style={{ marginTop: spacing.xs }}
                  testID="delete-export"
                />
              </View>
            </View>
          </Card>
        </View>

        {/* ── What actually goes ────────────────────────────────────── */}
        <View style={{ gap: spacing.md }}>
          <Text variant="overline" tone="muted">
            {t('settings.whatGetsDeleted')}
          </Text>
          <Card padded="sm">
            <View style={{ gap: spacing.sm }}>
              {REMOVED_KEYS.map((key) => (
                <View key={key} style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: colors.danger,
                      marginTop: 8,
                    }}
                  />
                  <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                    {t(key)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          <InfoNote tone="neutral" icon="info">
            {t('settings.retentionNote')}
          </InfoNote>
        </View>

        {/* ── The deliberate step ───────────────────────────────────── */}
        <View style={{ gap: spacing.md }}>
          <Text variant="overline" tone="muted">
            {t('common.confirm')}
          </Text>
          <Input
            label={t('settings.typeToContinue', { word: confirmWord })}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={confirmWord}
            testID="delete-confirm-input"
          />
          <Button
            label={t('settings.deleteMyAccount')}
            variant="danger"
            fullWidth
            disabled={!canDelete}
            onPress={() => setConfirming(true)}
            icon={<Trash2 size={17} color={colors.danger} />}
            testID="delete-account-button"
          />
          <Text variant="caption" tone="muted" align="center">
            {t('settings.changedYourMind')}
          </Text>
        </View>
      </View>

      <ConfirmSheet
        visible={confirming}
        title={t('settings.deleteConfirmTitle')}
        message={t('settings.deleteConfirmBody')}
        confirmLabel={t('settings.deletePermanently')}
        cancelLabel={t('settings.keepMyAccount')}
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}
