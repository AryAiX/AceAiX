import React from 'react';
import { Stack } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * The signed-out stack.
 *
 * Where a person belongs is decided once, by the gate in app/_layout.tsx.
 * Nothing in here redirects anywhere on its own.
 */
export default function AuthLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" options={{ animation: 'fade' }} />
      {/* Reached only after an account exists — going back would be a dead end. */}
      <Stack.Screen name="check-email" options={{ animation: 'fade', gestureEnabled: false }} />
    </Stack>
  );
}
