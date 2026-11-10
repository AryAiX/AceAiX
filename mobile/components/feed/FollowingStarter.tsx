import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, RemoteImage, SkeletonList, Text } from '@/components/ui';
import { FollowButton } from '@/components/discover/FollowButton';
import { reasonLabel } from '@/components/discover/MatchBadge';
import { useAsync } from '@/hooks/useAsync';
import { discoverAthletes, recommendedAthletes, toggleFollow } from '@/lib/api';
import { getExploreVideos } from '@/lib/api.explore';
import { posterOf } from '@/lib/mediaUrl';
import { displayName, metaLine } from '@/lib/format';
import { sportLabel } from '@/constants/sports';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/i18n';

/** How many follows fill the bar. */
const GOAL = 3;
const CARD = 136;

/**
 * The Following tab when you follow nobody yet: a welcome with a "1 of 3
 * followed" bar, a swipeable row of athletes like you (each with a reason
 * and a Follow button), then a few trending clips so there's always
 * something to watch. Uses data the app already loads; nothing new on the server.
 */
export function FollowingStarter({ onFollowed }: { onFollowed?: () => void }) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();

  const people = useAsync(async () => {
    const picked = await recommendedAthletes(10).catch(() => []);
    const list = picked.length ? picked : await discoverAthletes({}, 0, 10).catch(() => []);
    return list.filter((athlete) => athlete.user_id !== user?.id);
  }, [user?.id]);
  const clips = useAsync(() => getExploreVideos({ limit: 4 }).catch(() => []), []);

  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<string | null>(null);
  const followedCount = Object.values(following).filter(Boolean).length;

  const follow = async (userId: string) => {
    setPending(userId);
    try {
      const result = await toggleFollow(userId);
      setFollowing((current) => ({ ...current, [userId]: result.following }));
      if (result.following) onFollowed?.();
    } catch {
      /* The button simply stays as it was. */
    } finally {
      setPending(null);
    }
  };

  const card = { backgroundColor: colors.surface, borderRadius: radii.lg, ...theme.elevation(1) };

  return (
    <View style={{ gap: spacing.md, paddingTop: spacing.sm }} testID="following-starter">
      {/* Welcome, with how far along you are. */}
      <View style={{ ...card, padding: spacing.md, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontSize: 28, lineHeight: 34 }} accessible={false}>
            👋
          </Text>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{t('feed.starterTitle')}</Text>
            <Text variant="caption" tone="muted">
              {t('feed.starterBody')}
            </Text>
          </View>
        </View>
        <View
          style={{ flexDirection: 'row', gap: 6 }}
          accessible
          accessibilityLabel={t('feed.starterProgress', { count: Math.min(followedCount, GOAL) })}
        >
          {Array.from({ length: GOAL }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: i < followedCount ? colors.primary : colors.surfaceAlt,
              }}
            />
          ))}
        </View>
        <Text variant="captionStrong" tone="primary">
          {t('feed.starterProgress', { count: Math.min(followedCount, GOAL) })}
        </Text>
      </View>

      {/* Athletes like you. */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text variant="subheading">{t('feed.starterAthletes')}</Text>
        <Pressable onPress={() => router.push(Routes.discover)} accessibilityRole="link" hitSlop={8}>
          <Text variant="captionStrong" tone="primary">
            {t('common.seeAll')}
          </Text>
        </Pressable>
      </View>
      {people.loading ? (
        <SkeletonList count={1} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingVertical: 4, paddingHorizontal: 2 }}
        >
          {(people.data ?? []).map((athlete) => {
            const name = displayName(athlete.full_name);
            const reason = athlete.reasons?.[0] ? reasonLabel(t, athlete.reasons[0]) : null;
            const isFollowing = !!following[athlete.user_id];
            return (
              <Pressable
                key={athlete.user_id}
                onPress={() => router.push(Routes.profile(athlete.user_id))}
                accessibilityRole="button"
                accessibilityLabel={name}
                style={({ pressed }) => ({
                  ...card,
                  width: CARD,
                  padding: spacing.sm + 2,
                  alignItems: 'center',
                  gap: 3,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Avatar
                  uri={athlete.avatar_url}
                  name={name}
                  size="lg"
                  score={athlete.talent_score}
                  verified={athlete.is_verified}
                />
                <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: 4 }}>
                  {name}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {metaLine(sportLabel(t, athlete.sport), athlete.city)}
                </Text>
                <Text variant="caption" color={theme.play.flame} numberOfLines={1} style={{ minHeight: 16 }}>
                  {reason ?? ' '}
                </Text>
                <View style={{ alignSelf: 'stretch', marginTop: 4 }}>
                  <FollowButton
                    following={isFollowing}
                    pending={pending === athlete.user_id}
                    onPress={() => follow(athlete.user_id)}
                    name={name}
                  />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Something to watch in the meantime. */}
      {clips.data?.length ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text variant="subheading">{t('feed.starterClips')}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {clips.data.slice(0, 4).map((post) => {
              const poster = posterOf(post.media?.[0]);
              return (
                <Pressable
                  key={post.id}
                  onPress={() => router.push(Routes.post(post.id))}
                  accessibilityRole="button"
                  accessibilityLabel={metaLine(displayName(post.author_name), post.caption)}
                  style={({ pressed }) => ({
                    width: '48.5%',
                    aspectRatio: 0.8,
                    borderRadius: radii.md,
                    overflow: 'hidden',
                    backgroundColor: '#1E1A36',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  {poster ? (
                    <RemoteImage uri={poster} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : null}
                  <View
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: 'rgba(10,6,30,0.55)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Play size={11} color="#FFFFFF" fill="#FFFFFF" />
                  </View>
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      backgroundColor: 'rgba(10,6,30,0.45)',
                    }}
                  >
                    <Text variant="captionStrong" color="#FFFFFF" numberOfLines={1}>
                      {displayName(post.author_name)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}
