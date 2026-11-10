import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/i18n';
import type { MediaLayout } from './MediaGrid';

/* One choice for the whole profile (Posts and Highlights together), kept on
   the phone so it's still there next time. The switch lives in the tab row,
   and the tabs below listen, so they all change together. */
const KEY = 'profile.layout.v1';
let current: MediaLayout = 'grid';
let loaded = false;
const listeners = new Set<(next: MediaLayout) => void>();

function setLayoutEverywhere(next: MediaLayout) {
  current = next;
  listeners.forEach((listener) => listener(next));
}

export function useProfileLayout(): [MediaLayout, (next: MediaLayout) => void] {
  const [layout, setLayout] = useState<MediaLayout>(current);
  useEffect(() => {
    listeners.add(setLayout);
    setLayout(current);
    if (!loaded) {
      loaded = true;
      AsyncStorage.getItem(KEY)
        .then((saved) => {
          if (saved === 'grid' || saved === 'scroll') setLayoutEverywhere(saved);
        })
        .catch(() => undefined);
    }
    return () => {
      listeners.delete(setLayout);
    };
  }, []);
  const choose = useCallback((next: MediaLayout) => {
    setLayoutEverywhere(next);
    AsyncStorage.setItem(KEY, next).catch(() => undefined);
  }, []);
  return [layout, choose];
}

/* Drawn here so the two pictures always match: four squares for the grid,
   two tall cards for the scroll. */
function GridGlyph({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Rect x={1} y={1} width={6} height={6} rx={1.5} fill={color} />
      <Rect x={9} y={1} width={6} height={6} rx={1.5} fill={color} />
      <Rect x={1} y={9} width={6} height={6} rx={1.5} fill={color} />
      <Rect x={9} y={9} width={6} height={6} rx={1.5} fill={color} />
    </Svg>
  );
}

function ScrollGlyph({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Rect x={2} y={1} width={12} height={8.5} rx={2} fill={color} />
      <Rect x={2} y={11.5} width={12} height={3.5} rx={1.5} fill={color} />
    </Svg>
  );
}

/** The small Grid ⇄ Scroll switch above Posts and Highlights. */
export function LayoutToggle({ value, onChange }: { value: MediaLayout; onChange: (next: MediaLayout) => void }) {
  const theme = useTheme();
  const { colors } = theme;
  const t = useT();
  const options: { key: MediaLayout; label: string; Glyph: typeof GridGlyph }[] = [
    { key: 'grid', label: t('profile.layoutGrid'), Glyph: GridGlyph },
    { key: 'scroll', label: t('profile.layoutScroll'), Glyph: ScrollGlyph },
  ];
  return (
    <View
      accessibilityRole="radiogroup"
      style={{ flexDirection: 'row', padding: 3, borderRadius: 11, backgroundColor: colors.surfaceAlt }}
      testID="profile-layout-toggle"
    >
      {options.map(({ key, label, Glyph }) => {
        const on = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={label}
            hitSlop={4}
            testID={`profile-layout-${key}`}
            style={({ pressed }) => ({
              width: 36,
              height: 28,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? colors.surface : 'transparent',
              opacity: pressed ? 0.7 : 1,
              ...(on ? theme.elevation(1) : null),
            })}
          >
            <Glyph color={on ? colors.text : colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}
