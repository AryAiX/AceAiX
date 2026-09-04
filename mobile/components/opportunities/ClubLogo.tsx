import React, { useState } from 'react';
import { Image, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { initialsOf } from '@/lib/format';

export type ClubLogoSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ClubLogoSize, number> = { sm: 40, md: 48, lg: 72 };

/**
 * A club's mark: a rounded square, not a circle.
 *
 * The shape is the whole point — an athlete scanning a list should be able to
 * tell an organisation from a person without reading anything.
 */
export function ClubLogo({
  uri,
  name,
  size = 'md',
  style,
}: {
  uri?: string | null;
  name?: string | null;
  size?: ClubLogoSize;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const { colors, radii } = theme;
  const [failed, setFailed] = useState(false);

  const px = SIZES[size];
  const radius = size === 'lg' ? radii.lg : radii.sm;
  const showImage = !!uri && !failed;

  return (
    <View
      style={[
        {
          width: px,
          height: px,
          borderRadius: radius,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri }}
          onError={() => setFailed(true)}
          resizeMode="cover"
          style={{ width: px, height: px }}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text variant={size === 'lg' ? 'title' : 'subheading'} tone="muted">
          {initialsOf(name)}
        </Text>
      )}
    </View>
  );
}
