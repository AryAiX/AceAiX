import React, { useState } from 'react';
import { View } from 'react-native';
import { Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, EmptyState, ErrorState, SkeletonList, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getSuggestedFollows, toggleFollow, type SuggestedFollow } from '@/lib/api';
import { sportLabel } from '@/constants/sports';
import { displayName, roleLabel } from '@/lib/format';
import { errorMessage } from '@/lib/errors';

/**
 * People an Audience account might follow, offered once during onboarding.
 * Following happens immediately; skipping the step leaves the list untouched.
 */
export function FollowStep() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const toast = useToast();
  const suggestions = useAsync(() => getSuggestedFollows(12), []);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const onFollow = async (person: SuggestedFollow) => {
    const currently = following[person.id] === true;
    setBusyId(person.id);
    setFollowing((current) => ({ ...current, [person.id]: !currently }));
    try {
      const result = await toggleFollow(person.id);
      setFollowing((current) => ({ ...current, [person.id]: result.following }));
    } catch (err) {
      setFollowing((current) => ({ ...current, [person.id]: currently }));
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const rows = suggestions.data ?? [];

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="title">{t('onboarding.followTitle')}</Text>
        <Text variant="body" tone="secondary">
          {t('onboarding.followBody')}
        </Text>
      </View>

      {suggestions.loading ? (
        <SkeletonList count={4} variant="row" />
      ) : suggestions.error ? (
        <ErrorState message={suggestions.error} onRetry={suggestions.reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Users size={26} color={colors.textMuted} />}
          title={t('onboarding.followEmpty')}
        />
      ) : (
        <View>
          {rows.map((person) => {
            const isFollowing = following[person.id] === true;
            const detail = person.sport?.trim()
              ? sportLabel(t, person.sport)
              : roleLabel(person.role);
            return (
              <View
                key={person.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  minHeight: 64,
                  paddingVertical: spacing.md,
                }}
              >
                <Avatar
                  uri={person.avatar_url}
                  name={person.full_name}
                  size="md"
                  verified={person.is_verified}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {displayName(person.full_name)}
                  </Text>
                  {detail ? (
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {detail}
                    </Text>
                  ) : null}
                </View>
                <Button
                  label={t(isFollowing ? 'common.following' : 'common.follow')}
                  variant={isFollowing ? 'secondary' : 'primary'}
                  size="sm"
                  hitSlop={8}
                  loading={busyId === person.id}
                  onPress={() => void onFollow(person)}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
