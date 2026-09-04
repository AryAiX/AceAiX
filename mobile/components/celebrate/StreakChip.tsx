import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Flame } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button, Sheet, Text } from '@/components/ui';
import { useProgress } from '@/providers/ProgressProvider';
import { useT } from '@/i18n';
import { StreakCalendar } from './StreakCalendar';

interface Props {
  /** Overrides the value from ProgressProvider. Mostly for previews and tests. */
  current?: number;
  style?: ViewStyle;
  testID?: string;
}

/**
 * The flame and the number, for the home header.
 *
 * When the streak goes up the number rolls: the old one leaves upwards, the new
 * one arrives from below, and the flame gives a single pulse. Once. There is no
 * loop, no glow and no badge that keeps moving until you tap it — a streak is
 * worth a nod, not a demand for attention.
 *
 * Tapping opens the explanation, which is the part that matters most: missing a
 * day costs nothing but the run.
 */
export function StreakChip({ current, style, testID }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing, hit } = theme;
  const t = useT();
  const reduceMotion = useReducedMotion();
  const { progress, streak } = useProgress();

  const value = current ?? streak?.current ?? 0;

  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(value);
  const [incoming, setIncoming] = useState<number | null>(null);

  const roll = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rowHeight = Math.round(theme.size.md * theme.lineHeight.snug);

  useEffect(() => {
    if (value === shown) return;

    /* The chip mounts before progress has loaded, so the first number to arrive
       is not an increment — it is the number that was already true. Rolling it
       up would congratulate someone for opening the app twice. */
    if (reduceMotion || shown === 0) {
      setShown(value);
      return;
    }

    setIncoming(value);
    roll.setValue(0);
    pulse.setValue(0);

    const animation = Animated.parallel([
      Animated.timing(roll, {
        toValue: 1,
        duration: theme.duration.slow,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(pulse, { toValue: 1, useNativeDriver: true, friction: 4, tension: 120 }),
        Animated.spring(pulse, { toValue: 0, useNativeDriver: true, friction: 6, tension: 90 }),
      ]),
    ]);

    animation.start();

    /* The swap happens on a timer rather than in the animation callback: if the
       chip unmounts mid-roll the callback would set state on a dead component,
       and a cleared timer simply never fires. */
    settle.current = setTimeout(() => {
      setShown(value);
      setIncoming(null);
      roll.setValue(0);
    }, theme.duration.slow);

    return () => {
      animation.stop();
      if (settle.current) {
        clearTimeout(settle.current);
        settle.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion]);

  const outgoingY = roll.interpolate({ inputRange: [0, 1], outputRange: [0, -rowHeight] });
  const incomingY = roll.interpolate({ inputRange: [0, 1], outputRange: [rowHeight, 0] });
  const flameScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] });

  const label = t('progress.streakChipA11y', {
    days: t('progress.days', { count: value }),
  });

  return (
    <>
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.selectionAsync().catch(() => {});
          }
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={t('progress.streakChipHint')}
        hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
        testID={testID}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            minHeight: hit.min - 8,
            paddingHorizontal: spacing.md,
            borderRadius: radii.pill,
            backgroundColor: colors.primarySoft,
            borderWidth: 1,
            borderColor: colors.primaryBorder,
            opacity: pressed ? 0.75 : 1,
          },
          style,
        ]}
      >
        <Animated.View style={{ transform: [{ scale: flameScale }] }}>
          <Flame size={16} color={colors.primary} fill={value > 0 ? colors.primary : 'none'} />
        </Animated.View>

        <View style={{ height: rowHeight, overflow: 'hidden', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ translateY: outgoingY }] }}>
            <Text
              variant="captionStrong"
              color={colors.primary}
              style={{ lineHeight: rowHeight }}
              allowFontScaling={false}
            >
              {shown}
            </Text>
          </Animated.View>
          {incoming !== null ? (
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                transform: [{ translateY: incomingY }],
              }}
            >
              <Text
                variant="captionStrong"
                color={colors.primary}
                style={{ lineHeight: rowHeight }}
                allowFontScaling={false}
              >
                {incoming}
              </Text>
            </Animated.View>
          ) : null}
        </View>
      </Pressable>

      <StreakSheet
        visible={open}
        onClose={() => setOpen(false)}
        days={progress?.last_7_days ?? []}
      />
    </>
  );
}

/**
 * What a streak is, and what it is not.
 *
 * The second paragraph is the reason this sheet exists. Every other app with a
 * streak uses it as a threat; ours has to say out loud that nothing is lost,
 * because a 13-year-old reads a number going back to one and assumes it is.
 */
function StreakSheet({
  visible,
  onClose,
  days,
}: {
  visible: boolean;
  onClose: () => void;
  days: string[];
}) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();
  const { streak } = useProgress();

  const value = streak ?? {
    current: 0,
    longest: 0,
    total_days: 0,
    last_active_on: null,
    active_today: false,
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('progress.streakSheetTitle')}
      subtitle={
        value.current > 0
          ? t('progress.days', { count: value.current })
          : t('progress.streakNoneTitle')
      }
      testID="streak-sheet"
    >
      <StreakCalendar streak={value} days={days} style={{ marginBottom: spacing.xl }} />

      <Text variant="body" tone="secondary">
        {t('progress.streakWhat')}
      </Text>

      <Text variant="body" tone="secondary" style={{ marginTop: spacing.md }}>
        {t('progress.streakNoPressure')}
      </Text>

      {value.current === 0 ? (
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
          {t('progress.streakNoneBody')}
        </Text>
      ) : null}

      <Button
        label={t('progress.gotIt')}
        variant="secondary"
        fullWidth
        style={{ marginTop: spacing.xl }}
        onPress={onClose}
      />
    </Sheet>
  );
}
