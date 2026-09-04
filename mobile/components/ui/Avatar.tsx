import React, { useState } from 'react';
import { Image, Pressable, View, ViewStyle } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import { Text } from './Text';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

const SIZES: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 60,
  xl: 88,
  xxl: 112,
};

interface Props {
  uri?: string | null;
  name?: string | null;
  size?: AvatarSize;
  /** Draws a tier-coloured ring — used in the feed and on discovery cards. */
  score?: number | null;
  verified?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  uri,
  name,
  size = 'md',
  score,
  verified,
  onPress,
  style,
  testID,
}: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const [failed, setFailed] = useState(false);

  const px = SIZES[size];
  const ringWidth = score != null ? (px >= 60 ? 3 : 2) : 0;
  const ringColor = score != null ? TierColors[tierForScore(score)] : 'transparent';
  const outer = px + ringWidth * 2 + (score != null ? 4 : 0);
  const showImage = !!uri && !failed;

  const content = (
    <View
      style={[
        {
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: ringWidth,
          borderColor: ringColor,
          backgroundColor: 'transparent',
        },
        style,
      ]}
      testID={testID}
    >
      {showImage ? (
        <Image
          source={{ uri }}
          onError={() => setFailed(true)}
          style={{
            width: px,
            height: px,
            borderRadius: px / 2,
            backgroundColor: colors.surfaceAlt,
          }}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View
          style={{
            width: px,
            height: px,
            borderRadius: px / 2,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            variant={px >= 60 ? 'title' : px >= 44 ? 'subheading' : 'captionStrong'}
            tone="muted"
          >
            {initials(name)}
          </Text>
        </View>
      )}

      {verified ? (
        <View
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            backgroundColor: colors.surface,
            borderRadius: 999,
            padding: 1,
          }}
        >
          <BadgeCheck
            size={Math.max(14, px * 0.3)}
            color={colors.info}
            fill={colors.infoSoft}
            strokeWidth={2.2}
          />
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={name ? `Open ${name}'s profile` : 'Open profile'}
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => (pressed ? { opacity: 0.75 } : undefined)}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}
