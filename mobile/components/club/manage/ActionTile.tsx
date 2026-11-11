import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Pulse, Tappable, Text } from '@/components/ui';

/**
 * One big, friendly button on the page team's hub: a coloured icon, a short
 * name and a line saying what it does. Two to a row; a leftover uses `wide`.
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
  /** Compact full-width row: icon on the left, title and hint beside it. */
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
      containerStyle={
        wide
          ? { alignSelf: 'stretch' }
          : { flex: 1, alignSelf: 'stretch' }
      }
      style={{
        // Grow into a stretched row without a zero basis, so a short hint
        // still fills the taller neighbour's height and text is not clipped.
        flexGrow: wide ? undefined : 1,
        alignSelf: 'stretch',
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

/**
 * Lays hub tiles out two to a row. Neighbours share the row's height, and a
 * leftover last tile uses the wide row instead of a stretched card.
 */
export function ActionTileGrid({ children }: { children: React.ReactNode }) {
  const { spacing } = useTheme();
  const tiles = React.Children.toArray(children).filter(React.isValidElement);
  if (tiles.length === 0) return null;

  const rows: React.ReactElement[][] = [];
  for (let i = 0; i < tiles.length; i += 2) {
    rows.push(tiles.slice(i, i + 2) as React.ReactElement[]);
  }

  return (
    <View style={{ gap: spacing.md }}>
      {rows.map((row) => {
        const key = row.map((tile) => String(tile.key)).join('|');
        if (row.length === 1) {
          return React.cloneElement(row[0] as React.ReactElement<{ wide?: boolean }>, {
            key,
            wide: true,
          });
        }
        return (
          <View
            key={key}
            style={{ flexDirection: 'row', alignItems: 'stretch', gap: spacing.md }}
          >
            {row}
          </View>
        );
      })}
    </View>
  );
}
