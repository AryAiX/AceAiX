import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ListViewToken as ViewToken,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Clapperboard, Flame, Play, Sparkles, Star } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Chip, EmptyState, ErrorState, Reveal, Skeleton, Tappable, Text } from '@/components/ui';
import { SPORTS, sportConfig, sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTabReselect } from '@/hooks/useTabReselect';
import { useT } from '@/i18n';
import { EXPLORE_PAGE, getExploreSports, getExploreVideos, isHighlight } from '@/lib/api.explore';
import { followedOnly, getReels, reelVideo } from '@/lib/api.reels';
import { errorMessage } from '@/lib/errors';
import { mergeClips, mosaicMetrics, mosaicRows, type MosaicRow } from '@/lib/explore';
import { compactNumber, displayName } from '@/lib/format';
import { knownViewCount, publishViewCount, useViewCountUpdates } from '@/lib/viewCounts';
import { Routes } from '@/lib/routes';
import type { FeedPost } from '@/types/models';

/**
 * Explore — every public clip in one mosaic.
 *
 * Posters, not players: a grid of thirty videos all moving is noise and a
 * drained battery. Only the large tile of a row that is on screen plays, muted,
 * as a preview of what a tap opens. Tapping any tile opens the reels pager at
 * that clip, with the rest of the grid behind it to swipe through.
 *
 * Everything drawn on a tile is white: it sits on footage and a scrim, never
 * on a theme surface.
 */

const GAP = 3;
/** The athlete's Discover: tiles inside the page margins, a little apart. */
const HUB_GAP = 6;
const HUB_INSET = 16;
/** explore_videos caps a page at 60; get_reels caps one at 30. */
const QUIET_CAP = { explore: 60, reels: 30 } as const;

function withKnownView(post: FeedPost): FeedPost {
  const known = knownViewCount(isHighlight(post) ? 'highlight' : 'post', post.id);
  if (known == null || known <= post.view_count) return post;
  return { ...post, view_count: known };
}
const ON_TILE = '#FFFFFF';
const SCRIM = 'rgba(0,0,0,0.38)';
const SMALL = { fontSize: 11, lineHeight: 14 } as const;

interface Props {
  /**
   * What fills the grid. `explore` is every public clip, with sport chips;
   * `reels` is Your Rundown: clips from people and club pages the viewer
   * follows, the collection behind "See all" on Home.
   */
  source?: 'explore' | 'reels';
  /** Shown above the grid, scrolling away with it. */
  header?: React.ReactElement | null;
  /** Offered in the empty state to someone who can post. */
  onPostFirst?: () => void;
  /**
   * `hub` is the athlete's Discover: the newest top clip as a big card, every
   * sport as a chip, and rounded tiles inside the page margins.
   */
  layout?: 'edge' | 'hub';
  /** Hub only: something to show after a given grid row (people, clubs…). */
  between?: (rowIndex: number) => React.ReactElement | null;
}

export function ExploreGrid({ source = 'explore', header, onPostFirst, layout = 'edge', between }: Props) {
  const hub = layout === 'hub' && source === 'explore';
  const gap = hub ? HUB_GAP : GAP;
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const reduced = useReducedMotion();

  const [sport, setSport] = useState<string | null>(null);
  const [items, setItems] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState(false);
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState(true);

  const fromReels = source === 'reels';
  const sports = useAsync(() => (fromReels ? Promise.resolve([]) : getExploreSports()), [fromReels]);
  /* Reels page by time, Explore by position: each RPC's own cursor. */
  const lastSeen = useRef<string | null>(null);
  const mounted = useRef(true);
  const runId = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useViewCountUpdates((subject, id, count) => {
    setItems((current) =>
      current.map((post) => {
        if (post.id !== id || post.view_count === count) return post;
        const highlight = isHighlight(post);
        if (subject === 'highlight' ? !highlight : highlight) return post;
        return { ...post, view_count: count };
      }),
    );
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /* A preview must stop when the tab is left or the pager covers the grid.
     Coming back re-reads the counts already on screen, without a spinner
     and without replacing the list, so the scroll offset stays put. */
  const focusedOnce = useRef(false);
  const refreshCounts = useCallback(async () => {
    const loaded = itemsRef.current.length;
    if (loaded === 0) return;
    const cap = fromReels ? QUIET_CAP.reels : QUIET_CAP.explore;
    const floor = fromReels ? 12 : EXPLORE_PAGE;
    try {
      const rows = fromReels
        ? await getReels({ limit: Math.min(cap, Math.max(floor, loaded)) })
        : await getExploreVideos({
            offset: 0,
            limit: Math.min(cap, Math.max(floor, loaded)),
            sport,
          });
      if (!mounted.current) return;
      for (const row of rows) {
        publishViewCount(isHighlight(row) ? 'highlight' : 'post', row.id, row.view_count);
      }
    } catch {
      /* A quiet refresh that fails leaves the grid as it is. */
    }
  }, [fromReels, sport]);
  const refreshCountsRef = useRef(refreshCounts);
  refreshCountsRef.current = refreshCounts;

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      if (focusedOnce.current) void refreshCountsRef.current();
      else focusedOnce.current = true;
      return () => setFocused(false);
    }, []),
  );

  const load = useCallback(
    /* `background`: replace the grid with no skeleton and no spinner (a re-tap
       of the tab). */
    async (mode: 'initial' | 'refresh' | 'more' | 'background', offset: number) => {
      const id = ++runId.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      setMoreError(false);
      try {
        const page = fromReels
          ? await getReels({ limit: EXPLORE_PAGE, before: mode === 'more' ? lastSeen.current : null })
          : await getExploreVideos({ offset, sport });
        /* The cursor and the end come from the whole page; only what is shown
           is filtered, so paging never skips or stalls. */
        if (page.length > 0) lastSeen.current = page[page.length - 1].created_at;
        const rows = fromReels ? followedOnly(page) : page;
        /* A slower earlier request must never overwrite a newer filter's grid. */
        if (!mounted.current || id !== runId.current) return;
        setItems((current) =>
          (mode === 'more' ? mergeClips(current, rows) : rows).map(withKnownView),
        );
        setDone(page.length < EXPLORE_PAGE);
        setError(null);
      } catch (err) {
        if (!mounted.current || id !== runId.current) return;
        if (mode === 'more') setMoreError(true);
        /* A quiet reload that fails leaves the grid as it is. */
        else if (mode !== 'background') setError(errorMessage(err));
      } finally {
        if (mounted.current && id === runId.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [sport, fromReels],
  );

  useEffect(() => {
    load('initial', 0);
  }, [load]);

  /* Tap Discover while on Explore: back to the top and a quiet reload. */
  const listRef = useTabReselect(() => {
    sports.reload();
    void load('background', 0);
  });

  /* On the hub the first clip is the big card at the top, while no sport is
     picked and there are enough clips for a grid under it. */
  const hero = hub && !sport && items.length > 3 ? items[0] : null;
  const gridItems = useMemo(() => (hero ? items.slice(1) : items), [items, hero]);
  const rows = useMemo(() => mosaicRows(gridItems), [gridItems]);
  const metrics = useMemo(
    () => mosaicMetrics(hub ? Math.max(0, width - HUB_INSET * 2) : width, gap),
    [width, hub, gap],
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    setWidth((prev) => (prev === next ? prev : next));
  }, []);

  const open = useCallback(
    (post: FeedPost) =>
      router.push({
        pathname: Routes.reels,
        params: fromReels
          ? { start: post.id }
          : { start: post.id, source: 'explore', ...(sport ? { sport } : {}) },
      }),
    [router, sport, fromReels],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    setVisible(new Set(viewableItems.filter((v) => v.isViewable).map((v) => String(v.key))));
  }).current;

  /* The rows between the clips only show on the full grid, not a sport filter. */
  const after = hub && !sport ? between : undefined;
  const renderRow = useCallback(
    ({ item, index }: { item: MosaicRow<FeedPost>; index: number }) => {
      const tile = renderTiles(item, index);
      const extra = after?.(index);
      return extra ? (
        <View>
          {tile}
          {extra}
        </View>
      ) : (
        tile
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metrics, open, focused, reduced, visible, hub, gap, after],
  );

  function renderTiles(item: MosaicRow<FeedPost>, index: number): React.ReactElement {
      if (item.kind === 'row') {
        return (
          <View style={{ flexDirection: 'row', gap, paddingHorizontal: hub ? HUB_INSET : 0 }}>
            {item.items.map((post, i) => (
              <ClipTile
                hub={hub}
                key={post.id}
                post={post}
                width={metrics.cell}
                height={metrics.cellHeight}
                order={index * 3 + i}
                onPress={open}
              />
            ))}
          </View>
        );
      }
      const big = (
        <ClipTile
          hub={hub}
          key={item.big.id}
          post={item.big}
          width={metrics.bigWidth}
          height={metrics.bigHeight}
          order={index * 3}
          big
          preview={focused && !reduced && visible.has(item.key)}
          onPress={open}
        />
      );
      const small = (
        <View key="small" style={{ gap }}>
          {item.small.map((post, i) => (
            <ClipTile
              hub={hub}
              key={post.id}
              post={post}
              width={metrics.cell}
              height={metrics.cellHeight}
              order={index * 3 + 1 + i}
              onPress={open}
            />
          ))}
        </View>
      );
      return (
        <View style={{ flexDirection: 'row', gap, paddingHorizontal: hub ? HUB_INSET : 0 }}>
          {item.side === 'left' ? [big, small] : [small, big]}
        </View>
      );
  }

  /* The chips only earn their row when there is more than one sport to pick. */
  /* The same sport can come back twice, spelt two ways ("Football" and
     "football"). One chip each: the first, which has the most clips. The
     clip filter ignores case, so that chip still finds both spellings. */
  const sportRows = useMemo(() => {
    const seen = new Set<string>();
    return (sports.data ?? []).filter((row) => {
      const key = sportLabel(t, row.sport).trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [sports.data, t]);
  /* The hub lists every sport, the ones with nothing to watch yet faded, so
     the row does not look like the app only knows two sports. */
  const hubSports = useMemo(() => {
    const counts = new Map(sportRows.map((row) => [sportLabel(t, row.sport).trim().toLowerCase(), row]));
    return SPORTS.map((config) => {
      const row = counts.get(sportLabel(t, config.key).trim().toLowerCase());
      return { key: row?.sport ?? config.key, emoji: config.emoji, has: !!row };
    });
  }, [sportRows, t]);
  const chips = hub ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
      testID="explore-sports"
    >
      <Chip
        tone="accent"
        label={t('sports.allSports')}
        selected={!sport}
        onPress={() => setSport(null)}
      />
      {hubSports.map((entry) => (
        <Chip
          tone="accent"
          key={entry.key}
          label={sportLabel(t, entry.key)}
          icon={<Text variant="caption">{entry.emoji}</Text>}
          selected={sport === entry.key}
          onPress={() => setSport((s) => (s === entry.key ? null : entry.key))}
          style={entry.has || sport === entry.key ? undefined : { opacity: 0.45 }}
          testID={`explore-sport-${entry.key}`}
        />
      ))}
    </ScrollView>
  ) : sportRows.length > 1 || sport ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
        testID="explore-sports"
      >
        <Chip
          tone="accent"
          label={t('explore.allSports')}
          icon={<Sparkles size={14} color={sport ? colors.textSecondary : colors.accent} />}
          selected={!sport}
          onPress={() => setSport(null)}
        />
        {sportRows.map((row) => (
          <Chip
            tone="accent"
            key={row.sport}
            label={sportLabel(t, row.sport)}
            icon={<Text variant="caption">{sportConfig(row.sport)?.emoji ?? '🎽'}</Text>}
            selected={sport === row.sport}
            onPress={() => setSport((s) => (s === row.sport ? null : row.sport))}
            testID={`explore-sport-${row.sport}`}
          />
        ))}
      </ScrollView>
    ) : null;

  const top = hub ? (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      {header}
      {hero ? (
        <HeroClip
          post={hero}
          width={Math.max(0, width - HUB_INSET * 2)}
          preview={focused && !reduced}
          onPress={open}
        />
      ) : null}
      <Text variant="heading" style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xs }}>
        {t('explore.forYou')}
      </Text>
      {chips}
    </View>
  ) : (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      {header}
      {chips}
    </View>
  );

  let empty: React.ReactElement;
  if (loading) {
    empty = <GridSkeleton metrics={metrics} />;
  } else if (error) {
    empty = (
      <View style={{ paddingHorizontal: spacing.lg }}>
        <ErrorState message={error} onRetry={() => load('initial', 0)} compact />
      </View>
    );
  } else {
    empty = (
      <View style={{ paddingHorizontal: spacing.lg }}>
        <EmptyState
          icon={<Clapperboard size={26} color={colors.textMuted} />}
          title={fromReels ? t('reels.emptyTitle') : t('explore.emptyTitle')}
          body={fromReels ? t('reels.emptyBody') : sport ? t('explore.emptyFilteredBody') : t('explore.emptyBody')}
          actionLabel={sport ? t('explore.showAll') : onPostFirst ? t('explore.postFirst') : undefined}
          onAction={sport ? () => setSport(null) : onPostFirst}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayout} testID={fromReels ? 'reels-grid' : 'explore-grid'}>
      <FlatList
        ref={listRef}
        data={loading || width === 0 ? [] : rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        extraData={visible}
        ListHeaderComponent={top}
        ListEmptyComponent={width === 0 ? undefined : empty}
        ItemSeparatorComponent={hub ? HubRowGap : RowGap}
        contentContainerStyle={{ paddingBottom: spacing.giant }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              sports.reload();
              load('refresh', 0);
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReachedThreshold={0.7}
        onEndReached={() => {
          if (!loading && !loadingMore && !done && !moreError && items.length > 0) load('more', items.length);
        }}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : moreError ? (
            <Text variant="caption" tone="danger" align="center" style={{ margin: spacing.lg }}>
              {t('explore.loadMoreFailed')}
            </Text>
          ) : undefined
        }
      />
    </View>
  );
}

function RowGap() {
  return <View style={{ height: GAP }} />;
}

function HubRowGap() {
  return <View style={{ height: HUB_GAP }} />;
}

// ── One tile ─────────────────────────────────────────────────────────────────
interface TileProps {
  post: FeedPost;
  width: number;
  height: number;
  /** Position in the grid, for the staggered arrival. */
  order: number;
  big?: boolean;
  /** Play a muted preview over the poster. Large tiles only. */
  preview?: boolean;
  /** The Discover hub: rounder corners, and a small star instead of the labels. */
  hub?: boolean;
  onPress: (post: FeedPost) => void;
}

function ClipTileBase({ post, width, height, order, big, preview, hub, onPress }: TileProps) {
  const theme = useTheme();
  const t = useT();
  const video = reelVideo(post);
  const name = displayName(post.author_name);
  const highlight = isHighlight(post);

  return (
    <Reveal index={order % 9} from="scale">
      <Tappable
        onPress={() => onPress(post)}
        scaleTo={0.96}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={`${t('explore.playClipBy', { name })}. ${t('explore.viewsA11y', { n: post.view_count })}`}
        testID={`explore-tile-${post.id}`}
        style={{
          width,
          height,
          borderRadius: hub ? theme.radii.lg : big ? theme.radii.lg : theme.radii.md,
          overflow: 'hidden',
          backgroundColor: theme.colors.surfaceSunken,
        }}
      >
        {/* A clip with no poster still gets a coloured tile, never a grey hole. */}
        <LinearGradient
          colors={theme.huePair(post.author_id)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {video?.thumbnail ? (
          <Image
            source={{ uri: video.thumbnail }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Clapperboard size={big ? 40 : 24} color="rgba(255,255,255,0.7)" />
          </View>
        )}
        {preview && video ? <TilePreview url={video.url} /> : null}

        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: big ? height * 0.4 : height * 0.5 }}
        />

        {hub ? (
          highlight ? (
            <View
              pointerEvents="none"
              accessibilityLabel={t('explore.highlight')}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: SCRIM,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Star size={11} color="#FFD43B" fill="#FFD43B" />
            </View>
          ) : null
        ) : (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {highlight ? (
              <View style={{ paddingHorizontal: 7, height: 20, borderRadius: 10, backgroundColor: SCRIM, justifyContent: 'center' }}>
                <Text variant="captionStrong" color={ON_TILE} numberOfLines={1} style={SMALL}>
                  {t('explore.highlight')}
                </Text>
              </View>
            ) : null}
            <View
              style={{
                width: big ? 28 : 22,
                height: big ? 28 : 22,
                borderRadius: 14,
                backgroundColor: SCRIM,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Play size={big ? 13 : 10} color={ON_TILE} fill={ON_TILE} />
            </View>
          </View>
        )}

        <View pointerEvents="none" style={{ position: 'absolute', left: 8, right: 8, bottom: 7, gap: 4 }}>
          {big ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Avatar uri={post.author_avatar} name={name} size="xs" />
              <Text variant="captionStrong" color={ON_TILE} numberOfLines={1} style={{ flexShrink: 1 }}>
                {name}
              </Text>
            </View>
          ) : null}
          {big && post.caption ? (
            <Text variant="caption" color="rgba(255,255,255,0.86)" numberOfLines={1}>
              {post.caption}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Play size={10} color={ON_TILE} strokeWidth={2.6} />
            <Text variant="captionStrong" color={ON_TILE} style={SMALL}>
              {compactNumber(post.view_count)}
            </Text>
          </View>
        </View>
      </Tappable>
    </Reveal>
  );
}

const ClipTile = memo(ClipTileBase);

// ── The big card at the top of the hub ─────────────────────────────────────────
function HeroClip({
  post,
  width,
  preview,
  onPress,
}: {
  post: FeedPost;
  width: number;
  preview: boolean;
  onPress: (post: FeedPost) => void;
}) {
  const theme = useTheme();
  const { radii, spacing } = theme;
  const t = useT();
  const video = reelVideo(post);
  const name = displayName(post.author_name);
  const height = Math.round(width * 0.95);
  if (width === 0) return null;

  return (
    <Tappable
      onPress={() => onPress(post)}
      scaleTo={0.98}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={`${t('explore.playClipBy', { name })}. ${t('explore.viewsA11y', { n: post.view_count })}`}
      testID="explore-hero"
      style={{
        width,
        height,
        alignSelf: 'center',
        borderRadius: radii.xxl,
        overflow: 'hidden',
        backgroundColor: theme.colors.surfaceSunken,
      }}
    >
      <LinearGradient
        colors={theme.huePair(post.author_id)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {video?.thumbnail ? (
        <Image
          source={{ uri: video.thumbnail }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      {preview && video ? <TilePreview url={video.url} /> : null}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(10,10,40,0)', 'rgba(10,10,40,0.78)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.55 }}
      />

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: spacing.md,
          left: spacing.md,
          right: spacing.md,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <View style={heroPill}>
          <Flame size={13} color={ON_TILE} />
          <Text variant="captionStrong" color={ON_TILE} numberOfLines={1}>
            {t('explore.trendingNow')}
          </Text>
        </View>
        <View style={heroPill}>
          <Play size={11} color={ON_TILE} strokeWidth={2.6} />
          <Text variant="captionStrong" color={ON_TILE}>
            {compactNumber(post.view_count)}
          </Text>
        </View>
      </View>

      <View pointerEvents="none" style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg, gap: spacing.sm }}>
        {post.caption ? (
          <Text variant="title" color={ON_TILE} numberOfLines={2}>
            {post.caption}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Avatar uri={post.author_avatar} name={name} size="sm" />
          <Text variant="bodyStrong" color={ON_TILE} numberOfLines={1} style={{ flexShrink: 1 }}>
            {name}
          </Text>
        </View>
      </View>
    </Tappable>
  );
}

const heroPill = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 5,
  paddingHorizontal: 10,
  height: 28,
  borderRadius: 14,
  backgroundColor: 'rgba(255,255,255,0.22)',
};

/** The muted, looping preview on a large tile. Fades in over the poster on the first frame. */
function TilePreview({ url }: { url: string }) {
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
        onFirstFrameRender={() => setReady(true)}
      />
    </View>
  );
}

function GridSkeleton({ metrics }: { metrics: ReturnType<typeof mosaicMetrics> }) {
  const { radii } = useTheme();
  return (
    <View style={{ gap: GAP }} testID="explore-skeleton">
      <View style={{ flexDirection: 'row', gap: GAP }}>
        <Skeleton width={metrics.bigWidth} height={metrics.bigHeight} radius={radii.lg} />
        <View style={{ gap: GAP }}>
          <Skeleton width={metrics.cell} height={metrics.cellHeight} radius={radii.md} />
          <Skeleton width={metrics.cell} height={metrics.cellHeight} radius={radii.md} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: GAP }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={metrics.cell} height={metrics.cellHeight} radius={radii.md} />
        ))}
      </View>
    </View>
  );
}
