import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  Share,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  BadgeCheck,
  MoreHorizontal,
  Play,
  ChevronLeft,
  ChevronRight,
  Flag,
  Ban,
  Trash2,
  Edit3,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors, Spacing, Radii, Typography, Shadows } from '@/constants/theme';
import {
  FeedPost,
  PostTag,
  formatCount,
  postTimeAgo,
  toggleLike,
  toggleSave,
  deletePost,
  updatePostCaption,
} from '@/lib/postsService';
import { useAuth } from '@/context/AuthContext';
import { blockUser, reportContent } from '@/lib/contentSafetyService';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - Spacing.lg * 2;
const MEDIA_H = Math.round(CARD_W * 0.74);

interface Props {
  post: FeedPost;
  onUpdate: (id: string, partial: Partial<FeedPost>) => void;
  onRemove: (id: string) => void;
  onComments: (post: FeedPost) => void;
}

export function PostCard({ post, onUpdate, onRemove, onComments }: Props) {
  const { user } = useAuth();
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.caption ?? '');
  const [savingEdit, setSavingEdit] = useState(false);

  // Entry animation
  const entryOpacity = useRef(new Animated.Value(0)).current;
  const entryY = useRef(new Animated.Value(20)).current;

  // Heart animation
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartGlowAnim = useRef(new Animated.Value(0)).current;

  // Bookmark scale
  const saveScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entryOpacity, { toValue: 1, duration: 380, delay: 50, useNativeDriver: true }),
      Animated.timing(entryY,      { toValue: 0, duration: 380, delay: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLike = useCallback(async () => {
    if (!user) return;
    const newLiked = !post.liked;
    onUpdate(post.id, {
      liked: newLiked,
      like_count: post.like_count + (newLiked ? 1 : -1),
    });
    if (newLiked) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(heartScale,    { toValue: 1.5,  useNativeDriver: true }),
          Animated.timing(heartGlowAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.spring(heartScale,    { toValue: 1,   useNativeDriver: true }),
          Animated.timing(heartGlowAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
        ]),
      ]).start();
    }
    await toggleLike(post.id, user.id, post.liked);
  }, [post, user, heartScale, heartGlowAnim, onUpdate]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    const newSaved = !post.saved;
    onUpdate(post.id, { saved: newSaved, save_count: post.save_count + (newSaved ? 1 : -1) });
    Animated.sequence([
      Animated.spring(saveScale, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(saveScale, { toValue: 1,   useNativeDriver: true }),
    ]).start();
    await toggleSave(post.id, user.id, post.saved);
  }, [post, user, saveScale, onUpdate]);

  const performDelete = useCallback(async () => {
    const { error } = await deletePost(post.id);
    if (error) {
      Alert.alert('Post not deleted', error);
      return;
    }
    onRemove(post.id);
  }, [onRemove, post.id]);

  const handleDelete = useCallback(() => {
    setMenuOpen(false);
    if (Platform.OS === 'web') {
      if (globalThis.confirm('Delete this post? This cannot be undone.')) {
        void performDelete();
      }
      return;
    }
    Alert.alert(
      'Delete post?',
      'This removes the post and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void performDelete(),
        },
      ],
    );
  }, [performDelete]);

  const handleShare = useCallback(async () => {
    await Share.share({
      message: `${post.author_name ?? 'An athlete'} on AceAiX: ${post.caption ?? 'View this post on AceAiX.'}`,
    });
  }, [post.author_name, post.caption]);

  const handleSaveEdit = useCallback(async () => {
    if (!user) return;
    setSavingEdit(true);
    const { error } = await updatePostCaption(post.id, user.id, editText);
    setSavingEdit(false);
    if (error) {
      Alert.alert('Post not updated', error);
      return;
    }
    const normalized = editText.trim();
    onUpdate(post.id, { caption: normalized || null });
    setEditing(false);
  }, [editText, onUpdate, post.id, user]);

  const handleReport = useCallback(() => {
    if (!user) return;
    setMenuOpen(false);
    Alert.alert(
      'Report this post?',
      'AceAiX administrators will review it for safety and policy violations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            const { error } = await reportContent(user.id, 'post', post.id);
            Alert.alert(
              error ? 'Report not sent' : 'Report received',
              error ?? 'Thank you. Our safety team will review this post.',
            );
          },
        },
      ],
    );
  }, [post.id, user]);

  const handleBlock = useCallback(() => {
    if (!user || post.author_id === user.id) return;
    setMenuOpen(false);
    Alert.alert(
      `Block ${post.author_name ?? 'this member'}?`,
      'Their content will be hidden from your current feed. You can manage blocked members through support.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const { error } = await blockUser(user.id, post.author_id);
            if (error) {
              Alert.alert('Member not blocked', error);
              return;
            }
            onRemove(post.id);
            Alert.alert('Member blocked', 'Their content has been removed from your feed.');
          },
        },
      ],
    );
  }, [onRemove, post.author_id, post.author_name, post.id, user]);

  const isOwn = user?.id === post.author_id;
  const hasMedia = post.media.length > 0;
  const primaryTag = post.tags[0];
  const accentColor = primaryTag ? TAG_TEXT_COLORS[primaryTag.type] : Colors.primary;
  const captionLong = (post.caption?.length ?? 0) > 120;

  const heartGlowBg = heartGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,93,93,0)', 'rgba(255,93,93,0.22)'],
  });

  return (
    <Animated.View style={[
      s.card,
      post.liked && s.cardLiked,
      { opacity: entryOpacity, transform: [{ translateY: entryY }] },
    ]}>

      {/* ── Media-first layout ──────────────────────────────────────────── */}
      {hasMedia && (
        <View style={s.mediaWrap}>
          <MediaCarousel items={post.media} currentIdx={mediaIdx} onChangeIdx={setMediaIdx} />

          {/* Author gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.90)']}
            start={{ x: 0, y: 0.3 }}
            end={{ x: 0, y: 1 }}
            style={s.mediaGrad}
          >
            <View style={s.mediaAuthorRow}>
              <AvatarBubble name={post.author_name} avatar={post.author_avatar} size={38} />
              <View style={{ flex: 1 }}>
                <View style={s.nameRow}>
                  <Text style={s.authorNameOverlay} numberOfLines={1}>
                    {post.author_name ?? 'Athlete'}
                  </Text>
                  {post.author_verified && <BadgeCheck color={Colors.primary} size={12} />}
                </View>
                <Text style={s.authorMetaOverlay} numberOfLines={1}>
                  {[post.author_position, post.author_sport].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View style={s.timeMenuRow}>
                <Text style={s.timeOverlay}>{postTimeAgo(post.created_at)}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Open post menu"
                  onPress={() => setMenuOpen(p => !p)}
                  hitSlop={10}
                  style={s.menuOverlayBtn}
                >
                  <MoreHorizontal color="rgba(255,255,255,0.75)" size={18} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Carousel dots */}
          {post.media.length > 1 && (
            <View style={s.dotRowMedia}>
              {post.media.map((_, i) => (
                <View key={i} style={[s.dot, i === mediaIdx && s.dotActive]} />
              ))}
            </View>
          )}

          {/* Colored tag strip at top */}
          <View style={[s.mediaTagStrip, { backgroundColor: accentColor }]} />
        </View>
      )}

      {/* ── Text-only header ────────────────────────────────────────────── */}
      {!hasMedia && (
        <>
          <LinearGradient
            colors={[`${accentColor}22`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.textHeaderGrad}
          />
          <View style={[s.accentBar, { backgroundColor: accentColor }]} />
          <View style={s.header}>
            <AvatarBubble name={post.author_name} avatar={post.author_avatar} size={44} />
            <View style={s.headerInfo}>
              <View style={s.nameRow}>
                <Text style={s.authorName} numberOfLines={1}>
                  {post.author_name ?? 'Athlete'}
                </Text>
                {post.author_verified && <BadgeCheck color={Colors.primary} size={14} />}
              </View>
              <Text style={s.authorMeta} numberOfLines={1}>
                {[post.author_position, post.author_sport].filter(Boolean).join(' · ')}
              </Text>
              <Text style={s.timeAgo}>{postTimeAgo(post.created_at)}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open post menu"
              onPress={() => setMenuOpen(p => !p)}
              hitSlop={8}
              style={s.menuBtn}
            >
              <MoreHorizontal color={Colors.textMuted} size={20} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── Context menu ────────────────────────────────────────────────── */}
      {menuOpen && (
        <View style={s.menu}>
          {isOwn ? (
            <>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Edit post"
                style={s.menuItem}
                onPress={() => {
                  setEditText(post.caption ?? '');
                  setEditing(true);
                  setMenuOpen(false);
                }}
              >
                <Edit3 color={Colors.textPrimary} size={15} />
                <Text style={s.menuTxt}>Edit post</Text>
              </TouchableOpacity>
              <View style={s.menuDiv} />
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete post" style={s.menuItem} onPress={handleDelete}>
                <Trash2 color={Colors.error} size={15} />
                <Text style={[s.menuTxt, { color: Colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Report post" style={s.menuItem} onPress={handleReport}>
                <Flag color={Colors.warning} size={15} />
                <Text style={[s.menuTxt, { color: Colors.warning }]}>Report</Text>
              </TouchableOpacity>
              <View style={s.menuDiv} />
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Block member" style={s.menuItem} onPress={handleBlock}>
                <Ban color={Colors.error} size={15} />
                <Text style={[s.menuTxt, { color: Colors.error }]}>Block member</Text>
              </TouchableOpacity>
            </>
          )}
          <View style={s.menuDiv} />
          <TouchableOpacity style={s.menuItem} onPress={() => { handleSave(); setMenuOpen(false); }}>
            <Bookmark color={Colors.textPrimary} size={15} />
            <Text style={s.menuTxt}>{post.saved ? 'Unsave' : 'Save'}</Text>
          </TouchableOpacity>
          <View style={s.menuDiv} />
          <TouchableOpacity style={s.menuItem} onPress={() => setMenuOpen(false)}>
            <MoreHorizontal color={Colors.textMuted} size={15} />
            <Text style={s.menuTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Caption ─────────────────────────────────────────────────────── */}
      {editing ? (
        <View style={s.editWrap}>
          <TextInput
            accessibilityLabel="Edit post caption"
            style={s.editInput}
            value={editText}
            onChangeText={setEditText}
            placeholder="Write a caption…"
            placeholderTextColor={Colors.textDisabled}
            multiline
            maxLength={2200}
            autoFocus
          />
          <View style={s.editActions}>
            <TouchableOpacity
              accessibilityRole="button"
              style={s.editCancel}
              onPress={() => setEditing(false)}
              disabled={savingEdit}
            >
              <Text style={s.editCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={s.editSave}
              onPress={() => void handleSaveEdit()}
              disabled={savingEdit}
            >
              {savingEdit
                ? <ActivityIndicator color={Colors.bg} size="small" />
                : <Text style={s.editSaveText}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      ) : post.caption ? (
        <View style={s.captionWrap}>
          <Text style={s.caption} numberOfLines={captionExpanded ? undefined : 3}>
            <Text style={s.authorNameInline}>{post.author_name ?? 'Athlete'} </Text>
            {post.caption}
          </Text>
          {captionLong && !captionExpanded && (
            <TouchableOpacity onPress={() => setCaptionExpanded(true)}>
              <Text style={s.moreTxt}>…more</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* ── Tags ────────────────────────────────────────────────────────── */}
      {post.tags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tagRow}
        >
          {post.tags.map((tag, i) => <TagChip key={i} tag={tag} />)}
        </ScrollView>
      )}

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <View style={s.actionBar}>
        <View style={s.actionLeft}>

          {/* Like */}
          <TouchableOpacity style={s.actionBtn} onPress={handleLike} activeOpacity={0.75}>
            <Animated.View style={[s.heartGlowWrap, { backgroundColor: heartGlowBg }]}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Heart
                  color={post.liked ? Colors.error : Colors.textMuted}
                  fill={post.liked ? Colors.error : 'transparent'}
                  size={22}
                />
              </Animated.View>
            </Animated.View>
            {post.like_count > 0 && (
              <Text style={[s.actionCount, post.liked && s.countLiked]}>
                {formatCount(post.like_count)}
              </Text>
            )}
          </TouchableOpacity>

          {/* Comment */}
          <TouchableOpacity style={s.actionBtn} onPress={() => onComments(post)} activeOpacity={0.75}>
            <MessageCircle color={Colors.textMuted} size={22} />
            {post.comment_count > 0 && (
              <Text style={s.actionCount}>{formatCount(post.comment_count)}</Text>
            )}
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Share post"
            style={s.actionBtn}
            activeOpacity={0.75}
            onPress={() => void handleShare()}
          >
            <Share2 color={Colors.textMuted} size={22} />
          </TouchableOpacity>
        </View>

        {/* Bookmark */}
        <TouchableOpacity style={s.actionBtn} onPress={handleSave} activeOpacity={0.75}>
          <Animated.View style={{ transform: [{ scale: saveScale }] }}>
            <Bookmark
              color={post.saved ? Colors.accent : Colors.textMuted}
              fill={post.saved ? Colors.accent : 'transparent'}
              size={22}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── MediaCarousel ─────────────────────────────────────────────────────────────

function MediaCarousel({
  items,
  currentIdx,
  onChangeIdx,
}: {
  items: FeedPost['media'];
  currentIdx: number;
  onChangeIdx: (i: number) => void;
}) {
  const item = items[currentIdx];
  const isVideo = item?.type === 'video';

  return (
    <View style={mc.wrap}>
      {item?.signed_url ? (
        isVideo ? (
          <VideoPoster uri={item.signed_url} />
        ) : (
          <Image source={{ uri: item.signed_url }} style={mc.img} resizeMode="cover" />
        )
      ) : (
        <LinearGradient
          colors={[Colors.elevated, Colors.surface]}
          style={mc.img}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      {items.length > 1 && (
        <>
          {currentIdx > 0 && (
            <TouchableOpacity style={mc.prev} onPress={() => onChangeIdx(currentIdx - 1)}>
              <ChevronLeft color={Colors.white} size={20} />
            </TouchableOpacity>
          )}
          {currentIdx < items.length - 1 && (
            <TouchableOpacity style={mc.next} onPress={() => onChangeIdx(currentIdx + 1)}>
              <ChevronRight color={Colors.white} size={20} />
            </TouchableOpacity>
          )}
          <View style={mc.counter}>
            <Text style={mc.counterTxt}>{currentIdx + 1}/{items.length}</Text>
          </View>
        </>
      )}
    </View>
  );
}

function VideoPoster({ uri }: { uri: string }) {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
  });

  function togglePlayback() {
    if (playing) {
      player.pause();
    } else {
      player.play();
    }
    setPlaying((value) => !value);
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause post video' : 'Play post video'}
      activeOpacity={1}
      style={mc.wrap}
      onPress={togglePlayback}
    >
      <VideoView player={player} style={mc.img} contentFit="cover" nativeControls={false} />
      {!playing && (
        <View style={mc.videoOverlay}>
          <View style={mc.playBtn}>
            <Play color={Colors.white} size={28} fill={Colors.white} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const mc = StyleSheet.create({
  wrap: {
    width: CARD_W,
    height: MEDIA_H,
    backgroundColor: Colors.elevated,
  },
  img:          { width: '100%', height: '100%' },
  videoOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.28)' },
  playBtn:      { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  prev:         { position: 'absolute', left: 8, top: '50%', marginTop: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  next:         { position: 'absolute', right: 8, top: '50%', marginTop: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  counter:      { position: 'absolute', top: 10, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: Radii.full, paddingHorizontal: 8, paddingVertical: 3 },
  counterTxt:   { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.white },
});

// ── Sub-components ─────────────────────────────────────────────────────────────

function AvatarBubble({
  name, avatar, size = 44,
}: {
  name: string | null | undefined;
  avatar: string | null | undefined;
  size?: number;
}) {
  const r = size / 2;
  if (avatar) return <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: r }} />;
  return (
    <View style={[s.avatarDefault, { width: size, height: size, borderRadius: r }]}>
      <Text style={[s.avatarInitial, { fontSize: size * 0.38 }]}>
        {name?.[0]?.toUpperCase() ?? 'A'}
      </Text>
    </View>
  );
}

const TAG_COLORS: Record<PostTag['type'], string> = {
  sport:          Colors.primaryDim,
  attribute:      Colors.accentDim,
  location:       Colors.elevated,
  open_to_trials: `${Colors.success}20`,
  match:          `${Colors.warning}20`,
};

const TAG_TEXT_COLORS: Record<PostTag['type'], string> = {
  sport:          Colors.primary,
  attribute:      Colors.accent,
  location:       Colors.textMuted,
  open_to_trials: Colors.success,
  match:          Colors.warning,
};

function TagChip({ tag }: { tag: PostTag }) {
  const bg   = TAG_COLORS[tag.type]      ?? Colors.elevated;
  const color = TAG_TEXT_COLORS[tag.type] ?? Colors.textMuted;
  return (
    <View style={[s.chip, { backgroundColor: bg, borderColor: `${color}40` }]}>
      <Text style={[s.chipTxt, { color }]}>
        {tag.type === 'open_to_trials' ? 'Open to Trials' : tag.value}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'visible',
    ...Shadows.card,
  },
  cardLiked: {
    borderColor: `${Colors.error}35`,
  },

  // ── Media first
  mediaWrap: {
    width: CARD_W,
    height: MEDIA_H,
    borderTopLeftRadius:  Radii.xl,
    borderTopRightRadius: Radii.xl,
    overflow: 'hidden',
    backgroundColor: Colors.elevated,
  },
  mediaGrad: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 130,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  mediaTagStrip: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 3,
  },
  mediaAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeMenuRow: {
    alignItems: 'flex-end',
    gap: 4,
  },
  authorNameOverlay: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.sm,
    color: Colors.white,
  },
  authorMetaOverlay: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 1,
  },
  timeOverlay: {
    fontFamily: Typography.family.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
  },
  menuOverlayBtn: { padding: 2 },
  dotRowMedia: {
    position: 'absolute', bottom: 44, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 4,
  },

  // ── Text-only header
  textHeaderGrad: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 80,
    borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl,
  },
  accentBar: {
    height: 3,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headerInfo:  { flex: 1 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  authorName:  { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  authorMeta:  { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 2 },
  timeAgo:     { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled, marginTop: 1 },
  menuBtn:     { padding: 4, marginTop: 2 },
  avatarDefault: { backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: Typography.family.bold, color: Colors.white },

  // ── Menu
  menu: {
    position: 'absolute', right: Spacing.lg, top: 56, zIndex: 200,
    backgroundColor: Colors.elevated,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 165,
    overflow: 'hidden',
    ...Shadows.card,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: 13 },
  menuDiv:  { height: 1, backgroundColor: Colors.border },
  menuTxt:  { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary },

  // ── Caption
  captionWrap:     { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  caption:         { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary, lineHeight: 21 },
  authorNameInline:{ fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  moreTxt:         { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.primary, marginTop: 3 },
  editWrap: { marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radii.md, backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  editInput: { minHeight: 80, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, lineHeight: 20, color: Colors.textPrimary, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  editCancel: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  editCancelText: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.textMuted },
  editSave: { minWidth: 64, alignItems: 'center', borderRadius: Radii.md, backgroundColor: Colors.accent, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  editSaveText: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.bg },

  // ── Tags
  tagRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.sm },
  chip:   { borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: 5, borderWidth: 1 },
  chipTxt:{ fontFamily: Typography.family.bold, fontSize: Typography.size.xs },

  // ── Dots
  dot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 16, backgroundColor: Colors.primary },

  // ── Action bar
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionLeft:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  heartGlowWrap:{ borderRadius: 18, padding: 4 },
  actionCount:  { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textMuted },
  countLiked:   { color: Colors.error },
});
