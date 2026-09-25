import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Clapperboard, Play } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Reveal, Tappable, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import { getReels, reelVideo } from '@/lib/api.reels';
import { displayName } from '@/lib/format';
import { NATIVE_DRIVER } from '@/lib/motion';
import { Routes } from '@/lib/routes';
import type { FeedPost } from '@/types/models';

/**
 * A row of tall reel posters on Home — the way into Reels from the feed.
 *
 * Hidden entirely when there is nothing to show, like the spotlight tiles:
 * an empty strip is worse than no strip.
 */

const CARD_W = 118;
const CARD_H = 196;
const ON_POSTER = '#FFFFFF';

export function ReelsStrip() {
  const theme = useTheme();
  const { spacing } = theme;
  const router = useRouter();
  const t = useT();

  const reels = useAsync(() => getReels({ limit: 6 }), [], { refetchOnFocus: true });
  const items = reels.data ?? [];
  if (items.length === 0) return null;

  const open = (post?: FeedPost) =>
    router.push(post ? { pathname: Routes.reels, params: { start: post.id } } : Routes.reels);

  return (
    <View style={{ marginHorizontal: -spacing.lg, gap: spacing.sm }} testID="reels-strip">
      <Tappable
        onPress={() => open()}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={t('reels.open')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LinearGradient
            colors={theme.gradients.party}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View>
            <Clapperboard size={16} color={ON_POSTER} strokeWidth={2.2} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subheading">{t('reels.stripTitle')}</Text>
          <Text variant="caption" tone="muted">
            {t('reels.stripSubtitle')}
          </Text>
        </View>
        <Text variant="captionStrong" tone="primary">
          {t('reels.seeAll')}
        </Text>
        <ChevronRight size={16} color={theme.colors.primary} />
      </Tappable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
      >
        {items.map((post, index) => (
          <Reveal key={post.id} index={index} from="right" distance={24}>
            <ReelPoster post={post} index={index} onPress={() => open(post)} />
          </Reveal>
        ))}
      </ScrollView>
    </View>
  );
}

function ReelPoster({ post, index, onPress }: { post: FeedPost; index: number; onPress: () => void }) {
  const theme = useTheme();
  const t = useT();
  const reduced = useReducedMotion();
  const video = reelVideo(post);
  const name = displayName(post.author_name);
  const beat = useRef(new Animated.Value(0)).current;

  /* The play badges breathe out of step with each other, so the strip
     shimmers rather than blinks. */
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(index * 350),
        Animated.timing(beat, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(beat, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE_DRIVER }),
        Animated.delay(1600),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [beat, index, reduced]);

  return (
    <Tappable
      onPress={onPress}
      scaleTo={0.94}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={t('reels.playReelBy', { name })}
      testID={`reel-poster-${post.id}`}
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: theme.radii.lg,
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
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: CARD_H * 0.55 }}
      />

      <Animated.View
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: 'rgba(0,0,0,0.35)',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) }],
        }}
      >
        <Play size={13} color={ON_POSTER} fill={ON_POSTER} />
      </Animated.View>

      <View style={{ position: 'absolute', left: 8, right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Avatar uri={post.author_avatar} name={name} size="xs" />
        <Text variant="captionStrong" color={ON_POSTER} numberOfLines={1} style={{ flexShrink: 1 }}>
          {name.split(' ')[0]}
        </Text>
      </View>
    </Tappable>
  );
}
