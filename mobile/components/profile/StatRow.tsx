import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';

export interface StatItem {
  key: string;
  label: string;
  value: string;
  onPress?: () => void;
}

/** A row of evenly divided numbers — posts, clips, matches, endorsements. */
export function StatRow({ items }: { items: StatItem[] }) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();

  if (items.length === 0) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        paddingVertical: spacing.md,
      }}
    >
      {items.map((item, index) => {
        const body = (
          <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Text variant="stat">{item.value}</Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        );

        return (
          <View
            key={item.key}
            style={{
              flex: 1,
              borderLeftWidth: index === 0 ? 0 : 1,
              borderLeftColor: colors.divider,
            }}
          >
            {item.onPress ? (
              <Pressable
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={t('profile.statA11y', {
                  value: item.value,
                  label: item.label,
                })}
                style={({ pressed }) => ({
                  minHeight: 44,
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                {body}
              </Pressable>
            ) : (
              <View
                accessibilityLabel={t('profile.statA11y', {
                  value: item.value,
                  label: item.label,
                })}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                {body}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
