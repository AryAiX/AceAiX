import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { NATIVE_DRIVER } from '@/lib/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { FollowColors, followKind } from '@/theme/tokens';

interface Props {
  following: boolean;
  pending?: boolean;
  onPress: () => void;
  /** Who or what is being followed — used for the screen-reader label. */
  name: string;
  /** Their role, which picks the colour: athlete, coach, club or sponsor. */
  role?: string | null;
  /** No longer changes the look; kept so older callers still compile. */
  solid?: boolean;
  /** "Follow back" for someone who already follows you. Same look. */
  back?: boolean;
  /** The small pill, for rows where the name needs the room (Clubs). */
  compact?: boolean;
  /** The big button on a profile header. */
  large?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
  hitSlop?: number;
}

/**
 * Follow, coloured by who it is (set 3): an athlete's is the warm sweep, a
 * coach's violet, a club's blue and a sponsor's gold. Once followed it turns
 * into a soft tint of the same colour with a tick, so you can still tell a
 * followed club from a followed coach.
 */
export function FollowButton({
  following,
  pending,
  onPress,
  name,
  role,
  back,
  compact,
  large,
  fullWidth,
  style,
  accessibilityLabel,
  testID,
  hitSlop,
}: Props) {
  const t = useT();
  const theme = useTheme();
  const { radii, spacing } = theme;
  const c = FollowColors[theme.scheme === 'dark' ? 'dark' : 'light'][followKind(role)];
  const scale = useRef(new Animated.Value(1)).current;

  const height = compact ? 32 : large ? 52 : 40;
  const fg = following ? c.tintInk : c.ink;
  const label = following ? t('common.following') : back ? t('common.followBack') : t('common.follow');

  const animate = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: NATIVE_DRIVER, speed: 40, bounciness: 4 }).start();

  return (
    <Animated.View
      style={[{ transform: [{ scale }] }, fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }, style]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!pending, busy: !!pending }}
        accessibilityLabel={
          accessibilityLabel ??
          (following ? t('discover.unfollowA11y', { name }) : t('discover.followA11y', { name }))
        }
        disabled={pending}
        hitSlop={hitSlop}
        testID={testID}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        onPress={() => {
          if (!following && Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
          onPress();
        }}
        style={({ pressed }) => ({
          height,
          paddingHorizontal: compact ? spacing.md : large ? spacing.xl : spacing.lg,
          borderRadius: radii.button,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: following ? c.tint : c.sweep[0],
          borderWidth: following && c.tintEdge !== 'transparent' ? 1 : 0,
          borderColor: c.tintEdge,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        {following ? null : (
          <LinearGradient
            colors={c.sweep}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        )}
        {pending ? (
          <ActivityIndicator color={fg} size="small" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text variant={large ? 'subheading' : 'captionStrong'} color={fg} numberOfLines={1}>
              {label}
            </Text>
            {following ? <Check size={compact ? 13 : 15} color={fg} strokeWidth={2.8} /> : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
