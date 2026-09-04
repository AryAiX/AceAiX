import React from 'react';
import { Stack } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * The legal stack.
 *
 * These four screens are reachable while signed out — the sign-up screen links
 * to the terms and the privacy policy before an account exists — so the route
 * gate in app/_layout.tsx treats this group as public.
 */
export default function LegalLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="guidelines" />
      <Stack.Screen name="child-safety" />
    </Stack>
  );
}
