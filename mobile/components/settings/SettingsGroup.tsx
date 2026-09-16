import React from 'react';
import { View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Divider, ListItem, Switch, Text } from '@/components/ui';

/**
 * The grouped-list building blocks the settings tree is made of.
 *
 * A group is one card; rows inside it are separated by an inset divider so the
 * leading icons line up down the left edge, the way people expect a settings
 * list to look on both platforms.
 */

interface GroupProps {
  title?: string;
  /** Small explanatory line under the last row. */
  footer?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SettingsGroup({ title, footer, children, style }: GroupProps) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  const rows = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={[{ marginBottom: spacing.xl }, style]}>
      {title ? (
        <Text
          variant="overline"
          tone="muted"
          style={{ marginBottom: spacing.sm, marginLeft: spacing.xs }}
        >
          {title}
        </Text>
      ) : null}

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.lg,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 ? <Divider inset={44} /> : null}
            {row}
          </View>
        ))}
      </View>

      {footer ? (
        <Text
          variant="caption"
          tone="muted"
          style={{ marginTop: spacing.sm, marginHorizontal: spacing.xs }}
        >
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

/** A 28pt tinted square holding a lucide icon, sized for a settings row. */
export function RowIcon({
  icon,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  tone?: 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger';
}) {
  const theme = useTheme();
  const { colors, radii } = theme;

  const bg = {
    neutral: colors.surfaceAlt,
    primary: colors.primarySoft,
    info: colors.infoSoft,
    success: colors.successSoft,
    warning: colors.warningSoft,
    danger: colors.dangerSoft,
  }[tone];

  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: radii.xs,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </View>
  );
}

interface RowProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconTone?: 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger';
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  right?: React.ReactNode;
  testID?: string;
}

export function SettingsRow({
  title,
  subtitle,
  icon,
  iconTone = 'neutral',
  value,
  onPress,
  destructive,
  disabled,
  right,
  testID,
}: RowProps) {
  const theme = useTheme();

  const trailing =
    right ??
    (value ? (
      <Text variant="caption" tone="muted" numberOfLines={1} style={{ maxWidth: 140 }}>
        {value}
      </Text>
    ) : undefined);

  return (
    <ListItem
      title={title}
      subtitle={subtitle}
      left={icon ? <RowIcon icon={icon} tone={destructive ? 'danger' : iconTone} /> : undefined}
      right={trailing}
      onPress={onPress}
      destructive={destructive}
      disabled={disabled}
      showChevron={!!onPress}
      testID={testID}
      style={{ minHeight: theme.hit.min }}
    />
  );
}

interface SwitchRowProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

export function SettingsSwitchRow({
  title,
  subtitle,
  icon,
  value,
  onValueChange,
  disabled,
  testID,
}: SwitchRowProps) {
  const theme = useTheme();

  return (
    <ListItem
      title={title}
      subtitle={subtitle}
      left={icon ? <RowIcon icon={icon} /> : undefined}
      showChevron={false}
      disabled={disabled}
      testID={testID}
      style={{ minHeight: theme.hit.min }}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          accessibilityLabel={title}
        />
      }
    />
  );
}
