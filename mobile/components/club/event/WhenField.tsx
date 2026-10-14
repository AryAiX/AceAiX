import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { CalendarClock } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Chip, Input, Sheet, Text } from '@/components/ui';
import { DayStrip } from '@/components/coaching/DayStrip';
import { useT } from '@/i18n';
import { dayKey, startOfDay } from '@/lib/coaching';
import { currentLanguage } from '@/lib/i18n-bridge';

import { dateTimeLabel } from '../match/matchFormat';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06 → 23
const MINUTES = [0, 15, 30, 45];
const AHEAD_DAYS = 180;

interface Props {
  label: string;
  value: Date | null;
  onChange: (next: Date | null) => void;
  required?: boolean;
  error?: string | null;
  /** How many days before today can be picked (a result entered late). */
  pastDays?: number;
  /** Show a "Clear" action — for an optional end time. */
  clearable?: boolean;
  testID?: string;
}

/**
 * A date and a time without a native picker module: a strip of days, then
 * hour and minute chips. Same approach as meetups and coaching slots, so it
 * works in Expo Go and on the web alike.
 */
export function WhenField({ label, value, onChange, required, error, pastDays = 0, clearable, testID }: Props) {
  const { colors, spacing } = useTheme();
  const t = useT();
  const locale = currentLanguage();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [minute, setMinute] = useState<number>(0);

  useEffect(() => {
    if (!open) return;
    setDay(value ? dayKey(value) : null);
    setHour(value ? value.getHours() : null);
    setMinute(value ? value.getMinutes() : 0);
  }, [open, value]);

  const days = useMemo(() => {
    const today = new Date();
    const list = Array.from({ length: AHEAD_DAYS + pastDays }, (_, i) => startOfDay(today, i - pastDays));
    if (value && !list.some((d) => dayKey(d) === dayKey(value))) list.unshift(startOfDay(value));
    return list;
  }, [pastDays, value]);

  const minutes = MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort((a, b) => a - b);
  const hours = hour != null && !HOURS.includes(hour) ? [...HOURS, hour].sort((a, b) => a - b) : HOURS;

  const apply = () => {
    const d = days.find((x) => dayKey(x) === day);
    if (!d || hour == null) return;
    onChange(new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute));
    setOpen(false);
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label} testID={testID}>
        <Input
          label={label}
          value={value ? dateTimeLabel(value.toISOString(), locale) : ''}
          placeholder={t('clubMatch.when.pick')}
          editable={false}
          pointerEvents="none"
          required={required}
          error={error}
          icon={<CalendarClock size={18} color={colors.textMuted} />}
        />
      </Pressable>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        footer={
          <View style={{ gap: spacing.sm }}>
            <Button label={t('common.done')} fullWidth size="lg" disabled={!day || hour == null} onPress={apply} />
            {clearable && value ? (
              <Button
                label={t('clubMatch.when.clear')}
                variant="ghost"
                fullWidth
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
              />
            ) : null}
          </View>
        }
      >
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <Text variant="captionStrong" tone="secondary">
              {t('clubMatch.when.day')}
            </Text>
            <DayStrip days={days.map((d) => ({ key: dayKey(d), date: d }))} selected={day} onSelect={setDay} />
          </View>
          <View style={{ gap: spacing.sm }}>
            <Text variant="captionStrong" tone="secondary">
              {t('clubMatch.when.hour')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {hours.map((h) => (
                <Chip key={h} label={`${String(h).padStart(2, '0')}`} selected={hour === h} onPress={() => setHour(h)} />
              ))}
            </View>
          </View>
          <View style={{ gap: spacing.sm }}>
            <Text variant="captionStrong" tone="secondary">
              {t('clubMatch.when.minute')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {minutes.map((m) => (
                <Chip
                  key={m}
                  label={`:${String(m).padStart(2, '0')}`}
                  selected={minute === m}
                  onPress={() => setMinute(m)}
                />
              ))}
            </View>
          </View>
          {day && hour != null ? (
            <Text variant="bodyStrong" align="center">
              {(() => {
                const d = days.find((x) => dayKey(x) === day);
                return d
                  ? dateTimeLabel(new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute).toISOString(), locale)
                  : '';
              })()}
            </Text>
          ) : null}
        </View>
      </Sheet>
    </>
  );
}
