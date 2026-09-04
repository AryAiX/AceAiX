import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, Screen, Sheet, Text } from '@/components/ui';
import { LanguageList } from '@/components/common/LanguageList';
import { LanguageCode, tryRestartApp, useI18n } from '@/i18n';

/**
 * Changing language after the first launch.
 *
 * The choice applies immediately. Switching into or out of Arabic changes the
 * app's layout direction, which React Native only fully applies on a fresh
 * start — so that case, and only that case, asks for a restart.
 */
export default function LanguageSettingsScreen() {
  const theme = useTheme();
  const { spacing } = theme;
  const { language, setLanguage, t } = useI18n();

  const [busy, setBusy] = useState<LanguageCode | null>(null);
  const [restartPrompt, setRestartPrompt] = useState(false);

  const select = useCallback(
    async (code: LanguageCode) => {
      if (code === language) return;
      setBusy(code);
      const { needsRestart } = await setLanguage(code);
      setBusy(null);
      if (needsRestart) setRestartPrompt(true);
    },
    [language, setLanguage],
  );

  return (
    <Screen
      header={<Header title={t('language.settingsTitle')} back bordered />}
      testID="settings-language"
    >
      <View style={{ paddingTop: spacing.lg, gap: spacing.xl }}>
        <Text variant="caption" tone="secondary">
          {t('language.settingsSubtitle')}
        </Text>

        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="muted">
            {t('language.current')}
          </Text>
          <LanguageList selected={language} onSelect={select} busy={busy} />
        </View>

        <View style={{ gap: spacing.md }}>
          <Text variant="caption" tone="muted">
            {t('language.translationNote')}
          </Text>
          <Text variant="caption" tone="muted">
            {t('language.legalEnglishOnly')}
          </Text>
        </View>
      </View>

      <Sheet
        visible={restartPrompt}
        onClose={() => setRestartPrompt(false)}
        title={t('language.restartTitle')}
        scrollable={false}
      >
        <Text variant="body" tone="secondary" style={{ marginBottom: spacing.xl }}>
          {t('language.restartBody')}
        </Text>
        <View style={{ gap: spacing.sm }}>
          <Button
            label={t('language.restartAction')}
            fullWidth
            onPress={async () => {
              const restarted = await tryRestartApp();
              if (!restarted) setRestartPrompt(false);
            }}
          />
          <Button
            label={t('language.restartLater')}
            variant="ghost"
            fullWidth
            onPress={() => setRestartPrompt(false)}
          />
        </View>
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
          {t('language.restartManual')}
        </Text>
      </Sheet>
    </Screen>
  );
}
