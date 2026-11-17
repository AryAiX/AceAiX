import React from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { RemoteImage, Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { Playbook } from '@/lib/playbooks';
import { PlaybookEmoji } from './PlaybookSheet';

export const COVER = 118;

/** A playbook as a tile: a 2×2 mosaic of what is in it, its emoji, name and count. */
export function PlaybookCover({ playbook, onPress }: { playbook: Playbook; onPress: () => void }) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const cells = Array.from({ length: 4 }, (_, i) => playbook.items[i] ?? null);
  const half = (COVER - 2) / 2;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${playbook.name}, ${t('feed.playbooks.count', { count: playbook.items.length })}`}
      style={({ pressed }) => ({ width: COVER, opacity: pressed ? 0.8 : 1 })}
      testID={`playbook-${playbook.id}`}
    >
      <View
        style={{
          width: COVER,
          height: COVER,
          borderRadius: radii.xl,
          backgroundColor: colors.surface,
          shadowColor: '#28206E',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: theme.scheme === 'dark' ? 0.4 : 0.12,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: radii.xl,
            overflow: 'hidden',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 2,
            backgroundColor: colors.surface,
          }}
        >
          {cells.map((item, i) =>
            item?.thumb ? (
              <RemoteImage key={i} uri={item.thumb} style={{ width: half, height: half }} />
            ) : (
              <LinearGradient
                key={i}
                colors={
                  item
                    ? theme.huePair(item.id)
                    : ([theme.alpha(colors.primary, 0.1), theme.alpha(colors.accent, 0.12)] as const)
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: half, height: half }}
              />
            ),
          )}
        </View>
        <View
          style={{
            position: 'absolute',
            left: spacing.sm,
            top: spacing.sm,
            width: 30,
            height: 30,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.92)',
          }}
        >
          <PlaybookEmoji emoji={playbook.emoji} size={17} />
        </View>
      </View>
      <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: spacing.sm, fontSize: 14 }}>
        {playbook.name}
      </Text>
      <Text variant="caption" tone="muted" style={{ fontSize: 11.5 }}>
        {t('feed.playbooks.count', { count: playbook.items.length })}
      </Text>
    </Pressable>
  );
}

/** The last tile in the row: make a new playbook. */
export function NewPlaybookTile({ onPress }: { onPress: () => void }) {
  const { colors, radii, spacing } = useTheme();
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('feed.playbooks.new')}
      style={({ pressed }) => ({ width: COVER, opacity: pressed ? 0.7 : 1 })}
      testID="playbook-new-tile"
    >
      <View
        style={{
          width: COVER,
          height: COVER,
          borderRadius: radii.xl,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: colors.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus size={28} color={colors.primary} />
      </View>
      <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: spacing.sm, fontSize: 14 }}>
        {t('feed.playbooks.new')}
      </Text>
    </Pressable>
  );
}
