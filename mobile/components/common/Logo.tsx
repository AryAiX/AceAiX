import React from 'react';
import { Image, ImageStyle, StyleProp, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/*
  The brand asset, in the two shapes the app needs it.

  Both come out of `tools/brand/build-brand-assets.py`, which is also what
  writes the launcher icon and the splash — so the logo on the home screen, the
  logo on the splash and the logo in the header are the same pixels, not three
  exports that drifted.

  The lockup exists twice because the wordmark in it is white. On the light
  scheme that is a white word on a near-white page, which is how the splash
  used to launch to what looked like a bare triangle. The mark itself is
  saturated and needs no variant.
*/
const LOCKUP_LIGHT = require('../../assets/images/splash-icon.png');
const LOCKUP_DARK = require('../../assets/images/splash-icon-dark.png');
const MARK = require('../../assets/images/logo-mark.png');

/** Intrinsic sizes, so a caller gives a width and gets the right height. */
const LOCKUP_RATIO = 1044 / 738;
const MARK_RATIO = 512 / 331;

export function LogoLockup({
  width = 200,
  style,
  testID,
}: {
  width?: number;
  style?: StyleProp<ImageStyle>;
  testID?: string;
}) {
  const { scheme } = useTheme();

  return (
    <Image
      testID={testID}
      source={scheme === 'dark' ? LOCKUP_DARK : LOCKUP_LIGHT}
      style={[{ width, height: width / LOCKUP_RATIO }, style]}
      resizeMode="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel="AceAiX"
    />
  );
}

export function LogoMark({
  size = 32,
  style,
  testID,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
  testID?: string;
}) {
  return (
    <Image
      testID={testID}
      source={MARK}
      style={[{ width: size * MARK_RATIO, height: size }, style]}
      resizeMode="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel="AceAiX"
    />
  );
}

/** The mark with the app's own ground behind it — a badge, for a light page. */
export function LogoBadge({ size = 40, testID }: { size?: number; testID?: string }) {
  const { radii } = useTheme();

  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: radii.md,
        backgroundColor: '#0B0A16',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <LogoMark size={size * 0.46} />
    </View>
  );
}
