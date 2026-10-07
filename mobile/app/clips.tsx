import React from 'react';
import { useRouter } from 'expo-router';
import { Clapperboard } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Header, IconButton, Screen } from '@/components/ui';
import { ExploreGrid } from '@/components/explore/ExploreGrid';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';

/**
 * Every reel, as a collection — where "See all" on Home lands.
 *
 * The same mosaic as Explore, filled from the viewer's own reels feed: clips
 * from people they follow and public ones, video posts and profile clips
 * alike. A tile opens the full-screen pager at that clip.
 */
export default function ReelsCollectionScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();

  return (
    <Screen
      scroll={false}
      padded={false}
      header={
        <Header
          title={t('reels.title')}
          subtitle={t('reels.stripSubtitle')}
          back
          right={
            <IconButton
              icon={<Clapperboard size={20} color={theme.colors.text} />}
              label={t('reels.open')}
              size={theme.hit.min}
              onPress={() => router.push(Routes.reels)}
            />
          }
        />
      }
      testID="reels-collection"
    >
      <ExploreGrid source="reels" onPostFirst={() => router.push(Routes.compose)} />
    </Screen>
  );
}
