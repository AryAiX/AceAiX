import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Grid3x3 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { getPostTiles } from '@/lib/api.profile';
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
  }));

  return <MediaGrid tiles={tiles} onPressTile={openPost} />;
}
