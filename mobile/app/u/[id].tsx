import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EyeOff, ShieldBan, UserX } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, ErrorState, Header, Screen, SkeletonList, useToast } from '@/components/ui';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ScoreCard } from '@/components/profile/ScoreCard';
import { SupportsRow } from '@/components/profile/SupportsRow';
import { StatRow } from '@/components/profile/StatRow';
import { ProfileTabs, ProfileTab } from '@/components/profile/ProfileTabs';
import { PostsTab } from '@/components/profile/PostsTab';
import { HighlightsTab } from '@/components/profile/HighlightsTab';
import { CareerTab } from '@/components/profile/CareerTab';
import { useAsync } from '@/hooks/useAsync';
import { getProfile, unblockUser } from '@/lib/api';
import { didIBlock } from '@/lib/api.profile';
import { compactNumber, displayName } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { useT } from '@/i18n';

/** A route param is only usable when it is a single, plausible user id. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Someone else's profile — what a profile tap opens.
 *
 * Every path out of `get_profile_bundle` is handled here: a normal bundle, a
 * blocked pair, a suspended account, a bad id, and a failed call. This screen
 * must never render blank.
 */
export default function PublicProfileScreen() {
  const theme = useTheme();
  const { spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const userId = typeof raw === 'string' && UUID.test(raw) ? raw : null;

  const [tab, setTab] = useState<ProfileTab>('posts');
  const [childKey, setChildKey] = useState(0);
  const [unblocking, setUnblocking] = useState(false);

  const bundle = useAsync(() => getProfile(userId as string), [userId], {
    enabled: !!userId,
  });

  const iBlocked = useAsync(
    () => didIBlock(userId as string),
    [userId, bundle.data?.blocked],
    { enabled: !!userId && bundle.data?.blocked === true },
  );

  const reloadAll = useCallback(() => {
    bundle.refresh();
    setChildKey((key) => key + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle.refresh]);

  const onUnblock = useCallback(async () => {
    if (!userId) return;
    setUnblocking(true);
    try {
      await unblockUser(userId);
      toast.success(t('profile.unblockedToast'));
      bundle.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUnblocking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, t, toast, bundle.reload]);

  if (!userId) {
    return (
      <Screen header={<Header back title={t('profile.title')} />}>
        <EmptyState
          icon={<UserX size={26} color={theme.colors.textMuted} />}
          title={t('profile.notFoundTitle')}
          body={t('profile.notFoundBody')}
          actionLabel={t('profile.notFoundAction')}
          onAction={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        />
      </Screen>
    );
  }

  if (bundle.loading && !bundle.data) {
    return (
      <Screen header={<Header back title={t('profile.title')} />}>
        <SkeletonList count={3} />
      </Screen>
    );
  }

  if (bundle.error || !bundle.data) {
    return (
      <Screen header={<Header back title={t('profile.title')} />}>
        <ErrorState message={bundle.error} onRetry={bundle.reload} />
      </Screen>
    );
  }

  const data = bundle.data;
  const name = displayName(data.user?.full_name, t('profile.thisPerson'));

  if (data.blocked) {
    return (
      <Screen header={<Header back title={t('profile.title')} />}>
        <EmptyState
          icon={<ShieldBan size={26} color={theme.colors.textMuted} />}
          title={t('profile.blockedTitle')}
          body={
            iBlocked.data
              ? t('profile.blockedByYouBody', { name })
              : t('profile.blockedBody')
          }
        />
        {iBlocked.data ? (
          <View style={{ alignItems: 'center' }}>
            <Button
              label={t('common.unblock')}
              variant="secondary"
              loading={unblocking}
              onPress={onUnblock}
            />
          </View>
        ) : null}
      </Screen>
    );
  }

  if (data.suspended) {
    return (
      <Screen header={<Header back title={t('profile.title')} />}>
        <EmptyState
          icon={<EyeOff size={26} color={theme.colors.textMuted} />}
          title={t('profile.suspendedTitle')}
          body={t('profile.suspendedBody')}
        />
      </Screen>
    );
  }

  const athlete = data.athlete;
  const isSelf = data.viewer?.is_self === true;

  return (
    <Screen
      scroll
      padded={false}
      edges={['top']}
      onRefresh={reloadAll}
      refreshing={bundle.refreshing}
      header={<Header back title={name} />}
      testID="public-profile"
    >
      <ProfileHeader bundle={data} onChanged={reloadAll} />

      <View
        style={{
          paddingHorizontal: spacing.lg,
          marginTop: spacing.xl,
          gap: spacing.lg,
        }}
      >
        {athlete ? <ScoreCard score={data.score} /> : null}

        <SupportsRow userId={data.user.id} isSelf={false} sport={athlete?.sport} />

        <StatRow
          items={[
            {
              key: 'posts',
              label: t('common.posts'),
              value: compactNumber(data.stats?.posts ?? 0),
            },
            {
              key: 'media',
              label: t('common.clips'),
              value: compactNumber(data.stats?.media ?? 0),
            },
            {
              key: 'matches',
              label: t('common.matches'),
              value: compactNumber(data.stats?.matches ?? 0),
            },
            {
              key: 'endorsements',
              label: t('common.endorsed'),
              value: compactNumber(data.stats?.endorsements ?? 0),
            },
          ]}
        />

        {athlete ? <ProfileTabs value={tab} onChange={setTab} /> : null}

        {!athlete || tab === 'posts' ? (
          <PostsTab userId={data.user.id} isSelf={isSelf} refreshKey={childKey} />
        ) : tab === 'highlights' ? (
          <HighlightsTab athleteId={athlete.id} isSelf={isSelf} refreshKey={childKey} />
        ) : (
          <CareerTab
            athleteId={athlete.id}
            isSelf={isSelf}
            honors={athlete.honors ?? []}
            certifications={athlete.certifications ?? []}
            refreshKey={childKey}
          />
        )}
      </View>
    </Screen>
  );
}
