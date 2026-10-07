import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View, type LayoutChangeEvent } from 'react-native';
import { Clapperboard, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import { NATIVE_DRIVER } from '@/lib/motion';

export type DiscoverView = 'explore' | 'people';

interface Props {
  value: DiscoverView;
  onChange: (view: DiscoverView) => void;
  /** "Athletes" for a recruiter, "Clubs & people" for everyone else. */
  peopleLabel: string;
}

/**
 * The two faces of Discover, as underlined tabs.
 *
 * Deliberately not a SegmentedControl: the people side already has one of its
 * own just below (clubs / coaches / leaderboard), and two pill switches stacked
 * read as one control with six options.
 */
export function DiscoverSwitch({ value, onChange, peopleLabel }: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const slide = useRef(new Animated.Value(value === 'explore' ? 0 : 1)).current;

  useEffect(() => {
    const to = value === 'explore' ? 0 : 1;
    if (reduced) {
      slide.setValue(to);
      return;
    }
    Animated.spring(slide, { toValue: to, speed: 22, bounciness: 7, useNativeDriver: NATIVE_DRIVER }).start();
  }, [value, slide, reduced]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const half = width / 2;

  const tabs: { key: DiscoverView; label: string; Icon: typeof Users }[] = [
    { key: 'explore', label: t('explore.viewExplore'), Icon: Clapperboard },
    { key: 'people', label: peopleLabel, Icon: Users },
  ];

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('explore.switchA11y')}
      onLayout={onLayout}
      style={{
        flexDirection: 'row',
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
      testID="discover-switch"
    >
      {tabs.map(({ key, label, Icon }) => {
        const selected = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            testID={`discover-view-${key}`}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: theme.hit.min,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Icon size={17} color={selected ? colors.primary : colors.textMuted} strokeWidth={2.3} />
            <Text variant="bodyStrong" color={selected ? colors.text : colors.textMuted} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            bottom: -1,
            width: half,
            height: 3,
            borderRadius: 2,
            backgroundColor: colors.primary,
            transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, half] }) }],
          }}
        />
      ) : null}
    </View>
  );
}
