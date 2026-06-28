import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Play, Film } from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { ReelsFeed } from '@/components/reels/ReelsFeed';
import { PostComposer } from '@/components/posts/PostComposer';
import { CommentsSheet } from '@/components/posts/CommentsSheet';
import { FeedPost, fetchFeedPosts, fetchReels } from '@/lib/postsService';
import { useAuth } from '@/context/AuthContext';

const { width: SW } = Dimensions.get('window');
const GRID_GAP = 2;
const CELL = (SW - GRID_GAP * 2) / 3;

type Tab = 'Posts' | 'Reels';

export default function MediaScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('Posts');

  // Posts grid state
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsRefreshing, setPostsRefreshing] = useState(false);
  const postsCursorRef = useRef<string | undefined>(undefined);
  const postsHasMoreRef = useRef(true);

  // Reels state
  const [reels, setReels] = useState<FeedPost[]>([]);
  const [reelsLoading, setReelsLoading] = useState(false);
  const [reelsFetched, setReelsFetched] = useState(false);
  const reelsCursorRef = useRef<string | undefined>(undefined);
  const reelsHasMoreRef = useRef(true);

  // Modals
  const [composerVisible, setComposerVisible] = useState(false);
  const [composerType, setComposerType] = useState<'post' | 'reel'>('post');
  const [commentPost, setCommentPost] = useState<FeedPost | null>(null);

  const loadPosts = useCallback(async (reset = false) => {
    if (!user) return;
    const cursor = reset ? undefined : postsCursorRef.current;
    const data = await fetchFeedPosts(user.id, cursor);
    if (data.length > 0) postsCursorRef.current = data[data.length - 1].created_at;
    postsHasMoreRef.current = data.length === 20;
    setPosts((prev) => (reset ? data : [...prev, ...data]));
  }, [user]);

  const loadReels = useCallback(async (reset = false) => {
    if (!user) return;
    const cursor = reset ? undefined : reelsCursorRef.current;
    const data = await fetchReels(user.id, cursor);
    if (data.length > 0) reelsCursorRef.current = data[data.length - 1].created_at;
    reelsHasMoreRef.current = data.length === 10;
    setReels((prev) => (reset ? data : [...prev, ...data]));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setPostsLoading(true);
    loadPosts(true).finally(() => setPostsLoading(false));
  }, [user]);

  useEffect(() => {
    if (tab === 'Reels' && !reelsFetched && user) {
      setReelsLoading(true);
      loadReels(true).finally(() => {
        setReelsLoading(false);
        setReelsFetched(true);
      });
    }
  }, [tab, user, reelsFetched]);

  const onPostsRefresh = async () => {
    setPostsRefreshing(true);
    postsCursorRef.current = undefined;
    postsHasMoreRef.current = true;
    await loadPosts(true);
    setPostsRefreshing(false);
  };

  const handlePostUpdate = useCallback((id: string, partial: Partial<FeedPost>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...partial } : p)));
  }, []);

  const handleReelUpdate = useCallback((id: string, partial: Partial<FeedPost>) => {
    setReels((prev) => prev.map((r) => (r.id === id ? { ...r, ...partial } : r)));
  }, []);

  const handleCommentAdded = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
    );
    setReels((prev) =>
      prev.map((r) => (r.id === postId ? { ...r, comment_count: r.comment_count + 1 } : r))
    );
  }, []);

  const openComposer = (type: 'post' | 'reel') => {
    setComposerType(type);
    setComposerVisible(true);
  };

  const onComposerPosted = async () => {
    setComposerVisible(false);
    if (composerType === 'post') {
      postsCursorRef.current = undefined;
      await loadPosts(true);
    } else {
      reelsCursorRef.current = undefined;
      setReelsFetched(false);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <AppHeader title="Media" />

      {/* Tab bar */}
      <View style={s.tabBar}>
        {(['Posts', 'Reels'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={s.newBtn}
          onPress={() => openComposer(tab === 'Reels' ? 'reel' : 'post')}
        >
          <Plus color={Colors.white} size={18} strokeWidth={2.5} />
          <Text style={s.newBtnTxt}>{tab === 'Reels' ? 'New Reel' : 'New Post'}</Text>
        </TouchableOpacity>
      </View>

      {/* Posts grid */}
      {tab === 'Posts' && (
        postsLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxxl }} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(p) => p.id}
            numColumns={3}
            columnWrapperStyle={s.row}
            renderItem={({ item }) => <GridCell post={item} />}
            ListEmptyComponent={<EmptyGrid label="No posts yet" sub="Create your first post to share your journey." />}
            contentContainerStyle={s.gridContent}
            showsVerticalScrollIndicator={false}
            onEndReached={() => {
              if (!postsHasMoreRef.current) return;
              loadPosts(false);
            }}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={postsRefreshing} onRefresh={onPostsRefresh} tintColor={Colors.primary} />
            }
          />
        )
      )}

      {/* Reels pager */}
      {tab === 'Reels' && (
        reelsLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxxl }} />
        ) : (
          <ReelsFeed
            reels={reels}
            loading={reelsLoading}
            onUpdate={handleReelUpdate}
            onComments={setCommentPost}
            onLoadMore={() => {
              if (!reelsHasMoreRef.current) return;
              loadReels(false);
            }}
          />
        )
      )}

      {/* Post composer / reel composer */}
      <PostComposer
        visible={composerVisible}
        postType={composerType}
        onClose={() => setComposerVisible(false)}
        onPosted={onComposerPosted}
      />

      {/* Comments sheet (for reels) */}
      <CommentsSheet
        post={commentPost}
        onClose={() => setCommentPost(null)}
        onCommentAdded={handleCommentAdded}
      />
    </View>
  );
}

function GridCell({ post }: { post: FeedPost }) {
  const media = post.media[0];
  return (
    <TouchableOpacity activeOpacity={0.8} style={s.cell}>
      {media?.signed_url ? (
        <Image source={{ uri: media.signed_url }} style={s.cellThumb} resizeMode="cover" />
      ) : (
        <View style={[s.cellThumb, s.cellPlaceholder]}>
          <Film color={Colors.textFaint} size={22} />
        </View>
      )}
      {media?.type === 'video' && (
        <View style={s.cellPlayBadge}>
          <Play color={Colors.white} size={10} fill={Colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function EmptyGrid({ label, sub }: { label: string; sub: string }) {
  return (
    <View style={s.emptyWrap}>
      <Text style={s.emptyTitle}>{label}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  tabBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radii.full, backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: `${Colors.primary}20`, borderColor: `${Colors.primary}60` },
  tabTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  tabTxtActive: { fontFamily: Typography.family.bold, color: Colors.primary },
  newBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  newBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },

  gridContent: { paddingBottom: Spacing.xxxl },
  row: { gap: GRID_GAP },
  cell: { width: CELL, height: CELL, position: 'relative', marginBottom: GRID_GAP },
  cellThumb: { width: '100%', height: '100%' },
  cellPlaceholder: { backgroundColor: Colors.elevated, alignItems: 'center', justifyContent: 'center' },
  cellPlayBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: 3 },

  emptyWrap: { alignItems: 'center', paddingTop: Spacing.xxxl * 2, paddingHorizontal: Spacing.xxxl, gap: Spacing.md },
  emptyTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textMuted },
  emptySub: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled, textAlign: 'center', lineHeight: 20 },
});
