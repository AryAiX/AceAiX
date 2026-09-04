import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Share,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Flame } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TierColors, type Tier } from '@/theme/tokens';
import { Button, ScoreRing, Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { AchievementKey } from '@/types/models';
import { AchievementBadge } from './AchievementBadge';
import { Confetti } from './Confetti';
import { achievementFor } from './achievements';

/** One thing worth stopping the app for. */
export type CelebrationItem =
  | { kind: 'achievement'; key: AchievementKey }
  | { kind: 'tier'; from: number | null; to: number; tier: Tier }
  | { kind: 'streak'; days: number };

interface Props {
  /** The queue. An empty array means the overlay is not shown at all. */
  items: CelebrationItem[];
  onDone: () => void;
  /**
   * How many are shown one after another before the rest are summarised.
   * Three is the point at which a celebration becomes a slideshow.
   */
  maxInARow?: number;
}

const TIER_NAME_KEYS: Record<Tier, string> = {
  rising: 'common.tierRising',
  bronze: 'common.tierBronze',
  silver: 'common.tierSilver',
  gold: 'common.tierGold',
  elite: 'common.tierElite',
};

/** Web only has a share sheet if the browser gives us one. */
function canShare(): boolean {
  if (Platform.OS !== 'web') return true;
  const nav = (globalThis as { navigator?: { share?: unknown } }).navigator;
  return typeof nav?.share === 'function';
}

/**
 * The moment itself.
 *
 * Shows one thing at a time, in the order it was earned, and gets out of the
 * way. A person who has been offline for a fortnight comes back to three cards
 * and a line saying how many more are waiting on the wall — not eleven taps of
 * a "Nice" button.
 *
 * Every animation here has a still equivalent: with Reduce Motion on, the badge
 * fades instead of springing, the score is already counted, and no confetti is
 * drawn. Nothing is only communicated by movement.
 */
export function CelebrationOverlay({ items, onDone, maxInARow = 3 }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const reduceMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  const visible = items.length > 0;

  const shown = items.slice(0, Math.max(1, maxInARow));
  const overflow = items.length - shown.length;
  const current = shown[Math.min(index, shown.length - 1)] as CelebrationItem | undefined;
  const isLast = index >= shown.length - 1;

  // A new queue always starts at the front.
  useEffect(() => {
    if (visible) setIndex(0);
  }, [items, visible]);

  // One haptic per card, matched to how big the moment is.
  useEffect(() => {
    if (!visible || !current || Platform.OS === 'web') return;
    if (current.kind === 'tier') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [visible, current]);

  const advance = useCallback(() => {
    if (isLast) {
      setIndex(0);
      onDone();
      return;
    }
    setIndex((i) => i + 1);
  }, [isLast, onDone]);

  if (!visible || !current) return null;

  const window = Dimensions.get('window');
  const confettiCount = current.kind === 'tier' ? 46 : 32;
  const confettiColors =
    current.kind === 'tier'
      ? [TierColors[current.tier], colors.accent, colors.primary, colors.info]
      : undefined;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={advance}
      testID="celebration-overlay"
    >
      <View
        accessibilityViewIsModal
        style={{ flex: 1, backgroundColor: colors.overlay }}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.xl,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: radii.xxl,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.xxl,
              paddingBottom: spacing.xl,
              ...theme.elevation(3),
            }}
          >
            {/* `key` remounts the card so each item arrives on its own. */}
            <CelebrationCard key={index} item={current} />

            {isLast && overflow > 0 ? (
              <Text
                variant="caption"
                tone="muted"
                align="center"
                style={{ marginTop: spacing.md }}
              >
                {t('progress.andMore', { count: overflow })}
              </Text>
            ) : null}

            <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xl }}>
              <Button
                label={isLast ? t('progress.celebrateNice') : t('progress.celebrateNext')}
                fullWidth
                onPress={advance}
                testID="celebration-dismiss"
              />
              {current.kind === 'tier' && canShare() ? (
                <ShareTierButton tier={current.tier} score={current.to} />
              ) : null}
            </View>

            {shown.length > 1 ? (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{ flexDirection: 'row', gap: 6, marginTop: spacing.lg }}
              >
                {shown.map((_, dot) => (
                  <View
                    key={dot}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: dot === index ? colors.primary : colors.border,
                    }}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {/* Outside the padded column so the burst covers the whole screen. */}
        {reduceMotion ? null : (
          <Confetti
            key={`confetti-${index}`}
            count={confettiCount}
            colors={confettiColors}
            origin={{ x: window.width / 2, y: window.height * 0.24 }}
          />
        )}
      </View>
    </Modal>
  );
}

// ── The cards ────────────────────────────────────────────────────────────────

function CelebrationCard({ item }: { item: CelebrationItem }) {
  switch (item.kind) {
    case 'achievement':
      return <AchievementCard achievementKey={item.key} />;
    case 'tier':
      return <TierCard from={item.from} to={item.to} tier={item.tier} />;
    case 'streak':
      return <StreakCard days={item.days} />;
  }
}

function Eyebrow({ label, color }: { label: string; color?: string }) {
  const theme = useTheme();
  return (
    <Text variant="overline" color={color ?? theme.colors.textMuted} align="center">
      {label}
    </Text>
  );
}

function AchievementCard({ achievementKey }: { achievementKey: AchievementKey }) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();

  const meta = achievementFor(achievementKey);
  if (!meta) return null;

  return (
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <AchievementBadge meta={meta} size="lg" animateIn />
      <Eyebrow label={t('progress.celebrateAchievementEyebrow')} />
      <Text variant="title" align="center">
        {t(meta.titleKey)}
      </Text>
      <Text variant="body" tone="secondary" align="center">
        {t(meta.hintKey)}
      </Text>
    </View>
  );
}

/**
 * A tier promotion.
 *
 * The ring counts from the score they had to the score they have, because the
 * distance travelled is the story — a dial that fills from zero says nothing
 * about what changed today.
 */
function TierCard({ from, to, tier }: { from: number | null; to: number; tier: Tier }) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();
  const reduceMotion = useReducedMotion();

  const start = from ?? to;
  const [displayed, setDisplayed] = useState(reduceMotion ? to : start);
  const counter = useRef(new Animated.Value(start)).current;

  useEffect(() => {
    if (reduceMotion || start === to) {
      setDisplayed(to);
      return;
    }

    const listener = counter.addListener(({ value }) => {
      setDisplayed((shown) => {
        const next = Math.round(value);
        return next === shown ? shown : next;
      });
    });

    const animation = Animated.timing(counter, {
      toValue: to,
      duration: 1100,
      useNativeDriver: false,
    });
    animation.start();

    return () => {
      animation.stop();
      counter.removeListener(listener);
    };
  }, [counter, start, to, reduceMotion]);

  const tierColor = TierColors[tier];
  const tierName = t(TIER_NAME_KEYS[tier]);

  return (
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <ScoreRing score={displayed} size={148} showTier={false} animate={false} />
      <Eyebrow label={t('progress.celebrateTierEyebrow')} color={tierColor} />
      <Text variant="title" align="center" color={tierColor}>
        {tierName}
      </Text>
      <Text variant="body" tone="secondary" align="center">
        {t('progress.celebrateTierBody', { score: to })}
      </Text>
    </View>
  );
}

function StreakCard({ days }: { days: number }) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const reduceMotion = useReducedMotion();

  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = reduceMotion
      ? Animated.timing(enter, {
          toValue: 1,
          duration: theme.duration.slow,
          useNativeDriver: true,
        })
      : Animated.spring(enter, { toValue: 1, useNativeDriver: true, friction: 5, tension: 90 });
    animation.start();
    return () => animation.stop();
  }, [enter, reduceMotion, theme.duration.slow]);

  const scale = reduceMotion
    ? 1
    : enter.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <Animated.View
        style={{
          width: 116,
          height: 116,
          borderRadius: radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primarySoft,
          borderWidth: 3,
          borderColor: colors.primaryBorder,
          opacity: enter,
          transform: [{ scale }],
        }}
      >
        <Flame size={44} color={colors.primary} fill={colors.primary} />
        <Text variant="stat" color={colors.primary} style={{ marginTop: 2 }}>
          {days}
        </Text>
      </Animated.View>

      <Eyebrow label={t('progress.celebrateStreakEyebrow')} color={colors.primary} />
      <Text variant="title" align="center">
        {t('progress.streakMilestone', { count: days })}
      </Text>
      <Text variant="body" tone="secondary" align="center">
        {t('progress.celebrateStreakBody')}
      </Text>
    </View>
  );
}

/**
 * Share a tier promotion as a sentence.
 *
 * Text only, on purpose: rendering an image would mean composing something with
 * a young person's name and photo on it and handing it to whatever app they
 * pick next. A sentence they can read before they send it is the safer object.
 */
function ShareTierButton({ tier, score }: { tier: Tier; score: number }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await Share.share({
        message: t('progress.shareTierMessage', {
          tier: t(TIER_NAME_KEYS[tier]),
          score,
        }),
      });
    } catch {
      /* Dismissed, or no share sheet on this platform. Either way, silence. */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      label={t('progress.celebrateShare')}
      variant="secondary"
      fullWidth
      onPress={onPress}
      testID="celebration-share"
    />
  );
}
