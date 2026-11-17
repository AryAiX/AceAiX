import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Chip, Text } from '@/components/ui';
import { useT } from '@/i18n';

type Group = 'need' | 'give' | 'offer';

/** Read-only tags: what an athlete needs, gives back, or what a sponsor offers. */
export function TagRow({
  group,
  tags,
  label,
  otherText,
  max,
}: {
  group: Group;
  tags: readonly string[];
  label?: string;
  /** Free text stored with the "other" need, shown as "Other: …". */
  otherText?: string | null;
  /** Show this many, then a "+N" for the rest. */
  max?: number;
}) {
  const { colors, spacing, radii } = useTheme();
  const t = useT();
  if (tags.length === 0) return null;
  const detail = otherText?.trim();
  const shown = max && tags.length > max ? tags.slice(0, max) : tags;
  const more = tags.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {label ? (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      ) : null}
      {shown.map((tag) => (
        <View
          key={tag}
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: 3,
            borderRadius: radii.pill,
            backgroundColor: colors.surfaceAlt,
          }}
        >
          <Text variant="caption" tone="secondary">
            {group === 'need' && tag === 'other' && detail
              ? t('sponsorship.need.otherDetail', { detail })
              : t(`sponsorship.${group}.${tag}`)}
          </Text>
        </View>
      ))}
      {more > 0 ? (
        <View
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: 3,
            borderRadius: radii.pill,
            backgroundColor: colors.surfaceAlt,
          }}
        >
          <Text variant="caption" tone="secondary">
            {`+${more}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** The same vocabulary as a multi-select, for the forms. */
export function TagPicker<T extends string>({
  group,
  options,
  value,
  onToggle,
  label,
  required,
  error,
}: {
  group: Group;
  options: readonly T[];
  value: readonly T[];
  onToggle: (tag: T) => void;
  label: string;
  required?: boolean;
  error?: string | null;
}) {
  const { spacing } = useTheme();
  const t = useT();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="captionStrong" tone="secondary">
        {label}
        {required ? (
          <Text variant="captionStrong" tone="danger">
            {' *'}
          </Text>
        ) : null}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((option) => (
          <Chip
            key={option}
            label={t(`sponsorship.${group}.${option}`)}
            selected={value.includes(option)}
            onPress={() => onToggle(option)}
            testID={`tag-${group}-${option}`}
          />
        ))}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
