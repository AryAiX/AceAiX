import React from 'react';
import { View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Tappable, Text } from '@/components/ui';

/**
 * A number you nudge, with a track showing where it sits.
 *
 * A slider would be smaller, but on a phone a slider cannot be moved by one —
 * and one more clip is exactly the question this control exists to answer. The
 * bar underneath keeps the sense of a range without pretending to be draggable.
 *
 * `min` is what is already true, so the control can raise the number but never
 * offer to un-play a match somebody has already played.
 */
export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;

  const clamped = Math.max(min, Math.min(max, value));
  const span = Math.max(1, max - min);
  const fill = Math.max(0, Math.min(1, (clamped - min) / span));
  const raised = clamped > min;

  const button = (icon: React.ReactNode, to: number, enabled: boolean, label: string) => (
    <Tappable
      onPress={() => onChange(to)}
      disabled={!enabled}
      accessibilityLabel={label}
      scaleTo={0.9}
      haptic="selection"
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: enabled ? colors.surfaceAlt : 'transparent',
          borderWidth: 1,
          borderColor: enabled ? colors.border : colors.divider,
          opacity: enabled ? 1 : 0.4,
        }}
      >
        {icon}
      </View>
    </Tappable>
  );

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
          {label}
        </Text>

        {button(
          <Minus size={16} color={colors.text} />,
          Math.max(min, clamped - step),
          clamped > min,
          `${label} −`,
        )}

        <Text
          variant="stat"
          tone={raised ? 'primary' : 'default'}
          style={{ minWidth: 34, textAlign: 'center' }}
        >
          {clamped}
        </Text>

        {button(
          <Plus size={16} color={colors.text} />,
          Math.min(max, clamped + step),
          clamped < max,
          `${label} +`,
        )}
      </View>

      <View
        style={{
          height: 4,
          borderRadius: radii.sm,
          backgroundColor: colors.divider,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${fill * 100}%`,
            height: '100%',
            backgroundColor: raised ? colors.primary : colors.textMuted,
          }}
        />
      </View>
    </View>
  );
}
