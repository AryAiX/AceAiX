import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { AnimatedNumber, Tappable } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import { compactNumber } from '@/lib/format';

interface Props {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  saved: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
}

const ICON = 22;

/**
 * Like, comment, share, save.
 *
 * The heart pops the moment it is tapped — the network call catches up behind
 * it — because a like that waits for a round trip feels broken on a train.
 * Everything here reacts to the optimistic state, never to the response.
 */
export function PostActions({
  liked,
  likeCount,
  commentCount,
  saved,
  onLike,
  onComment,
  onShare,
  onSave,
}: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const reduced = useReducedMotion();

  const pop = useRef(new Animated.Value(1)).current;
  const wasLiked = useRef(liked);
  const fill = useRef(new Animated.Value(saved ? 1 : 0)).current;
  const wasSaved = useRef(saved);

  useEffect(() => {
    if (liked === wasLiked.current) return;
    wasLiked.current = liked;

    if (reduced) {
      pop.setValue(1);
      return;
    }

    if (liked) {
      Animated.sequence([
        Animated.spring(pop, { toValue: 1.3, useNativeDriver: true, speed: 60, bounciness: 12 }),
        Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
      ]).start();
      return;
    }

    /* Taking a like back is not an achievement: it shrinks and settles, with
       none of the overshoot that makes the like feel like a win. */
    Animated.sequence([
      Animated.timing(pop, {
        toValue: 0.85,
        duration: theme.duration.fast,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pop, {
        toValue: 1,
        duration: theme.duration.base,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [liked, pop, reduced, theme.duration.fast, theme.duration.base]);

  useEffect(() => {
    if (saved === wasSaved.current) return;
    wasSaved.current = saved;

    if (reduced) {
      fill.setValue(saved ? 1 : 0);
      return;
    }

    if (saved) {
      Animated.spring(fill, {
        toValue: 1,
        useNativeDriver: true,
        speed: 26,
        bounciness: 14,
      }).start();
      return;
    }
    Animated.timing(fill, {
      toValue: 0,
      duration: theme.duration.fast,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [saved, fill, reduced, theme.duration.fast]);

  const handleLike = () => {
    /* State first, feedback second — the haptic can never be in the way. */
    onLike();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Action
        label={liked ? t('feed.unlikePost') : t('feed.likePost')}
        onPress={handleLike}
        selected={liked}
        count={likeCount}
        icon={
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <Heart
              size={ICON}
              color={liked ? colors.primary : colors.textSecondary}
              fill={liked ? colors.primary : 'transparent'}
              strokeWidth={liked ? 2.4 : 1.9}
            />
          </Animated.View>
        }
      />

      <Action
        label={t('feed.readAndAddComments')}
        onPress={onComment}
        count={commentCount}
        icon={<MessageCircle size={ICON} color={colors.textSecondary} strokeWidth={1.9} />}
      />

      <Action
        label={t('feed.sharePost')}
        onPress={onShare}
        icon={<Share2 size={ICON - 1} color={colors.textSecondary} strokeWidth={1.9} />}
      />

      <View style={{ flex: 1 }} />

      <Action
        label={saved ? t('feed.removeFromSaved') : t('feed.savePost')}
        onPress={onSave}
        selected={saved}
        haptic
        icon={
          <View style={{ width: ICON, height: ICON, alignItems: 'center', justifyContent: 'center' }}>
            <Bookmark size={ICON} color={colors.textSecondary} strokeWidth={1.9} />
            {/* The filled bookmark springs in over the outline, so saving reads
                as the mark filling up rather than one icon swapping for another. */}
            <Animated.View
              style={{
                position: 'absolute',
                opacity: fill.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
                transform: [
                  { scale: fill.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                ],
              }}
            >
              <Bookmark
                size={ICON}
                color={colors.primary}
                fill={colors.primary}
                strokeWidth={2.4}
              />
            </Animated.View>
          </View>
        }
      />
    </View>
  );
}

function Action({
  icon,
  label,
  count,
  onPress,
  selected,
  haptic,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  onPress: () => void;
  selected?: boolean;
  haptic?: boolean;
}) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  return (
    <Tappable
      onPress={onPress}
      haptic={haptic}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      hitSlop={6}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
        minHeight: theme.hit.min,
        minWidth: theme.hit.min,
        justifyContent: 'center',
        paddingHorizontal: spacing.sm,
        borderRadius: radii.pill,
        backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
      })}
    >
      {icon}
      {count != null && count > 0 ? (
        <AnimatedNumber
          value={count}
          variant="captionStrong"
          tone={selected ? 'primary' : 'secondary'}
          format={compactNumber}
          duration={theme.duration.base}
        />
      ) : null}
    </Tappable>
  );
}
