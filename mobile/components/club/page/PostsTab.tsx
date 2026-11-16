import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Grid3x3, SquarePen } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, ErrorState, SkeletonList, Text, useToast } from '@/components/ui';
import { PostCard } from '@/components/feed/PostCard';
import { ContentActionsSheet, type ContentTarget } from '@/components/feed/ContentActionsSheet';
import { MediaGrid, type MediaTile } from '@/components/profile/MediaGrid';
import { LayoutToggle, useProfileLayout } from '@/components/profile/LayoutToggle';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/providers/AuthProvider';
import { getClubPosts, type ClubPost } from '@/lib/api.club';
import { getPostById, postLink } from '@/lib/api.feed';
import { resolveMediaUrls } from '@/lib/api.profile';
import { errorMessage } from '@/lib/errors';
import { truncate } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { posterOf } from '@/lib/mediaUrl';
import type { FeedPost, PostMedia } from '@/types/models';
import { PreviewEmpty, useReportItems, type ClubTabProps } from './shared';

const PAGE = 24;
/** Full cards, a few at a time, the same way a profile's scroll does. */
const CARD_PAGE = 6;

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
    .map((p) => posterOf(firstMedia(p)))
    .filter((k): k is string => !!k);
  const urls = await resolveMediaUrls(keys);
  return {
    tiles: posts.map((p) => {
      const media = firstMedia(p);
      const key = posterOf(media);
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

export function ClubPostsTab({
  orgId,
  canPost,
  refreshKey,
  clubName,
  limit,
  onHasItems,
}: ClubTabProps & { clubName: string }) {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [layout, setLayout] = useProfileLayout();
  const [actionTarget, setActionTarget] = useState<ContentTarget | null>(null);

  const first = useAsync(() => loadPosts(orgId, null), [orgId, refreshKey]);

  /* Pages after the first live here and are dropped when the first reloads. */
  const [more, setMore] = useState<{ base: Loaded | null; pages: Loaded[] }>({ base: null, pages: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const extra = more.base === first.data ? more.pages : [];

  const last = extra.length > 0 ? extra[extra.length - 1] : first.data;
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const tiles = [...(first.data?.tiles ?? []), ...extra.flatMap((p) => p.tiles)].filter(
    (tile) => !gone.has(tile.id),
  );
  const preview = limit != null;

  /* Scroll view: the same post cards as a profile, loaded a few at a time
     from the ids already on the grid (each card needs the full post). */
  const ids = tiles.map((tile) => tile.id);
  const idsKey = ids.join(',');
  const [cards, setCards] = useState<FeedPost[]>([]);
  const [wanted, setWanted] = useState(CARD_PAGE);
  const [fetched, setFetched] = useState(0);
  const [loadingCards, setLoadingCards] = useState(false);
  useEffect(() => {
    setCards([]);
    setFetched(0);
    setWanted(CARD_PAGE);
    setGone(new Set());
  }, [orgId, refreshKey]);
  useEffect(() => {
    const upTo = Math.min(wanted, ids.length);
    if (preview || layout !== 'scroll' || fetched >= upTo) return;
    let alive = true;
    setLoadingCards(true);
    const next = ids.slice(fetched, upTo);
    Promise.all(next.map((id) => getPostById(id).catch(() => null)))
      .then((loaded) => {
        if (!alive) return;
        setFetched(upTo);
        setCards((current) => [...current, ...loaded.filter((post): post is FeedPost => post !== null)]);
      })
      .finally(() => {
        if (alive) setLoadingCards(false);
      });
    return () => {
      alive = false;
    };
    // ids is rebuilt every render; idsKey is the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, preview, wanted, idsKey, fetched]);
  const previewHas: boolean | null = !preview
    ? null
    : first.data == null && !first.error
      ? null
      : first.error && !first.data
        ? true
        : tiles.length > 0;
  useReportItems(onHasItems, previewHas);

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

  const patchCard = useCallback((postId: string, changes: Partial<FeedPost>) => {
    setCards((current) => current.map((post) => (post.id === postId ? { ...post, ...changes } : post)));
  }, []);
  const openCardPost = useCallback((post: FeedPost) => router.push(Routes.post(post.id)), [router]);
  const openCardProfile = useCallback((id: string) => router.push(Routes.profile(id)), [router]);
  const openCardActions = useCallback(
    (post: FeedPost) => {
      setActionTarget({
        kind: 'post',
        id: post.id,
        authorId: post.author_id,
        authorName: post.author_name,
        isOwn: !!user && post.author_id === user.id,
        link: postLink(post.id),
      });
    },
    [user],
  );
  const dropPost = useCallback((postId: string) => {
    setCards((current) => current.filter((post) => post.id !== postId));
    setGone((current) => new Set(current).add(postId));
  }, []);

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

  if (limit != null) {
    if (first.error && !first.data) return <ErrorState message={first.error} onRetry={first.reload} compact />;
    if (previewHas === false) return <PreviewEmpty title={t('club.posts.emptyTitle')} />;
    if (previewHas !== true) return null;
    return <MediaGrid tiles={tiles.slice(0, limit)} onPressTile={(id) => router.push(Routes.post(id))} />;
  }

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
  else {
    const layoutRow = (
      <View
        testID="club-posts-layout-row"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text variant="captionStrong" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
          {t('profile.postCount', { count: tiles.length })}
        </Text>
        <LayoutToggle value={layout} onChange={setLayout} />
      </View>
    );
    const moreButton = last?.more ? (
      <Button
        size="sm"
        label={t('club.posts.loadMore')}
        variant="ghost"
        loading={loadingMore}
        onPress={loadMore}
        testID="club-posts-more"
      />
    ) : null;

    body =
      layout === 'scroll' ? (
        <View style={{ gap: spacing.md }}>
          {layoutRow}
          <View style={{ gap: spacing.md }} testID="club-posts-scroll">
            {cards.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPatch={patchCard}
                onOpenComments={openCardPost}
                onOpenActions={openCardActions}
                onOpenProfile={openCardProfile}
                onOpenPost={openCardPost}
              />
            ))}
            {loadingCards ? <SkeletonList count={1} /> : null}
            {!loadingCards && fetched < ids.length ? (
              <Button
                size="sm"
                label={t('club.posts.loadMore')}
                variant="ghost"
                onPress={() => setWanted((n) => n + CARD_PAGE)}
                testID="club-posts-more"
              />
            ) : (
              moreButton
            )}
          </View>
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {layoutRow}
          <MediaGrid tiles={tiles} onPressTile={(id) => router.push(Routes.post(id))} />
          {moreButton}
        </View>
      );
  }

  return (
    <View style={{ gap: spacing.md }}>
      {actions}
      {body}
      {preview ? null : (
        <ContentActionsSheet
          target={actionTarget}
          onClose={() => setActionTarget(null)}
          onDeleted={(target) => dropPost(target.id)}
          onTagsChanged={(postId, tagged) => patchCard(postId, { tagged })}
        />
      )}
    </View>
  );
}
