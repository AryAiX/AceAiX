import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from './Button';
import { Text } from './Text';

// ── EmptyState ────────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  style?: ViewStyle;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  style,
  compact,
}: EmptyStateProps) {
  const theme = useTheme();
  const { spacing, radii } = theme;

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: compact ? spacing.xxl : spacing.giant,
          paddingHorizontal: spacing.xl,
          gap: spacing.md,
        },
        style,
      ]}
    >
      {icon ? (
        /* An empty screen is the one place with nothing else to look at, so the
           bubble is the picture: a soft wash of the brand gradient rather than
           a grey square. */
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radii.xl,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.xs,
          }}
        >
          <LinearGradient
            colors={[
              theme.alpha(theme.gradients.hero[0], 0.22),
              theme.alpha(theme.gradients.hero[1], 0.22),
              theme.alpha(theme.gradients.hero[2], 0.22),
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Wrapped for the same reason the tab bar's plus is. */}
          <View>{icon}</View>
        </View>
      ) : null}
      <Text variant="heading" align="center">
        {title}
      </Text>
      {body ? (
        <Text variant="caption" tone="muted" align="center" style={{ maxWidth: 320 }}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: spacing.sm }} />
      ) : null}
      {secondaryLabel && onSecondary ? (
        <Button label={secondaryLabel} variant="ghost" size="sm" onPress={onSecondary} />
      ) : null}
    </View>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/**
 * A loading placeholder with a light travelling across it.
 *
 * The sheen reads as "this is coming" in a way a pulsing block never does. It
 * is a transform on the native driver, so a screen full of them costs nothing
 * on the JS thread. Reduce-motion gets the old opacity pulse instead.
 */
export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  const theme = useTheme();
  const { colors } = theme;
  const reduced = useReducedMotion();

  const pulse = useRef(new Animated.Value(1)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const [measured, setMeasured] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setMeasured(Math.round(e.nativeEvent.layout.width));
  }, []);

  useEffect(() => {
    if (!reduced) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);

  useEffect(() => {
    if (reduced || measured <= 0) return;
    sweep.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(320),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep, reduced, measured]);

  /* A pale sheen in light mode, a faint white one in the dark — never a colour
     of its own, so a loading screen stays quiet. */
  const sheenColor = theme.alpha(
    theme.scheme === 'dark' ? colors.surfaceInverse : colors.surface,
    theme.scheme === 'dark' ? 0.09 : 0.95,
  );
  const sheenEdge = theme.alpha(
    theme.scheme === 'dark' ? colors.surfaceInverse : colors.surface,
    0,
  );
  const band = Math.max(48, Math.round(measured * 0.55));

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.skeleton,
          overflow: 'hidden',
          opacity: pulse,
        },
        style,
      ]}
    >
      {!reduced && measured > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: band,
            transform: [
              {
                translateX: sweep.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-band, measured],
                }),
              },
            ],
          }}
        >
          <LinearGradient
            colors={[sheenEdge, sheenColor, sheenEdge]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** A stack of skeleton rows shaped like a feed post or list item. */
export function SkeletonList({ count = 3, variant = 'card' }: { count?: number; variant?: 'card' | 'row' }) {
  const theme = useTheme();
  const { spacing, radii, colors } = theme;

  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Skeleton width={44} height={44} radius={22} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="55%" height={13} />
              <Skeleton width="35%" height={11} />
            </View>
          </View>
          {variant === 'card' ? <Skeleton height={140} radius={12} /> : null}
          <Skeleton width="85%" height={12} />
        </View>
      ))}
    </View>
  );
}

// ── Loader ────────────────────────────────────────────────────────────────────
export function Loader({ label, style }: { label?: string; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View
      style={[
        { alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xxl, gap: theme.spacing.md },
        style,
      ]}
    >
      <ActivityIndicator color={theme.colors.primary} />
      {label ? (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

// ── ErrorState ────────────────────────────────────────────────────────────────
export function ErrorState({
  message,
  onRetry,
  compact,
}: {
  message?: string | null;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <EmptyState
      compact={compact}
      title="Something went wrong"
      body={message ?? 'Check your connection and try again.'}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
    />
  );
}
