import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/ThemeProvider';
import { LogoLockup } from '@/components/common/Logo';
import { NATIVE_DRIVER } from '@/lib/motion';

/**
 * The screen between the native splash and the app.
 *
 * Launching used to go: logo, then a bare page while the language loads, then a
 * spinner while the session loads, then the app — three different screens
 * before anything with a name on it. This is the same logo the native splash
 * just showed, at the same size on the same colour, so the handover is
 * invisible and the app appears to hold on its own mark rather than blink
 * through two empty states.
 *
 * The image is identical to `expo-splash-screen`'s (`imageWidth: 240` in
 * app.json, matched below). Change one and change the other, or the logo will
 * jump a few points at the seam.
 */
export function BrandSplash({ testID }: { testID?: string }) {
  const theme = useTheme();
  const { colors, alpha } = theme;

  // Breath, not entrance: the logo is already on screen from the native
  // splash, so fading it in would be a flicker. It only has to look alive
  // while something loads behind it.
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  return (
    <View
      testID={testID}
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* The same wash as the welcome screen, so the first two screens of the
          app belong to each other. */}
      <LinearGradient
        colors={[alpha(theme.gradients.hero[0], 0.2), alpha(theme.gradients.action[0], 0.08), colors.bg]}
        locations={[0, 0.45, 0.9]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={{
          opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }),
          transform: [
            { scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) },
          ],
        }}
      >
        <LogoLockup width={240} />
      </Animated.View>
    </View>
  );
}
