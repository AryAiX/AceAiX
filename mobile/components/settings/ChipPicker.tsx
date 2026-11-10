import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Dropdown, Text, type ChipTone } from '@/components/ui';
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
  /** Kept for callers; the dropdown looks the same for every list. */
  tone?: ChipTone;
  /** An emoji before each option (a sport's ball, say). */
  emojiOf?: (value: string) => string | undefined;
}

/**
 * A labelled multi-select. It used to be a wrapping wall of chips; it is now
 * the app's one dropdown (the row is the search box, ticks in the list), so
 * the scouting screen matches every filter in the app.
 */
export function ChipPicker({
  label,
  hint,
  options,
  selected,
  onToggle,
  labelOf,
  emptyHint,
  emojiOf,
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
        <Dropdown
          multiple
          options={options.map((option) => ({
            key: option,
            label: labelOf ? labelOf(option) : option,
            emoji: emojiOf?.(option),
          }))}
          value={selected}
          onChange={(next) => {
            /* Callers toggle one value at a time; pass on whichever changed. */
            const changed =
              next.find((key) => !selected.includes(key)) ?? selected.find((key) => !next.includes(key));
            if (changed) onToggle(changed);
          }}
        />
      )}
    </View>
  );
}
