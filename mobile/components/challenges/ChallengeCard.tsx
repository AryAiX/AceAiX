import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, Clock, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, Tappable, Text } from '@/components/ui';
import { deadlineLabel } from '@/lib/format';
import { useT } from '@/i18n';
import type { Challenge } from '@/types/models';

/**
 * One challenge, as a card.
 *
 * The two facts a fourteen-year-old decides on are what to film and how long
 * they have, so those are the two largest things here. The entry count sits
 * third — it is social proof, not pressure, so it never says "hurry".
 */
export function ChallengeCard({
  challenge,
  onPress,
}: {
  challenge: Challenge;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();

  const closing = deadlineLabel(challenge.closes_at);
  const entered = !!challenge.my_entry_id;

  const ages =
    challenge.age_min != null && challenge.age_max != null
      ? t('challenges.ageRange', { min: challenge.age_min, max: challenge.age_max })
      : challenge.age_min != null
        ? t('challenges.ageMin', { min: challenge.age_min })
        : challenge.age_max != null
          ? t('challenges.ageMax', { max: challenge.age_max })
          : null;

  return (
    <Tappable onPress={onPress} accessibilityLabel={challenge.title}>
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {/* A quiet wash rather than a photograph: every challenge would
            otherwise need artwork nobody has time to make. */}
        <LinearGradient
          colors={[theme.alpha(colors.primary, 0.22), 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 96 }}
          pointerEvents="none"
        />

        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            {challenge.metric_label ? (
              <Badge label={challenge.metric_label} tone="primary" />
            ) : (
              <Badge label={t('challenges.measuredNo')} tone="neutral" />
            )}
            {entered ? <Badge label={t('challenges.tabEntered')} tone="success" /> : null}
            {challenge.status === 'judging' ? (
              <Badge label={t('challenges.judging')} tone="warning" />
            ) : null}
          </View>

          <Text variant="subheading" numberOfLines={2}>
            {challenge.title}
          </Text>

          <Text variant="body" tone="secondary" numberOfLines={2}>
            {challenge.brief}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: spacing.md,
              marginTop: spacing.xs,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color={colors.textMuted} />
              <Text variant="caption" tone="muted">
                {challenge.status === 'closed' || !closing
                  ? t('challenges.closed')
                  : closing}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Users size={14} color={colors.textMuted} />
              <Text variant="caption" tone="muted">
                {t('challenges.entries', { count: challenge.entry_count })}
              </Text>
            </View>

            {ages ? (
              <Text variant="caption" tone="muted">
                {ages}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: spacing.xs,
              paddingTop: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.divider,
            }}
          >
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
              {t('challenges.setBy', {
                name: challenge.org_name ?? challenge.setter_name ?? '',
              })}
            </Text>
            {challenge.setter_verified ? (
              <BadgeCheck size={14} color={colors.info} fill={theme.alpha(colors.info, 0.16)} />
            ) : null}
          </View>
        </View>
      </Card>
    </Tappable>
  );
}
