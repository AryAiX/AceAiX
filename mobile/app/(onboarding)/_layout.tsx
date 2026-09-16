import React from 'react';
import { Stack } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * The profile wizard runs once, in one place. Swiping back out of it would
 * drop someone into a half-built profile, so the gesture is off.
 */
export default function OnboardingLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: { backgroundColor: theme.colors.bg },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
