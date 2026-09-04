import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Card, Text } from '@/components/ui';
import { useT } from '@/i18n';

/**
 * Shown when EXPO_PUBLIC_SUPABASE_URL / ANON_KEY are absent.
 *
 * Failing here, once, with an explanation beats every screen failing later
 * with "Network request failed".
 */
export function ConfigMissing() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
      }}
    >
      <Card level={1} style={{ maxWidth: 420, gap: spacing.md }}>
        <Text variant="title">{t('settings.configMissingTitle')}</Text>
        <Text variant="body" tone="secondary">
          {t('settings.configMissingBody')}
        </Text>
        <Card tone="sunken" padded="sm" radius="md">
          <Text variant="caption" tone="muted" style={{ fontFamily: theme.font.medium }}>
            EXPO_PUBLIC_SUPABASE_URL{'\n'}
            EXPO_PUBLIC_SUPABASE_ANON_KEY
          </Text>
        </Card>
        <Text variant="caption" tone="muted">
          {t('settings.configMissingHint')}
        </Text>
      </Card>
    </View>
  );
}
