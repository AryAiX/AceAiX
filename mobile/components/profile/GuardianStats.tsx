import React from 'react';
import { useRouter } from 'expo-router';

import { StatItem, StatRow } from '@/components/profile/StatRow';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getGuardianStats } from '@/lib/api.profile';
import { compactNumber } from '@/lib/format';
import { Routes } from '@/lib/routes';

/**
 * The numbers on a guardian profile.
 *
 * Posts behave as they do for every other role. Children is the number of
 * young people linked to this guardian, and it exists only on your own
 * profile: tapping it opens Parent and guardian settings. Someone else's
 * view of a guardian is posts alone — the count is never shown, and it is
 * never fetched.
 *
 * The row is the shared stat row. Its direction follows the layout, and the
 * labels are centered, so Arabic does not need a hand-built order. Item
 * order stays Posts then Children; reversing it would fight the RTL flip.
 */
export function GuardianStats({
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
  /*
   * Coming back to the profile refetches in the background. That mode keeps
   * the number on screen until the new count arrives. A stranger's profile
   * never enables the read.
   */
  const stats = useAsync(() => getGuardianStats(isSelf), [userId, isSelf, refreshKey], {
    enabled: isSelf && !!userId,
    refetchOnFocus: true,
  });
  const children = stats.data?.children ?? 0;

  const items: StatItem[] = [
    {
      key: 'posts',
      label: t('common.posts'),
      value: compactNumber(posts),
      onPress: onPosts,
    },
  ];

  if (isSelf) {
    items.push({
      key: 'children',
      label: t('common.children'),
      value: compactNumber(children),
      onPress: () => router.push(Routes.settingsGuardian),
    });
  }

  return <StatRow items={items} />;
}
