import React from 'react';
import { Stack } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * The settings stack.
 *
 * Every screen draws its own <Header>, so the native header stays off and the
 * whole tree animates as one push-and-pop.
 */
export default function SettingsLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="blocked" />
      <Stack.Screen name="guardian" />
      <Stack.Screen name="scouting" />
      <Stack.Screen name="appearance" />
      <Stack.Screen name="language" />
      {/* Deliberate one-way flow: swiping back mid-way would be confusing. */}
      <Stack.Screen name="delete-account" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
