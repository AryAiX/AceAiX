import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquare } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';

const SIZE = 44;
const INK = '#FFFFFF';
/** The count's ink on its white badge: the darkest step of the warm ramp. */
const BADGE_INK = '#A8400A';

/**
 * The way into Messages, beside the Playfeed switch on Home.
 *
 * Home is the only door to the inbox, so this button has to be found without
 * looking for it: a warm sweep with a white icon. It is the one place warm is
 * used for something other than time — a deliberate exception, agreed in the
 * design review. The unread count sits on a white badge rimmed in the page
 * colour, so it reads on the gradient in both themes.
 */
export function MessagesButton({
  count,
  label,
  onPress,
  testID,
}: {
  count: number;
  /** Read out to screen readers; says how many are unread. */
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const { colors, radii } = theme;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      testID={testID}
      style={({ pressed }) => ({
        width: SIZE,
        height: SIZE,
        borderRadius: radii.button,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          flex: 1,
          borderRadius: radii.button,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Light end top-right, deep end bottom-left. */}
        <LinearGradient
          colors={theme.gradients.warm}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.12, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <MessageSquare size={20} color={INK} strokeWidth={2.2} />
      </View>

      {count > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -5,
            right: -5,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: 9,
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="overline" color={BADGE_INK} style={{ fontSize: 10 }} allowFontScaling={false}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
