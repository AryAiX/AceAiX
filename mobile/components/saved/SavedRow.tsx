import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, RemoteImage, Text } from '@/components/ui';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { Tag } from '@/components/opportunities/Tag';
import { DaysLeftTag } from '@/components/opportunities/DeadlineChip';
import { useT } from '@/i18n';
import type { PlaybookItem } from '@/lib/playbooks';

interface Props {
  kind: PlaybookItem['kind'];
  /** Used for the picture's fallback colour. */
  seed: string;
  title: string;
  line?: string | null;
  thumb?: string | null;
  /** Under the line: "Post · saved 2d ago", or the trial's tags. */
  meta?: string | null;
  tags?: { type?: string | null; sport?: string | null; deadline?: string | null };
  /** The trailing action: unsave (filled bookmark) or take out of a playbook (×). */
  action: 'unsave' | 'remove';
  onPress: () => void;
  onAction: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
}

/**
 * One saved thing as a compact row: its picture, who or what, one line of
 * text, and a single action on the right. Posts, trials and sponsor calls share it, so the
 * Saved list and a playbook read the same way.
 */
export function SavedRow({
  kind,
  seed,
  title,
  line,
  thumb,
  meta,
  tags,
  action,
  onPress,
  onAction,
  onLongPress,
  style,
}: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();

  const picture =
    kind === 'trial' ? (
      <ClubLogo uri={thumb ?? null} name={title} size="md" />
    ) : kind === 'call' ? (
      <Avatar uri={thumb ?? null} name={title} size="lg" />
    ) : thumb ? (
      <RemoteImage uri={thumb} style={{ width: 52, height: 52, borderRadius: radii.lg }} />
    ) : (
      /* A text post: its colour, with a quote mark, like the profile grid. */
      <LinearGradient
        colors={theme.huePair(seed)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 52, height: 52, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text variant="title" color="#FFFFFF" style={{ fontSize: 26, lineHeight: 30 }}>
          “
        </Text>
      </LinearGradient>
    );

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={[title, line].filter(Boolean).join(', ')}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {picture}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {line ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {line}
          </Text>
        ) : null}
        {tags ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {tags.type ? <Tag label={tags.type} tone="warm" /> : null}
            {tags.sport ? <Tag label={tags.sport} /> : null}
            {tags.deadline ? <DaysLeftTag deadline={tags.deadline} /> : null}
          </View>
        ) : meta ? (
          <Text variant="caption" tone="muted" numberOfLines={1} style={{ fontSize: 11.5 }}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onAction}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={action === 'unsave' ? t('feed.removeFromSaved') : t('feed.playbooks.removeFrom')}
        style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.5 : 1 })}
      >
        {action === 'unsave' ? (
          <Bookmark size={21} color={colors.primary} fill={colors.primary} />
        ) : (
          <X size={20} color={colors.textMuted} />
        )}
      </Pressable>
    </Pressable>
  );
}
