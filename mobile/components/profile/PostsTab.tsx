import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Grid3x3 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, SkeletonList, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { getPostTiles } from '@/lib/api.profile';
import { getMyPostScores } from '@/lib/api';
import { scoreWhenPosted } from '@/lib/scoreTimeline';
import { Routes } from '@/lib/routes';
import { truncate } from '@/lib/format';
import { useT } from '@/i18n';
import { MediaGrid, MediaTile } from './MediaGrid';

interface Props {
  userId: string;
  isSelf: boolean;
  /** Bumped by the parent's pull-to-refresh so this list reloads with it. */
  refreshKey?: number;
}

export function PostsTab({ userId, isSelf, refreshKey = 0 }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();

  const posts = useAsync(() => getPostTiles(userId), [userId, refreshKey]);
  /* Your own grid: your score on the day each post went up, from your own
     score history (only you can read it). Others' grids stay as they are. */
  const myScores = useAsync(() => getMyPostScores(), [refreshKey], { enabled: isSelf });

  const openPost = useCallback((id: string) => router.push(Routes.post(id)), [router]);

  if (posts.loading) return <SkeletonList count={2} />;
  if (posts.error) return <ErrorState message={posts.error} onRetry={posts.reload} compact />;

  const rows = posts.data ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        icon={<Grid3x3 size={26} color={theme.colors.textMuted} />}
        title={t(isSelf ? 'profile.postsEmptyTitleSelf' : 'profile.postsEmptyTitleOther')}
        body={t(isSelf ? 'profile.postsEmptyBodySelf' : 'profile.postsEmptyBodyOther')}
        actionLabel={isSelf ? t('profile.postsEmptyAction') : undefined}
        onAction={isSelf ? () => router.push(Routes.compose) : undefined}
      />
    );
  }

  const tiles: MediaTile[] = rows.map((post) => ({
    id: post.id,
    uri: post.thumbnail,
    isVideo: post.media?.[0]?.type === 'video',
    caption: post.caption ? truncate(post.caption, 60) : null,
    score:
      isSelf && post.media?.length && myScores.data
        ? scoreWhenPosted(myScores.data.saved[post.id])
        : null,
  }));
  const showsScores = tiles.some((tile) => tile.score != null && tile.score > 0);

  return (
    <>
      <MediaGrid tiles={tiles} onPressTile={openPost} />
      {showsScores ? (
        <Text variant="caption" tone="muted" style={{ marginTop: theme.spacing.sm }}>
          {t('profile.scoreWhenPostedHint')}
        </Text>
      ) : null}
    </>
  );
}
