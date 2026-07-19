import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  MoreHorizontal,
  Eye,
  Trash2,
  Flag,
  Ban,
  Send,
  ChevronDown,
} from 'lucide-react-native';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import {
  Story,
  StoryAuthorGroup,
  deleteStory,
  fetchMyStoryViewers,
  sendStoryReply,
  storyTimeAgo,
} from '@/lib/storiesService';
import { useStoriesContext } from '@/context/StoriesContext';
import { useAuth } from '@/context/AuthContext';
import { blockUser, reportContent } from '@/lib/contentSafetyService';

const { width: SW, height: SH } = Dimensions.get('window');
const STORY_DURATION = 5000; // ms for photos

const QUICK_REACTIONS = ['🔥', '💪', '👏', '❤️', '🏆', '😮'];

const STICKER_LABELS: Record<string, { label: string; emoji: string }> = {
  open_to_trials: { label: 'Open to Trials', emoji: '🎯' },
  match_day: { label: 'Match Day', emoji: '⚽' },
  training: { label: 'Training', emoji: '💪' },
  new_pb: { label: 'New PB', emoji: '🏆' },
  recovery: { label: 'Recovery Day', emoji: '🧘' },
  team_win: { label: 'Team Win', emoji: '🎉' },
};

interface Props {
  visible: boolean;
  groups: StoryAuthorGroup[];
  startGroupIndex: number;
  onClose: () => void;
}

export function StoryViewer({ visible, groups, startGroupIndex, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { markSeen, refresh } = useStoriesContext();

  const [groupIdx, setGroupIdx] = useState(startGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<Array<{ viewer_id: string; viewer_name: string | null; viewer_avatar: string | null; viewed_at: string }>>([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyStatus, setReplyStatus] = useState<string | null>(null);

  const progressAnims = useRef<Animated.Value[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentGroup: StoryAuthorGroup | undefined = groups[groupIdx];
  const currentStory: Story | undefined = currentGroup?.stories[storyIdx];
  const isOwnStory = currentGroup?.is_own ?? false;

  // Rebuild progress anims when group changes
  useEffect(() => {
    if (!currentGroup) return;
    progressAnims.current = currentGroup.stories.map(() => new Animated.Value(0));
  }, [groupIdx, currentGroup?.stories.length]);

  // Mark current story as seen
  useEffect(() => {
    if (!currentStory || !user) return;
    if (!currentStory.seen) markSeen(currentStory.id);
  }, [currentStory?.id, user]);

  // Progress timer
  useEffect(() => {
    if (!visible || paused || !currentStory) return;

    // Reset current bar
    const bar = progressAnims.current[storyIdx];
    if (!bar) return;
    bar.setValue(0);

    // Fill previous bars
    for (let i = 0; i < storyIdx; i++) {
      progressAnims.current[i]?.setValue(1);
    }
    // Clear future bars
    for (let i = storyIdx + 1; i < progressAnims.current.length; i++) {
      progressAnims.current[i]?.setValue(0);
    }

    const anim = Animated.timing(bar, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) advanceStory();
    });

    return () => { anim.stop(); };
  }, [storyIdx, groupIdx, paused, visible]);

  const advanceStory = useCallback(() => {
    if (!currentGroup) return;
    if (storyIdx < currentGroup.stories.length - 1) {
      setStoryIdx((i) => i + 1);
    } else {
      // Move to next group
      if (groupIdx < groups.length - 1) {
        setGroupIdx((g) => g + 1);
        setStoryIdx(0);
      } else {
        onClose();
      }
    }
  }, [storyIdx, groupIdx, currentGroup, groups.length, onClose]);

  const goBack = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      const prevGroup = groups[groupIdx - 1];
      setGroupIdx((g) => g - 1);
      setStoryIdx(prevGroup.stories.length - 1);
    }
  }, [storyIdx, groupIdx, groups]);

  const handleDelete = useCallback(async () => {
    if (!currentStory) return;
    setMenuOpen(false);
    const { error } = await deleteStory(currentStory.id, currentStory.media_url);
    if (error) {
      Alert.alert('Story not deleted', error);
      return;
    }
    await refresh();
    onClose();
  }, [currentStory, refresh, onClose]);

  const handleShowViewers = useCallback(async () => {
    if (!currentStory) return;
    setMenuOpen(false);
    const data = await fetchMyStoryViewers(currentStory.id);
    setViewers(data);
    setShowViewers(true);
  }, [currentStory]);

  const handleReply = useCallback(async () => {
    if (!currentStory || !user || !replyText.trim() || sendingReply) return;
    setSendingReply(true);
    setReplyStatus(null);
    const { error } = await sendStoryReply(currentStory, user.id, replyText);
    setSendingReply(false);
    if (error) {
      Alert.alert('Reply not sent', error);
      return;
    }
    setReplyText('');
    setReplyStatus('Reply sent to Messages');
  }, [currentStory, replyText, sendingReply, user]);

  const handleReport = useCallback(() => {
    if (!currentStory || !user) return;
    setMenuOpen(false);
    Alert.alert(
      'Report this story?',
      'AceAiX administrators will review it for safety and policy violations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            const { error } = await reportContent(user.id, 'story', currentStory.id);
            Alert.alert(
              error ? 'Report not sent' : 'Report received',
              error ?? 'Thank you. Our safety team will review this story.',
            );
          },
        },
      ],
    );
  }, [currentStory, user]);

  const handleBlock = useCallback(() => {
    if (!currentStory || !currentGroup || !user || currentStory.author_id === user.id) return;
    setMenuOpen(false);
    Alert.alert(
      `Block ${currentGroup.author_name ?? 'this member'}?`,
      'Their stories and posts will no longer appear in your feed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const { error } = await blockUser(user.id, currentStory.author_id);
            if (error) {
              Alert.alert('Member not blocked', error);
              return;
            }
            await refresh();
            onClose();
            Alert.alert('Member blocked', 'Their content has been hidden.');
          },
        },
      ],
    );
  }, [currentGroup, currentStory, onClose, refresh, user]);

  // Swipe down to close + horizontal to change group
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 15 || Math.abs(g.dx) > 20,
      onPanResponderGrant: () => setPaused(true),
      onPanResponderRelease: (_, g) => {
        setPaused(false);
        if (g.dy > 60) { onClose(); return; }
        if (g.dx < -50 && groupIdx < groups.length - 1) {
          setGroupIdx((gi) => gi + 1);
          setStoryIdx(0);
        } else if (g.dx > 50 && groupIdx > 0) {
          setGroupIdx((gi) => gi - 1);
          setStoryIdx(0);
        }
      },
    })
  ).current;

  if (!visible || !currentGroup || !currentStory) return null;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" statusBarTranslucent>
      <View style={s.root} {...panResponder.panHandlers}>
        {/* ── MEDIA ─────────────────────────────────────────────────────────── */}
        <View style={s.mediaWrap}>
          {currentStory.signed_url ? (
            <Image
              source={{ uri: currentStory.signed_url }}
              style={s.media}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={['#0A1628', Colors.primary, '#061020']}
              style={s.media}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}
        </View>

        {/* Gradient overlays for readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          style={s.topGrad}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={s.bottomGrad}
          pointerEvents="none"
        />

        {/* Tap zones: left = back, right = forward */}
        <View style={s.tapZones}>
          <TouchableOpacity style={s.tapLeft} onPress={goBack} activeOpacity={1} />
          <TouchableOpacity style={s.tapRight} onPress={advanceStory} activeOpacity={1} />
        </View>

        {/* Press-and-hold pause zone */}
        <View
          style={s.holdZone}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        />

        {/* ── PROGRESS BARS ─────────────────────────────────────────────────── */}
        <View style={[s.progressRow, { top: insets.top + 8 }]}>
          {currentGroup.stories.map((_, i) => (
            <View key={i} style={s.progressTrack}>
              <Animated.View
                style={[
                  s.progressFill,
                  {
                    width:
                      progressAnims.current[i]
                        ? progressAnims.current[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        : i < storyIdx ? '100%' : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <View style={[s.header, { top: insets.top + 20 }]}>
          <View style={s.authorRow}>
            <View style={s.authorAvatar}>
              <Text style={s.authorInitial}>
                {currentGroup.author_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View>
              <Text style={s.authorName} numberOfLines={1}>
                {currentGroup.author_name ?? 'Athlete'}
              </Text>
              <Text style={s.storyTime}>{storyTimeAgo(currentStory.created_at)}</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={() => setMenuOpen((p) => !p)} hitSlop={8}>
              <MoreHorizontal color={Colors.white} size={22} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X color={Colors.white} size={22} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── CAPTION + OVERLAYS ────────────────────────────────────────────── */}
        {currentStory.overlays?.length > 0 && (
          <View style={s.stickerDisplay} pointerEvents="none">
            {currentStory.overlays.map((ov, i) => (
              <View key={i}>
                {ov.type === 'text' ? (
                  <View style={s.textBubble}>
                    <Text style={[s.textBubbleTxt, { color: ov.color ?? Colors.white }]}>
                      {ov.value}
                    </Text>
                  </View>
                ) : (
                  <View style={s.stickerBubble}>
                    <Text style={s.stickerBubbleEmoji}>
                      {STICKER_LABELS[ov.value]?.emoji ?? '🏅'}
                    </Text>
                    <Text style={s.stickerBubbleLabel}>
                      {STICKER_LABELS[ov.value]?.label ?? ov.value}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
        {currentStory.caption && (
          <View style={s.captionWrap} pointerEvents="none">
            <Text style={s.captionTxt}>{currentStory.caption}</Text>
          </View>
        )}

        {/* ── REPLY BAR ─────────────────────────────────────────────────────── */}
        {!isOwnStory && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'position' : undefined}
            style={[s.replyBar, { bottom: insets.bottom + Spacing.md }]}
          >
            {/* Quick reactions */}
            <View style={s.reactRow}>
              {QUICK_REACTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={s.reactBtn}
                  onPress={() => setReplyText(emoji)}
                >
                  <Text style={s.reactEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.replyInputRow}>
              <TextInput
                style={s.replyInput}
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Reply..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                returnKeyType="send"
                editable={!sendingReply}
                onSubmitEditing={() => void handleReply()}
              />
              {replyText.trim().length > 0 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Send story reply"
                  onPress={() => void handleReply()}
                  style={s.sendBtn}
                  disabled={sendingReply}
                >
                  {sendingReply
                    ? <ActivityIndicator color={Colors.accent} size="small" />
                    : <Send color={Colors.accent} size={18} />
                  }
                </TouchableOpacity>
              )}
            </View>
            {replyStatus && <Text style={s.replyStatus}>{replyStatus}</Text>}
          </KeyboardAvoidingView>
        )}

        {/* Own story bottom: viewers */}
        {isOwnStory && (
          <TouchableOpacity
            style={[s.viewersBtn, { bottom: insets.bottom + Spacing.lg }]}
            onPress={handleShowViewers}
          >
            <Eye color={Colors.white} size={18} />
            <Text style={s.viewersBtnTxt}>View insights</Text>
          </TouchableOpacity>
        )}

        {/* ── MENU ──────────────────────────────────────────────────────────── */}
        {menuOpen && (
          <View style={[s.menu, { top: insets.top + 64 }]}>
            {isOwnStory ? (
              <>
                <TouchableOpacity style={s.menuItem} onPress={handleShowViewers}>
                  <Eye color={Colors.textPrimary} size={18} />
                  <Text style={s.menuTxt}>View insights</Text>
                </TouchableOpacity>
                <View style={s.menuDivider} />
                <TouchableOpacity style={s.menuItem} onPress={handleDelete}>
                  <Trash2 color={Colors.error} size={18} />
                  <Text style={[s.menuTxt, { color: Colors.error }]}>Delete story</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={s.menuItem} onPress={handleReport}>
                  <Flag color={Colors.warning} size={18} />
                  <Text style={[s.menuTxt, { color: Colors.warning }]}>Report</Text>
                </TouchableOpacity>
                <View style={s.menuDivider} />
                <TouchableOpacity style={s.menuItem} onPress={handleBlock}>
                  <Ban color={Colors.error} size={18} />
                  <Text style={[s.menuTxt, { color: Colors.error }]}>Block member</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={s.menuDivider} />
            <TouchableOpacity style={s.menuItem} onPress={() => setMenuOpen(false)}>
              <X color={Colors.textMuted} size={18} />
              <Text style={s.menuTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── VIEWERS SHEET ─────────────────────────────────────────────────── */}
        {showViewers && (
          <View style={[s.viewersSheet, { paddingBottom: insets.bottom }]}>
            <View style={s.viewersHandle} />
            <View style={s.viewersHeader}>
              <Text style={s.viewersTitle}>
                {viewers.length} viewer{viewers.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowViewers(false)}>
                <ChevronDown color={Colors.textMuted} size={22} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {viewers.length === 0 ? (
                <Text style={s.viewersEmpty}>No views yet</Text>
              ) : (
                viewers.map((v) => (
                  <View key={v.viewer_id} style={s.viewerRow}>
                    <View style={s.viewerAvatar}>
                      <Text style={s.viewerInitial}>
                        {v.viewer_name?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.viewerName}>{v.viewer_name ?? 'Athlete'}</Text>
                      <Text style={s.viewerTime}>{storyTimeAgo(v.viewed_at)} ago</Text>
                    </View>
                    <Eye color={Colors.textDisabled} size={14} />
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  mediaWrap: { ...StyleSheet.absoluteFillObject },
  media: { width: '100%', height: '100%' },

  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 180 },
  bottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 250 },

  // Tap zones
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  tapLeft: { flex: 1 },
  tapRight: { flex: 2 },
  holdZone: { position: 'absolute', top: 100, left: 80, right: 80, bottom: 180 },

  // Progress
  progressRow: {
    position: 'absolute', left: Spacing.md, right: Spacing.md,
    flexDirection: 'row', gap: 3,
  },
  progressTrack: {
    flex: 1, height: 2, borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.white },

  // Header
  header: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  authorAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.white,
  },
  authorInitial: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white },
  authorName: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white, maxWidth: 160 },
  storyTime: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: 'rgba(255,255,255,0.7)' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },

  // Overlays
  stickerDisplay: {
    position: 'absolute', top: '40%', left: 0, right: 0,
    alignItems: 'center', gap: Spacing.sm,
  },
  textBubble: {
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: Radii.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  textBubbleTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl },
  stickerBubble: {
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radii.md, padding: Spacing.sm,
  },
  stickerBubbleEmoji: { fontSize: 28 },
  stickerBubbleLabel: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.white },
  captionWrap: { position: 'absolute', bottom: 160, left: Spacing.lg, right: Spacing.lg },
  captionTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.md, color: Colors.white, lineHeight: 20 },

  // Reply bar
  replyBar: { position: 'absolute', left: 0, right: 0, paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  reactRow: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center' },
  reactBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  reactEmoji: { fontSize: 20 },
  replyInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radii.full, paddingHorizontal: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  replyInput: {
    flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.size.sm,
    color: Colors.white, paddingVertical: Spacing.md,
  },
  sendBtn: { padding: Spacing.sm },
  replyStatus: { marginTop: 5, textAlign: 'center', fontFamily: Typography.family.medium, fontSize: 10, color: Colors.success },

  // Own story viewers button
  viewersBtn: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
  },
  viewersBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },

  // Menu
  menu: {
    position: 'absolute', right: Spacing.lg,
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border,
    minWidth: 180, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  menuDivider: { height: 1, backgroundColor: Colors.border },
  menuTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.md, color: Colors.textPrimary },

  // Viewers sheet
  viewersSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl,
    maxHeight: SH * 0.6, paddingTop: Spacing.md, paddingHorizontal: Spacing.xl,
    borderWidth: 1, borderColor: Colors.border,
  },
  viewersHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md,
  },
  viewersHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.lg,
  },
  viewersTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  viewersEmpty: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.xl },
  viewerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  viewerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  viewerInitial: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white },
  viewerName: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary },
  viewerTime: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled, marginTop: 2 },
});
