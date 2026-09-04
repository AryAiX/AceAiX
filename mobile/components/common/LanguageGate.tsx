import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Sheet, Text } from '@/components/ui';
import { LanguageCode, tryRestartApp, useI18n } from '@/i18n';
import { LanguageList } from './LanguageList';

/**
 * The first thing anyone sees, once, on a fresh install.
 *
 * It is not a route: it sits in front of the whole app until a language has
 * been chosen, so there is no way to reach a screen in the wrong language and
 * no redirect to get wrong. Choosing Arabic flips the app to a right-to-left
 * layout, which React Native applies at the native level — so that one choice
 * asks for a restart, and says why.
 */
export function LanguageGate() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const { language, setLanguage, t } = useI18n();

  const [pending, setPending] = useState<LanguageCode>(language);
  const [busy, setBusy] = useState<LanguageCode | null>(null);
  const [restartPrompt, setRestartPrompt] = useState(false);

  const choose = useCallback(async () => {
    setBusy(pending);
    const { needsRestart } = await setLanguage(pending);
    setBusy(null);
    if (needsRestart) setRestartPrompt(true);
  }, [pending, setLanguage]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <StatusBar style={colors.statusBar} />

      <LinearGradient
        colors={[theme.alpha(colors.primary, 0.18), 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.giant }}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title" style={{ letterSpacing: 0.4 }}>
          Ace
          <Text variant="title" tone="primary">
            AiX
          </Text>
        </Text>

        <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl, gap: spacing.sm }}>
          {/* Shown in whichever language the phone is set to, since that is our
              best guess at what this person reads — with the English underneath
              when the guess is not English, so a wrong guess is still readable. */}
          <Text variant="display" style={{ fontSize: theme.size.xxl }}>
            {t('language.chooseTitle')}
          </Text>
          {language !== 'en' ? (
            <Text variant="subheading" tone="muted">
              Choose your language
            </Text>
          ) : null}
          <Text variant="body" tone="secondary">
            {t('language.chooseBody')}
          </Text>
        </View>

        <LanguageList selected={pending} onSelect={setPending} busy={busy} />

        <Text variant="caption" tone="muted" style={{ marginTop: spacing.xl }}>
          {t('language.legalEnglishOnly')}
        </Text>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.lg,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          backgroundColor: colors.bg,
        }}
      >
        <Button
          label={t('common.continue')}
          fullWidth
          loading={busy !== null}
          onPress={choose}
        />
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
    </SafeAreaView>
  );
}
