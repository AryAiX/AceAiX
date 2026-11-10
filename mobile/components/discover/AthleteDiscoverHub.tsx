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
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  const open = useCallback(
    (shortcut: DiscoverShortcut) => {
      /* Players are found through the search bar above, so they have no
         button of their own; challenges have their own page. */
      if (shortcut === 'challenges') router.push(Routes.challenges);
      else router.push(Routes.discoverSection(shortcut));
    },
    [router],
  );

  const top = (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
      {/* One search for the whole app: people, posts and #tags, clubs,
          trials, challenges, meetups and sponsors. */}
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
          borderColor: colors.fieldBorder,
          backgroundColor: colors.field,
          opacity: pressed ? 0.7 : 1,
          ...theme.raised('control'),
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
