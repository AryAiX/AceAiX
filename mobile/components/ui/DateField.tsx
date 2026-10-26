import React, { useState } from 'react';
import { Platform, Pressable, View, type ViewStyle } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/i18n';
import { fullDate } from '@/lib/format';
import { Button } from './Button';
import { Text } from './Text';

interface Props {
  label: string;
  /** Calendar day already chosen, or null when the field is empty. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Earliest day a new pick may land on. Defaults to today. Does not hide a saved earlier day. */
  minimumDate?: Date;
  /** Shows Clear once a day is set. The field can be left empty. */
  optional?: boolean;
  error?: string | null;
  testID?: string;
  style?: ViewStyle;
}

/** Local calendar day. `toISOString()` would shift it for anyone east or west of UTC. */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function fromIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

/**
 * One calendar day, in the person's language.
 *
 * iOS and Android open the native date picker. The web lays the browser's
 * date input over the same row, so both show a formatted day rather than
 * YYYY-MM-DD. A day saved in the past still reads as that day; `minimumDate`
 * only bounds the next choice.
 */
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  optional = false,
  error,
  testID,
  style,
}: Props) {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing, radii } = theme;
  const [picking, setPicking] = useState(false);

  const minimum = startOfDay(minimumDate ?? new Date());
  const selected = value ? fromIsoDate(value) : null;
  const shown = selected ? fullDate(value) : t('common.dateNone');
  const showClear = optional && selected != null;
  /* The native picker rejects a value earlier than minimumDate, so a saved
     past day stays on the label and the wheel opens on the earliest new pick. */
  const pickerValue = selected && selected.getTime() >= minimum.getTime() ? selected : minimum;

  const chooseLabel = selected
    ? t('common.dateChange', { date: fullDate(value) })
    : t('common.dateNone');

  const commit = (next: string | null) => {
    setPicking(false);
    onChange(next);
  };

  const borderColor = error ? colors.danger : selected ? colors.primary : colors.border;

  const face = (
    <View
      pointerEvents="none"
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        minHeight: 52,
      }}
    >
      <CalendarDays size={20} color={selected ? colors.primary : colors.textMuted} />
      <Text variant="body" tone={selected ? 'default' : 'muted'} style={{ flex: 1 }} numberOfLines={1}>
        {shown}
      </Text>
    </View>
  );

  return (
    <View style={[{ gap: spacing.sm }, style]} testID={testID}>
      <Text variant="captionStrong" tone="secondary">
        {label}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 52,
          borderRadius: radii.md,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: colors.surface,
          overflow: 'hidden',
        }}
      >
        {Platform.OS === 'web' ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            {face}
            <input
              type="date"
              min={toIsoDate(minimum)}
              value={selected ? value ?? '' : ''}
              onChange={(event) => {
                const next = event.currentTarget.value;
                onChange(next || null);
              }}
              aria-label={chooseLabel}
              aria-invalid={error ? true : undefined}
              data-testid={testID ? `${testID}-input` : undefined}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                opacity: 0.01,
                cursor: 'pointer',
              }}
            />
          </View>
        ) : (
          <Pressable
            onPress={() => setPicking(true)}
            accessibilityRole="button"
            accessibilityLabel={chooseLabel}
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}
          >
            {face}
          </Pressable>
        )}

        {showClear ? (
          <Pressable
            onPress={() => commit(null)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('common.dateClearA11y')}
            style={{
              minHeight: 44,
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
            }}
          >
            <Text variant="captionStrong" tone="primary">
              {t('common.clear')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {picking && Platform.OS !== 'web' ? (
        <View
          style={
            Platform.OS === 'ios'
              ? {
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  overflow: 'hidden',
                }
              : undefined
          }
        >
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={minimum}
            themeVariant={theme.scheme}
            onChange={(event, picked) => {
              // Android shows a dialog and closes itself; iOS stays inline.
              if (Platform.OS !== 'ios') setPicking(false);
              // 'dismissed' still carries a date on Android — cancelling
              // must not quietly pick one.
              if (event.type === 'set' && picked) onChange(toIsoDate(picked));
            }}
          />
          {Platform.OS === 'ios' ? (
            <Button
              label={t('common.done')}
              variant="ghost"
              fullWidth
              size="sm"
              onPress={() => setPicking(false)}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
