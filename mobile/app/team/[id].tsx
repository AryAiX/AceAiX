import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Header,
  ListItem,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { fansOfTeam, teamDetail } from '@/lib/api';
import { Routes } from '@/lib/routes';
import { ageBandLabel, displayName, metaLine, roleLabel } from '@/lib/format';
import { useT } from '@/i18n';
import type { Team, TeamFan } from '@/types/models';

/**
 * A team's page: who else here supports them.
 *
 * This is the payoff for the sign-up question. Somebody who has just joined,
 * has no followers and no footage still has one thing in common with a few
 * hundred people, and this is the screen that shows it to them.
 *
 * The list runs through the same discovery gate as search, so a minor whose
 * guardian has not turned discovery on does not appear here either.
 */
export default function TeamScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const team = useAsync<Team | null>(() => teamDetail(id!), [id], { enabled: !!id });
  const fans = useAsync<TeamFan[]>(() => fansOfTeam(id!, 50, 0), [id], { enabled: !!id });

  const name = team.data?.name ?? '';

  return (
    <Screen
      padded={false}
      header={<Header title={name} back bordered />}
      onRefresh={() => {
        team.refresh();
        fans.refresh();
      }}
      refreshing={team.refreshing || fans.refreshing}
      testID="team-screen"
    >
      <View style={{ paddingBottom: spacing.xxl }}>
        <LinearGradient
          colors={[theme.alpha(colors.primary, 0.24), 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg }}
        >
          {team.loading && !team.data ? (
            <SkeletonList count={1} />
          ) : team.data ? (
            <View style={{ gap: spacing.xs }}>
              <Text variant="title">{team.data.name}</Text>
              <Text variant="body" tone="secondary">
                {metaLine(team.data.sport, team.data.country, team.data.city)}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
                <Badge
                  label={t('teams.followersCount', { count: team.data.followers ?? 0 })}
                  tone="primary"
                  icon={<Users size={12} color={colors.primary} />}
                />
              </View>
            </View>
          ) : (
            <ErrorState message={team.error} onRetry={team.reload} compact />
          )}
        </LinearGradient>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <SectionHeader title={t('teams.fansTitle')} />

          {fans.loading && !fans.data ? (
            <SkeletonList count={4} variant="row" />
          ) : fans.error && !fans.data ? (
            <ErrorState message={fans.error} onRetry={fans.reload} />
          ) : !fans.data?.length ? (
            <EmptyState
              icon={<Users size={26} color={colors.textMuted} />}
              title={t('teams.fansEmpty')}
            />
          ) : (
            <Card padded={false}>
              {fans.data.map((fan) => (
                <ListItem
                  key={fan.user_id}
                  title={displayName(fan.full_name)}
                  subtitle={metaLine(
                    fan.position ?? roleLabel(fan.role),
                    fan.sport,
                    fan.age != null ? String(fan.age) : ageBandLabel(fan.age_band),
                  )}
                  left={
                    <Avatar
                      uri={fan.avatar_url}
                      name={fan.full_name}
                      size="sm"
                      score={fan.talent_score ?? undefined}
                    />
                  }
                  right={
                    fan.is_verified ? <BadgeCheck size={16} color={colors.info} /> : undefined
                  }
                  onPress={() => router.push(Routes.profile(fan.user_id))}
                />
              ))}
            </Card>
          )}
        </View>
      </View>
    </Screen>
  );
}
