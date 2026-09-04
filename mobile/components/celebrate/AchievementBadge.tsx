import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { raritySkin, type AchievementMeta } from './achievements';

export type BadgeSize = 'sm' | 'md' | 'lg';

interface Props {
  meta: AchievementMeta;
  /** Earned badges are in full colour; unearned ones are dimmed but legible. */
  earned?: boolean;
  size?: BadgeSize;
  /** Spring in on mount. Falls back to a fade when Reduce Motion is on. */
  animateIn?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const DIMENSIONS: Record<BadgeSize, { box: number; icon: number; ring: number }> = {
  sm: { box: 44, icon: 20, ring: 2 },
  md: { box: 64, icon: 28, ring: 2.5 },
  lg: { box: 116, icon: 52, ring: 4 },
};

/**
 * One achievement medallion.
 *
 * Deliberately just the object — no title, no date, no hint. The wall and the
 * celebration compose those around it differently, and a badge that carried its
 * own label could only ever suit one of them.
 *
 * Unearned badges are dimmed rather than hidden or padlocked. The point of the
 * wall is to show what is worth doing next, and a silhouette says less than a
 * quiet version of the real thing.
 */
export function AchievementBadge({
  meta,
  earned = true,
  size = 'md',
  animateIn = false,
  style,
  testID,
}: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  const { box, icon, ring } = DIMENSIONS[size];
  const skin = raritySkin(meta.rarity, theme, earned);
  const Icon = meta.icon;

  const enter = useRef(new Animated.Value(animateIn ? 0 : 1)).current;

  useEffect(() => {
    if (!animateIn) return;

    const animation = reduceMotion
      ? /* Same arrival, no movement: the badge appears, it does not leap. */
        Animated.timing(enter, {
          toValue: 1,
          duration: theme.duration.slow,
          useNativeDriver: true,
        })
      : Animated.spring(enter, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
          tension: 90,
        });

    animation.start();
    return () => animation.stop();
  }, [animateIn, reduceMotion, enter, theme.duration.slow]);

  const scale = reduceMotion
    ? 1
    : enter.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  const restOpacity = earned ? 1 : 0.55;
  const opacity = animateIn
    ? enter.interpolate({ inputRange: [0, 1], outputRange: [0, restOpacity] })
    : restOpacity;

  return (
    <Animated.View
      testID={testID}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: box,
          height: box,
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
          transform: [{ scale }],
        },
        style,
      ]}
    >
      {/* The medallion. Drawn in SVG so the ring stays a true circle at every
          size rather than a border radius that rounds differently per platform. */}
      <Svg width={box} height={box} style={{ position: 'absolute' }}>
        <Circle
          cx={box / 2}
          cy={box / 2}
          r={box / 2 - ring / 2}
          fill={skin.bg}
          stroke={skin.ring}
          strokeWidth={ring}
        />
      </Svg>
      <Icon size={icon} color={skin.fg} strokeWidth={earned ? 2 : 1.75} />
    </Animated.View>
  );
}
