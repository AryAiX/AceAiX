import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, View, type LayoutChangeEvent, type ViewToken } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Clapperboard } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Brand } from '@/theme/tokens';
import { Button, Loader, Text, useToast } from '@/components/ui';
import { CommentSheet } from '@/components/feed/CommentSheet';
import { ReelItem } from '@/components/reels/ReelItem';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { toggleFollow, toggleLike } from '@/lib/api';
import { postLink } from '@/lib/api.feed';
import { getExploreVideos, isHighlight } from '@/lib/api.explore';
import { getReels } from '@/lib/api.reels';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import { shareContent } from '@/lib/share';
import { useAuth } from '@/providers/AuthProvider';
import type { FeedPost } from '@/types/models';

/**
 * Reels — the feed's video posts, one per screen, swiped vertically.
 *
 * Only the reel that is actually on screen plays. Sound is one setting for
 * the whole session: turn it on once and every reel after is audible, which is
 * what someone who turned it on meant.
 */

const INK = Brand.ink;
const ON_DARK = '#FFFFFF';

export default function ReelsScreen() {
  const theme = useTheme();
  const { spacing } = theme;
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ start?: string; source?: string; sport?: string }>();

  /* Opened from Explore, the pager plays the grid the tap came from — the
     same clips, the same filter — so swiping carries on where the eye was. */
  const fromExplore = params.source === 'explore';
  const sport = typeof params.sport === 'string' && params.sport ? params.sport : null;
  const reels = useAsync(
    () =>
      fromExplore
        ? getExploreVideos({ limit: 60, sport }).then((rows) =>
            rows.filter((post) => post.media.some((m) => m.type === 'video')),
          )
        : getReels({ limit: 30 }),
    [fromExplore, sport],
  );
  const { mutate } = reels;
  const items = useMemo(() => reels.data ?? [], [reels.data]);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [commentsFor, setCommentsFor] = useState<FeedPost | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev.width === Math.round(width) && prev.height === Math.round(height)
        ? prev
        : { width: Math.round(width), height: Math.round(height) },
    );
  }, []);

  const startIndex = useMemo(() => {
    const i = items.findIndex((p) => p.id === params.start);
    return i >= 0 ? i : 0;
  }, [items, params.start]);

  /* Until the list reports what is on screen, the reel it opened at is. */
  const currentId = activeId ?? items[startIndex]?.id ?? null;

  const patch = useCallback(
    (match: (p: FeedPost) => boolean, changes: Partial<FeedPost>) => {
      mutate((list) => (list ? list.map((p) => (match(p) ? { ...p, ...changes } : p)) : list));
    },
    [mutate],
  );

  const onLike = useCallback(
    async (post: FeedPost, forceOn = false) => {
      /* A highlight is a clip from a profile, not a post: nothing to like. */
      if (isHighlight(post)) return;
      if (forceOn && post.viewer_liked) return;
      const liked = !post.viewer_liked;
      patch((p) => p.id === post.id, {
        viewer_liked: liked,
        like_count: Math.max(0, post.like_count + (liked ? 1 : -1)),
      });
      try {
        const result = await toggleLike(post.id);
        patch((p) => p.id === post.id, { viewer_liked: result.liked, like_count: result.like_count });
      } catch (err) {
        patch((p) => p.id === post.id, { viewer_liked: post.viewer_liked, like_count: post.like_count });
        toast.error(errorMessage(err));
      }
    },
    [patch, toast],
  );

  const onFollow = useCallback(
    async (post: FeedPost) => {
      patch((p) => p.author_id === post.author_id, { viewer_follows: true });
      try {
        const result = await toggleFollow(post.author_id);
        patch((p) => p.author_id === post.author_id, { viewer_follows: result.following });
      } catch (err) {
        patch((p) => p.author_id === post.author_id, { viewer_follows: false });
        toast.error(errorMessage(err));
      }
    },
    [patch, toast],
  );

  const onShare = useCallback(
    async (post: FeedPost) => {
      const link = postLink(post.id);
      try {
        const outcome = await shareContent({ message: link, url: link });
        if (outcome === 'copied') toast.success(t('feed.linkCopied'));
      } catch {
        toast.error(t('common.somethingWentWrong'));
      }
    },
    [t, toast],
  );

  const openProfile = useCallback(
    (userId: string) => router.push(Routes.profile(userId)),
    [router],
  );

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fromExplore ? Routes.discover : Routes.home);
  }, [router, fromExplore]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((token) => token.isViewable);
    const post = first?.item as FeedPost | undefined;
    if (post) setActiveId(post.id);
  }).current;

  const renderItem = useCallback(
    ({ item }: { item: FeedPost }) => (
      <ReelItem
        post={item}
        width={size.width}
        height={size.height}
        active={item.id === currentId}
        muted={muted}
        isOwn={!!user && user.id === item.author_id}
        bottomInset={insets.bottom}
        onToggleMute={toggleMute}
        onLike={onLike}
        onComment={setCommentsFor}
        onShare={onShare}
        onFollow={onFollow}
        onOpenProfile={openProfile}
      />
    ),
    [size.width, size.height, currentId, muted, user, insets.bottom, toggleMute, onLike, onShare, onFollow, openProfile],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: size.height, offset: size.height * index, index }),
    [size.height],
  );

  let body: React.ReactNode;
  if (reels.loading && items.length === 0) {
    body = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Loader />
      </View>
    );
  } else if (reels.error && items.length === 0) {
    body = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.lg }}>
        <Text variant="body" color={ON_DARK} align="center">
          {reels.error}
        </Text>
        <Button label={t('common.retry')} variant="secondary" onPress={reels.reload} />
      </View>
    );
  } else if (items.length === 0) {
    body = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md }}>
        <Clapperboard size={40} color={ON_DARK} />
        <Text variant="heading" color={ON_DARK} align="center">
          {t('reels.emptyTitle')}
        </Text>
        <Text variant="body" color="rgba(255,255,255,0.72)" align="center">
          {t('reels.emptyBody')}
        </Text>
      </View>
    );
  } else if (size.height > 0) {
    body = (
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        extraData={currentId}
        pagingEnabled
        snapToInterval={size.height}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
        initialScrollIndex={startIndex}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        testID="reels-list"
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: INK }} onLayout={onLayout} testID="reels-screen">
      <StatusBar style="light" />
      {body}

      {/* The header floats over the footage; a short scrim keeps it legible. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 90 }}
      />
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: insets.top + spacing.sm,
          left: spacing.sm,
          right: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
        }}
      >
        <Pressable
          onPress={close}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('reels.close')}
          testID="reels-close"
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? 'rgba(255,255,255,0.18)' : 'transparent',
          })}
        >
          <ChevronLeft size={28} color={ON_DARK} strokeWidth={2.4} />
        </Pressable>
        <Text variant="heading" color={ON_DARK}>
          {fromExplore ? t('explore.title') : t('reels.title')}
        </Text>
      </View>

      {commentsFor ? (
        <CommentSheet
          key={commentsFor.id}
          post={commentsFor}
          onClose={() => setCommentsFor(null)}
          onOpenProfile={openProfile}
          onCommentAdded={(postId) => {
            const post = items.find((p) => p.id === postId);
            patch((p) => p.id === postId, { comment_count: (post?.comment_count ?? 0) + 1 });
          }}
        />
      ) : null}
    </View>
  );
}
