import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, View, type ViewToken } from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  EmptyState,
  ErrorState,
  Header,
  Loader,
  Reveal,
  Screen,
  SkeletonList,
} from '@/components/ui';
import { PostCard } from '@/components/feed/PostCard';
import { CommentSheet } from '@/components/feed/CommentSheet';
import {
  ContentActionsSheet,
  type ContentTarget,
} from '@/components/feed/ContentActionsSheet';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getSavedPosts } from '@/lib/api';
import { postLink } from '@/lib/api.feed';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';
import type { SavedFeedPost } from '@/types/models';

/**
 * Saved.
 *
 * Same list mechanics as Home, but the cursor and the removal rule both key
 * off when a post was saved, not when it was posted — and unsaving a post
 * here removes it from the list immediately, the way every other app with a
 * bookmarks screen behaves.
 */

const PAGE_SIZE = 20;

export default function SavedScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const { user } = useAuth();

  const [older, setOlder] = useState<SavedFeedPost[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [commentsFor, setCommentsFor] = useState<SavedFeedPost | null>(null);
  const [actionTarget, setActionTarget] = useState<ContentTarget | null>(null);

  const feed = useAsync<SavedFeedPost[]>(
    () => getSavedPosts({ limit: PAGE_SIZE }),
    [],
    { refetchOnFocus: true },
  );

  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: SavedFeedPost[] = [];
    for (const post of [...(feed.data ?? []), ...older]) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      out.push(post);
    }
    return out;
  }, [feed.data, older]);

  const { mutate, refresh: refetch } = feed;

  /* Unlike Home's patchPost, a save-state change of `false` removes the post
     from the list entirely rather than patching it in place — a post that is
     no longer saved has no reason to still be on this screen. Note: if the
     underlying toggleSave call later fails and PostCard reverts the icon, the
     post will already be gone from this list until the next real refresh —
     a known, accepted tradeoff rather than something worth extra state to
     avoid for a rare network-failure case. */
  const patchPost = useCallback(
    (postId: string, changes: Partial<SavedFeedPost>) => {
      if (changes.viewer_saved === false) {
        const drop = (list: SavedFeedPost[]) => list.filter((p) => p.id !== postId);
        mutate((current) => (current ? drop(current) : current));
        setOlder(drop);
        return;
      }
      const apply = (list: SavedFeedPost[]) =>
        list.map((p) => (p.id === postId ? { ...p, ...changes } : p));
      mutate((current) => (current ? apply(current) : current));
      setOlder(apply);
    },
    [mutate],
  );

  const removePost = useCallback(
    (postId: string) => {
      const drop = (list: SavedFeedPost[]) => list.filter((p) => p.id !== postId);
      mutate((current) => (current ? drop(current) : current));
      setOlder(drop);
    },
    [mutate],
  );

  const removeAuthor = useCallback(
    (authorId: string) => {
      const drop = (list: SavedFeedPost[]) => list.filter((p) => p.author_id !== authorId);
      mutate((current) => (current ? drop(current) : current));
      setOlder(drop);
    },
    [mutate],
  );

  const refresh = useCallback(() => {
    setOlder([]);
    setReachedEnd(false);
    refetch();
  }, [refetch]);

  const loadMore = useCallback(async () => {
    if (loadingMore || reachedEnd || feed.loading || items.length === 0) return;

    const oldestSavedAt = items.reduce(
      (min, post) => (post.saved_at < min ? post.saved_at : min),
      items[0].saved_at,
    );

    setLoadingMore(true);
    try {
      const page = await getSavedPosts({ limit: PAGE_SIZE, before: oldestSavedAt });
      if (page.length < PAGE_SIZE) setReachedEnd(true);
      if (page.length > 0) setOlder((current) => [...current, ...page]);
    } catch {
      /* Same deliberate-silence rule as Home: a broken load-more banner is
         worse than just trying again on the next scroll. */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, reachedEnd, feed.loading, items]);

  const openProfile = useCallback(
    (userId: string) => router.push(Routes.profile(userId)),
    [router],
  );

  const openPost = useCallback(
    (post: SavedFeedPost) => router.push(Routes.post(post.id)),
    [router],
  );

  const openActions = useCallback(
    (post: SavedFeedPost) => {
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

  const bumpCommentCount = useCallback(
    (postId: string) => {
      const post = items.find((p) => p.id === postId);
      patchPost(postId, { comment_count: (post?.comment_count ?? 0) + 1 });
    },
    [items, patchPost],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 120,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((token) => token.isViewable);
      setActiveId((first?.item as SavedFeedPost | undefined)?.id ?? null);
    },
  ).current;

  const renderItem = useCallback(
    ({ item, index }: { item: SavedFeedPost; index: number }) => (
      <Reveal index={index}>
        <PostCard
          post={item}
          isActive={item.id === activeId}
          onPatch={patchPost}
          onOpenComments={setCommentsFor}
          onOpenActions={openActions}
          onOpenProfile={openProfile}
          onOpenPost={openPost}
        />
      </Reveal>
    ),
    [activeId, patchPost, openActions, openProfile, openPost],
  );

  const renderEmpty = () => {
    if (feed.loading && items.length === 0) return <SkeletonList count={3} />;
    if (feed.error && items.length === 0) {
      return <ErrorState message={feed.error} onRetry={feed.reload} />;
    }
    return (
      <EmptyState
        icon={<Bookmark size={26} color={colors.textMuted} />}
        title={t('savedPosts.emptyTitle')}
        body={t('savedPosts.emptyBody')}
      />
    );
  };

  const header = <Header back title={t('savedPosts.title')} />;

  return (
    <Screen header={header} scroll={false} padded={false} testID="saved-posts-screen">
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        extraData={activeId}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.giant,
          gap: spacing.md,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={feed.refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={
          loadingMore ? <Loader /> : <View style={{ height: spacing.sm }} />
        }
        testID="saved-posts-feed"
      />

      {commentsFor ? (
        <CommentSheet
          key={commentsFor.id}
          post={commentsFor}
          onClose={() => setCommentsFor(null)}
          onOpenProfile={openProfile}
          onCommentAdded={bumpCommentCount}
        />
      ) : null}

      <ContentActionsSheet
        target={actionTarget}
        onClose={() => setActionTarget(null)}
        onDeleted={(target) => removePost(target.id)}
        onBlocked={removeAuthor}
      />
    </Screen>
  );
}
