import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Card, ChevronForward, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getGuardianStats } from '@/lib/api.profile';
import { Routes } from '@/lib/routes';

/**
 * The way into Parent and guardian settings from a guardian's own profile.
 *
 * Same shape as a coach's coaching card: a title, one line, and a chevron.
 * The line is how many children `my_linked_minors` returns. The chevron is
 * the forward one, so it points to the start edge when Arabic is on and the
 * row has already flipped.
 */
export function GuardianAthletesCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const stats = useAsync(() => getGuardianStats(true), [refreshKey], { refetchOnFocus: true });
  const count = stats.data?.children ?? 0;

  return (
    <Card
      padded
      level={1}
      onPress={() => router.push(Routes.settingsGuardian)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      testID="guardian-athletes-card"
    >
      <Users size={22} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="subheading">{t('safety.guardianAthletesTitle')}</Text>
        <Text variant="caption" tone="muted">
          {t('common.athletes', { count })}
        </Text>
      </View>
      <ChevronForward size={18} color={colors.textMuted} />
    </Card>
  );
}
