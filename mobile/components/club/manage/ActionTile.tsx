import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Pulse, Tappable, Text } from '@/components/ui';

/**
 * One big, friendly button on the page team's hub: a coloured icon, a short
 * name and a line saying what it does. Two to a row.
 */
export function ActionTile({
  icon: Icon,
  hue,
  title,
  hint,
  onPress,
  live,
  wide,
  testID,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  hue: string;
  title: string;
  hint?: string;
  onPress: () => void;
  /** A soft pulse behind the icon: something is happening now. */
  live?: boolean;
  /** Takes the whole row. */
  wide?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;

  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${title}. ${hint}` : title}
      haptic="light"
      testID={testID}
      containerStyle={{ flexBasis: wide ? '100%' : '46%', flexGrow: 1 }}
      style={{
        minHeight: wide ? theme.hit.comfortable + spacing.lg : 112,
        padding: spacing.lg,
        gap: spacing.sm,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: live ? hue : colors.border,
        flexDirection: wide ? 'row' : 'column',
        alignItems: wide ? 'center' : 'flex-start',
        ...theme.elevation(1),
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radii.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.alpha(hue, 0.16),
        }}
      >
        {live ? <Pulse color={hue} size={44} radius={radii.md} /> : null}
        <Icon size={22} color={hue} strokeWidth={2.2} />
      </View>
      <View style={{ flex: wide ? 1 : undefined, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {title}
        </Text>
        {hint ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Tappable>
  );
}
