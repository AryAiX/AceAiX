import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { ExploreGrid } from '@/components/explore/ExploreGrid';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { discoverRowAfter } from './DiscoverRows';
import { DiscoverShortcuts, type DiscoverShortcut } from './DiscoverShortcuts';

/**
 * The athlete's Discover: a search, five ways into the people side, then the
 * clips. Clubs, coaches, the leaderboard and sponsors each open as their own
 * page, so the clips are what this screen is for.
 */
export function AthleteDiscoverHub() {
  const router = useRouter();
  const t = useT();
  const { colors, radii, spacing } = useTheme();

  const open = useCallback(
    (shortcut: DiscoverShortcut) => {
      /* Players are found by name, sport or position: that is the search. */
      if (shortcut === 'players') router.push(Routes.search);
      else router.push(Routes.discoverSection(shortcut));
    },
    [router],
  );

  const top = (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
      {/* Clips are not searched by text. The bar opens the people-and-clubs
          search, where a name typed here would have been looked for anyway. */}
      <Pressable
        onPress={() => router.push(Routes.search)}
        accessibilityRole="search"
        accessibilityLabel={t('discover.searchPeople')}
        testID="explore-search"
        style={({ pressed }) => ({
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Search size={18} color={colors.textMuted} />
        <Text variant="body" tone="muted" numberOfLines={1}>
          {t('discover.searchPeople')}
        </Text>
      </Pressable>
      <DiscoverShortcuts onOpen={open} />
    </View>
  );

  return (
    <ExploreGrid
      layout="hub"
      header={top}
      between={discoverRowAfter}
      onPostFirst={() => router.push(Routes.compose)}
    />
  );
}
