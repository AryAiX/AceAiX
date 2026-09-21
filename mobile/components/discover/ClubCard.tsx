import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { BadgeCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Card, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { compactNumber, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import type { Organization } from '@/types/models';
import { FollowButton } from './FollowButton';

/* The type is stored in English; only the label is translated. "Club" and
   "Federation" are shared vocabulary — an academy is only ever an org type. */
const TYPE_KEY: Record<Organization['type'], string> = {
  club: 'common.club',
  academy: 'discover.club.typeAcademy',
  federation: 'common.federation',
};

interface Props {
  organization: Organization;
  following?: boolean;
  pending?: boolean;
  /** Omit to render the row without a follow action (search results). */
  onToggleFollow?: (organization: Organization, nextFollowing: boolean) => void;
}

export function ClubCard({ organization, following, pending, onToggleFollow }: Props) {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const router = useRouter();

  const place = [organization.city, organization.country].filter(Boolean).join(', ');
  const meta = metaLine(
    t(TYPE_KEY[organization.type] ?? 'common.club'),
    organization.league,
    place,
  );
  const followers = t('discover.followers', {
    count: organization.followers_count,
    value: compactNumber(organization.followers_count),
  });

  return (
    <Card
      onPress={() => router.push(Routes.organization(organization.id))}
      padded="sm"
      accessibilityLabel={metaLine(
        organization.name,
        organization.is_verified ? t('common.verified') : null,
        meta,
        followers,
      )}
      accessibilityHint={t('discover.club.openClub')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
    >
      <Avatar uri={organization.logo_url} name={organization.name} size="md" />

      <View style={{ flex: 1, gap: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {organization.name}
          </Text>
          {organization.is_verified ? (
            <BadgeCheck size={15} color={colors.info} fill={colors.infoSoft} strokeWidth={2.2} />
          ) : null}
        </View>
        {meta ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {followers}
        </Text>
      </View>

      {onToggleFollow ? (
        <FollowButton
          following={!!following}
          pending={pending}
          name={organization.name}
          onPress={() => onToggleFollow(organization, !following)}
        />
      ) : null}
    </Card>
  );
}
