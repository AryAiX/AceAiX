import React, { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { Header, Screen } from '@/components/ui';
import { PeopleList } from '@/components/profile/PeopleList';
import { useAsync } from '@/hooks/useAsync';
import { getFollowers, getFollowing } from '@/lib/api';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';

export default function FollowersScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const t = useT();
  const { user } = useAuth();
  const myId = user?.id ?? null;

  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const userId = typeof raw === 'string' && raw.length > 0 ? raw : null;
  const isMe = !!userId && userId === myId;

  const followers = useAsync(() => getFollowers(userId as string), [userId], {
    enabled: !!userId,
  });

  /* My own following list drives the button state on every row. */
  const mine = useAsync(() => getFollowing(myId as string), [myId], { enabled: !!myId });

  const followingIds = useMemo(
    () => new Set((mine.data ?? []).map((person) => person.id)),
    [mine.data],
  );

  return (
    <Screen scroll={false} header={<Header back title={t('common.followers')} />}>
      <PeopleList
        people={followers.data}
        loading={followers.loading}
        error={followers.error}
        onRetry={followers.reload}
        followingIds={followingIds}
        myId={myId}
        emptyTitle={t('profile.followersEmptyTitle')}
        emptyBody={t(
          isMe ? 'profile.followersEmptyBodySelf' : 'profile.followersEmptyBodyOther',
        )}
      />
    </Screen>
  );
}
