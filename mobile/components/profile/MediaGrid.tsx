import React, { useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, Pressable, View } from 'react-native';
import { ImageOff, Play, Plus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { RemoteImage, Text } from '@/components/ui';
import { useT } from '@/i18n';

export interface MediaTile {
  id: string;
  uri: string | null;
  isVideo?: boolean;
  /** Read out to screen readers and shown when there is no image. */
  caption?: string | null;
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
}: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const [width, setWidth] = useState(0);
  /* Pictures that failed to load (missing file, dropped connection). */
  const [failed, setFailed] = useState<Record<string, true>>({});

  const addText = addLabel ?? t('profile.addHighlight');

  const gap = spacing.sm;
  const size = width > 0 ? (width - gap * (columns - 1)) / columns : 0;

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
    <View onLayout={onLayout} style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {onAdd ? (
        <Pressable
          onPress={onAdd}
          disabled={adding}
          accessibilityRole="button"
          accessibilityLabel={addText}
          accessibilityState={{ busy: adding }}
          style={({ pressed }) => ({
            width: size || undefined,
            height: size || undefined,
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
        return (
        <Pressable
          key={tile.id}
          onPress={onPressTile ? () => onPressTile(tile.id) : undefined}
          onLongPress={onLongPressTile ? () => onLongPressTile(tile.id) : undefined}
          disabled={!onPressTile && !onLongPressTile}
          accessibilityRole={onPressTile ? 'imagebutton' : 'image'}
          accessibilityLabel={
            tile.caption || t(tile.isVideo ? 'profile.videoClipA11y' : 'profile.photoA11y')
          }
          style={({ pressed }) => ({
            width: size || undefined,
            height: size || undefined,
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
              <Text variant="bodyStrong" color={colors.text} numberOfLines={4}>
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
      })}
    </View>
  );
}
