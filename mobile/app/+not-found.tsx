import React from 'react';
import { useRouter } from 'expo-router';
import { Compass } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, Screen } from '@/components/ui';
import { useT } from '@/i18n';

export default function NotFound() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();

  return (
    <Screen>
      <EmptyState
        icon={<Compass size={28} color={theme.colors.textMuted} />}
        title={t('feed.notFoundTitle')}
        body={t('feed.notFoundBody')}
        actionLabel={t('feed.notFoundAction')}
        onAction={() => router.replace('/(tabs)')}
      />
    </Screen>
  );
}
