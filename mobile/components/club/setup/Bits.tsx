import React, { useState } from 'react';
import { View, ViewStyle } from 'react-native';
import { Plus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Input, Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { BadgeTone } from '@/components/ui';
import type { VerificationStatus } from '@/lib/api.club';

/** The small pieces every club-setup section is built from. */

/** A caption-sized label above a group of chips. */
export function GroupLabel({ children, hint }: { children: string; hint?: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xxs }}>
      <Text variant="captionStrong" tone="secondary">
        {children}
      </Text>
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** "Add your own" — a short text box and a plus button. */
export function AddOwnInput({
  placeholder,
  maxLength,
  onAdd,
  accessibilityLabel,
  testID,
}: {
  placeholder: string;
  maxLength: number;
  onAdd: (value: string) => void;
  accessibilityLabel: string;
  testID?: string;
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const [value, setValue] = useState('');

  const add = () => {
    const v = value.trim();
    if (!v) return;
    onAdd(v.slice(0, maxLength));
    setValue('');
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
      <Input
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        maxLength={maxLength}
        returnKeyType="done"
        onSubmitEditing={add}
        containerStyle={{ flex: 1 }}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      />
      <Button
        label={t('clubSetup.add')}
        variant="secondary"
        disabled={!value.trim()}
        onPress={add}
        icon={<Plus size={16} color={colors.text} />}
        accessibilityLabel={accessibilityLabel}
        style={{ minHeight: theme.hit.min }}
      />
    </View>
  );
}

/** "123/300" under a text box. */
export function counter(t: ReturnType<typeof useT>, value: string, max: number): string {
  return t('clubSetup.counter', { used: value.length, max });
}

/** A titled block on the edit screen, with its own Save. */
export function EditSection({
  title,
  subtitle,
  children,
  saving,
  onSave,
  testID,
  style,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  saving: boolean;
  onSave: () => void;
  testID?: string;
  style?: ViewStyle;
}) {
  const t = useT();
  const { spacing } = useTheme();
  return (
    <Card style={[{ gap: spacing.lg }, style ?? {}]} testID={testID}>
      <View style={{ gap: spacing.xxs }}>
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
      <Button
        label={t('clubSetup.edit.save')}
        loading={saving}
        onPress={onSave}
        fullWidth
        accessibilityLabel={t('clubSetup.edit.saveA11y', { section: title })}
        testID={testID ? `${testID}-save` : undefined}
      />
    </Card>
  );
}

/** Badge colour for each verification state. */
export const VERIFICATION_TONE: Record<VerificationStatus, BadgeTone> = {
  approved: 'success',
  pending: 'info',
  more_info: 'warning',
  rejected: 'danger',
  expired: 'warning',
};
