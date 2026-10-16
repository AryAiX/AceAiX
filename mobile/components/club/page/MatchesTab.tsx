import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Swords } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, Reveal, SectionHeader, SkeletonList } from '@/components/ui';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { getClubMatches, type ClubMatch } from '@/lib/api.club';
import { Routes } from '@/lib/routes';
import { MatchCard } from './MatchCard';
import { TabAction, type ClubTabProps } from './shared';

export function ClubMatchesTab({ orgId, canPost, refreshKey, clubName }: ClubTabProps & { clubName: string }) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const matches = useAsync(() => getClubMatches(orgId), [orgId, refreshKey]);

  const add = canPost ? (
    <TabAction
      label={t('club.matches.add')}
      onPress={() => router.push(Routes.clubMatchEdit(orgId))}
      testID="club-add-match"
    />
  ) : null;

  if (matches.loading) return <SkeletonList count={2} />;
  if (matches.error) return <ErrorState message={matches.error} onRetry={matches.reload} compact />;

  const data = matches.data ?? { live: [], upcoming: [], results: [] };
  const sections: { key: string; title: string; rows: ClubMatch[] }[] = [
    { key: 'live', title: t('club.matches.live'), rows: data.live ?? [] },
    { key: 'upcoming', title: t('club.matches.upcoming'), rows: data.upcoming ?? [] },
    { key: 'results', title: t('club.matches.results'), rows: data.results ?? [] },
  ].filter((s) => s.rows.length > 0);

  if (sections.length === 0) {
    return (
      <View style={{ gap: spacing.md }}>
        {add}
        <EmptyState
          compact
          icon={<Swords size={26} color={colors.textMuted} />}
          title={t('club.matches.emptyTitle')}
          body={t('club.matches.emptyBody')}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {add}
      {sections.map((section) => (
        <View key={section.key}>
          <SectionHeader title={section.title} />
          <View style={{ gap: spacing.md }}>
            {section.rows.map((m, i) => (
              <Reveal key={m.id} index={i}>
                <MatchCard match={m} clubName={clubName} />
              </Reveal>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
