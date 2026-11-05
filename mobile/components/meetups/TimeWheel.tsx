import React, { useEffect, useRef } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';

const ROW = 44;
const VISIBLE = 5; // rows on screen; the middle one is the choice

/**
 * One spinning column, like a column of the iOS Clock alarm picker: the list
 * snaps a row at a time and the row in the middle band is the value.
 */
function Wheel({
  values,
  value,
  onChange,
  format,
  label,
  testID,
}: {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  label: string;
  testID?: string;
}) {
  const theme = useTheme();
  const { colors, font } = theme;
  /* Typed by what we call, not by React Native's instance type — RN 0.88
     renamed those, and this keeps the file independent of the name. */
  const ref = useRef<{ scrollTo: (to: { y: number; animated: boolean }) => void } | null>(null);
  const index = Math.max(0, values.indexOf(value));
  const last = useRef(index);

  /* Line the wheel up with the value it was opened on. */
  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ y: index * ROW, animated: false }), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(values.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ROW)));
    if (next !== last.current) {
      last.current = next;
      onChange(values[next]);
    }
  };

  return (
    <View style={{ flex: 1, height: ROW * VISIBLE }} accessibilityLabel={label} testID={testID}>
      <ScrollView
        ref={(node) => {
          ref.current = node as unknown as typeof ref.current;
        }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ROW * Math.floor(VISIBLE / 2) }}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
        scrollEventThrottle={16}
      >
        {values.map((v) => {
          const on = v === value;
          return (
            <View key={v} style={{ height: ROW, alignItems: 'center', justifyContent: 'center' }}>
              <Text
                variant="title"
                color={on ? colors.text : colors.textMuted}
                style={{ fontFamily: on ? font.monoBold : font.mono, opacity: on ? 1 : 0.55 }}
              >
                {format(v)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Hours and minutes on two wheels, with the chosen row in a soft band across
 * both — the iOS alarm picker, drawn in the app's own colours so it looks the
 * same on Android and the web.
 */
export function TimeWheel({
  hour,
  minute,
  onChange,
  hours,
  minutes,
  hourLabel,
  minuteLabel,
  testID,
}: {
  hour: number;
  minute: number;
  onChange: (next: { hour: number; minute: number }) => void;
  hours: number[];
  minutes: number[];
  hourLabel: string;
  minuteLabel: string;
  testID?: string;
}) {
  const theme = useTheme();
  const { colors, radii } = theme;

  return (
    <View style={{ height: ROW * VISIBLE, flexDirection: 'row', alignItems: 'center' }} testID={testID}>
      {/* The selection band, behind both wheels. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: ROW * Math.floor(VISIBLE / 2),
          height: ROW,
          borderRadius: radii.button,
          backgroundColor: colors.surfaceAlt,
        }}
      />
      <Wheel
        values={hours}
        value={hour}
        onChange={(h) => onChange({ hour: h, minute })}
        format={pad}
        label={hourLabel}
        testID={testID ? `${testID}-hour` : undefined}
      />
      <Text variant="title" tone="muted">
        :
      </Text>
      <Wheel
        values={minutes}
        value={minute}
        onChange={(m) => onChange({ hour, minute: m })}
        format={pad}
        label={minuteLabel}
        testID={testID ? `${testID}-minute` : undefined}
      />
    </View>
  );
}
