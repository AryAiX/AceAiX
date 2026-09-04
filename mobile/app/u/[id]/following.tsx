import React, { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { Header, Screen } from '@/components/ui';
import { PeopleList } from '@/components/profile/PeopleList';
import { useAsync } from '@/hooks/useAsync';
import { getFollowing } from '@/lib/api';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';

export default function FollowingScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const t = useT();
  const { user } = useAuth();
  const myId = user?.id ?? null;

  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const userId = typeof raw === 'string' && raw.length > 0 ? raw : null;
  const isMe = !!userId && userId === myId;

  const following = useAsync(() => getFollowing(userId as string), [userId], {
    enabled: !!userId,
  });

  /* On my own list every row is someone I follow; otherwise ask for my own. */
  const mine = useAsync(() => getFollowing(myId as string), [myId], {
    enabled: !!myId && !isMe,
  });

  const followingIds = useMemo(() => {
    const source = isMe ? following.data : mine.data;
    return new Set((source ?? []).map((person) => person.id));
  }, [isMe, following.data, mine.data]);

  return (
    <Screen scroll={false} header={<Header back title={t('common.followingCount')} />}>
      <PeopleList
        people={following.data}
        loading={following.loading}
        error={following.error}
        onRetry={following.reload}
        followingIds={followingIds}
        myId={myId}
        emptyTitle={t(
          isMe ? 'profile.followingEmptyTitleSelf' : 'profile.followingEmptyTitleOther',
        )}
        emptyBody={t(
          isMe ? 'profile.followingEmptyBodySelf' : 'profile.followingEmptyBodyOther',
        )}
      />
    </Screen>
  );
}
