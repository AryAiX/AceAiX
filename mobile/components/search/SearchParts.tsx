import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, ChevronForward, Text } from '@/components/ui';

/** A section's small caps title, with its way to see more on the right. */
export function SectionHead({
  title,
  action,
  onAction,
  testID,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  testID?: string;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
      }}
    >
      <Text variant="overline" tone="muted">
        {title}
      </Text>
      {action && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${title}: ${action}`}
          testID={testID}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text variant="captionStrong" color={colors.primary}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * One row of a result list drawn as a white card: a title, a short line
 * under it, and a small coloured label on the right (Trial, Challenge…).
 */
export function ResultRow({
  title,
  subtitle,
  left,
  label,
  warm,
  onPress,
  grouped,
  testID,
}: {
  title: string;
  subtitle?: string | null;
  left?: React.ReactNode;
  label?: string | null;
  /** Fire for something to act on (a trial, a challenge); blue otherwise. */
  warm?: boolean;
  onPress: () => void;
  grouped: ViewStyle;
  testID?: string;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, label].filter(Boolean).join(', ')}
      testID={testID}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          opacity: pressed ? 0.7 : 1,
        },
        grouped,
      ]}
    >
      {left}
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {label ? (
        <Badge label={label} tone={warm ? 'flame' : 'primary'} />
      ) : (
        <ChevronForward size={18} color={colors.textMuted} />
      )}
    </Pressable>
  );
}
