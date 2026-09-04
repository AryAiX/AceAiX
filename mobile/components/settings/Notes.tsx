import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View, ViewStyle } from 'react-native';
import { Check, CircleAlert, Info, Lock, ShieldCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';

export type NoteTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

interface NoteProps {
  children: string;
  tone?: NoteTone;
  icon?: 'info' | 'warning' | 'lock' | 'shield';
  /** Renders a tappable line under the note — used to link to another screen. */
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

/**
 * A short explanatory block.
 *
 * Used wherever a control is restricted and the honest reason has to sit next
 * to it — "a parent or guardian needs to approve this first" and friends.
 */
export function InfoNote({
  children,
  tone = 'info',
  icon = 'info',
  actionLabel,
  onAction,
  style,
}: NoteProps) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  const skin: Record<NoteTone, { bg: string; fg: string; border: string }> = {
    info: { bg: colors.infoSoft, fg: colors.info, border: colors.info },
    warning: { bg: colors.warningSoft, fg: colors.warning, border: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.danger },
    success: { bg: colors.successSoft, fg: colors.success, border: colors.success },
    neutral: { bg: colors.surfaceAlt, fg: colors.textMuted, border: colors.border },
  };

  const s = skin[tone];
  const Icon = { info: Info, warning: CircleAlert, lock: Lock, shield: ShieldCheck }[icon];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: spacing.md,
          backgroundColor: s.bg,
          borderRadius: radii.md,
          borderLeftWidth: 3,
          borderLeftColor: s.border,
          padding: spacing.md,
        },
        style,
      ]}
    >
      <Icon size={18} color={s.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="caption" tone="secondary">
          {children}
        </Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            hitSlop={10}
            accessibilityRole="link"
            accessibilityLabel={actionLabel}
            style={{ minHeight: 24, justifyContent: 'center' }}
          >
            <Text variant="captionStrong" tone="primary">
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The inline "Saved" affordance.
 *
 * Settings that save on change need to say so without a button; this fades in
 * when `visible` flips true and fades out again on its own.
 */
export function SavedBadge({ visible, label }: { visible: boolean; label?: string }) {
  const theme = useTheme();
  const { colors, spacing, radii, duration } = theme;
  const t = useT();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? duration.fast : duration.base,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity, duration]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        opacity,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        backgroundColor: colors.successSoft,
        borderRadius: radii.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
      }}
    >
      <Check size={12} color={colors.success} strokeWidth={3} />
      <Text variant="overline" color={colors.success}>
        {label ?? t('common.saved')}
      </Text>
    </Animated.View>
  );
}

/** Screen-level intro copy: a heading and a sentence of context. */
export function SettingsIntro({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xs, marginBottom: theme.spacing.lg }}>
      <Text variant="heading">{title}</Text>
      <Text variant="caption" tone="muted">
        {body}
      </Text>
    </View>
  );
}
