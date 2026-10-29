import React from 'react';
import { useRouter } from 'expo-router';

import { StatRow } from '@/components/profile/StatRow';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getCoachStats } from '@/lib/api.profile';
import { compactNumber } from '@/lib/format';
import { Routes } from '@/lib/routes';

/**
 * The three numbers on a coach profile.
 *
 * Posts behave as they do for every other role. Opportunities and challenges
 * are tappable only on your own profile: opportunities opens your postings,
 * challenges opens the Mine tab.
 */
export function CoachStats({
  userId,
  isSelf,
  posts,
  onPosts,
  refreshKey = 0,
}: {
  userId: string;
  isSelf: boolean;
  posts: number;
  onPosts?: () => void;
  refreshKey?: number;
}) {
  const t = useT();
  const router = useRouter();
  const stats = useAsync(() => getCoachStats(userId, isSelf), [userId, isSelf, refreshKey], {
    enabled: !!userId,
  });
  const counts = stats.data ?? {
    opportunities: 0,
    challenges: 0,
  };

  return (
    <StatRow
      items={[
        {
          key: 'posts',
          label: t('common.posts'),
          value: compactNumber(posts),
          onPress: onPosts,
        },
        {
          key: 'opportunities',
          label: t('opportunities.title'),
          value: compactNumber(counts.opportunities),
          onPress: isSelf
            ? () => router.push({ pathname: Routes.opportunities, params: { tab: 'postings' } })
            : undefined,
        },
        {
          key: 'challenges',
          label: t('challenges.title'),
          value: compactNumber(counts.challenges),
          onPress: isSelf
            ? () => router.push({ pathname: Routes.challenges, params: { tab: 'mine' } })
            : undefined,
        },
      ]}
    />
  );
}
