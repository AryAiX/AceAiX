import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Card, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { compactNumber, displayName, metaLine, roleLabel, truncate } from '@/lib/format';
import { useFollowCount, useRefreshFollowCountsOnFocus } from '@/lib/followCounts';
import { Routes } from '@/lib/routes';
import type { PersonResult } from '@/types/models';
import { FollowButton } from './FollowButton';

interface Props {
  person: PersonResult;
  following?: boolean;
  pending?: boolean;
  /** Omit to render the row without a follow action (search results). */
  onToggleFollow?: (person: PersonResult, nextFollowing: boolean) => void;
  /** Called just before the profile opens. */
  onOpen?: () => void;
  /** Draw as one row of a white list (see groupedRowStyle) instead of a card. */
  grouped?: ViewStyle;
  /** One line under the name instead of the usual two (search results). */
  subtitle?: string;
}

export function CoachRow({ person, following, pending, onToggleFollow, onOpen, grouped, subtitle }: Props) {
  const theme = useTheme();
  const t = useT();
  const { spacing } = theme;
  const router = useRouter();

  const name = displayName(person.full_name);
  /* The city is enough to place someone; the country made the line run out. */
  const place = person.city || person.country;
  const meta = metaLine(roleLabel(person.role), place);
  const followerCount = useFollowCount(person.id, 'followers', person.followers_count);
  useRefreshFollowCountsOnFocus(person.id);
  const followers = t('discover.followers', {
    count: followerCount,
    value: compactNumber(followerCount),
  });

  const openProfile = () => {
    onOpen?.();
    router.push(Routes.profile(person.id));
  };
  const a11yLabel = metaLine(
    name,
    person.is_verified ? t('common.verified') : null,
    subtitle ?? meta,
    followers,
  );

  const content = (
    <>
      <Avatar uri={person.avatar_url} name={name} size="md" verified={person.is_verified} />

      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="name" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {subtitle ?? (person.bio ? meta : metaLine(meta, followers))}
        </Text>
        {person.bio && !subtitle ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {truncate(person.bio, 60)}
          </Text>
        ) : null}
      </View>

      {onToggleFollow ? (
        <FollowButton
          following={!!following}
          pending={pending}
          solid={!!grouped}
          name={name}
          onPress={() => onToggleFollow(person, !following)}
        />
      ) : null}
    </>
  );

  if (grouped) {
    return (
      <Pressable
        onPress={openProfile}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint={t('discover.card.openProfile')}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            opacity: pressed ? 0.7 : 1,
          },
          grouped,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Card
      onPress={openProfile}
      padded="sm"
      accessibilityLabel={a11yLabel}
      accessibilityHint={t('discover.card.openProfile')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
    >
      {content}
    </Card>
  );
}
