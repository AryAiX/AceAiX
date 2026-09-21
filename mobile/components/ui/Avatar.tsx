import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { huePair, tierForScore, tierGradient } from '@/theme/tokens';
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
  /**
   * What the tap does, for a screen reader. Required in spirit whenever
   * `onPress` is set — the default assumes it opens a profile, which stopped
   * being true the moment the profile header started using it to open a photo.
   */
  pressLabel?: string;
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
  pressLabel,
  style,
  testID,
}: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const [failed, setFailed] = useState(false);

  const px = SIZES[size];
  const ringWidth = score != null ? (px >= 60 ? 3 : 2) : 0;
  const outer = px + ringWidth * 2 + (score != null ? 4 : 0);
  const showImage = !!uri && !failed;

  /* The ring is a gradient rather than a stroke: a filled circle behind an
     opaque, centred photo, so the margin between them *is* the ring. A tier is
     two colours now, and a single-stop border could only ever show one. */
  const ringStops = score != null ? tierGradient(tierForScore(score)) : null;

  const content = (
    <View
      style={[
        {
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        },
        style,
      ]}
      testID={testID}
    >
      {ringStops ? (
        <LinearGradient
          colors={ringStops}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: outer / 2 }]}
          pointerEvents="none"
        />
      ) : null}

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
        /*
         * The fallback used to be grey initials in a grey circle, and most rows
         * in a young network have no photo yet — so a feed, a search result or
         * an inbox was a column of grey discs. The colour is derived from the
         * name, so it is stable: the same person is the same colour on every
         * screen, and two people in a list are almost never the same one.
         */
        <View
          style={{
            width: px,
            height: px,
            borderRadius: px / 2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LinearGradient
            colors={huePair(name)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View>
            <Text
              variant={px >= 60 ? 'title' : px >= 44 ? 'subheading' : 'captionStrong'}
              color="#FFFFFF"
            >
              {initials(name)}
            </Text>
          </View>
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
        accessibilityLabel={pressLabel ?? name ?? undefined}
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
