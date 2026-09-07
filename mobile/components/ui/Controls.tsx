import React, { useRef } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  Switch as RNSwitch,
  View,
  ViewStyle,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

// ── SegmentedControl ──────────────────────────────────────────────────────────
interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
  testID?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
  testID,
}: SegmentedProps<T>) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const indicator = useRef(new Animated.Value(0)).current;
  const widthRef = useRef(0);

  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    indicator.setValue((index * widthRef.current) / options.length);
  };

  const moveTo = (i: number) =>
    Animated.timing(indicator, {
      toValue: (i * widthRef.current) / options.length,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

  return (
    <View
      onLayout={onLayout}
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.surfaceSunken,
          borderRadius: radii.pill,
          padding: 4,
          position: 'relative',
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: 4,
          width: `${100 / options.length}%`,
          borderRadius: radii.pill,
          backgroundColor: colors.surface,
          transform: [{ translateX: indicator }],
          ...theme.elevation(1),
        }}
      />
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              moveTo(i);
              onChange(opt.value);
            }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: spacing.sm + 2,
            }}
          >
            <Text variant="captionStrong" tone={active ? 'default' : 'muted'}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── ListItem ──────────────────────────────────────────────────────────────────
interface ListItemProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function ListItem({
  title,
  subtitle,
  left,
  right,
  onPress,
  showChevron,
  destructive,
  disabled,
  style,
  testID,
}: ListItemProps) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: 56,
          paddingVertical: spacing.md,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {left}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" tone={destructive ? 'danger' : 'default'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {showChevron ?? (onPress && !right) ? (
        <ChevronRight size={20} color={colors.textMuted} />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
    >
      {content}
    </Pressable>
  );
}

// ── Switch ────────────────────────────────────────────────────────────────────
export function Switch({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: colors.surfaceSunken, true: colors.primary }}
      thumbColor={colors.surface}
      ios_backgroundColor={colors.surfaceSunken}
    />
  );
}

// ── IconButton ────────────────────────────────────────────────────────────────
export function IconButton({
  icon,
  onPress,
  label,
  tone = 'neutral',
  size = 40,
  badge,
  style,
  testID,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  /** Required for screen readers. */
  label: string;
  tone?: 'neutral' | 'surface' | 'primary' | 'transparent';
  size?: number;
  badge?: number;
  style?: ViewStyle;
  testID?: string;
}) {
  const theme = useTheme();
  const { colors, radii } = theme;

  const bg = {
    neutral: colors.surfaceAlt,
    surface: colors.surface,
    primary: colors.primary,
    transparent: 'transparent',
  }[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      testID={testID}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radii.pill,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {icon}
      {badge && badge > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: 9,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.bg,
          }}
        >
          <Text variant="overline" color={colors.textOnBrand} style={{ fontSize: 9 }}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ style, inset = 0 }: { style?: ViewStyle; inset?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        { height: 1, backgroundColor: theme.colors.divider, marginLeft: inset },
        style,
      ]}
    />
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.md,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        {/* A short coloured bar. Twelve of these down a screen is what stops a
            list of sections reading as a list of grey headings. */}
        <LinearGradient
          colors={theme.gradients.action}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ width: 4, height: 20, borderRadius: 2 }}
        />
        <Text variant="heading">{title}</Text>
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text variant="captionStrong" tone="primary">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
