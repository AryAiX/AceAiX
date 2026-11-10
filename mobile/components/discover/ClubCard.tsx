import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { BadgeCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Card, Text } from '@/components/ui';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
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
  /** Called just before the club page opens. */
  onOpen?: () => void;
  /** Draw as one row of a white list (see groupedRowStyle) instead of a card. */
  grouped?: ViewStyle;
  /** Type, place and followers on one line under the name (search results). */
  oneLine?: boolean;
}

export function ClubCard({ organization, following, pending, onToggleFollow, onOpen, grouped, oneLine }: Props) {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const router = useRouter();

  /* Type, then the league or the city: the one line has to fit on a phone. */
  const meta = metaLine(
    t(TYPE_KEY[organization.type] ?? 'common.club'),
    organization.league || organization.city || organization.country,
  );
  const followers = t('discover.followers', {
    count: organization.followers_count,
    value: compactNumber(organization.followers_count),
  });

  const openClub = () => {
    onOpen?.();
    router.push(Routes.organization(organization.id));
  };
  const a11yLabel = metaLine(
    organization.name,
    organization.is_verified ? t('common.verified') : null,
    meta,
    followers,
  );
  const content = (
    <>
      <ClubLogo uri={organization.logo_url} name={organization.name} size="md" />

      <View style={{ flex: 1, gap: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text variant="name" numberOfLines={1} style={{ flexShrink: 1 }}>
            {organization.name}
          </Text>
          {organization.is_verified ? (
            <BadgeCheck size={15} color={colors.info} fill={colors.infoSoft} strokeWidth={2.2} />
          ) : null}
        </View>
        {oneLine ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {metaLine(meta, followers)}
          </Text>
        ) : (
          <>
            {meta ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {followers}
            </Text>
          </>
        )}
      </View>

      {onToggleFollow ? (
        <FollowButton
          following={!!following}
          pending={pending}
          solid={!!grouped}
          name={organization.name}
          onPress={() => onToggleFollow(organization, !following)}
        />
      ) : null}
    </>
  );

  if (grouped) {
    return (
      <Pressable
        onPress={openClub}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint={t('discover.club.openClub')}
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
      onPress={openClub}
      padded="sm"
      accessibilityLabel={a11yLabel}
      accessibilityHint={t('discover.club.openClub')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
    >
      {content}
    </Card>
  );
}
