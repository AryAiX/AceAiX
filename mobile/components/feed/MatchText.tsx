import React from 'react';
import type { TextStyle } from 'react-native';

import { Text } from '@/components/ui';
import { highlightMatch } from '@/lib/highlightMatch';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * A single line of text. The part that matches `query` is bold and primary;
 * the rest stays the regular body weight. Case and accents are ignored.
 */
export function MatchText({
  text,
  query,
  style,
}: {
  text: string;
  query: string;
  style?: TextStyle;
}) {
  const { colors, font } = useTheme();
  const parts = highlightMatch(text, query);

  return (
    <Text variant="body" numberOfLines={1} style={style}>
      {parts.map((part, index) => (
        <Text
          key={index}
          variant="body"
          style={part.match ? { fontFamily: font.bold, color: colors.primary } : undefined}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
}
