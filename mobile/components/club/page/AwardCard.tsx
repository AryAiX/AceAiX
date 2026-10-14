import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Medal, Trophy } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Play } from '@/theme/tokens';
import { Card, Text } from '@/components/ui';
import { sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import type { ClubAward } from '@/lib/api.club';
import { clubLabel } from '@/lib/clubLabels';
import { metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';

/**
 * Medal metals. These are the colours of the objects themselves, the same in
 * light and dark, so they live here rather than in the semantic palette.
 */
const METAL: Partial<Record<ClubAward['placement'], string>> = {
  winner: Play.amber,
  runner_up: '#A7AFBE',
  third: '#C98345',
};

/** One trophy on the shelf: the metal says the placement before the words do. */
export function AwardCard({ award }: { award: ClubAward }) {
  const t = useT();
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();

  const metal = METAL[award.placement] ?? colors.primary;
  const Icon = award.placement === 'winner' ? Trophy : Medal;
  const meta = metaLine(
    award.competition,
    award.category ? clubLabel(t, 'category', award.category) : null,
    award.sport ? sportLabel(t, award.sport) : null,
  );
  const recipientId = award.recipient_user_id;

  return (
    <Card level={1} style={{ flexDirection: 'row', gap: spacing.md }} testID={`club-award-${award.id}`}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radii.md,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 2,
          borderColor: metal,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {award.image_url ? (
          <Image
            source={{ uri: award.image_url }}
            resizeMode="cover"
            style={{ width: '100%', height: '100%' }}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Icon size={26} color={metal} strokeWidth={2.2} />
        )}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="overline" color={metal}>
          {clubLabel(t, 'placement', award.placement)}
        </Text>
        <Text variant="bodyStrong" numberOfLines={2}>
          {award.title}
        </Text>
        {meta ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
        {award.recipient_kind !== 'club' && award.recipient_name ? (
          recipientId ? (
            <Pressable
              onPress={() => router.push(Routes.profile(recipientId))}
              accessibilityRole="link"
              hitSlop={10}
              style={{ alignSelf: 'flex-start' }}
            >
              <Text variant="captionStrong" tone="primary">
                {award.recipient_name}
              </Text>
            </Pressable>
          ) : (
            <Text variant="captionStrong" tone="secondary">
              {award.recipient_name}
            </Text>
          )
        ) : null}
        {award.description ? (
          <Text variant="caption" tone="secondary" numberOfLines={3}>
            {award.description}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
