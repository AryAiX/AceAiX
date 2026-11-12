import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BadgeCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Sheet, SkeletonList, Tappable, Text, useToast } from '@/components/ui';
import { FollowButton } from '@/components/discover/FollowButton';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { followedUserIds } from '@/lib/api.discover';
import { postLikers, type PostLiker } from '@/lib/api.feed';
import { applyToggleFollow } from '@/lib/followCounts';
import { errorMessage } from '@/lib/errors';
import { displayName, roleLabel } from '@/lib/format';
import { Routes } from '@/lib/routes';

/**
 * "Liked by Maya and 12 others", under your own posts only.
 *
 * The line stays on the viewer's own posts so the feed does not ask who
 * liked every card. Tapping it opens the same list anyone can open from
 * the like count.
 */
export function LikedBy({ postId, likeCount }: { postId: string; likeCount: number }) {
  const t = useT();
  const { spacing } = useTheme();
  const [open, setOpen] = useState(false);

  // The newest like names the line; re-read when the count moves.
  const preview = useAsync(() => postLikers(postId, 1), [postId, likeCount], {
    enabled: likeCount > 0,
  });

  if (likeCount <= 0) return null;

  const first = preview.data?.likers[0];
  const name = first ? displayName(first.full_name) : null;
  const label = name
    ? likeCount > 1
      ? t('feed.likedByOthers', { name, count: likeCount - 1 })
      : t('feed.likedBy', { name })
    : t('feed.likedByCount', { count: likeCount });

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID="post-liked-by"
        hitSlop={8}
        style={({ pressed }) => ({ paddingVertical: spacing.xs, opacity: pressed ? 0.6 : 1 })}
      >
        <Text variant="captionStrong" tone="secondary" numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      {open ? <LikersSheet postId={postId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Everyone this viewer may see on the like list, with a Follow button on each. */
export function LikersSheet({
  postId,
  onClose,
}: {
  postId: string;
  onClose: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const { user, profile } = useAuth();

  const list = useAsync(() => postLikers(postId, 100), [postId]);
  const followed = useAsync(() => followedUserIds(), []);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  const isFollowing = (id: string) =>
    overrides[id] ?? (followed.data ?? []).includes(id);

  const onFollow = async (person: PostLiker) => {
    const was = isFollowing(person.id);
    setOverrides((current) => ({ ...current, [person.id]: !was }));
    setPendingId(person.id);
    try {
      const result = await applyToggleFollow({
        targetId: person.id,
        myId: user?.id ?? null,
        wasFollowing: was,
        targetFollowers: null,
        myFollowing: profile?.following_count ?? 0,
      });
      setOverrides((current) => ({ ...current, [person.id]: result.following }));
    } catch (err) {
      setOverrides((current) => ({ ...current, [person.id]: was }));
      toast.error(errorMessage(err));
    } finally {
      setPendingId(null);
    }
  };

  const openProfile = (id: string) => {
    onClose();
    // iOS will not present the next screen while the sheet is still closing.
    setTimeout(() => router.push(Routes.profile(id)), 240);
  };

  const people = list.data?.likers ?? [];
  const hidden = list.data?.hidden ?? 0;

  return (
    <Sheet visible onClose={onClose} title={t('feed.likersTitle')} testID="post-likers">
      {list.loading && !list.data ? (
        <SkeletonList count={3} variant="row" />
      ) : list.error ? (
        <Text variant="body" tone="secondary" style={{ paddingVertical: spacing.sm }}>
          {list.error}
        </Text>
      ) : (
        <View style={{ paddingBottom: spacing.lg }}>
          {people.map((person) => {
            const name = displayName(person.full_name);
            return (
              <View
                key={person.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: spacing.sm,
                }}
              >
                <Tappable
                  onPress={() => openProfile(person.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('feed.openProfileOf', { name })}
                  containerStyle={{ flex: 1 }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
                >
                  <Avatar uri={person.avatar_url} name={person.full_name} size="sm" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {name}
                      </Text>
                      {person.is_verified ? (
                        <BadgeCheck size={14} color={colors.info} fill={theme.alpha(colors.info, 0.16)} />
                      ) : null}
                    </View>
                    {person.role ? (
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {roleLabel(person.role)}
                      </Text>
                    ) : null}
                  </View>
                </Tappable>
                {person.id === user?.id ? null : (
                  <FollowButton
                    following={isFollowing(person.id)}
                    pending={pendingId === person.id}
                    onPress={() => void onFollow(person)}
                    role={person.role}
                    name={name}
                  />
                )}
              </View>
            );
          })}
          {hidden > 0 ? (
            <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
              {t('feed.likersHidden', { count: hidden })}
            </Text>
          ) : null}
        </View>
      )}
    </Sheet>
  );
}
