import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * The tab bar registers `create` but intercepts the press and opens
 * `/compose` as a modal, so this route normally never renders. It exists so
 * expo-router does not warn about a missing screen — and if anything ever does
 * land here (a deep link, a restored navigation state) it forwards to the
 * composer instead of showing a blank tab.
 */
export default function CreateTab() {
  const theme = useTheme();
  const router = useRouter();

  useEffect(() => {
    router.replace('/compose');
  }, [router]);

  return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;
}
