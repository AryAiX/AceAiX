import React, { useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useI18n, useT } from '@/i18n';
import type { Streak } from '@/types/models';

interface Props {
  streak: Streak;
  /** `progress.last_7_days` — ISO dates the person opened the app. */
  days?: string[];
  /** Hide the longest / total figures when the surrounding card says them. */
  showTotals?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const DOT = 30;
const WEEK = 7;

/** Local `YYYY-MM-DD`. Not `toISOString()`, which would shift the day in UTC-. */
function localDay(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The last seven days as dots.
 *
 * Filled for a day the person was here, hollow for one they were not, and today
 * carries a ring whichever way it went. There is no red, no cross and no gap
 * shaming — a missed day is simply a dot that is not filled in.
 */
export function StreakCalendar({ streak, days = [], showTotals = true, style, testID }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const { language } = useI18n();
  const t = useT();

  const present = useMemo(
    () => new Set(days.map((day) => String(day).slice(0, 10))),
    [days],
  );

  const week = useMemo(() => {
    const today = new Date();
    const narrow = new Intl.DateTimeFormat(language, { weekday: 'narrow' });

    return Array.from({ length: WEEK }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (WEEK - 1 - index));
      const key = localDay(date);
      return {
        key,
        letter: narrow.format(date),
        here: present.has(key),
        isToday: index === WEEK - 1,
      };
    });
  }, [present, language]);

  const hereCount = week.filter((day) => day.here).length;

  return (
    <View style={style} testID={testID}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('progress.calendarA11y', { count: hereCount })}
        style={{ flexDirection: 'row', justifyContent: 'space-between' }}
      >
        {week.map((day) => {
          const fill = day.here ? colors.primary : 'transparent';
          const stroke = day.here
            ? colors.primary
            : day.isToday
              ? colors.borderStrong
              : colors.border;

          return (
            <View key={day.key} style={{ alignItems: 'center', gap: spacing.xs }}>
              <Text variant="overline" tone={day.isToday ? 'default' : 'muted'}>
                {day.letter}
              </Text>
              <View style={{ width: DOT, height: DOT }}>
                <Svg width={DOT} height={DOT}>
                  {/* Today's ring sits outside the dot, so it reads as "you are
                      here" rather than as a different kind of day. */}
                  {day.isToday ? (
                    <Circle
                      cx={DOT / 2}
                      cy={DOT / 2}
                      r={DOT / 2 - 1}
                      fill="none"
                      stroke={day.here ? colors.primary : colors.borderStrong}
                      strokeWidth={1.5}
                      opacity={day.here ? 0.45 : 1}
                    />
                  ) : null}
                  <Circle
                    cx={DOT / 2}
                    cy={DOT / 2}
                    r={DOT / 2 - 6}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={2}
                  />
                </Svg>
              </View>
            </View>
          );
        })}
      </View>

      {showTotals ? (
        <View
          style={{
            flexDirection: 'row',
            marginTop: spacing.lg,
            borderRadius: radii.md,
            backgroundColor: colors.surfaceAlt,
            paddingVertical: spacing.md,
          }}
        >
          <Stat label={t('progress.streakCurrent')} value={streak.current} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <Stat label={t('progress.streakLongest')} value={streak.longest} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <Stat label={t('progress.streakTotal')} value={streak.total_days} />
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const t = useT();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${t('progress.days', { count: value })}`}
      style={{ flex: 1, alignItems: 'center', gap: 2 }}
    >
      <Text variant="stat">{value}</Text>
      <Text variant="overline" tone="muted" align="center">
        {label}
      </Text>
    </View>
  );
}
