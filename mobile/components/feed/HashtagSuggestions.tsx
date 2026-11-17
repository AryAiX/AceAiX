import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MatchText } from '@/components/feed/MatchText';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Hashtag rows for the list shown while someone is typing `#`.
 *
 * The box around them is the same one the mention list uses, so this only
 * draws the rows: "#tag" on the first line, with the typed part in bold
 * primary, and how many public posts use it underneath. Picking one does
 * not mention anyone.
 */

/** A 44pt avatar plus a little padding. About seven of these fit before the list scrolls. */
export const SUGGESTION_ROW_HEIGHT = 56;
export const SUGGESTION_VISIBLE_ROWS = 7;

export interface HashtagSuggestion {
  tag: string;
  post_count: number;
}

export function HashtagSuggestions({
  suggestions,
  query,
  onPick,
}: {
  suggestions: readonly HashtagSuggestion[];
  query: string;
  onPick: (tag: string) => void;
}) {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  if (suggestions.length === 0) return null;

  return (
    <View>
      {suggestions.map((row, index) => {
        const label = `#${row.tag}`;
        const count = t('feed.hashtagPostCount', { count: row.post_count });
        return (
          <View key={row.tag}>
            {index > 0 ? (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: colors.divider,
                  marginHorizontal: spacing.md,
                }}
              />
            ) : null}
            <Pressable
              onPressIn={() => onPick(row.tag)}
              accessibilityRole="button"
              accessibilityLabel={`${label}, ${count}`}
              style={({ pressed }) => ({
                justifyContent: 'center',
                minHeight: SUGGESTION_ROW_HEIGHT,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
              })}
            >
              <MatchText text={label} query={query} />
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {count}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
