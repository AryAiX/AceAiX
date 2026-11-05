import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { isRTL } from '@/components/ui/rtl';

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function sameDay(a: Date | null, b: Date | null): boolean {
  return !!a && !!b && a.toDateString() === b.toDateString();
}

/**
 * A month calendar for picking one day.
 *
 * Only days between `min` and `max` (inclusive) can be tapped; the rest are
 * drawn faded. Arrows step a month at a time, and stop at the months that
 * hold the allowed range. Weeks start on Monday, as in most of the markets
 * the app serves; day and month names come from the phone's language.
 */
export function CalendarPicker({
  value,
  onChange,
  min,
  max,
  testID,
}: {
  value: Date | null;
  onChange: (day: Date) => void;
  min: Date;
  max: Date;
  testID?: string;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const first = startOfDay(min);
  const last = startOfDay(max);
  const [month, setMonth] = useState(() => {
    const anchor = value ?? first;
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  });

  const cells = useMemo(() => {
    const out: (Date | null)[] = [];
    const lead = (month.getDay() + 6) % 7; // Monday first
    for (let i = 0; i < lead; i += 1) out.push(null);
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d += 1) out.push(new Date(month.getFullYear(), month.getMonth(), d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [month]);

  /* Seven short weekday names in the reader's language, Monday first. */
  const weekdays = useMemo(() => {
    const monday = new Date(2024, 0, 1); // a Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toLocaleDateString(undefined, { weekday: 'narrow' });
    });
  }, []);

  const canBack = month.getTime() > new Date(first.getFullYear(), first.getMonth(), 1).getTime();
  const canForward = month.getTime() < new Date(last.getFullYear(), last.getMonth(), 1).getTime();
  const today = startOfDay(new Date());
  const Back = isRTL ? ChevronRight : ChevronLeft;
  const Forward = isRTL ? ChevronLeft : ChevronRight;

  const arrow = (enabled: boolean, onPress: () => void, Icon: typeof ChevronLeft, label: string) => (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: theme.radii.button,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceAlt,
        opacity: !enabled ? 0.3 : pressed ? 0.7 : 1,
      })}
    >
      <Icon size={18} color={colors.text} />
    </Pressable>
  );

  return (
    <View style={{ gap: spacing.sm }} testID={testID}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {arrow(canBack, () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)), Back, '‹')}
        <Text variant="subheading">
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        {arrow(canForward, () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)), Forward, '›')}
      </View>

      <View style={{ flexDirection: 'row' }}>
        {weekdays.map((w, i) => (
          <Text key={i} variant="overline" tone="muted" align="center" style={{ flex: 1 }}>
            {w}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
          const allowed = d.getTime() >= first.getTime() && d.getTime() <= last.getTime();
          const on = sameDay(d, value);
          const isToday = sameDay(d, today);
          return (
            <View key={d.toDateString()} style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable
                onPress={() => onChange(d)}
                disabled={!allowed}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: !allowed }}
                accessibilityLabel={d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                testID={testID ? `${testID}-${d.getDate()}` : undefined}
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: theme.radii.button,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? colors.primary : 'transparent',
                  borderWidth: isToday && !on ? 1.5 : 0,
                  borderColor: colors.primary,
                  opacity: !allowed ? 0.3 : pressed ? 0.7 : 1,
                })}
              >
                <Text
                  variant={on ? 'bodyStrong' : 'body'}
                  color={on ? colors.textOnBrand : allowed ? colors.text : colors.textMuted}
                >
                  {d.getDate()}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
