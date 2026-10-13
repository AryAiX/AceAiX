import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { alpha, Play, TierColors, TierColorsEnd } from '@/theme/tokens';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { NATIVE_DRIVER } from '@/lib/motion';
import { giMedal, type GiMedal } from '@/lib/gi/catalogue';
import { Medal } from './art';

/**
 * A medal's two colours, from the tier ramp and the play hues — nothing new.
 * Nothing here is grey (docs/20 §2): "silver" is the ramp's silver, violet.
 */
export const MEDAL_COLORS: Record<GiMedal, { fill: string; ribbon: string }> = {
  keepGoing: { fill: TierColors.rising, ribbon: TierColorsEnd.rising },
  bronze: { fill: Play.flame, ribbon: TierColorsEnd.gold },
  silver: { fill: TierColors.silver, ribbon: TierColorsEnd.silver },
  gold: { fill: TierColors.gold, ribbon: TierColorsEnd.gold },
};

const MEDAL_KEY: Record<GiMedal, { name: string; feedback: string }> = {
  keepGoing: { name: 'intelligence.medalKeepGoing', feedback: 'intelligence.feedbackKeepGoing' },
  bronze: { name: 'intelligence.medalBronze', feedback: 'intelligence.feedbackBronze' },
  silver: { name: 'intelligence.medalSilver', feedback: 'intelligence.feedbackSilver' },
  gold: { name: 'intelligence.medalGold', feedback: 'intelligence.feedbackGold' },
};

/** A small medal for a hub tile. */
export function MedalChip({ score, size = 30 }: { score: number | null | undefined; size?: number }) {
  const medal = giMedal(score);
  if (!medal) return null;
  const c = MEDAL_COLORS[medal];
  return <Medal size={size} color={c.fill} accent={c.ribbon} />;
}

/**
 * The moment a scored game ends: the score counts up, the medal lands, and
 * for a silver or gold a burst of confetti. One sentence says what it means.
 * Under reduce-motion the number and the medal are simply there.
 */
export function ResultMoment({
  score,
  hue,
  onBurst,
}: {
  score: number;
  hue: string;
  /** Called once, when a silver or gold lands — the screen owns the confetti. */
  onBurst?: (colors: string[]) => void;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const reduced = useReducedMotion();
  const target = Math.max(0, Math.min(100, Math.round(score)));
  const medal = giMedal(target) ?? 'keepGoing';
  const mc = MEDAL_COLORS[medal];

  const count = useRef(new Animated.Value(reduced ? target : 0)).current;
  const land = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const [shown, setShown] = useState(reduced ? target : 0);
  const burst = useRef(onBurst);
  burst.current = onBurst;

  useEffect(() => {
    if (reduced) {
      setShown(target);
      land.setValue(1);
      return;
    }
    const sub = count.addListener(({ value }) => setShown(Math.round(value)));
    count.setValue(0);
    land.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(count, {
        toValue: target,
        duration: 400 + target * 10,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.spring(land, { toValue: 1, useNativeDriver: NATIVE_DRIVER, speed: 12, bounciness: 12 }),
    ]);
    anim.start(({ finished }) => {
      if (!finished) return;
      if (target >= 70) {
        burst.current?.([mc.fill, mc.ribbon, hue, Play.lime, Play.cyan]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    });
    return () => {
      anim.stop();
      count.removeListener(sub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduced, count, land]);

  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: spacing.md }} testID="gi-result-moment">
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text
          variant="display"
          color={hue}
          style={{ fontSize: 72, lineHeight: 80 }}
          accessibilityLabel={t('intelligence.gameScore', { score: target })}
        >
          {shown}
        </Text>
        <Text variant="subheading" tone="muted">
          /100
        </Text>
      </View>
      <Animated.View
        style={{
          alignItems: 'center',
          gap: spacing.xs,
          opacity: land,
          transform: [
            { scale: land.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
            { rotate: land.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
          ],
        }}
      >
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(mc.fill, 0.14),
          }}
        >
          <Medal size={80} color={mc.fill} accent={mc.ribbon} />
        </View>
        <Text variant="heading" color={medal === 'keepGoing' ? colors.text : mc.fill} testID={`gi-medal-${medal}`}>
          {t(MEDAL_KEY[medal].name)}
        </Text>
      </Animated.View>
      <Text tone="secondary" style={{ textAlign: 'center' }}>
        {t(MEDAL_KEY[medal].feedback)}
      </Text>
    </View>
  );
}
