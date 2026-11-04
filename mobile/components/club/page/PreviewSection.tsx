import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { SectionHeader } from '@/components/ui';
import { useT } from '@/i18n';

/**
 * One block on the public club page. The heading is always there. "See all"
 * appears only once the body reports that it has something to show; an empty
 * body is the muted line the tab renders itself.
 */
export function PreviewSection({
  title,
  onSeeAll,
  testID,
  children,
}: {
  title: string;
  onSeeAll: () => void;
  testID?: string;
  children: (onHasItems: (has: boolean) => void) => React.ReactNode;
}) {
  const t = useT();
  const { spacing } = useTheme();
  const [hasItems, setHasItems] = useState<boolean | null>(null);
  const onHasItems = useCallback((has: boolean) => {
    setHasItems((prev) => (prev === has ? prev : has));
  }, []);

  return (
    <View
      testID={testID}
      style={{ marginTop: spacing.xl, paddingHorizontal: spacing.lg, gap: spacing.md }}
    >
      <SectionHeader
        title={title}
        action={hasItems ? t('common.seeAll') : undefined}
        onAction={hasItems ? onSeeAll : undefined}
        style={{ marginBottom: 0 }}
      />
      {children(onHasItems)}
    </View>
  );
}
