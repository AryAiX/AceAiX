import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, View, type ListViewToken as ViewToken } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  EmptyState,
  ErrorState,
  IconButton,
  Loader,
  Reveal,
  Screen,
  SegmentedControl,
  SkeletonList,
} from '@/components/ui';
import { FollowingStarter } from '@/components/feed/FollowingStarter';
import { PostCard } from '@/components/feed/PostCard';
import { CommentSheet } from '@/components/feed/CommentSheet';
import {
  ContentActionsSheet,
  type ContentTarget,
} from '@/components/feed/ContentActionsSheet';
import { useAsync } from '@/hooks/useAsync';
import { useTabReselect } from '@/hooks/useTabReselect';
import { useT } from '@/i18n';
import { getFeed } from '@/lib/api';
import { postLink } from '@/lib/api.feed';
import { getFollowingReels } from '@/lib/api.reels';
import { Routes } from '@/lib/routes';
import { StreakChip } from '@/components/celebrate/StreakChip';
import { HomeSpotlight } from '@/components/feed/HomeSpotlight';
import { MessagesButton } from '@/components/feed/MessagesButton';
import { MatchedTrial } from '@/components/feed/MatchedTrial';
import { StoryRail } from '@/components/stories/StoryRail';
import { ReelsStrip } from '@/components/reels/ReelsStrip';
import { Wordmark } from '@/components/common/Wordmark';
import { useAuth } from '@/providers/AuthProvider';
import { useUnread } from '@/providers/UnreadProvider';
import type { FeedPost } from '@/types/models';
import { useEndPadding } from '@/components/navigation/dockInset';

/**
 * Home.
 *
 * Page one comes from `useAsync` so a return from the composer refreshes it on
 * focus; later pages are appended locally and keyed off the oldest post we
 * hold, which keeps the cursor honest even though "For you" is not strictly
 * chronological.
 */

const PAGE_SIZE = 20;
/** Posters in Your Rundown, read from the people and club pages you follow. */
const RUNDOWN_SHOWN = 6;

type Scope = 'for_you' | 'following';

export default function HomeScreen() {
  const endPad = useEndPadding();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const { user } = useAuth();
  const unread = useUnread();

  const scopes = useMemo<{ value: Scope; label: string }[]>(
    () => [
      { value: 'for_you', label: t('feed.scopeForYou') },
      { value: 'following', label: t('feed.scopeFollowing') },
    ],
    [t],
  );

  const [scope, setScope] = useState<Scope>('for_you');
  const [older, setOlder] = useState<FeedPost[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [commentsFor, setCommentsFor] = useState<FeedPost | null>(null);
  const [actionTarget, setActionTarget] = useState<ContentTarget | null>(null);

  const feed = useAsync<FeedPost[]>(
    () => getFeed({ scope, limit: PAGE_SIZE }),
    [scope],
    { refetchOnFocus: true },
  );

  /* Loaded here, not inside the strip: the strip now sits in a list cell, and
     a cell scrolled far enough away is unmounted. Loading on remount would pop
     the strip in from nothing and jump the feed under your thumb. These six
     are the clips from people and club pages you follow. */
  const reels = useAsync(
    () => getFollowingReels({ limit: RUNDOWN_SHOWN }),
    [],
    { refetchOnFocus: true },
  );

  useEffect(() => {
    setOlder([]);
    setReachedEnd(false);
  }, [scope]);

  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: FeedPost[] = [];
    for (const post of [...(feed.data ?? []), ...older]) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      out.push(post);
    }
    return out;
  }, [feed.data, older]);

  const { mutate, refresh: refetch } = feed;

  const patchPost = useCallback(
    (postId: string, changes: Partial<FeedPost>) => {
      const apply = (list: FeedPost[]) =>
        list.map((p) => (p.id === postId ? { ...p, ...changes } : p));
      mutate((current) => (current ? apply(current) : current));
      setOlder(apply);
    },
    [mutate],
  );

  const removePost = useCallback(
    (postId: string) => {
      const drop = (list: FeedPost[]) => list.filter((p) => p.id !== postId);
      mutate((current) => (current ? drop(current) : current));
      setOlder(drop);
    },
    [mutate],
  );

  const removeAuthor = useCallback(
    (authorId: string) => {
      const drop = (list: FeedPost[]) => list.filter((p) => p.author_id !== authorId);
      mutate((current) => (current ? drop(current) : current));
      setOlder(drop);
    },
    [mutate],
  );

  /* A follow from one card applies to every post by that author on screen, so
     a second card by the same person can never offer (and toggle back off)
     the follow that was just made. */
  const setAuthorFollowed = useCallback(
    (authorId: string, following: boolean) => {
      const apply = (list: FeedPost[]) =>
        list.map((p) => (p.author_id === authorId ? { ...p, viewer_follows: following } : p));
      mutate((current) => (current ? apply(current) : current));
      setOlder(apply);
    },
    [mutate],
  );

  const refresh = useCallback(() => {
    setOlder([]);
    setReachedEnd(false);
    refetch();
  }, [refetch]);

  /* Tap Home while on Home: back to the top and a fresh first page. Quietly —
     a `refreshing` flag set without a finger-pull sticks on iOS (see
     hooks/useAsync.ts). Older pages are dropped once the new page is in, so
     the list does not shrink under the scroll on its way up. `reload` never
     rejects (useAsync catches), so the `then` always runs. */
  const listRef = useTabReselect(() => {
    void feed.reload().then(() => {
      setOlder([]);
      setReachedEnd(false);
    });
  });

  const loadMore = useCallback(async () => {
    if (loadingMore || reachedEnd || feed.loading || items.length === 0) return;

    // "For you" re-orders posts, so the newest-first cursor has to be the
    // oldest post we actually hold — not simply the last one on screen.
    const oldest = items.reduce(
      (min, post) => (post.created_at < min ? post.created_at : min),
      items[0].created_at,
    );

    setLoadingMore(true);
    try {
      const page = await getFeed({ scope, limit: PAGE_SIZE, before: oldest });
      if (page.length < PAGE_SIZE) setReachedEnd(true);
      if (page.length > 0) setOlder((current) => [...current, ...page]);
    } catch {
      /* Deliberately silent, and deliberately not marked as the end: a red
         banner over an otherwise working feed helps nobody, and the next
         scroll to the bottom tries the same page again. */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, reachedEnd, feed.loading, items, scope]);

  const openProfile = useCallback(
    (userId: string) => router.push(Routes.profile(userId)),
    [router],
  );

  const openPost = useCallback(
    (post: FeedPost) => router.push(Routes.post(post.id)),
    [router],
  );

  const openActions = useCallback(
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

  const bumpCommentCount = useCallback(
    (postId: string) => {
      const post = items.find((p) => p.id === postId);
      patchPost(postId, { comment_count: (post?.comment_count ?? 0) + 1 });
    },
    [items, patchPost],
  );

  /* FlatList captures these once — swapping them mid-scroll makes it throw. */
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 120,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((token) => token.isViewable);
      setActiveId((first?.item as FeedPost | undefined)?.id ?? null);
    },
  ).current;

  /* Your Rundown sits right under Stories, on the Following tab only. */
  const rundown = scope === 'following' && reels.data?.length ? reels.data : null;

  const renderItem = useCallback(
    /* The stagger is keyed off the position in the list, and `Reveal` caps it
       at six — so the first screenful arrives in sequence and everything the
       person scrolls to afterwards is already in place. */
    ({ item, index }: { item: FeedPost; index: number }) => {
      const card = (
        <Reveal index={index}>
          <PostCard
            post={item}
            isActive={item.id === activeId}
            onPatch={patchPost}
            onOpenComments={setCommentsFor}
            onOpenActions={openActions}
            onOpenProfile={openProfile}
            onOpenPost={openPost}
            onFollowChange={setAuthorFollowed}
            scoreCorner={scope === 'for_you'}
          />
        </Reveal>
      );
      return card;
    },
    [activeId, patchPost, openActions, openProfile, openPost, setAuthorFollowed, scope],
  );

  /* Everything renderItem reads besides `data`, so the list redraws when any of
     it changes — FlatList is a PureComponent and only compares `extraData`. */
  const listExtra = useMemo(
    () => ({ activeId, scope }),
    [activeId, scope],
  );

  /* Returns an element, not a component: a fresh component type on every
     render would remount the skeleton and restart its shimmer. */
  const renderEmpty = () => {
    if (feed.loading && items.length === 0) return <SkeletonList count={3} />;
    if (feed.error && items.length === 0) {
      return <ErrorState message={feed.error} onRetry={feed.reload} />;
    }
    /* Following: the starter sits in the header, above the (empty) list. */
    if (scope === 'following') return undefined;
    return (
      <EmptyState
        icon={<Users size={26} color={colors.textMuted} />}
        title={t('feed.emptyForYouTitle')}
        body={t('feed.emptyForYouBody')}
        actionLabel={t('feed.emptyForYouAction')}
        onAction={() => router.push(Routes.discover)}
      />
    );
  };

  return (
    <Screen scroll={false} padded={false} testID="home-screen">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs + 2,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
        }}
      >
        <Wordmark />

        {/* The streak sits before the bell: it is the one thing in the header
            that rewards opening the app rather than asking something of you.
            Messages moved down beside the Playfeed switch. */}
        <StreakChip testID="home-streak" />

        <IconButton
          icon={<Bell size={20} color={colors.text} strokeWidth={1.9} />}
          label={
            unread.notifications > 0
              ? t('feed.notificationsNew', { count: unread.notifications })
              : t('feed.notifications')
          }
          badge={unread.notifications}
          size={38}
          onPress={() => router.push(Routes.notifications)}
          testID="home-notifications"
        />
      </View>

      {/* The Playfeed switch sits above the list, outside it, so it stays put
          while stories and posts scroll under it — and Messages with it. Home
          is the only way into the inbox, so this button must never go. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <SegmentedControl
            options={scopes}
            value={scope}
            onChange={setScope}
            testID="home-scope"
          />
        </View>
        <MessagesButton
          count={unread.messages}
          label={
            unread.messages > 0
              ? t('feed.messagesUnread', { count: unread.messages })
              : t('feed.messages')
          }
          onPress={() => router.push(Routes.inbox)}
          testID="home-messages"
        />
      </View>

      {feed.error ? (
        <View style={{ flex: 1 }}>
          <ErrorState message={feed.error} onRetry={feed.reload} />
        </View>
      ) : (
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        extraData={listExtra}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: endPad,
          gap: spacing.md,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          /* Stories, then Your Rundown (Following only), then your week, then
             one matched trial — each arriving a beat after the one above it.
             The challenge and the matched trial are Playfeed only: Following
             is the people you follow. */
          <View style={{ gap: spacing.lg }}>
            <Reveal index={0}>
              <StoryRail />
            </Reveal>
            {rundown ? (
              <Reveal index={1}>
                <ReelsStrip items={rundown} />
              </Reveal>
            ) : null}
            <Reveal index={1}>
              <HomeSpotlight showChallenge={scope === 'for_you'} />
            </Reveal>
            {scope === 'following' && !(feed.loading && items.length === 0) && !feed.error ? (
              /* Follow 3 to get going. Stays while their posts arrive below. */
              <FollowingStarter feedEmpty={items.length === 0} onFollowed={feed.reload} />
            ) : null}
            {scope === 'for_you' ? (
              <Reveal index={2}>
                <MatchedTrial />
              </Reveal>
            ) : null}
          </View>
        }
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
        testID="home-feed"
      />
      )}

      {/* Mounted only while open, and keyed on the post, so one post's
          comments can never appear under another's header. */}
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
