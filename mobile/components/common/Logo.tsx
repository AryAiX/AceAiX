import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Palettes } from '@/theme/tokens';

/*
  The brand asset, in the shapes the app needs it.

  All of them come out of `tools/brand/build-brand-assets.py`, which is also
  what writes the launcher icon and the splash — so the logo on the home screen,
  the logo on the splash and the logo in the header are the same pixels, not
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

/*
  Where the word sits inside the lockup. Both splash images are 1044×738: the
  mark fills rows 0–561 and "AceAiX" rows 588–737, measured from the alpha
  channel. `LogoWord` shows only that band, so the header uses the brand's own
  type in both schemes without a third image file to keep in step.
*/
const LOCKUP_W = 1044;
const LOCKUP_H = 738;
const WORD_TOP = 588;
const WORD_H = 150;

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

/**
 * The word "AceAiX" as the lockup draws it — dark ink on the light scheme,
 * white on the dark one. `height` is the word's height in points.
 */
export function LogoWord({
  height = 14,
  style,
  testID,
}: {
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { scheme } = useTheme();
  const scale = height / WORD_H;

  return (
    <View
      testID={testID}
      style={[{ width: LOCKUP_W * scale, height, overflow: 'hidden' }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="AceAiX"
    >
      <Image
        source={scheme === 'dark' ? LOCKUP_DARK : LOCKUP_LIGHT}
        style={{
          position: 'absolute',
          left: 0,
          top: -WORD_TOP * scale,
          width: LOCKUP_W * scale,
          height: LOCKUP_H * scale,
        }}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * The mark with the app's own ground behind it — a badge, for a light page.
 *
 * The ground is the dark palette's `bg`, read from tokens so it follows the
 * palette (it was a literal `#0B0A16`). On the dark scheme that is the page
 * colour itself, so a hairline keeps the badge's edge visible.
 */
export function LogoBadge({ size = 40, testID }: { size?: number; testID?: string }) {
  const { radii, scheme, colors } = useTheme();

  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: radii.md,
        backgroundColor: Palettes.dark.bg,
        borderWidth: scheme === 'dark' ? StyleSheet.hairlineWidth : 0,
        borderColor: colors.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <LogoMark size={size * 0.46} />
    </View>
  );
}
