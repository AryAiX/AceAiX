import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Chip, Text } from '@/components/ui';
import { useI18n, useT } from '@/i18n';

interface Props {
  label: string;
  /** '' or 'YYYY-MM-DD'. */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string | null;
}

type Part = 'day' | 'month' | 'year';

function parseValue(value: string): { day: number | null; month: number | null; year: number | null } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return { day: null, month: null, year: null };
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function daysInMonth(year: number | null, month: number | null): number {
  if (year == null || month == null) return 31;
  return new Date(year, month, 0).getDate();
}

function toIso(day: number, month: number, year: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Day, month, and year, each opening a grid under the row. Built to live
 * inside a sheet, so it never opens a modal or a native picker.
 */
export function MatchDateField({ label, value, onChange, required, error }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const { language } = useI18n();

  const initial = parseValue(value);
  const [day, setDay] = useState<number | null>(initial.day);
  const [month, setMonth] = useState<number | null>(initial.month);
  const [year, setYear] = useState<number | null>(initial.year);
  const [open, setOpen] = useState<Part | null>(null);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  const years: number[] = [];
  for (let y = currentYear; y >= currentYear - 20; y -= 1) years.push(y);

  const publish = (nextDay: number | null, nextMonth: number | null, nextYear: number | null) => {
    if (nextDay != null && nextMonth != null && nextYear != null) {
      onChange(toIso(nextDay, nextMonth, nextYear));
    } else {
      onChange('');
    }
  };

  const monthIsFuture = (m: number, y: number | null) => y === currentYear && m > currentMonth;

  const dayIsUnavailable = (d: number, m: number | null, y: number | null) => {
    if (d > daysInMonth(y, m)) return true;
    return y === currentYear && m === currentMonth && d > currentDay;
  };

  const chooseYear = (y: number) => {
    let nextMonth = month;
    let nextDay = day;
    if (nextMonth != null && monthIsFuture(nextMonth, y)) {
      nextMonth = null;
      nextDay = null;
    } else if (nextDay != null && dayIsUnavailable(nextDay, nextMonth, y)) {
      nextDay = null;
    }
    setYear(y);
    setMonth(nextMonth);
    setDay(nextDay);
    setOpen(null);
    publish(nextDay, nextMonth, y);
  };

  const chooseMonth = (m: number) => {
    let nextDay = day;
    if (monthIsFuture(m, year)) {
      setMonth(null);
      setDay(null);
      setOpen(null);
      publish(null, null, year);
      return;
    }
    if (nextDay != null && dayIsUnavailable(nextDay, m, year)) nextDay = null;
    setMonth(m);
    setDay(nextDay);
    setOpen(null);
    publish(nextDay, m, year);
  };

  const chooseDay = (d: number) => {
    setDay(d);
    setOpen(null);
    publish(d, month, year);
  };

  const monthName = (m: number) =>
    new Date(2000, m - 1, 1).toLocaleDateString(language, { month: 'short' });

  const toggle = (part: Part) => setOpen((current) => (current === part ? null : part));

  const boxBorder = (part: Part) =>
    open === part ? colors.primary : error ? colors.danger : colors.border;

  const boxes: { part: Part; text: string; chosen: boolean; a11y: string }[] = [
    {
      part: 'day',
      text: day != null ? String(day) : t('profile.matchDay'),
      chosen: day != null,
      a11y: day != null ? `${t('profile.matchDay')}, ${day}` : `${t('profile.matchDay')}, not chosen`,
    },
    {
      part: 'month',
      text: month != null ? monthName(month) : t('profile.matchMonth'),
      chosen: month != null,
      a11y:
        month != null
          ? `${t('profile.matchMonth')}, ${monthName(month)}`
          : `${t('profile.matchMonth')}, not chosen`,
    },
    {
      part: 'year',
      text: year != null ? String(year) : t('profile.matchYear'),
      chosen: year != null,
      a11y: year != null ? `${t('profile.matchYear')}, ${year}` : `${t('profile.matchYear')}, not chosen`,
    },
  ];

  return (
    <View style={{ gap: 6 }}>
      <Text variant="captionStrong" tone="secondary">
        {label}
        {required ? <Text variant="captionStrong" tone="danger">{' *'}</Text> : null}
      </Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {boxes.map((box) => (
          <Pressable
            key={box.part}
            onPress={() => toggle(box.part)}
            accessibilityRole="button"
            accessibilityLabel={box.a11y}
            accessibilityState={{ expanded: open === box.part }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.surface,
              borderWidth: 1.5,
              borderColor: boxBorder(box.part),
              borderRadius: radii.md,
              paddingHorizontal: spacing.md,
              minHeight: 52,
              gap: spacing.xs,
            }}
          >
            <Text
              variant="body"
              tone={box.chosen ? 'default' : 'muted'}
              numberOfLines={1}
              style={{ flex: 1 }}
            >
              {box.text}
            </Text>
            {open === box.part ? (
              <ChevronUp size={16} color={colors.textMuted} />
            ) : (
              <ChevronDown size={16} color={colors.textMuted} />
            )}
          </Pressable>
        ))}
      </View>

      {open === 'day' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1).map((d) => {
            const disabled = dayIsUnavailable(d, month, year);
            return (
              <Chip
                key={d}
                label={String(d)}
                selected={day === d}
                disabled={disabled}
                onPress={() => chooseDay(d)}
                style={disabled ? { opacity: 0.35 } : undefined}
              />
            );
          })}
        </View>
      ) : null}

      {open === 'month' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const disabled = monthIsFuture(m, year);
            return (
              <Chip
                key={m}
                label={monthName(m)}
                selected={month === m}
                disabled={disabled}
                onPress={() => chooseMonth(m)}
                style={disabled ? { opacity: 0.35 } : undefined}
              />
            );
          })}
        </View>
      ) : null}

      {open === 'year' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {years.map((y) => (
            <Chip key={y} label={String(y)} selected={year === y} onPress={() => chooseYear(y)} />
          ))}
        </View>
      ) : null}

      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
