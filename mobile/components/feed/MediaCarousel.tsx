import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Play, Volume2, VolumeX } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { PostMedia } from '@/types/models';

/**
 * Post media: one photo, one clip, or up to four of either in a pager.
 *
 * Every card in the feed reserves the same shape before its images decode, so
 * the list never jumps under the reader's thumb: the frame is derived from the
 * first item's real dimensions, clamped between 16:9 and 4:5.
 */

const MAX_TALL = 1.25; // 4:5 — the tallest we allow
const MAX_WIDE = 0.5625; // 16:9 — the shortest we allow

function frameRatio(media: PostMedia[]): number {
  const first = media[0];
  if (!first?.width || !first?.height) return MAX_TALL;
  const ratio = first.height / first.width;
  if (!Number.isFinite(ratio) || ratio <= 0) return MAX_TALL;
  return Math.min(MAX_TALL, Math.max(MAX_WIDE, ratio));
}

interface Props {
  media: PostMedia[];
  /** True while this card is the one on screen — videos only play then. */
  isActive?: boolean;
  onPress?: () => void;
}

export function MediaCarousel({ media, isActive = false, onPress }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();

  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [muted, setMuted] = useState(true);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(Math.round(e.nativeEvent.layout.width));
  }, []);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setPage(Math.min(Math.max(next, 0), media.length - 1));
    },
    [width, media.length],
  );

  if (media.length === 0) return null;

  const height = Math.round(width * frameRatio(media));

  return (
    <View
      onLayout={onLayout}
      style={{
        borderRadius: radii.md,
        overflow: 'hidden',
        backgroundColor: colors.surfaceSunken,
        height: height || undefined,
        aspectRatio: height ? undefined : 1 / MAX_TALL,
      }}
    >
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={media.length > 1}
          onMomentumScrollEnd={onScrollEnd}
          accessibilityLabel={
            media.length > 1
              ? t('feed.mediaSwipe', { count: media.length })
              : undefined
          }
        >
          {media.map((item, index) => (
            <MediaItem
              key={`${item.url}-${index}`}
              item={item}
              width={width}
              height={height}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              isActive={isActive && index === page}
              onPress={onPress}
            />
          ))}
        </ScrollView>
      ) : null}

      {media.length > 1 ? (
        <>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: spacing.sm,
              right: spacing.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical: 2,
              borderRadius: radii.pill,
              backgroundColor: theme.alpha(colors.surfaceInverse, 0.6),
            }}
          >
            <Text variant="overline" color={colors.textInverse}>
              {t('feed.mediaPosition', { current: page + 1, total: media.length })}
            </Text>
          </View>

          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: spacing.md,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: spacing.xs + 2,
            }}
          >
            {media.map((item, index) => (
              <View
                key={`dot-${item.url}-${index}`}
                style={{
                  width: index === page ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    index === page
                      ? colors.textInverse
                      : theme.alpha(colors.textInverse, 0.45),
                }}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

interface ItemProps {
  item: PostMedia;
  width: number;
  height: number;
  isActive: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onPress?: () => void;
}

function MediaItem({
  item,
  width,
  height,
  isActive,
  muted,
  onToggleMute,
  onPress,
}: ItemProps) {
  const t = useT();

  if (item.type === 'video') {
    return (
      <VideoItem
        item={item}
        width={width}
        height={height}
        isActive={isActive}
        muted={muted}
        onToggleMute={onToggleMute}
        onPress={onPress}
      />
    );
  }

  const image = (
    <Image
      source={{ uri: item.url }}
      style={{ width, height }}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  );

  if (!onPress) return <View style={{ width, height }}>{image}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="imagebutton"
      accessibilityLabel={t('feed.openPost')}
      style={{ width, height }}
    >
      {image}
    </Pressable>
  );
}

function VideoItem({ item, width, height, isActive, muted, onToggleMute, onPress }: ItemProps) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const [ready, setReady] = useState(false);

  const player = useVideoPlayer(item.url, (p) => {
    p.loop = true;
    p.muted = true;
  });

  // Guard every player call: the native player can be released underneath us
  // when a row is recycled, and a throw here would take the whole list down.
  const safely = useRef((fn: () => void) => {
    try {
      fn();
    } catch {
      /* the player went away — nothing to do */
    }
  }).current;

  useEffect(() => {
    safely(() => {
      player.muted = muted;
    });
  }, [muted, player, safely]);

  useEffect(() => {
    safely(() => {
      if (isActive) player.play();
      else player.pause();
    });
    return () => safely(() => player.pause());
  }, [isActive, player, safely]);

  useEffect(() => {
    // Safety net: if the first-frame callback never arrives we still need to
    // stop covering the video with its poster.
    const timer = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ width, height }}>
      {item.thumbnail && !ready ? (
        <Image
          source={{ uri: item.thumbnail }}
          style={{ position: 'absolute', width, height }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}

      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        onFirstFrameRender={() => setReady(true)}
        accessibilityLabel={t('feed.videoClip')}
      />

      {!isActive ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radii.pill,
              backgroundColor: theme.alpha(colors.surfaceInverse, 0.55),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Play size={24} color={colors.textInverse} fill={colors.textInverse} />
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={onToggleMute}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={muted ? t('feed.soundOn') : t('feed.soundOff')}
        style={{
          position: 'absolute',
          bottom: spacing.md,
          right: spacing.md,
          width: 36,
          height: 36,
          borderRadius: radii.pill,
          backgroundColor: theme.alpha(colors.surfaceInverse, 0.55),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {muted ? (
          <VolumeX size={18} color={colors.textInverse} />
        ) : (
          <Volume2 size={18} color={colors.textInverse} />
        )}
      </Pressable>

      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t('feed.openPost')}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 48,
          }}
        />
      ) : null}
    </View>
  );
}
