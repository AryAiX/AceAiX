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
import type { SavedPost } from '@/types/models';

const PAGE_SIZE = 20;

export default function SavedPostsScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const { user } = useAuth();

  const [older, setOlder] = useState<SavedPost[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [commentsFor, setCommentsFor] = useState<SavedPost | null>(null);
  const [actionTarget, setActionTarget] = useState<ContentTarget | null>(null);

  const feed = useAsync<SavedPost[]>(
    () => getSavedPosts({ limit: PAGE_SIZE }),
    [],
    { refetchOnFocus: true },
  );
  const { data, error, loading, refreshing, refresh: refetch, mutate } = feed;

  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: SavedPost[] = [];
    for (const post of [...(data ?? []), ...older]) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      out.push(post);
    }
    return out;
  }, [data, older]);

  const patchPost = useCallback(
    (postId: string, changes: Partial<SavedPost>) => {
      if (changes.viewer_saved === false) {
        // Unsaved from this screen — it no longer belongs in this list.
        const drop = (list: SavedPost[]) => list.filter((p) => p.id !== postId);
        mutate((current) => (current ? drop(current) : current));
        setOlder(drop);
        return;
      }
      const apply = (list: SavedPost[]) =>
        list.map((p) => (p.id === postId ? { ...p, ...changes } : p));
      mutate((current) => (current ? apply(current) : current));
      setOlder(apply);
    },
    [mutate],
  );

  const removePost = useCallback(
    (postId: string) => {
      const drop = (list: SavedPost[]) => list.filter((p) => p.id !== postId);
      mutate((current) => (current ? drop(current) : current));
      setOlder(drop);
    },
    [mutate],
  );

  const removeAuthor = useCallback(
    (authorId: string) => {
      const drop = (list: SavedPost[]) => list.filter((p) => p.author_id !== authorId);
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
    if (loadingMore || reachedEnd || loading || items.length === 0) return;

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
      /* Silent, same as Home — the next scroll to the bottom retries. */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, reachedEnd, loading, items]);

  const openProfile = useCallback(
    (userId: string) => router.push(Routes.profile(userId)),
    [router],
  );

  const openPost = useCallback(
    (post: SavedPost) => router.push(Routes.post(post.id)),
    [router],
  );

  const openActions = useCallback(
    (post: SavedPost) => {
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
      setActiveId((first?.item as SavedPost | undefined)?.id ?? null);
    },
  ).current;

  const renderItem = useCallback(
    ({ item, index }: { item: SavedPost; index: number }) => (
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
    if (loading && items.length === 0) return <SkeletonList count={3} />;
    if (error && items.length === 0) {
      return <ErrorState message={error} onRetry={refetch} />;
    }
    return (
      <EmptyState
        icon={<Bookmark size={26} color={colors.textMuted} />}
        title={t('feed.savedEmptyTitle')}
        body={t('feed.savedEmptyBody')}
      />
    );
  };

  const header = <Header back title={t('feed.savedTitle')} />;

  return (
    <Screen header={header} scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={
          loadingMore ? <Loader /> : <View style={{ height: spacing.sm }} />
        }
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
