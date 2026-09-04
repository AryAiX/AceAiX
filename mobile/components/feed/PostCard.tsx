import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Share, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Heart, MoreHorizontal } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Tappable, Text, useToast } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { positionLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { toggleLike, toggleSave } from '@/lib/api';
import { postLink } from '@/lib/api.feed';
import { errorMessage } from '@/lib/errors';
import { displayName, metaLine, relativeTime } from '@/lib/format';
import type { FeedPost } from '@/types/models';
import { MediaCarousel } from './MediaCarousel';
import { PostActions } from './PostActions';

/**
 * The most-seen component in the app.
 *
 * Two rules it must never break: tapping the avatar or the name opens that
 * person's profile, and every post is one tap away from the safety menu.
 */

const CAPTION_LINES = 4;
/** Roughly four lines on a phone. Only decides whether "more" is offered. */
const CAPTION_CHARS = 170;
/**
 * How long a first tap on the media waits to see whether a second one is
 * coming. Long enough for a thumb, short enough that opening a post still feels
 * immediate — and nothing else in the card is ever held up by it.
 */
const DOUBLE_TAP_MS = 260;

export interface PostCardProps {
  post: FeedPost;
  /** True while this card is the one on screen — controls video playback. */
  isActive?: boolean;
  /** Full caption, no truncation. Used on the single-post screen. */
  expanded?: boolean;
  /** Apply an optimistic change to this post in whatever list holds it. */
  onPatch: (postId: string, changes: Partial<FeedPost>) => void;
  onOpenComments: (post: FeedPost) => void;
  onOpenActions: (post: FeedPost) => void;
  onOpenProfile: (userId: string) => void;
  /** Omit on the single-post screen — there is nowhere further to go. */
  onOpenPost?: (post: FeedPost) => void;
}

function PostCardBase({
  post,
  isActive = false,
  expanded = false,
  onPatch,
  onOpenComments,
  onOpenActions,
  onOpenProfile,
  onOpenPost,
}: PostCardProps) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const toast = useToast();
  const t = useT();
  const reduced = useReducedMotion();

  const [showAll, setShowAll] = useState(expanded);

  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const lastMediaTap = useRef(0);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (openTimer.current) clearTimeout(openTimer.current);
    },
    [],
  );

  const name = displayName(post.author_name);
  const caption = post.caption?.trim() ?? '';
  /* Sport and position are stored in English; only their labels are translated. */
  const meta = metaLine(
    positionLabel(t, post.athlete_position),
    sportLabel(t, post.athlete_sport),
    relativeTime(post.created_at),
  );
  const mightOverflow =
    caption.length > CAPTION_CHARS || caption.split('\n').length > CAPTION_LINES;

  const handleLike = useCallback(async () => {
    const liked = !post.viewer_liked;
    const optimistic = Math.max(0, post.like_count + (liked ? 1 : -1));
    onPatch(post.id, { viewer_liked: liked, like_count: optimistic });

    try {
      const result = await toggleLike(post.id);
      onPatch(post.id, { viewer_liked: result.liked, like_count: result.like_count });
    } catch (err) {
      onPatch(post.id, {
        viewer_liked: post.viewer_liked,
        like_count: post.like_count,
      });
      toast.error(errorMessage(err));
    }
  }, [post.id, post.viewer_liked, post.like_count, onPatch, toast]);

  const handleSave = useCallback(async () => {
    const saved = !post.viewer_saved;
    onPatch(post.id, { viewer_saved: saved });

    try {
      const result = await toggleSave(post.id);
      onPatch(post.id, { viewer_saved: result.saved });
      if (result.saved) toast.success(t('common.saved'));
    } catch (err) {
      onPatch(post.id, { viewer_saved: post.viewer_saved });
      toast.error(errorMessage(err));
    }
  }, [post.id, post.viewer_saved, onPatch, toast, t]);

  const handleShare = useCallback(async () => {
    const link = postLink(post.id);
    try {
      await Share.share(
        Platform.OS === 'ios' ? { url: link, message: link } : { message: link },
      );
    } catch {
      /* the user backed out of the share sheet */
    }
  }, [post.id]);

  const burst = useCallback(() => {
    burstOpacity.setValue(0);
    burstScale.setValue(reduced ? 1 : 0.4);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(burstOpacity, {
          toValue: 1,
          duration: reduced ? theme.duration.fast : 130,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        reduced
          ? Animated.delay(0)
          : Animated.spring(burstScale, {
              toValue: 1.1,
              useNativeDriver: true,
              speed: 18,
              bounciness: 14,
            }),
      ]),
      Animated.delay(reduced ? 240 : 150),
      Animated.parallel([
        Animated.timing(burstOpacity, {
          toValue: 0,
          duration: theme.duration.base,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        reduced
          ? Animated.delay(0)
          : Animated.timing(burstScale, {
              toValue: 1.35,
              duration: theme.duration.base,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
      ]),
    ]).start();
  }, [burstOpacity, burstScale, reduced, theme.duration.fast, theme.duration.base]);

  const openPost = onOpenPost ? () => onOpenPost(post) : undefined;

  /**
   * One tap opens the post, two likes it — the gesture this audience already
   * has in its thumbs. The like is applied before anything moves; only the
   * *navigation* waits out the double-tap window, and only when there is
   * somewhere to navigate to.
   */
  const handleMediaTap = useCallback(() => {
    const now = Date.now();
    const isSecond = now - lastMediaTap.current < DOUBLE_TAP_MS;

    if (isSecond) {
      lastMediaTap.current = 0;
      if (openTimer.current) {
        clearTimeout(openTimer.current);
        openTimer.current = null;
      }
      /* A double tap only ever likes. Taking a like back is deliberate, and
         belongs to the heart button. */
      if (!post.viewer_liked) handleLike();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      burst();
      return;
    }

    lastMediaTap.current = now;
    if (!onOpenPost) return;
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      onOpenPost(post);
    }, DOUBLE_TAP_MS);
  }, [post, onOpenPost, handleLike, burst]);
  /* On the single-post screen the caption is already full and there is
     nowhere further to go, so it stops being a button. */
  const captionIsInert = showAll && !openPost;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {/* One target covering avatar and name: the profile tap must never
            land in the gap between them. */}
        <Tappable
          onPress={() => onOpenProfile(post.author_id)}
          accessibilityRole="button"
          accessibilityLabel={t('feed.openProfileOf', { name })}
          hitSlop={6}
          scaleTo={0.985}
          containerStyle={{ flex: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            minHeight: theme.hit.min,
          }}
        >
          <Avatar
            uri={post.author_avatar}
            name={name}
            size="md"
            score={post.author_score}
            verified={post.author_verified}
          />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {name}
            </Text>
            {meta ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>
        </Tappable>

        <Tappable
          onPress={() => onOpenActions(post)}
          accessibilityRole="button"
          accessibilityLabel={t('feed.postMoreOptions', { name })}
          hitSlop={12}
          scaleTo={0.9}
          style={({ pressed }) => ({
            width: theme.hit.min,
            height: theme.hit.min,
            borderRadius: radii.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
          })}
        >
          <MoreHorizontal size={20} color={colors.textSecondary} />
        </Tappable>
      </View>

      {caption ? (
        captionIsInert ? (
          <Text variant="body">{caption}</Text>
        ) : (
          <Pressable
            onPress={() => (showAll ? openPost?.() : setShowAll(true))}
            accessibilityRole="button"
            accessibilityLabel={showAll ? t('feed.openPost') : t('feed.showFullCaption')}
          >
            <Text variant="body" numberOfLines={showAll ? undefined : CAPTION_LINES}>
              {caption}
            </Text>
            {!showAll && mightOverflow ? (
              <Text variant="captionStrong" tone="muted" style={{ marginTop: 2 }}>
                {t('common.showMore')}
              </Text>
            ) : null}
          </Pressable>
        )
      ) : null}

      {post.media.length > 0 ? (
        <View>
          <MediaCarousel
            media={post.media}
            isActive={isActive}
            onPress={openPost ? handleMediaTap : undefined}
          />
          {/* Announced nowhere and touchable nowhere: the like it stands for is
              already announced by the heart button below. */}
          {openPost ? (
            <Animated.View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: burstOpacity,
                transform: [{ scale: burstScale }],
              }}
            >
              <Heart
                size={theme.hit.comfortable * 2}
                color={colors.textOnBrand}
                fill={colors.primary}
                strokeWidth={1.4}
              />
            </Animated.View>
          ) : null}
        </View>
      ) : null}

      <PostActions
        liked={post.viewer_liked}
        likeCount={post.like_count}
        commentCount={post.comment_count}
        saved={post.viewer_saved}
        onLike={handleLike}
        onComment={() => onOpenComments(post)}
        onShare={handleShare}
        onSave={handleSave}
      />
    </View>
  );
}

export const PostCard = memo(PostCardBase);
