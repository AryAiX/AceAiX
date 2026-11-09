import React, { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { CardFill } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Sideways preview on the public club page. Each card is about 80% of the
 * row so the next one peeks, with the same gap as the vertical lists. The
 * row bleeds through the section padding and pads its content back, so the
 * first card lines up with the heading. RTL scrolls from the other end.
 */
export function PreviewRow({ children }: { children: React.ReactNode }) {
  const { spacing } = useTheme();
  const items = React.Children.toArray(children);
  const signature = items.map((child) => (React.isValidElement(child) ? String(child.key) : '')).join('|');
  const heights = useRef<number[]>([]);
  const [layout, setLayout] = useState({ signature: '', width: 0, max: 0 });

  if (layout.signature !== signature) {
    heights.current = [];
    setLayout((prev) => ({ signature, width: prev.width, max: 0 }));
  }

  const record = (index: number, height: number) => {
    const next = Math.round(height);
    if (next <= 0 || heights.current[index] === next) return;
    heights.current[index] = next;
    if (heights.current.filter((n) => n > 0).length < items.length) return;
    const max = Math.max(...heights.current);
    setLayout((prev) => (prev.max === max ? prev : { ...prev, max }));
  };

  const cardWidth = layout.width > 0 ? Math.round(layout.width * 0.8) : undefined;
  const row = (
    <ScrollView
      horizontal
      nestedScrollEnabled
      directionalLockEnabled
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -spacing.lg, flexGrow: 0 }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        alignItems: 'stretch',
      }}
      onLayout={(e) => {
        const width = Math.round(e.nativeEvent.layout.width);
        setLayout((prev) => (prev.width === width ? prev : { ...prev, width }));
      }}
    >
      {layout.width > 0
        ? items.map((child, index) => (
            <View
              key={React.isValidElement(child) && child.key != null ? String(child.key) : index}
              collapsable={false}
              onLayout={(e) => record(index, e.nativeEvent.layout.height)}
              style={{ width: cardWidth, height: layout.max > 0 ? layout.max : undefined }}
            >
              {child}
            </View>
          ))
        : null}
    </ScrollView>
  );

  return layout.max > 0 ? <CardFill>{row}</CardFill> : row;
}
