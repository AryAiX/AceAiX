import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Entry route. The gate in `_layout.tsx` decides where to send the person
 * once the session and profile have loaded; this screen is just the moment
 * in between.
 */
export default function Index() {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.bg,
      }}
    >
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}
