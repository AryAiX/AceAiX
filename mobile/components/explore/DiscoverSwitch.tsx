import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View, type LayoutChangeEvent } from 'react-native';
import { Clapperboard, Handshake, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import { NATIVE_DRIVER } from '@/lib/motion';

export type DiscoverView = 'explore' | 'people' | 'sponsors';

interface Props {
  value: DiscoverView;
  onChange: (view: DiscoverView) => void;
  /** The tabs, in order. `people` needs its label: "Athletes" for a recruiter, "Seeking sponsors" for a sponsor. */
  views: DiscoverView[];
  peopleLabel: string;
}

const ICONS = { explore: Clapperboard, people: Users, sponsors: Handshake } as const;

/**
 * The faces of Discover for a recruiter or a sponsor, as underlined tabs.
 *
 * Deliberately not a SegmentedControl: the screens below have filter rows of
 * their own, and two pill rows stacked read as one control.
 */
export function DiscoverSwitch({ value, onChange, views, peopleLabel }: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, views.indexOf(value));
  const slide = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    if (reduced) {
      slide.setValue(index);
      return;
    }
    Animated.spring(slide, { toValue: index, speed: 22, bounciness: 7, useNativeDriver: NATIVE_DRIVER }).start();
  }, [index, slide, reduced]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const tabWidth = width / Math.max(1, views.length);

  const labels: Record<DiscoverView, string> = {
    explore: t('explore.viewExplore'),
    people: peopleLabel,
    sponsors: t('sponsorship.tabSponsors'),
  };
  const tabs = views.map((key) => ({ key, label: labels[key], Icon: ICONS[key] }));

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
            width: tabWidth,
            height: 3,
            borderRadius: 2,
            backgroundColor: colors.primary,
            transform: [{ translateX: Animated.multiply(slide, tabWidth) }],
          }}
        />
      ) : null}
    </View>
  );
}
