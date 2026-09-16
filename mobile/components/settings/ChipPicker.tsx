import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Chip, Text } from '@/components/ui';
import { useT } from '@/i18n';

interface Props {
  label: string;
  hint?: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  /** Maps a stored value to the words shown on its chip. */
  labelOf?: (value: string) => string;
  /** Shown instead of the chips when `options` is empty. */
  emptyHint?: string;
}

/**
 * A wrapping multi-select of chips.
 *
 * Preferred over a picker or a slider throughout the scouting screen: the whole
 * set of choices stays visible, and every target is a full chip.
 */
export function ChipPicker({
  label,
  hint,
  options,
  selected,
  onToggle,
  labelOf,
  emptyHint,
}: Props) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ gap: 2 }}>
        <Text variant="captionStrong" tone="secondary">
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>

      {options.length === 0 ? (
        <Text variant="caption" tone="muted">
          {emptyHint ?? t('settings.nothingToChoose')}
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {options.map((option) => (
            <Chip
              key={option}
              label={labelOf ? labelOf(option) : option}
              selected={selected.includes(option)}
              onPress={() => onToggle(option)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
