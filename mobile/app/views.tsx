import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { BadgeCheck, Eye, Info } from 'lucide-react-native';

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
  SegmentedControl,
  Sheet,
  SkeletonList,
  Text,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { markProfileViewsSeen, profileViewDigest } from '@/lib/api';
import { Routes } from '@/lib/routes';
import { displayName, relativeTime, roleLabel } from '@/lib/format';
import { useT } from '@/i18n';
import type { ViewDigest } from '@/types/models';

/**
 * Who has been looking.
 *
 * Named rows are verified coaches, scouts and clubs. Everyone else is a number
 * at the bottom, and the screen says so in a line the reader can open — because
 * a list that looks complete and is not is worse than no list.
 */
export default function ProfileViewsScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();

  const [days, setDays] = useState<7 | 30>(7);
  const [why, setWhy] = useState(false);

  const { data, loading, error, refreshing, refresh, reload } = useAsync<ViewDigest>(
    () => profileViewDigest(days),
    [days],
  );

  /* Opening the screen is what "seen" means. It runs once per mount rather
     than per range change, so flipping to 30 days does not re-mark anything. */
  useEffect(() => {
    markProfileViewsSeen().catch(() => {});
  }, []);

  return (
    <Screen
      header={<Header title={t('views.title')} back bordered />}
      onRefresh={refresh}
      refreshing={refreshing}
      testID="views-screen"
    >
      <View style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
        <SegmentedControl
          options={[
            { value: '7' as const, label: t('views.rangeWeek') },
            { value: '30' as const, label: t('views.rangeMonth') },
          ]}
          value={String(days) as '7' | '30'}
          onChange={(v) => setDays(Number(v) as 7 | 30)}
        />

        {loading && !data ? (
          <SkeletonList count={4} variant="row" />
        ) : error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data?.is_athlete ? (
          <EmptyState
            icon={<Eye size={26} color={colors.textMuted} />}
            title={t('views.emptyTitle')}
            body={t('views.emptyBody')}
          />
        ) : (
          <>
            <Card padded tone="primarySoft">
              <Text variant="display" tone="primary">
                {data.total}
              </Text>
              <Text variant="body" tone="secondary">
                {t('views.subtitle', { days: data.days })}
              </Text>
              {data.professional > 0 ? (
                <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
                  {t('views.homeProfessional', { count: data.professional })}
                  {data.clubs > 0 ? ` · ${t('views.homeClubs', { count: data.clubs })}` : ''}
                </Text>
              ) : null}
            </Card>

            {data.named.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                <SectionHeader title={t('views.namedTitle')} />
                <Card padded={false}>
                  {data.named.map((viewer) => (
                    <ListItem
                      key={viewer.user_id}
                      title={displayName(viewer.full_name)}
                      subtitle={[
                        viewer.organization ?? roleLabel(viewer.role),
                        t('views.viewedAgo', { when: relativeTime(viewer.last_viewed_at) }),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      left={
                        <Avatar uri={viewer.avatar_url} name={viewer.full_name} size="sm" />
                      }
                      right={
                        viewer.views > 1 ? (
                          <Badge
                            label={t('views.viewsCount', { count: viewer.views })}
                            tone="neutral"
                          />
                        ) : (
                          <BadgeCheck size={16} color={colors.info} />
                        )
                      }
                      onPress={() => router.push(Routes.profile(viewer.user_id))}
                    />
                  ))}
                </Card>
                <Text variant="caption" tone="muted">
                  {t('views.namedBody')}
                </Text>
              </View>
            ) : null}

            {data.unnamed > 0 ? (
              <Card padded tone="alt">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Info size={18} color={colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">
                      {t('views.unnamedTitle', { count: data.unnamed })}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {t('views.unnamedBody')}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : null}

            {data.total === 0 ? (
              <EmptyState
                icon={<Eye size={26} color={colors.textMuted} />}
                title={t('views.emptyTitle')}
                body={t('views.homeEmptyBody')}
              />
            ) : null}

            <ListItem title={t('views.whyTitle')} onPress={() => setWhy(true)} showChevron />
          </>
        )}
      </View>

      <Sheet visible={why} onClose={() => setWhy(false)} title={t('views.whyTitle')}>
        <Text variant="body" tone="secondary">
          {t('views.whyBody')}
        </Text>
      </Sheet>
    </Screen>
  );
}
