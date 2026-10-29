import React, { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';

import { StatItem, StatRow } from '@/components/profile/StatRow';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getSponsorStats } from '@/lib/api.profile';
import { compactNumber } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { useUnread } from '@/providers/UnreadProvider';

/**
 * What `private.notify` writes for a sponsorship deal (1008/02).
 * Accept and decline are both `sponsorship_response`; the status is in the row.
 */
const SPONSORSHIP_NOTIFICATIONS = new Set([
  'sponsorship_offer',
  'sponsorship_application',
  'sponsorship_response',
]);

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
  const { subscribeNotifications } = useUnread();
  /*
   * Coming back to the profile refetches in the background. That mode keeps
   * the numbers on screen until the new counts arrive.
   */
  const stats = useAsync(() => getSponsorStats(userId, isSelf), [userId, isSelf, refreshKey], {
    enabled: !!userId,
    refetchOnFocus: true,
  });
  const reloadStats = useRef(stats.reload);
  reloadStats.current = stats.reload;

  useEffect(() => {
    if (!isSelf) return;
    return subscribeNotifications((payload) => {
      if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') return;
      const type = payload.new?.type;
      if (typeof type !== 'string' || !SPONSORSHIP_NOTIFICATIONS.has(type)) return;
      void reloadStats.current();
    });
  }, [isSelf, subscribeNotifications]);
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
