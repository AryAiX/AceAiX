import React from 'react';
import { View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';

/**
 * Shown above the composer whenever the other person is under 18.
 *
 * Three deliberate choices:
 *  - It is not dismissible. The point is that an adult always knows a
 *    guardian can see the conversation exists; a banner you can swipe away
 *    stops being a disclosure and becomes decoration.
 *  - It is one line and quiet. A red warning would make an ordinary,
 *    legitimate coach–athlete conversation feel like an accusation.
 *  - It states only what is true: guardians can see that the thread exists,
 *    not its contents.
 */
export function MinorSafetyBanner() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();

  /* Compliance copy: every translation has to keep both halves of the
     statement — the person is under 18, and a guardian can see that the
     conversation exists. */
  const notice = t('messaging.minorBanner');

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={notice}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.infoSoft,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + 2,
      }}
    >
      <ShieldCheck size={16} color={colors.info} strokeWidth={2.1} />
      <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
        {notice}
      </Text>
    </View>
  );
}
