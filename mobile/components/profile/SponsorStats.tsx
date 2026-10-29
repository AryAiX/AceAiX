import React from 'react';
import { useRouter } from 'expo-router';

import { StatItem, StatRow } from '@/components/profile/StatRow';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getSponsorStats } from '@/lib/api.profile';
import { compactNumber } from '@/lib/format';
import { Routes } from '@/lib/routes';

/**
 * The numbers on a sponsor profile.
 *
 * Posts behave as they do for every other role. Calls and deals are tappable
 * only on your own profile, and both open the sponsorship portal. Someone
 * else's profile shows posts and open calls only — deals stay private.
 */
export function SponsorStats({
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
  const stats = useAsync(() => getSponsorStats(userId, isSelf), [userId, isSelf, refreshKey], {
    enabled: !!userId,
  });
  const counts = stats.data ?? {
    calls: 0,
    deals: 0,
  };
  const openPortal = () => router.push(Routes.sponsorship);

  const items: StatItem[] = [
    {
      key: 'posts',
      label: t('common.posts'),
      value: compactNumber(posts),
      onPress: onPosts,
    },
    {
      key: 'calls',
      label: t('sponsorship.calls'),
      value: compactNumber(counts.calls),
      onPress: isSelf ? openPortal : undefined,
    },
  ];

  if (isSelf) {
    items.push({
      key: 'deals',
      label: t('sponsorship.deals'),
      value: compactNumber(counts.deals),
      onPress: openPortal,
    });
  }

  return <StatRow items={items} />;
}
