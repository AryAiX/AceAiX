import React from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

/**
 * One choice in a picker: a soft rounded row with an optional icon tile or
 * emoji, the words (and a hint line under them), and a radio dot — or a
 * tick box when several can be chosen — on the end. The chosen row is
 * tinted and outlined in the brand blue.
 *
 * Every picker in the app (the sheets for When, Sport and the filters, the
 * dropdown lists, the searchable picker) draws its rows with this, so they
 * all look and behave the same.
 */
export function ChoiceRow({
  label,
  sublabel,
  icon,
  emoji,
  on,
  multiple = false,
  faded = false,
  onPress,
  testID,
}: {
  label: string;
  sublabel?: string | null;
  /** Drawn in a small tile at the start; given the colour to draw in. */
  icon?: (color: string) => React.ReactNode;
  emoji?: string;
  on: boolean;
  multiple?: boolean;
  /** Shown faded, e.g. a sport with nothing in it right now. Still pickable. */
  faded?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { colors, spacing, radii } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: on }}
      accessibilityLabel={sublabel ? `${label}, ${sublabel}` : label}
      testID={testID}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: sublabel ? 60 : 50,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radii.lg,
        borderWidth: 1.5,
        borderColor: on ? colors.primary : 'transparent',
        backgroundColor: on ? colors.primarySoft : pressed ? colors.surfaceAlt : 'transparent',
        opacity: faded && !on ? 0.45 : 1,
      })}
    >
      {icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: on ? colors.primary : colors.surfaceAlt,
          }}
        >
          {icon(on ? colors.textOnBrand : colors.textSecondary)}
        </View>
      ) : null}
      {emoji ? <Text style={{ fontSize: 18, lineHeight: 22 }}>{emoji}</Text> : null}

      <View style={{ flex: 1 }}>
        <Text variant={on ? 'bodyStrong' : 'body'} color={on ? colors.primary : colors.text} numberOfLines={1}>
          {label}
        </Text>
        {sublabel ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>

      {multiple ? (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 7,
            borderWidth: 1.5,
            borderColor: on ? colors.primary : colors.borderStrong,
            backgroundColor: on ? colors.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {on ? <Check size={14} color={colors.textOnBrand} strokeWidth={3} /> : null}
        </View>
      ) : (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: on ? 6.5 : 1.5,
            borderColor: on ? colors.primary : colors.borderStrong,
          }}
        />
      )}
    </Pressable>
  );
}
