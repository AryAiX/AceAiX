import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { alpha } from '@/theme/tokens';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { NATIVE_DRIVER } from '@/lib/motion';
import { useTimers } from './shared';
import { Ripple } from './art';

const STEP_MS = 600;
const GO_MS = 500;

/**
 * 3 · 2 · 1 · GO before every round.
 *
 * The game is not mounted until GO has been shown, so none of its timers —
 * the first trial's wait, the clip, the window — can start early: a round
 * begins when the player has been told it begins.
 */
export function CountdownGate({ hue, children }: { hue: string; children: React.ReactNode }) {
  const [go, setGo] = useState(false);
  if (!go) return <Countdown hue={hue} onDone={() => setGo(true)} />;
  return <>{children}</>;
}

function Countdown({ hue, onDone }: { hue: string; onDone: () => void }) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const reduced = useReducedMotion();
  const { later } = useTimers();
  const [n, setN] = useState(3);
  const pop = useRef(new Animated.Value(1)).current;
  const finished = useRef(onDone);
  finished.current = onDone;

  useEffect(() => {
    if (n > 0) {
      later(() => setN((x) => x - 1), STEP_MS);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      later(() => finished.current(), GO_MS);
    }
    if (reduced) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0);
    const a = Animated.timing(pop, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.back(2)),
      useNativeDriver: NATIVE_DRIVER,
    });
    a.start();
    return () => a.stop();
  }, [n, later, pop, reduced]);

  const isGo = n === 0;
  const ring = isGo ? colors.play.mint : hue;
  const disc = 168;

  return (
    <View
      testID="gi-countdown"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={isGo ? t('intelligence.countdownGo') : String(n)}
      style={{
        height: 380,
        borderRadius: radii.xl,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xl + spacing.md,
        backgroundColor: alpha(hue, 0.08),
        borderWidth: 1,
        borderColor: alpha(hue, 0.25),
      }}
    >
      <Text variant="overline" tone="muted">
        {t('intelligence.getReady')}
      </Text>
      <View style={{ width: disc, height: disc, alignItems: 'center', justifyContent: 'center' }}>
        <Ripple key={n} color={ring} size={disc} period={STEP_MS} grow={1.28} />
        <Animated.View
          style={{
            width: disc,
            height: disc,
            borderRadius: disc / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ring,
            opacity: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          }}
        >
          <Text
            variant="display"
            color="#FFFFFF"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ fontSize: isGo ? 52 : 84, lineHeight: isGo ? 60 : 92, paddingHorizontal: spacing.md }}
          >
            {isGo ? t('intelligence.countdownGo') : String(n)}
          </Text>
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[3, 2, 1].map((k) => (
          <View
            key={k}
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: n <= k - 1 || isGo ? ring : colors.surfaceSunken,
            }}
          />
        ))}
      </View>
    </View>
  );
}
