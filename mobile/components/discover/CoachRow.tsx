import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Card, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { compactNumber, displayName, metaLine, roleLabel, truncate } from '@/lib/format';
import { Routes } from '@/lib/routes';
import type { PersonResult } from '@/types/models';
import { FollowButton } from './FollowButton';

interface Props {
  person: PersonResult;
  following?: boolean;
  pending?: boolean;
  /** Omit to render the row without a follow action (search results). */
  onToggleFollow?: (person: PersonResult, nextFollowing: boolean) => void;
}

export function CoachRow({ person, following, pending, onToggleFollow }: Props) {
  const theme = useTheme();
  const t = useT();
  const { spacing } = theme;
  const router = useRouter();

  const name = displayName(person.full_name);
  const place = [person.city, person.country].filter(Boolean).join(', ');
  const meta = metaLine(roleLabel(person.role), place);
  const followers = t('discover.followers', {
    count: person.followers_count,
    value: compactNumber(person.followers_count),
  });

  return (
    <Card
      onPress={() => router.push(Routes.profile(person.id))}
      padded="sm"
      accessibilityLabel={metaLine(
        name,
        person.is_verified ? t('common.verified') : null,
        meta,
        followers,
      )}
      accessibilityHint={t('discover.card.openProfile')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
    >
      <Avatar uri={person.avatar_url} name={name} size="md" verified={person.is_verified} />

      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {metaLine(meta, followers)}
        </Text>
        {person.bio ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {truncate(person.bio, 60)}
          </Text>
        ) : null}
      </View>

      {onToggleFollow ? (
        <FollowButton
          following={!!following}
          pending={pending}
          name={name}
          onPress={() => onToggleFollow(person, !following)}
        />
      ) : null}
    </Card>
  );
}
