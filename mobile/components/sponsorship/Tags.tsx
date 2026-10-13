import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Chip, Text } from '@/components/ui';
import { useT } from '@/i18n';

type Group = 'need' | 'give' | 'offer';

/** Read-only tags: what an athlete needs, gives back, or what a sponsor offers. */
export function TagRow({ group, tags, label }: { group: Group; tags: readonly string[]; label?: string }) {
  const { colors, spacing, radii } = useTheme();
  const t = useT();
  if (tags.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {label ? (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      ) : null}
      {tags.map((tag) => (
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
            {t(`sponsorship.${group}.${tag}`)}
          </Text>
        </View>
      ))}
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
}: {
  group: Group;
  options: readonly T[];
  value: readonly T[];
  onToggle: (tag: T) => void;
  label: string;
}) {
  const { spacing } = useTheme();
  const t = useT();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="captionStrong" tone="secondary">
        {label}
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
    </View>
  );
}
