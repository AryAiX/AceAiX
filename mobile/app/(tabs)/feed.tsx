import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Pencil, Flame, Users, Clock } from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Spacing, Radii, Typography, Shadows } from '@/constants/theme';
import { StoriesTray } from '@/components/stories/StoriesTray';
import { StoryViewer } from '@/components/stories/StoryViewer';
import { StoryCreator } from '@/components/stories/StoryCreator';
import { PostCard } from '@/components/posts/PostCard';
import { PostComposer } from '@/components/posts/PostComposer';
import { CommentsSheet } from '@/components/posts/CommentsSheet';
import { StoryAuthorGroup } from '@/lib/storiesService';
import { FeedPost, fetchFeedPosts } from '@/lib/postsService';
import { useStoriesContext } from '@/context/StoriesContext';
import { useAuth } from '@/context/AuthContext';

const { width: SW } = Dimensions.get('window');

const FILTERS = [
  { key: 'for_you',   label: 'For You',   Icon: Flame  },
  { key: 'following', label: 'Following',  Icon: Users  },
  { key: 'latest',    label: 'Latest',     Icon: Clock  },
] as const;

type FilterKey = typeof FILTERS[number]['key'];

export default function FeedScreen() {
  const { user, profile } = useAuth();
  const { refresh: refreshStories } = useStoriesContext();

  const [posts, setPosts]         = useState<FeedPost[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('for_you');

  const cursorRef  = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);
  const indicatorX = useRef(new Animated.Value(0)).current;

  // Modals
  const [viewerVisible,       setViewerVisible]       = useState(false);
  const [viewerGroups,        setViewerGroups]        = useState<StoryAuthorGroup[]>([]);
  const [viewerStart,         setViewerStart]         = useState(0);
  const [storyCreatorVisible, setStoryCreatorVisible] = useState(false);
  const [postComposerVisible, setPostComposerVisible] = useState(false);
  const [commentPost,         setCommentPost]         = useState<FeedPost | null>(null);

  const loadPosts = useCallback(async (reset = false) => {
    if (!user) return;
    const cursor = reset ? undefined : cursorRef.current;
    const data   = await fetchFeedPosts(user.id, cursor);
    if (data.length > 0) cursorRef.current = data[data.length - 1].created_at;
    hasMoreRef.current = data.length === 20;
    setPosts(prev => reset ? data : [...prev, ...data]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadPosts(true).finally(() => setLoading(false));
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    cursorRef.current = undefined;
    hasMoreRef.current = true;
    await Promise.all([loadPosts(true), refreshStories()]);
    setRefreshing(false);
  };

  const onLoadMore = async () => {
    if (loadingMore || !hasMoreRef.current) return;
    setLoadingMore(true);
    await loadPosts(false);
    setLoadingMore(false);
  };

  const handlePostUpdate = useCallback((id: string, partial: Partial<FeedPost>) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...partial } : p));
  }, []);

  const handlePostDeleted  = useCallback((id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleCommentAdded = useCallback((postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
  }, []);

  // Animate the filter indicator when tab changes
  const handleFilterChange = (key: FilterKey, idx: number) => {
    setActiveFilter(key);
    const tabW = (SW - Spacing.lg * 2) / FILTERS.length;
    Animated.spring(indicatorX, {
      toValue: idx * tabW,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };

  const initial = profile?.full_name?.[0]?.toUpperCase() ?? 'U';

  const ListHeader = (
    <View>
      {/* Stories tray */}
      <StoriesTray
        onOpenViewer={(groups, idx) => {
          setViewerGroups(groups);
          setViewerStart(idx);
          setViewerVisible(true);
        }}
        onOpenCreator={() => setStoryCreatorVisible(true)}
      />

      {/* Filter tabs */}
      <View style={s.filterWrap}>
        <View style={s.filterTabs}>
          {FILTERS.map(({ key, label, Icon }, i) => {
            const active = activeFilter === key;
            return (
              <TouchableOpacity
                key={key}
                style={s.filterTab}
                onPress={() => handleFilterChange(key, i)}
                activeOpacity={0.75}
              >
                <Icon
                  color={active ? Colors.primary : Colors.textDisabled}
                  size={13}
                />
                <Text style={[s.filterLabel, active && s.filterLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* Animated indicator */}
        <View style={s.indicatorTrack}>
          <Animated.View
            style={[
              s.indicator,
              {
                width: (SW - Spacing.lg * 2) / FILTERS.length,
                transform: [{ translateX: indicatorX }],
              },
            ]}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryGlow]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.indicatorGrad}
            />
          </Animated.View>
        </View>
      </View>

      {/* Compose bar */}
      <TouchableOpacity
        style={s.composeBar}
        onPress={() => setPostComposerVisible(true)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[`${Colors.primary}20`, `${Colors.accent}12`]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.composeAvatar}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryGlow]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={s.composeAvatarTxt}>{initial}</Text>
        </View>
        <Text style={s.composePlaceholder}>Share a moment, result, or milestone…</Text>
        <View style={s.composeActions}>
          <View style={s.composeIconBtn}>
            <Camera color={Colors.primary} size={16} />
          </View>
          <View style={[s.composeIconBtn, { backgroundColor: `${Colors.accent}20`, borderColor: `${Colors.accent}35` }]}>
            <Pencil color={Colors.accent} size={14} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.root}>
      <AppHeader title="Feed" />

      {loading ? (
        <View style={s.loadingWrap}>
          {ListHeader}
          <View style={s.skeletonList}>
            {[1, 2].map(i => <SkeletonCard key={i} />)}
          </View>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={p => p.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onUpdate={handlePostUpdate}
              onRemove={handlePostDeleted}
              onComments={setCommentPost}
            />
          )}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={<EmptyFeed />}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={Colors.primary} style={{ paddingVertical: Spacing.xl }} />
            ) : null
          }
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}

      <StoryViewer
        visible={viewerVisible}
        groups={viewerGroups}
        startGroupIndex={viewerStart}
        onClose={() => setViewerVisible(false)}
      />

      <StoryCreator
        visible={storyCreatorVisible}
        onClose={() => setStoryCreatorVisible(false)}
        onPosted={async () => {
          setStoryCreatorVisible(false);
          await refreshStories();
        }}
      />

      <PostComposer
        visible={postComposerVisible}
        postType="post"
        onClose={() => setPostComposerVisible(false)}
        onPosted={async () => {
          setPostComposerVisible(false);
          cursorRef.current = undefined;
          await loadPosts(true);
        }}
      />

      <CommentsSheet
        post={commentPost}
        onClose={() => setCommentPost(null)}
        onCommentAdded={handleCommentAdded}
      />
    </View>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });

  return (
    <Animated.View style={[sk.card, { opacity }]}>
      <View style={sk.mediaPlaceholder} />
      <View style={sk.body}>
        <View style={sk.avatarRow}>
          <View style={sk.avatar} />
          <View style={{ gap: 6 }}>
            <View style={[sk.line, { width: 120 }]} />
            <View style={[sk.line, { width: 80, height: 8 }]} />
          </View>
        </View>
        <View style={[sk.line, { width: '90%', marginTop: 8 }]} />
        <View style={[sk.line, { width: '70%', marginTop: 6 }]} />
      </View>
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  card:             { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderRadius: Radii.xl, overflow: 'hidden', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  mediaPlaceholder: { height: 200, backgroundColor: Colors.elevated },
  body:             { padding: Spacing.lg },
  avatarRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar:           { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.elevated },
  line:             { height: 10, borderRadius: 5, backgroundColor: Colors.elevated },
});

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyFeed() {
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(v, { toValue: 2.2, duration: 1600, useNativeDriver: true }),
          ]),
          Animated.timing(v, { toValue: 1,   duration: 0,    useNativeDriver: true }),
        ])
      );
    anim(ring1, 0).start();
    anim(ring2, 800).start();
  }, []);

  const ring1Opacity = ring1.interpolate({ inputRange: [1, 2.2], outputRange: [0.5, 0] });
  const ring2Opacity = ring2.interpolate({ inputRange: [1, 2.2], outputRange: [0.35, 0] });

  return (
    <View style={e.wrap}>
      <View style={e.ringCenter}>
        <Animated.View style={[e.ring, { transform: [{ scale: ring1 }], opacity: ring1Opacity, borderColor: Colors.primary }]} />
        <Animated.View style={[e.ring, { transform: [{ scale: ring2 }], opacity: ring2Opacity, borderColor: Colors.accent }]} />
        <View style={e.icon}>
          <Flame color={Colors.primary} size={28} />
        </View>
      </View>
      <Text style={e.title}>Your feed is empty</Text>
      <Text style={e.body}>Follow athletes or post your first update to get started.</Text>
    </View>
  );
}

const e = StyleSheet.create({
  wrap:       { alignItems: 'center', paddingTop: Spacing.xxxl + Spacing.xl, paddingHorizontal: Spacing.xxxl, gap: Spacing.lg },
  ringCenter: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  ring:       { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 1.5 },
  icon:       { width: 56, height: 56, borderRadius: 28, backgroundColor: `${Colors.primary}18`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${Colors.primary}30` },
  title:      { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textMuted },
  body:       { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled, textAlign: 'center', lineHeight: 20 },
});

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: Colors.bg },
  listContent: { paddingBottom: Spacing.xxxl },
  loadingWrap: { flex: 1 },
  skeletonList:{ marginTop: Spacing.sm },

  // Filter tabs
  filterWrap: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  filterTabs:  { flexDirection: 'row' },
  filterTab:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12 },
  filterLabel: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textDisabled },
  filterLabelActive: { color: Colors.primary, fontFamily: Typography.family.bold },
  indicatorTrack: { height: 2, backgroundColor: Colors.border },
  indicator:   { height: 2 },
  indicatorGrad: { flex: 1, borderRadius: 1 },

  // Compose bar
  composeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: `${Colors.primary}35`,
    borderRadius: Radii.xl,
    gap: Spacing.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  composeAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  composeAvatarTxt:  { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white, zIndex: 1 },
  composePlaceholder:{ flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled },
  composeActions:    { flexDirection: 'row', gap: Spacing.sm },
  composeIconBtn: {
    width: 32, height: 32, borderRadius: Radii.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${Colors.primary}15`,
    borderWidth: 1, borderColor: `${Colors.primary}30`,
  },
});
