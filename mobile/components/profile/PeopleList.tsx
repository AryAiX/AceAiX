import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  Input,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { toggleFollow } from '@/lib/api';
import { Routes } from '@/lib/routes';
import { displayName, metaLine, roleLabel } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { useT } from '@/i18n';
import type { UserSummary } from '@/types/models';

interface Props {
  people: UserSummary[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** Ids the signed-in person already follows, for the row buttons. */
  followingIds: Set<string>;
  myId: string | null;
  emptyTitle: string;
  emptyBody: string;
}

/** A fast list of people: avatar, name, one line of context, follow button. */
export function PeopleList({
  people,
  loading,
  error,
  onRetry,
  followingIds,
  myId,
  emptyTitle,
  emptyBody,
}: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();

  const [query, setQuery] = useState('');
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo(() => people ?? [], [people]);
  const showSearch = rows.length > 20;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((person) =>
      [person.full_name, person.city, person.country]
        .filter(Boolean)
        .some((value) => (value as string).toLowerCase().includes(term)),
    );
  }, [query, rows]);

  const onFollow = useCallback(
    async (person: UserSummary, currentlyFollowing: boolean) => {
      setBusyId(person.id);
      setOverrides((current) => ({ ...current, [person.id]: !currentlyFollowing }));
      try {
        const result = await toggleFollow(person.id);
        setOverrides((current) => ({ ...current, [person.id]: result.following }));
      } catch (err) {
        setOverrides((current) => ({ ...current, [person.id]: currentlyFollowing }));
        toast.error(errorMessage(err));
      } finally {
        setBusyId(null);
      }
    },
    [toast],
  );

  if (loading) return <SkeletonList count={4} variant="row" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Users size={26} color={colors.textMuted} />}
        title={emptyTitle}
        body={emptyBody}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {showSearch ? (
        <Input
          placeholder={t('profile.searchThisList')}
          value={query}
          onChangeText={setQuery}
          icon={<Search size={18} color={colors.textMuted} />}
          autoCorrect={false}
          containerStyle={{ marginBottom: spacing.md }}
          accessibilityLabel={t('profile.searchThisList')}
        />
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.giant }}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: colors.divider }} />
        )}
        ListEmptyComponent={
          <EmptyState
            compact
            title={t('profile.noMatchTitle')}
            body={t('profile.noMatchBody')}
          />
        }
        renderItem={({ item }) => {
          const isMe = item.id === myId;
          const isFollowing = overrides[item.id] ?? followingIds.has(item.id);
          const meta = metaLine(roleLabel(item.role), item.city, item.country);

          return (
            <Pressable
              onPress={() => router.push(Routes.profile(item.id))}
              accessibilityRole="button"
              accessibilityLabel={t('profile.openProfileA11y', {
                name: displayName(item.full_name),
              })}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: 64,
                paddingVertical: spacing.md,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Avatar
                uri={item.avatar_url}
                name={item.full_name}
                size="md"
                verified={item.is_verified}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {displayName(item.full_name)}
                </Text>
                {meta ? (
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {meta}
                  </Text>
                ) : null}
              </View>

              {isMe ? null : (
                <Button
                  label={t(isFollowing ? 'common.following' : 'common.follow')}
                  variant={isFollowing ? 'secondary' : 'primary'}
                  size="sm"
                  /* The pill is 40pt tall to fit the row; the slop takes the
                     real target past 44. */
                  hitSlop={8}
                  loading={busyId === item.id}
                  onPress={() => onFollow(item, isFollowing)}
                />
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
