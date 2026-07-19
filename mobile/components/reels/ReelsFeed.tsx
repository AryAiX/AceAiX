import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  BadgeCheck,
  Play,
  Volume2,
  VolumeX,
  Star,
  Trash2,
} from 'lucide-react-native';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import {
  FeedPost,
  formatCount,
  postTimeAgo,
  toggleLike,
  toggleSave,
  toggleFeatureReel,
  deletePost,
} from '@/lib/postsService';
import { useAuth } from '@/context/AuthContext';

const { width: SW, height: SH } = Dimensions.get('window');

interface Props {
  reels: FeedPost[];
  loading: boolean;
  onUpdate: (id: string, partial: Partial<FeedPost>) => void;
  onRemove: (id: string) => void;
  onComments: (post: FeedPost) => void;
  onLoadMore: () => void;
}

export function ReelsFeed({ reels, loading, onUpdate, onRemove, onComments, onLoadMore }: Props) {
  const insets = useSafeAreaInsets();
  const [muted, setMuted] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const onViewableChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIdx(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 70 }).current;

  return (
    <View style={s.root}>
      {reels.length === 0 && !loading ? (
        <EmptyReels />
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(r) => r.id}
          pagingEnabled
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          onViewableItemsChanged={onViewableChanged}
          viewabilityConfig={viewConfig}
          renderItem={({ item, index }) => (
            <ReelCard
              reel={item}
              active={index === activeIdx}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onComments={onComments}
              insets={insets}
            />
          )}
        />
      )}
    </View>
  );
}

// ── Individual reel card ───────────────────────────────────────────────────────

interface ReelCardProps {
  reel: FeedPost;
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onUpdate: (id: string, partial: Partial<FeedPost>) => void;
  onRemove: (id: string) => void;
  onComments: (post: FeedPost) => void;
  insets: { top: number; bottom: number };
}

function ReelVideo({
  uri,
  active,
  paused,
  muted,
}: {
  uri: string;
  active: boolean;
  paused: boolean;
  muted: boolean;
}) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = muted;
  });

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (active && !paused) {
      player.play();
    } else {
      player.pause();
    }
  }, [active, paused, player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

function ReelCard({ reel, active, muted, onToggleMute, onUpdate, onRemove, onComments, insets }: ReelCardProps) {
  const { user } = useAuth();
  const heartAnim = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const [paused, setPaused] = useState(false);
  const lastTap = useRef<number>(0);

  const media = reel.media[0];

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap — like
      handleLike();
      Animated.sequence([
        Animated.parallel([
          Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true }),
          Animated.timing(heartOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]),
        Animated.delay(600),
        Animated.parallel([
          Animated.spring(heartAnim, { toValue: 0, useNativeDriver: true }),
          Animated.timing(heartOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      ]).start();
    } else {
      setPaused((p) => !p);
    }
    lastTap.current = now;
  }, [reel]);

  const handleLike = useCallback(async () => {
    if (!user) return;
    const newLiked = !reel.liked;
    onUpdate(reel.id, { liked: newLiked, like_count: reel.like_count + (newLiked ? 1 : -1) });
    await toggleLike(reel.id, user.id, reel.liked);
  }, [reel, user, onUpdate]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    const newSaved = !reel.saved;
    onUpdate(reel.id, { saved: newSaved, save_count: reel.save_count + (newSaved ? 1 : -1) });
    await toggleSave(reel.id, user.id, reel.saved);
  }, [reel, user, onUpdate]);

  const handleFeature = useCallback(async () => {
    const newFeatured = !reel.is_featured;
    onUpdate(reel.id, { is_featured: newFeatured });
    await toggleFeatureReel(reel.id, newFeatured);
  }, [reel, onUpdate]);

  const handleShare = useCallback(async () => {
    await Share.share({
      message: `${reel.author_name ?? 'An athlete'} on AceAiX: ${reel.caption ?? 'Watch this reel.'}`,
    });
  }, [reel.author_name, reel.caption]);

  const performDelete = useCallback(async () => {
    const { error } = await deletePost(reel.id);
    if (error) {
      Alert.alert('Reel not deleted', error);
      return;
    }
    onRemove(reel.id);
  }, [onRemove, reel.id]);

  const confirmDelete = useCallback(() => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm('Delete this reel? This cannot be undone.')) void performDelete();
      return;
    }
    Alert.alert('Delete reel?', 'This removes the reel and cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void performDelete() },
    ]);
  }, [performDelete]);

  const isOwn = user?.id === reel.author_id;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleDoubleTap}
      style={[s.reelCard, { height: SH }]}
    >
      {/* Media */}
      <View style={StyleSheet.absoluteFill}>
        {media?.signed_url && media.type === 'video' ? (
          <ReelVideo
            uri={media.signed_url}
            active={active}
            paused={paused}
            muted={muted}
          />
        ) : (
          <LinearGradient
            colors={['#0A1020', Colors.primary, '#061018']}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        {/* Dim overlay when paused */}
        {paused && (
          <View style={s.pauseOverlay}>
            <Play color={Colors.white} size={52} fill={Colors.white} />
          </View>
        )}
      </View>

      {/* Double-tap heart burst */}
      <Animated.View
        pointerEvents="none"
        style={[s.heartBurst, { opacity: heartOpacity, transform: [{ scale: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.8] }) }] }]}
      >
        <Heart color={Colors.error} size={80} fill={Colors.error} />
      </Animated.View>

      {/* Bottom gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={[s.bottomGrad]}
        pointerEvents="none"
      />

      {/* Top controls */}
      <View style={[s.topRow, { top: insets.top + Spacing.md }]}>
        <View style={s.viewCount}>
          <Play color={Colors.white} size={12} fill={Colors.white} />
          <Text style={s.viewCountTxt}>{formatCount(reel.view_count)}</Text>
        </View>
        <TouchableOpacity onPress={onToggleMute} style={s.muteBtn}>
          {muted ? (
            <VolumeX color={Colors.white} size={20} />
          ) : (
            <Volume2 color={Colors.white} size={20} />
          )}
        </TouchableOpacity>
      </View>

      {/* Right action rail */}
      <View style={[s.actionRail, { bottom: insets.bottom + 120 }]}>
        {/* Author */}
        <View style={s.railAvatar}>
          <Text style={s.railAvatarTxt}>{reel.author_name?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>

        {/* Like */}
        <TouchableOpacity style={s.railAction} onPress={handleLike}>
          <Heart
            color={reel.liked ? Colors.error : Colors.white}
            fill={reel.liked ? Colors.error : 'transparent'}
            size={28}
          />
          <Text style={s.railCount}>{formatCount(reel.like_count)}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={s.railAction} onPress={() => onComments(reel)}>
          <MessageCircle color={Colors.white} size={28} />
          <Text style={s.railCount}>{formatCount(reel.comment_count)}</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity style={s.railAction} onPress={handleSave}>
          <Bookmark
            color={reel.saved ? Colors.accent : Colors.white}
            fill={reel.saved ? Colors.accent : 'transparent'}
            size={28}
          />
          <Text style={s.railCount}>{formatCount(reel.save_count)}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Share reel"
          style={s.railAction}
          onPress={() => void handleShare()}
        >
          <Share2 color={Colors.white} size={28} />
        </TouchableOpacity>

        {/* Feature (own only) */}
        {isOwn && (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Feature reel on profile"
              style={s.railAction}
              onPress={handleFeature}
            >
              <Star
                color={reel.is_featured ? Colors.accent : Colors.white}
                fill={reel.is_featured ? Colors.accent : 'transparent'}
                size={24}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Delete reel"
              style={s.railAction}
              onPress={confirmDelete}
            >
              <Trash2 color={Colors.white} size={24} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Bottom info */}
      <View style={[s.bottomInfo, { bottom: insets.bottom + Spacing.xl }]}>
        <View style={s.authorRow}>
          <Text style={s.authorName}>{reel.author_name ?? 'Athlete'}</Text>
          {reel.author_verified && <BadgeCheck color={Colors.primary} size={14} />}
          <Text style={s.authorMeta}>
            {[reel.author_position, reel.author_sport].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {reel.caption && (
          <Text style={s.caption} numberOfLines={2}>{reel.caption}</Text>
        )}
        {reel.tags.length > 0 && (
          <View style={s.tagRow}>
            {reel.tags.slice(0, 3).map((tag, i) => (
              <View key={i} style={s.tagChip}>
                <Text style={s.tagTxt}>
                  {tag.type === 'open_to_trials' ? 'Open to Trials' : tag.value}
                </Text>
              </View>
            ))}
          </View>
        )}
        <Text style={s.timeAgo}>{postTimeAgo(reel.created_at)}</Text>
      </View>

      {/* Featured banner */}
      {reel.is_featured && (
        <View style={[s.featuredBadge, { top: insets.top + 50 }]}>
          <Star color={Colors.accent} size={12} fill={Colors.accent} />
          <Text style={s.featuredTxt}>Featured</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function EmptyReels() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.empty, { paddingTop: insets.top + 60 }]}>
      <Play color={Colors.textDisabled} size={52} strokeWidth={1.5} />
      <Text style={s.emptyTitle}>No Reels yet</Text>
      <Text style={s.emptyBody}>Create your first reel to share your highlights.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  reelCard: { width: SW, position: 'relative', backgroundColor: '#000' },

  pauseOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  heartBurst: { position: 'absolute', top: '50%', left: '50%', marginLeft: -40, marginTop: -40 },

  bottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 320 },
  topRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg },

  viewCount: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  viewCountTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.white },
  muteBtn: { padding: Spacing.sm, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: Radii.full },

  actionRail: { position: 'absolute', right: Spacing.lg, alignItems: 'center', gap: Spacing.xl },
  railAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  railAvatarTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white },
  railAction: { alignItems: 'center', gap: 3 },
  railCount: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.white },

  bottomInfo: { position: 'absolute', left: Spacing.lg, right: 80, gap: Spacing.xs },
  authorRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  authorName: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white },
  authorMeta: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: 'rgba(255,255,255,0.7)' },
  caption: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.white, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tagChip: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  tagTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.white },
  timeAgo: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: 'rgba(255,255,255,0.6)' },

  featuredBadge: { position: 'absolute', left: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: 4, borderWidth: 1, borderColor: `${Colors.accent}50` },
  featuredTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.accent },

  empty: { flex: 1, alignItems: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.xxxl, backgroundColor: Colors.bg },
  emptyTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textMuted },
  emptyBody: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled, textAlign: 'center', lineHeight: 20 },
});
