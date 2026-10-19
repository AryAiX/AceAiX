import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Grid3x3, Megaphone, SquarePen } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, EmptyState, ErrorState, SkeletonList, Text, useToast } from '@/components/ui';
import { MediaGrid, type MediaTile } from '@/components/profile/MediaGrid';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { getClubBroadcasts, getClubPosts, type ClubPost } from '@/lib/api.club';
import { resolveMediaUrls } from '@/lib/api.profile';
import { errorMessage } from '@/lib/errors';
import { relativeTime, truncate } from '@/lib/format';
import { Routes } from '@/lib/routes';
import type { PostMedia } from '@/types/models';
import type { ClubTabProps } from './shared';

const PAGE = 24;

interface Loaded {
  tiles: MediaTile[];
  /** created_at of the last post, for the next page. */
  cursor: string | null;
  more: boolean;
}

function firstMedia(post: ClubPost): PostMedia | null {
  return Array.isArray(post.media) && post.media.length > 0 ? (post.media[0] as PostMedia) : null;
}

/** One page of posts, with the first photo of each signed for <Image>. */
async function loadPosts(orgId: string, before: string | null): Promise<Loaded> {
  const posts = await getClubPosts(orgId, before);
  const keys = posts
    .map((p) => firstMedia(p)?.thumbnail ?? firstMedia(p)?.url ?? null)
    .filter((k): k is string => !!k);
  const urls = await resolveMediaUrls(keys);
  return {
    tiles: posts.map((p) => {
      const media = firstMedia(p);
      const key = media?.thumbnail ?? media?.url ?? null;
      return {
        id: p.id,
        uri: (key && urls[key]) ?? null,
        isVideo: media?.type === 'video',
        caption: p.caption ? truncate(p.caption, 60) : null,
      };
    }),
    cursor: posts.length > 0 ? posts[posts.length - 1].created_at : null,
    more: posts.length >= PAGE,
  };
}

export function ClubPostsTab({ orgId, canPost, refreshKey, clubName }: ClubTabProps & { clubName: string }) {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();

  const first = useAsync(() => loadPosts(orgId, null), [orgId, refreshKey]);
  const broadcasts = useAsync(() => getClubBroadcasts(orgId, 3), [orgId, refreshKey]);

  /* Pages after the first live here and are dropped when the first reloads. */
  const [more, setMore] = useState<{ base: Loaded | null; pages: Loaded[] }>({ base: null, pages: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const extra = more.base === first.data ? more.pages : [];

  const last = extra.length > 0 ? extra[extra.length - 1] : first.data;
  const tiles = [...(first.data?.tiles ?? []), ...extra.flatMap((p) => p.tiles)];

  const loadMore = useCallback(async () => {
    if (!last?.cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await loadPosts(orgId, last.cursor);
      const base = first.data;
      setMore((m) => ({ base, pages: [...(m.base === base ? m.pages : []), next] }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }, [first.data, last, loadingMore, orgId, toast]);

  const actions = canPost ? (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Button
        label={t('club.posts.newPost')}
        size="sm"
        icon={<SquarePen size={16} color={colors.textOnBrand} />}
        onPress={() => router.push(Routes.compose)}
        style={{ flex: 1 }}
        testID="club-new-post"
      />
      <Button
        label={t('club.posts.newStory')}
        size="sm"
        variant="secondary"
        icon={<Camera size={16} color={colors.text} />}
        onPress={() => router.push(Routes.newStory)}
        style={{ flex: 1 }}
        testID="club-new-story"
      />
    </View>
  ) : null;

  const pinned = (broadcasts.data ?? []).map((b) => (
    <Card key={b.id} tone="accentSoft" style={{ gap: spacing.xs }} testID={`club-broadcast-${b.id}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Megaphone size={14} color={colors.textSecondary} />
        <Text variant="overline" tone="secondary" style={{ flex: 1 }}>
          {t('club.posts.announcement')}
        </Text>
        <Text variant="caption" tone="muted">
          {relativeTime(b.created_at)}
        </Text>
      </View>
      <Text variant="bodyStrong">{b.title}</Text>
      <Text variant="body" tone="secondary">
        {b.body}
      </Text>
    </Card>
  ));

  let body: React.ReactNode;
  if (first.loading) body = <SkeletonList count={2} />;
  else if (first.error) body = <ErrorState message={first.error} onRetry={first.reload} compact />;
  else if (tiles.length === 0)
    body = (
      <EmptyState
        compact
        icon={<Grid3x3 size={26} color={colors.textMuted} />}
        title={t('club.posts.emptyTitle')}
        body={canPost ? t('club.posts.emptyTeam') : t('club.posts.emptyBody', { name: clubName })}
      />
    );
  else
    body = (
      <View style={{ gap: spacing.md }}>
        <MediaGrid tiles={tiles} onPressTile={(id) => router.push(Routes.post(id))} />
        {last?.more ? (
          <Button
            label={t('club.posts.loadMore')}
            variant="ghost"
            loading={loadingMore}
            onPress={loadMore}
            testID="club-posts-more"
          />
        ) : null}
      </View>
    );

  return (
    <View style={{ gap: spacing.md }}>
      {actions}
      {pinned}
      {body}
    </View>
  );
}
