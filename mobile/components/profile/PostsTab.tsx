import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Grid3x3, Tag } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, ErrorState, SegmentedControl, SkeletonList, Text } from '@/components/ui';
import { PostCard } from '@/components/feed/PostCard';
import { ContentActionsSheet, type ContentTarget } from '@/components/feed/ContentActionsSheet';
import { getPostById, postLink } from '@/lib/api.feed';
import type { FeedPost } from '@/types/models';
import { useAsync } from '@/hooks/useAsync';
import { getPostTiles, getTaggedPostTiles, type PostTile } from '@/lib/api.profile';
import { getMyPostScores } from '@/lib/api';
import { scoreWhenPosted } from '@/lib/scoreTimeline';
import { Routes } from '@/lib/routes';
import { relativeTime, truncate } from '@/lib/format';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { MediaGrid, MediaTile } from './MediaGrid';
import { useProfileLayout } from './LayoutToggle';

interface Props {
  userId: string;
  isSelf: boolean;
  /** Bumped by the parent's pull-to-refresh so this list reloads with it. */
  refreshKey?: number;
}

type PostSource = 'posts' | 'tagged';

const PAGE = 6;

/**
 * The grid and the scroll of full cards, shared by Posts and Tagged.
 * `loadTiles` is the only difference in where the rows come from.
 */
function ProfilePostList({
  userId,
  refreshKey,
  loadTiles,
  showScores,
  empty,
}: {
  userId: string;
  refreshKey: number;
  loadTiles: (userId: string) => Promise<PostTile[]>;
  /** Score-when-posted belongs on your own posts, never on Tagged. */
  showScores: boolean;
  empty: {
    icon: React.ReactNode;
    title: string;
    body: string;
    actionLabel?: string;
    onAction?: () => void;
  };
}) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  const { user } = useAuth();
  const [actionTarget, setActionTarget] = useState<ContentTarget | null>(null);

  const posts = useAsync(() => loadTiles(userId), [userId, refreshKey, loadTiles]);
  /* Your own grid: your score on the day each post went up, from your own
     score history (only you can read it). Others' grids stay as they are. */
  const myScores = useAsync(() => getMyPostScores(), [refreshKey], { enabled: showScores });

  const [layout] = useProfileLayout();

  const openPost = useCallback((id: string) => router.push(Routes.post(id)), [router]);

  /* Scroll view: the same post cards as Home, loaded a few at a time
     (each card needs the full post: author, likes, saves). */
  const ids = (posts.data ?? []).map((post) => post.id);
  const [cards, setCards] = useState<FeedPost[]>([]);
  const [wanted, setWanted] = useState(PAGE);
  /* How many ids have been asked for, found or not, so a deleted post is
     skipped instead of being asked for again and again. */
  const [fetched, setFetched] = useState(0);
  const [loadingCards, setLoadingCards] = useState(false);
  const idsKey = ids.join(',');
  useEffect(() => {
    setCards([]);
    setFetched(0);
    setWanted(PAGE);
  }, [idsKey, refreshKey]);
  useEffect(() => {
    const upTo = Math.min(wanted, ids.length);
    if (layout !== 'scroll' || fetched >= upTo) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, wanted, idsKey, fetched]);

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
  const mutateTiles = posts.mutate;
  const dropPost = useCallback(
    (postId: string) => {
      setCards((current) => current.filter((post) => post.id !== postId));
      mutateTiles((current) => current?.filter((post) => post.id !== postId) ?? current);
    },
    [mutateTiles],
  );

  if (posts.loading) return <SkeletonList count={2} />;
  if (posts.error) return <ErrorState message={posts.error} onRetry={posts.reload} compact />;

  const rows = posts.data ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        icon={empty.icon}
        title={empty.title}
        body={empty.body}
        actionLabel={empty.actionLabel}
        onAction={empty.onAction}
      />
    );
  }

  const scoreFor = (postId: string): number | null =>
    showScores && myScores.data ? scoreWhenPosted(myScores.data.saved[postId]) : null;

  if (layout === 'scroll') {
    return (
      <>
        <View style={{ gap: theme.spacing.md }} testID="profile-posts-scroll">
          {cards.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              scoreCorner
              scoreThen={scoreFor(post.id)}
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
              label={t('profile.morePosts')}
              variant="secondary"
              onPress={() => setWanted((n) => n + PAGE)}
              testID="profile-posts-more"
            />
          ) : null}
        </View>
        <ContentActionsSheet
          target={actionTarget}
          onClose={() => setActionTarget(null)}
          onDeleted={(target) => dropPost(target.id)}
          onTagsChanged={(postId, tagged) => patchCard(postId, { tagged })}
        />
      </>
    );
  }

  const tiles: MediaTile[] = rows.map((post) => ({
    id: post.id,
    uri: post.thumbnail,
    isVideo: post.media?.[0]?.type === 'video',
    caption: post.caption ? truncate(post.caption, 60) : null,
    when: relativeTime(post.created_at),
    likes: post.like_count,
    comments: post.comment_count,
    /* Every post of yours, text ones too, so the grid matches the
       "Posted at …" line on the post itself. */
    score: scoreFor(post.id),
  }));
  const showsScores = tiles.some((tile) => tile.score != null && tile.score > 0);

  return (
    <>
      <MediaGrid tiles={tiles} onPressTile={openPost} layout={layout} />
      {showsScores ? (
        <Text variant="caption" tone="muted" style={{ marginTop: theme.spacing.sm }}>
          {t('profile.scoreWhenPostedHint')}
        </Text>
      ) : null}
    </>
  );
}

export function PostsTab({ userId, isSelf, refreshKey = 0 }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  const [source, setSource] = useState<PostSource>('posts');

  const showingPosts = source === 'posts';

  return (
    <View>
      {/* Posts stays first in the list. The row itself follows the writing
          direction, so in Arabic it is the one on the right. */}
      <SegmentedControl<PostSource>
        testID="profile-posts-switch"
        value={source}
        onChange={setSource}
        options={[
          { value: 'posts', label: t('profile.postsSwitchPosts') },
          { value: 'tagged', label: t('profile.postsSwitchTagged') },
        ]}
        style={{ marginBottom: theme.spacing.md }}
      />
      <ProfilePostList
        key={source}
        userId={userId}
        refreshKey={refreshKey}
        loadTiles={showingPosts ? getPostTiles : getTaggedPostTiles}
        showScores={showingPosts && isSelf}
        empty={
          showingPosts
            ? {
                icon: <Grid3x3 size={26} color={theme.colors.textMuted} />,
                title: t(isSelf ? 'profile.postsEmptyTitleSelf' : 'profile.postsEmptyTitleOther'),
                body: t(isSelf ? 'profile.postsEmptyBodySelf' : 'profile.postsEmptyBodyOther'),
                actionLabel: isSelf ? t('profile.postsEmptyAction') : undefined,
                onAction: isSelf ? () => router.push(Routes.compose) : undefined,
              }
            : {
                icon: <Tag size={26} color={theme.colors.textMuted} />,
                title: t('profile.taggedEmptyTitle'),
                body: t(isSelf ? 'profile.taggedEmptyBodySelf' : 'profile.taggedEmptyBodyOther'),
              }
        }
      />
    </View>
  );
}
