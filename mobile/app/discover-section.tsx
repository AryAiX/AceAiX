import React from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { ChevronBack, Screen, Text } from '@/components/ui';
import { AthleteExplore, type AthleteDiscoverTab } from '@/components/discover/AthleteExplore';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';

type Section = Exclude<AthleteDiscoverTab, 'explore'>;

const TITLES: Record<Section, string> = {
  clubs: 'discover.tabClubs',
  coaches: 'discover.tabCoaches',
  leaderboard: 'discover.tabLeaderboard',
  sponsors: 'sponsorship.tabSponsors',
};

function asSection(value: string | undefined): Section {
  return value === 'coaches' || value === 'leaderboard' || value === 'sponsors' ? value : 'clubs';
}

/**
 * One side of the athlete's Discover on its own page: Clubs, Coaches, the
 * Leaderboard or Sponsors, opened from the buttons on Discover. The blue
 * "‹ Discover" says where back goes.
 */
export default function DiscoverSectionScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ section?: string }>();
  const section = asSection(params.section);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(Routes.discover);
  };

  const header = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md }}>
      <Pressable
        onPress={goBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        testID="discover-section-back"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 2,
          minHeight: 32,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <ChevronBack size={20} color={colors.primary} />
        <Text variant="bodyStrong" color={colors.primary}>
          {t('common.tabDiscover')}
        </Text>
      </Pressable>
      <Text variant="title" numberOfLines={1}>
        {t(TITLES[section])}
      </Text>
    </View>
  );

  return (
    <Screen scroll={false} padded={false} header={header} testID={`discover-section-${section}`}>
      <AthleteExplore viewerId={profile?.id ?? null} only={section} />
    </Screen>
  );
}
