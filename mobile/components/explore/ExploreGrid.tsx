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
  type ViewToken,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Clapperboard, Play, Sparkles } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Chip, EmptyState, ErrorState, Reveal, Skeleton, Tappable, Text } from '@/components/ui';
import { sportConfig, sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import { EXPLORE_PAGE, getExploreSports, getExploreVideos, isHighlight } from '@/lib/api.explore';
import { getReels, reelVideo } from '@/lib/api.reels';
import { errorMessage } from '@/lib/errors';
import { mergeClips, mosaicMetrics, mosaicRows, type MosaicRow } from '@/lib/explore';
import { compactNumber, displayName } from '@/lib/format';
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
const ON_TILE = '#FFFFFF';
const SCRIM = 'rgba(0,0,0,0.38)';
const SMALL = { fontSize: 11, lineHeight: 14 } as const;

interface Props {
  /**
   * What fills the grid. `explore` is every public clip, with sport chips;
   * `reels` is the viewer's own reels feed (people they follow included), the
   * collection behind "See all" on Home.
   */
  source?: 'explore' | 'reels';
  /** Shown above the grid, scrolling away with it. */
  header?: React.ReactElement | null;
  /** Offered in the empty state to someone who can post. */
  onPostFirst?: () => void;
}

export function ExploreGrid({ source = 'explore', header, onPostFirst }: Props) {
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

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /* A preview must stop when the tab is left or the pager covers the grid. */
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'more', offset: number) => {
      const id = ++runId.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      setMoreError(false);
      try {
        const rows = fromReels
          ? await getReels({ limit: EXPLORE_PAGE, before: mode === 'more' ? lastSeen.current : null })
          : await getExploreVideos({ offset, sport });
        if (rows.length > 0) lastSeen.current = rows[rows.length - 1].created_at;
        /* A slower earlier request must never overwrite a newer filter's grid. */
        if (!mounted.current || id !== runId.current) return;
        setItems((current) => (mode === 'more' ? mergeClips(current, rows) : rows));
        setDone(rows.length < EXPLORE_PAGE);
        setError(null);
      } catch (err) {
        if (!mounted.current || id !== runId.current) return;
        if (mode === 'more') setMoreError(true);
        else setError(errorMessage(err));
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

  const rows = useMemo(() => mosaicRows(items), [items]);
  const metrics = useMemo(() => mosaicMetrics(width, GAP), [width]);

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

  const renderRow = useCallback(
    ({ item, index }: { item: MosaicRow<FeedPost>; index: number }) => {
      if (item.kind === 'row') {
        return (
          <View style={{ flexDirection: 'row', gap: GAP }}>
            {item.items.map((post, i) => (
              <ClipTile
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
        <View key="small" style={{ gap: GAP }}>
          {item.small.map((post, i) => (
            <ClipTile
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
        <View style={{ flexDirection: 'row', gap: GAP }}>{item.side === 'left' ? [big, small] : [small, big]}</View>
      );
    },
    [metrics, open, focused, reduced, visible],
  );

  /* The chips only earn their row when there is more than one sport to pick. */
  const sportRows = sports.data ?? [];
  const chips =
    sportRows.length > 1 || sport ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
        testID="explore-sports"
      >
        <Chip
          label={t('explore.allSports')}
          icon={<Sparkles size={14} color={sport ? colors.textSecondary : colors.textOnBrand} />}
          selected={!sport}
          onPress={() => setSport(null)}
        />
        {sportRows.map((row) => (
          <Chip
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

  const top = (
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
        data={loading || width === 0 ? [] : rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        extraData={visible}
        ListHeaderComponent={top}
        ListEmptyComponent={width === 0 ? null : empty}
        ItemSeparatorComponent={RowGap}
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
          ) : null
        }
      />
    </View>
  );
}

function RowGap() {
  return <View style={{ height: GAP }} />;
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
  onPress: (post: FeedPost) => void;
}

function ClipTileBase({ post, width, height, order, big, preview, onPress }: TileProps) {
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
          borderRadius: big ? theme.radii.lg : theme.radii.md,
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
