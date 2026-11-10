import React, { useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, Pressable, View } from 'react-native';
import { BadgeCheck, Eye, Heart, ImageOff, MessageCircle, Play, Plus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import { Avatar, RemoteImage, Text } from '@/components/ui';
import { useT } from '@/i18n';

export interface MediaTile {
  id: string;
  uri: string | null;
  isVideo?: boolean;
  /** Read out to screen readers and shown when there is no image. */
  caption?: string | null;
  /** Your own grid only: your Talent Score on the day this post went up. */
  score?: number | null;
  /** Scroll view only: when it went up ("3d", "12 Nov 2026"). */
  when?: string | null;
  /** Scroll view only: likes and comments, for posts. */
  likes?: number | null;
  comments?: number | null;
  /** Scroll view only: a clip's length in seconds. */
  durationSeconds?: number | null;
  /** Scroll view only: how many times a clip has been watched. */
  views?: number | null;
}

/** Whose clips these are: shown at the top of each scroll card, like Home. */
export interface MediaAuthor {
  name: string;
  avatar: string | null;
  verified?: boolean;
  score?: number | null;
  /** "Judo · Martial arts" */
  meta?: string | null;
}

export type MediaLayout = 'grid' | 'scroll';

function clipLength(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface Props {
  tiles: MediaTile[];
  onPressTile?: (id: string) => void;
  onLongPressTile?: (id: string) => void;
  /** Renders an "add" tile in the first cell. */
  onAdd?: () => void;
  addLabel?: string;
  adding?: boolean;
  columns?: number;
  /** "scroll": one big card per item, top to bottom, instead of the square grid. */
  layout?: MediaLayout;
  author?: MediaAuthor | null;
  /** A small label on each scroll card, e.g. "Best of". */
  badge?: string | null;
}

/* A video file is not a picture: shown as an image it draws nothing. */
const VIDEO_FILE = /\.(mp4|mov|m4v|webm|3gp)(\?|#|$)/i;

/* Dark in both themes: a video tile reads as "press play" anywhere. */
const VIDEO_TILE = '#1E1A36';

/** A square grid of clips or posts. Sized from its own width so it fits any device. */
export function MediaGrid({
  tiles,
  onPressTile,
  onLongPressTile,
  onAdd,
  addLabel,
  adding = false,
  columns = 3,
  layout = 'grid',
  author = null,
  badge = null,
}: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const [width, setWidth] = useState(0);
  /* Pictures that failed to load (missing file, dropped connection). */
  const [failed, setFailed] = useState<Record<string, true>>({});

  const addText = addLabel ?? t('profile.addHighlight');

  const scroll = layout === 'scroll';
  const gap = scroll ? spacing.md : spacing.sm;
  const size = width > 0 ? (width - gap * (columns - 1)) / columns : 0;
  /* In the scroll view each item is the full width, a little taller than wide. */
  /* Scroll cards are laid out like Home's post cards: a padded card with the
     title on top and the picture inset inside it. */
  const inset = spacing.md;
  const tileW = scroll ? Math.max(0, width - inset * 2) : size;
  const tileH = scroll ? Math.round(tileW * 1.15) : size;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  /* Text-only posts become quote tiles in a rotating colour: blue, orange,
     green, yellow, purple, then round again. Only text tiles move the
     rotation, so five text posts are always five different colours however
     many photos sit between them. Yellow tints from the bright sun but writes
     its mark in the darker onSun, so it reads. */
  const quoteColours = [
    { ink: colors.primary, tint: colors.primary },
    { ink: theme.play.flame, tint: theme.play.flame },
    { ink: colors.success, tint: colors.success },
    { ink: colors.onSun, tint: colors.sun },
    { ink: colors.accent, tint: colors.accent },
  ];
  let textCount = 0;

  return (
    <View onLayout={onLayout} style={{ flexDirection: scroll ? 'column' : 'row', flexWrap: scroll ? 'nowrap' : 'wrap', gap }}>
      {onAdd ? (
        <Pressable
          onPress={onAdd}
          disabled={adding}
          accessibilityRole="button"
          accessibilityLabel={addText}
          accessibilityState={{ busy: adding }}
          style={({ pressed }) => ({
            width: (scroll ? width : size) || undefined,
            height: (scroll ? 64 : size) || undefined,
            flexDirection: scroll ? 'row' : 'column',
            borderRadius: radii.md,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: colors.primaryBorder,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: spacing.sm,
            opacity: pressed || adding ? 0.7 : 1,
          })}
        >
          {adding ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Plus size={22} color={colors.primary} strokeWidth={2.4} />
              <Text variant="caption" tone="primary" align="center" numberOfLines={2}>
                {addText}
              </Text>
            </>
          )}
        </Pressable>
      ) : null}

      {tiles.map((tile) => {
        /* A picture we can actually draw: not a bare video file, not one that failed. */
        const picture =
          tile.uri && !failed[tile.id] && !(tile.isVideo && VIDEO_FILE.test(tile.uri)) ? tile.uri : null;
        const broken = !picture && !!tile.uri;
        /* No picture and no video: a text post, drawn as a quote. */
        const quote =
          !picture && !broken && !tile.isVideo && !!tile.caption
            ? quoteColours[textCount++ % quoteColours.length]
            : null;
        const videoTile = !picture && !!tile.isVideo;
        const media = (
        <Pressable
          key={scroll ? undefined : tile.id}
          onPress={onPressTile ? () => onPressTile(tile.id) : undefined}
          onLongPress={onLongPressTile ? () => onLongPressTile(tile.id) : undefined}
          disabled={!onPressTile && !onLongPressTile}
          accessibilityRole={onPressTile ? 'imagebutton' : 'image'}
          accessibilityLabel={
            tile.caption || t(tile.isVideo ? 'profile.videoClipA11y' : 'profile.photoA11y')
          }
          style={({ pressed }) => ({
            width: tileW || undefined,
            /* A text post in the scroll view is only as tall as its words. */
            height: scroll && quote ? undefined : tileH || undefined,
            minHeight: scroll && quote ? 140 : undefined,
            borderRadius: radii.md,
            overflow: 'hidden',
            backgroundColor: videoTile ? VIDEO_TILE : quote ? theme.alpha(quote.tint, 0.12) : colors.surfaceAlt,
            borderWidth: 1,
            borderColor: videoTile ? VIDEO_TILE : quote ? theme.alpha(quote.tint, 0.3) : colors.border,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {picture ? (
            <RemoteImage
              uri={picture}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              onError={() => setFailed((f) => ({ ...f, [tile.id]: true }))}
            />
          ) : videoTile ? (
            /* A video with no preview picture: a dark tile with play and the caption. */
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Play size={15} color="#FFFFFF" fill="#FFFFFF" />
              </View>
              {tile.caption ? (
                <Text
                  variant="captionStrong"
                  color="#FFFFFF"
                  numberOfLines={1}
                  style={{ position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: spacing.sm, fontSize: 11 }}
                >
                  {tile.caption}
                </Text>
              ) : null}
            </View>
          ) : quote ? (
            <View style={{ flex: 1, padding: spacing.md, justifyContent: 'space-between' }}>
              {/* A typed quote mark, not an icon: it can never go missing. */}
              <Text variant="title" color={quote.ink} style={{ fontSize: 34, lineHeight: 34 }} allowFontScaling={false}>
                “
              </Text>
              <Text variant="bodyStrong" color={colors.text} numberOfLines={scroll ? 8 : 4}>
                {tile.caption}
              </Text>
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                padding: spacing.sm,
                gap: 6,
              }}
            >
              <ImageOff size={18} color={colors.textMuted} />
              {broken ? (
                <Text variant="caption" tone="muted" align="center" numberOfLines={2} style={{ fontSize: 11 }}>
                  {t('profile.photoUnavailable')}
                </Text>
              ) : null}
            </View>
          )}

          {/* Your score when you posted it: on your own photo and video posts. */}
          {tile.score != null && tile.score > 0 && (picture || videoTile) ? (
            <View
              accessible
              accessibilityLabel={t('profile.scoreWhenPostedA11y', { score: tile.score })}
              style={{
                position: 'absolute',
                left: 6,
                ...(videoTile && !picture ? { top: 6 } : { bottom: 6 }),
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.94)',
              }}
              testID="tile-score"
            >
              <View
                style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: TierColors[tierForScore(tile.score)] }}
              />
              <Text variant="captionStrong" color="#161327" style={{ fontSize: 11 }}>
                {tile.score}
              </Text>
            </View>
          ) : null}

          {/* The small play badge, on a video that does have a preview picture. */}
          {tile.isVideo && picture ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: spacing.sm,
                right: spacing.sm,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: colors.overlay,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* The scrim is dark in both schemes, so the on-brand white reads. */}
              <Play size={12} color={colors.textOnBrand} fill={colors.textOnBrand} />
            </View>
          ) : null}
        </Pressable>
        );
        if (!scroll) return media;

        /* The scroll view: a card like Home's: title and date on top, the
           picture inset, then likes / comments or the clip length. */
        const hasDetails =
          tile.likes != null || tile.comments != null || tile.durationSeconds != null || tile.views != null;
        return (
          <View
            key={tile.id}
            style={{
              width: width || undefined,
              borderRadius: radii.lg,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              padding: inset,
              gap: spacing.sm,
              ...theme.elevation(1),
            }}
          >
            {author ? (
              /* The same top row as a post on Home: photo, name, sport and when. */
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Avatar uri={author.avatar} name={author.name} size="sm" score={author.score ?? undefined} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {author.name}
                    </Text>
                    {author.verified ? <BadgeCheck size={14} color={colors.primary} /> : null}
                  </View>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {[author.meta, tile.when].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {badge ? (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                      backgroundColor: theme.alpha(theme.play.flame, 0.14),
                    }}
                  >
                    <Text variant="captionStrong" color={theme.play.flame} style={{ fontSize: 11 }}>
                      {badge}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {tile.caption && !quote ? (
              <Text variant="body" numberOfLines={3}>
                {tile.caption}
              </Text>
            ) : null}
            {!author && tile.when ? (
              <Text variant="caption" tone="muted">
                {tile.when}
              </Text>
            ) : null}
            {media}
            {hasDetails ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingTop: 2 }}>
                {tile.likes != null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Heart size={18} color={colors.textSecondary} />
                    <Text variant="captionStrong" tone="secondary">
                      {tile.likes}
                    </Text>
                  </View>
                ) : null}
                {tile.comments != null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <MessageCircle size={18} color={colors.textSecondary} />
                    <Text variant="captionStrong" tone="secondary">
                      {tile.comments}
                    </Text>
                  </View>
                ) : null}
                {tile.views != null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Eye size={18} color={colors.textSecondary} />
                    <Text variant="captionStrong" tone="secondary">
                      {tile.views}
                    </Text>
                  </View>
                ) : null}
                {tile.durationSeconds != null && tile.durationSeconds > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Play size={15} color={colors.textSecondary} />
                    <Text variant="captionStrong" tone="secondary">
                      {clipLength(tile.durationSeconds)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
