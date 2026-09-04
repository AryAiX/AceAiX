import React, { useState } from 'react';
import { ActivityIndicator, Image, LayoutChangeEvent, Pressable, View } from 'react-native';
import { ImageOff, Play, Plus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
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

  const addText = addLabel ?? t('profile.addHighlight');

  const gap = spacing.sm;
  const size = width > 0 ? (width - gap * (columns - 1)) / columns : 0;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

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

      {tiles.map((tile) => (
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
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {tile.uri ? (
            <Image
              source={{ uri: tile.uri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
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
              {tile.caption ? (
                <Text variant="caption" tone="muted" align="center" numberOfLines={3}>
                  {tile.caption}
                </Text>
              ) : null}
            </View>
          )}

          {tile.isVideo ? (
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
      ))}
    </View>
  );
}
