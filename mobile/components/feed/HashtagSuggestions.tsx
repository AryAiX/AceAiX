import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Hashtags to finish while someone is typing `#`.
 *
 * Same box, placement and test id shape as the mention list. A row is a
 * hashtag and how many public posts use it. Picking one does not mention
 * anyone.
 */

export interface HashtagSuggestion {
  tag: string;
  post_count: number;
}

export function HashtagSuggestions({
  suggestions,
  layout = 'inline',
  onPick,
}: {
  suggestions: readonly HashtagSuggestion[];
  /** `inline` takes space above the field. `overlay` draws the list upward. */
  layout?: 'inline' | 'overlay';
  onPick: (tag: string) => void;
}) {
  const t = useT();
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  if (suggestions.length === 0) return null;

  return (
    <View
      testID="hashtag-suggestions"
      style={{
        marginBottom: spacing.xs,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        overflow: 'hidden',
        ...(layout === 'overlay'
          ? {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '100%',
              zIndex: 30,
              elevation: 8,
            }
          : null),
      }}
    >
      {suggestions.map((row, index) => {
        const label = `#${row.tag}`;
        const count = t('feed.hashtagPostCount', { count: row.post_count });
        return (
          <Pressable
            key={row.tag}
            onPressIn={() => onPick(row.tag)}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${count}`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              minHeight: theme.hit.min,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: colors.border,
              backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
            })}
          >
            <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
              {label}
            </Text>
            <Text variant="caption" tone="muted">
              {count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
