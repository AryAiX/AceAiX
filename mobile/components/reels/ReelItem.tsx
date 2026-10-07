import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BadgeCheck, Heart, MessageCircle, Play, Share2, Volume2, VolumeX } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Text } from '@/components/ui';
import { HeartBurst } from '@/components/feed/HeartBurst';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { positionLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { isHighlight } from '@/lib/api.explore';
import { reelVideo } from '@/lib/api.reels';
import { compactNumber, displayName, metaLine } from '@/lib/format';
import { NATIVE_DRIVER } from '@/lib/motion';
import type { FeedPost } from '@/types/models';

/**
 * One reel, one screen.
 *
 * The clip plays only while this is the reel on screen, loops, and starts
 * muted — a video that shouts on arrival is how an app gets closed on a bus.
 * One tap pauses, two like (with the burst), and the like, comment and share
 * column sits under the right thumb.
 *
 * Everything drawn over the video is white: it sits on footage and a dark
 * scrim, never on a theme surface (docs/20 rule 1's exception).
 */

const ON_VIDEO = '#FFFFFF';
const ON_VIDEO_SOFT = 'rgba(255,255,255,0.82)';
const CHIP = 'rgba(0,0,0,0.32)';
const DOUBLE_TAP_MS = 260;

export interface ReelItemProps {
  post: FeedPost;
  width: number;
  height: number;
  active: boolean;
  muted: boolean;
  isOwn: boolean;
  bottomInset: number;
  onToggleMute: () => void;
  onLike: (post: FeedPost, forceOn?: boolean) => void;
  onComment: (post: FeedPost) => void;
  onShare: (post: FeedPost) => void;
  onFollow: (post: FeedPost) => void;
  onOpenProfile: (userId: string) => void;
}

function ReelItemBase({
  post,
  width,
  height,
  active,
  muted,
  isOwn,
  bottomInset,
  onToggleMute,
  onLike,
  onComment,
  onShare,
  onFollow,
  onOpenProfile,
}: ReelItemProps) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();
  const video = reelVideo(post);
  /* A highlight is a clip from a profile, not a post: it has no likes, comments
     or post link, so the reel shows it without those controls. */
  const reactable = !isHighlight(post);

  const [firstFrame, setFirstFrame] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [bursts, setBursts] = useState(0);
  const [captionOpen, setCaptionOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(video?.url ?? null, (p) => {
    p.loop = true;
    p.muted = true;
    p.timeUpdateEventInterval = 0.25;
  });

  const safely = useCallback((fn: () => void) => {
    try {
      fn();
    } catch {
      /* the player went away underneath us */
    }
  }, []);

  useEffect(() => {
    safely(() => {
      player.muted = muted;
    });
  }, [muted, player, safely]);

  const playing = active && !userPaused;
  useEffect(() => {
    safely(() => {
      if (playing) player.play();
      else player.pause();
    });
  }, [playing, player, safely]);

  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      const total = player.duration;
      if (total > 0 && Number.isFinite(total)) progress.setValue(Math.min(1, currentTime / total));
    });
    return () => sub.remove();
  }, [player, progress]);

  /* The poster stays until a real frame is on screen. If the clip cannot be
     played at all, the poster is a better thing to look at than black. */
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    },
    [],
  );

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
      if (!reactable) return;
      if (!post.viewer_liked) onLike(post, true);
      setBursts((n) => n + 1);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      setUserPaused((p) => !p);
    }, DOUBLE_TAP_MS);
  };

  const name = displayName(post.author_name);
  const meta = metaLine(positionLabel(t, post.athlete_position), sportLabel(t, post.athlete_sport));
  const caption = post.caption?.trim() ?? '';

  return (
    <View style={{ width, height, backgroundColor: 'transparent', overflow: 'hidden' }} testID={`reel-${post.id}`}>
      {video ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          fullscreenOptions={{ enable: false }}
          allowsPictureInPicture={false}
          onFirstFrameRender={() => setFirstFrame(true)}
          accessibilityLabel={t('reels.videoOf', { name })}
        />
      ) : null}

      {video?.thumbnail && !firstFrame ? (
        <Image
          source={{ uri: video.thumbnail }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}

      {/* Tap and double-tap surface — the whole reel. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleTap}
        accessibilityRole="button"
        accessibilityLabel={userPaused ? t('reels.paused') : t('reels.videoOf', { name })}
        accessibilityHint={reactable ? t('reels.doubleTapHint') : undefined}
      />

      {userPaused ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: CHIP,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Play size={32} color={ON_VIDEO} fill={ON_VIDEO} />
          </View>
        </View>
      ) : null}

      <HeartBurst trigger={bursts} size={120} />

      {/* ── Scrim, author and caption ── */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.78)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.42 }}
      />

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: spacing.lg,
          right: 84,
          bottom: bottomInset + spacing.xl,
          gap: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Pressable
            onPress={() => onOpenProfile(post.author_id)}
            accessibilityRole="button"
            accessibilityLabel={t('feed.openProfileOf', { name })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 }}
          >
            <Avatar uri={post.author_avatar} name={name} size="sm" score={post.author_score} />
            <View style={{ flexShrink: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text variant="bodyStrong" color={ON_VIDEO} numberOfLines={1} style={{ flexShrink: 1 }}>
                  {name}
                </Text>
                {post.author_verified ? <BadgeCheck size={15} color={theme.colors.info} /> : null}
              </View>
              {meta ? (
                <Text variant="caption" color={ON_VIDEO_SOFT} numberOfLines={1}>
                  {meta}
                </Text>
              ) : null}
            </View>
          </Pressable>
          {!isOwn && !post.viewer_follows ? (
            <Pressable
              onPress={() => onFollow(post)}
              accessibilityRole="button"
              accessibilityLabel={t('discover.followA11y', { name })}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.md,
                height: 30,
                borderRadius: 15,
                borderWidth: 1.5,
                borderColor: ON_VIDEO,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'transparent',
              })}
              testID="reel-follow"
            >
              <Text variant="captionStrong" color={ON_VIDEO}>
                {t('common.follow')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {!reactable ? (
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: spacing.sm,
              height: 22,
              borderRadius: 11,
              backgroundColor: CHIP,
              justifyContent: 'center',
            }}
          >
            <Text variant="captionStrong" color={ON_VIDEO}>
              {t('explore.highlight')}
            </Text>
          </View>
        ) : null}

        {caption ? (
          <Pressable onPress={() => setCaptionOpen((o) => !o)} accessibilityRole="button">
            <Text variant="body" color={ON_VIDEO} numberOfLines={captionOpen ? 8 : 2}>
              {caption}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* ── Action column ── */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: spacing.sm,
          bottom: bottomInset + spacing.xl,
          alignItems: 'center',
          gap: spacing.lg,
        }}
      >
        <RailButton
          label={muted ? t('feed.soundOn') : t('feed.soundOff')}
          onPress={onToggleMute}
          testID="reel-mute"
        >
          {muted ? <VolumeX size={24} color={ON_VIDEO} /> : <Volume2 size={24} color={ON_VIDEO} />}
        </RailButton>

        {reactable ? (
          <>
          <LikeButton
            liked={post.viewer_liked}
            count={post.like_count}
            label={post.viewer_liked ? t('feed.unlikePost') : t('feed.likePost')}
            onPress={() => onLike(post)}
          />

          <RailButton
            label={t('feed.readAndAddComments')}
            onPress={() => onComment(post)}
            count={post.comment_count}
            testID="reel-comment"
          >
            <MessageCircle size={28} color={ON_VIDEO} strokeWidth={2} />
          </RailButton>

          <RailButton label={t('feed.sharePost')} onPress={() => onShare(post)} testID="reel-share">
            <Share2 size={26} color={ON_VIDEO} strokeWidth={2} />
          </RailButton>
          </>
        ) : null}
      </View>

      {/* ── Thin progress ── */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: bottomInset,
          height: 2,
          backgroundColor: 'rgba(255,255,255,0.22)',
        }}
      >
        <Animated.View
          style={{
            height: 2,
            width: '100%',
            backgroundColor: ON_VIDEO,
            transformOrigin: 'left',
            transform: [{ scaleX: progress }],
          }}
        />
      </View>
    </View>
  );
}

export const ReelItem = memo(ReelItemBase);

function RailButton({
  label,
  onPress,
  children,
  count,
  testID,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  count?: number;
  testID?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const press = (to: number) => {
    if (reduced) return;
    Animated.spring(scale, { toValue: to, speed: 50, bounciness: 10, useNativeDriver: NATIVE_DRIVER }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => press(0.85)}
      onPressOut={() => press(1)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={{ alignItems: 'center', gap: 2, minWidth: 48 }}
    >
      <Animated.View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: CHIP,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
        }}
      >
        {children}
      </Animated.View>
      {count != null && count > 0 ? (
        <Text variant="captionStrong" color={ON_VIDEO}>
          {compactNumber(count)}
        </Text>
      ) : null}
    </Pressable>
  );
}

function LikeButton({
  liked,
  count,
  label,
  onPress,
}: {
  liked: boolean;
  count: number;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(1)).current;
  const was = useRef(liked);

  useEffect(() => {
    if (liked === was.current) return;
    was.current = liked;
    if (reduced) return;
    if (liked) {
      Animated.sequence([
        Animated.timing(pop, { toValue: 0.7, duration: 70, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
        Animated.spring(pop, { toValue: 1.4, speed: 40, bounciness: 16, useNativeDriver: NATIVE_DRIVER }),
        Animated.spring(pop, { toValue: 1, speed: 20, bounciness: 12, useNativeDriver: NATIVE_DRIVER }),
      ]).start();
    } else {
      Animated.sequence([
        Animated.timing(pop, { toValue: 0.85, duration: 90, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(pop, { toValue: 1, duration: 160, useNativeDriver: NATIVE_DRIVER }),
      ]).start();
    }
  }, [liked, pop, reduced]);

  return (
    <RailButton label={label} onPress={onPress} count={count} testID="reel-like">
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Heart
          size={28}
          color={liked ? theme.colors.primary : ON_VIDEO}
          fill={liked ? theme.colors.primary : 'transparent'}
          strokeWidth={2}
        />
      </Animated.View>
    </RailButton>
  );
}

