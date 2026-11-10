import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Play, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { LogoColors } from '@/theme/tokens';
import { Avatar, RemoteImage, SkeletonList, Text } from '@/components/ui';
import { FollowButton } from '@/components/discover/FollowButton';
import { reasonLabel } from '@/components/discover/MatchBadge';
import { useAsync } from '@/hooks/useAsync';
import { discoverAthletes, recommendedAthletes } from '@/lib/api';
import { applyToggleFollow, refreshFollowCounts, useFollowCount } from '@/lib/followCounts';
import { WaveHand } from '@/components/feed/WaveHand';
import { getExploreVideos } from '@/lib/api.explore';
import { posterOf } from '@/lib/mediaUrl';
import { displayName, metaLine } from '@/lib/format';
import { positionLabel } from '@/constants/sports';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/i18n';

/** How many follows fill the bar. */
const GOAL = 3;
const CARD = 136;
/* Every card in "Athletes like you" plays your sport, so that reason says nothing. */
const SAME_SPORT = 'Plays your sport';
/* The bar fills in the logo's colours, sky to ember, one third per follow,
   the way the story ring travels round. */
const STEPS = [
  { colors: [LogoColors.sky, LogoColors.cobalt] as const, locations: [0, 1] as const },
  { colors: [LogoColors.cobalt, LogoColors.amber, '#FF9A3A'] as const, locations: [0, 0.8, 1] as const },
  { colors: ['#FF9A3A', LogoColors.flame, LogoColors.ember] as const, locations: [0, 0.4, 1] as const },
];

/**
 * The top of the Following tab until you follow 3 people: a welcome with a
 * "1 of 3" bar, a swipeable row of athletes like you (each with a Follow
 * button), and, while your feed is still empty, a few trending clips.
 * It counts your real follows, so it stays put as their posts arrive below,
 * fills one step per follow, says you're set at 3 (with an X to close it
 * right away) and is gone the next time. Uses data the app already loads.
 */
export function FollowingStarter({
  feedEmpty,
  onFollowed,
}: {
  feedEmpty: boolean;
  onFollowed?: () => void;
}) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const myId = user?.id ?? null;

  const people = useAsync(async () => {
    const picked = await recommendedAthletes(10).catch(() => []);
    const list = picked.length ? picked : await discoverAthletes({}, 0, 10).catch(() => []);
    return list.filter((athlete) => athlete.user_id !== myId);
  }, [myId]);
  const clips = useAsync(
    () => (feedEmpty ? getExploreVideos({ limit: 4 }).catch(() => []) : Promise.resolve([])),
    [feedEmpty],
  );

  /* -1 until the server's number arrives. */
  const known = useFollowCount(myId, 'following', -1);
  useEffect(() => {
    if (myId) void refreshFollowCounts(myId);
  }, [myId]);

  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  /* Reached 3 by following from here: say so before going away. */
  const [doneHere, setDoneHere] = useState(false);
  const localCount = Object.values(followed).filter(Boolean).length;
  const count = known >= 0 ? known : localCount;
  const prevCount = useRef(count);
  useEffect(() => {
    if (prevCount.current < GOAL && count >= GOAL && localCount > 0) setDoneHere(true);
    prevCount.current = count;
  }, [count, localCount]);

  const follow = async (userId: string) => {
    setPending(userId);
    try {
      const result = await applyToggleFollow({
        targetId: userId,
        myId,
        wasFollowing: false,
        targetFollowers: null,
        myFollowing: Math.max(count, 0),
      });
      setFollowed((current) => ({ ...current, [userId]: result.following }));
      if (result.following) onFollowed?.();
    } catch {
      /* The button simply stays as it was. */
    } finally {
      setPending(null);
    }
  };

  /* Until the count is known, only an empty feed gets the starter. */
  if (known < 0 && !feedEmpty) return null;
  const done = count >= GOAL;
  const showWelcome = !dismissed && (feedEmpty || !done || doneHere);
  const showPeople = feedEmpty || !done;
  if (!showWelcome && !showPeople && !feedEmpty) return null;
  const shown = Math.min(count, GOAL);
  const remaining = GOAL - shown;
  const list = (people.data ?? []).filter((athlete) => !followed[athlete.user_id]);

  const card = { backgroundColor: colors.surface, borderRadius: radii.lg, ...theme.elevation(1) };

  return (
    <View style={{ gap: spacing.md, paddingTop: spacing.sm }} testID="following-starter">
      {/* Welcome, with how far along you are: one row, bar under the title. */}
      {showWelcome ? (
        <View
          style={{ ...card, paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 }}
          testID="following-starter-welcome"
        >
          {done ? (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.successSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={20} color={colors.success} strokeWidth={2.8} />
            </View>
          ) : (
            <WaveHand size={40} />
          )}
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {done
                ? t('feed.starterDone')
                : shown === 0
                  ? t('feed.starterTitle')
                  : t('feed.starterMore', { count: remaining })}
            </Text>
            {done ? (
              <Text variant="caption" tone="muted" numberOfLines={2}>
                {t('feed.starterDoneBody')}
              </Text>
            ) : (
              <View
                style={{ flexDirection: 'row', gap: 5 }}
                accessible
                accessibilityLabel={t('feed.starterProgress', { count: shown })}
              >
                {STEPS.map((step, i) =>
                  i < shown ? (
                    <LinearGradient
                      key={i}
                      colors={step.colors}
                      locations={step.locations}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ flex: 1, height: 6, borderRadius: 3 }}
                    />
                  ) : (
                    <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt }} />
                  ),
                )}
              </View>
            )}
          </View>
          {done ? (
            <Pressable
              onPress={() => setDismissed(true)}
              accessibilityRole="button"
              accessibilityLabel={t('feed.starterHide')}
              hitSlop={12}
              testID="following-starter-hide"
            >
              <X size={18} color={colors.textMuted} />
            </Pressable>
          ) : (
            <Text variant="captionStrong" tone="primary">
              {t('feed.starterCount', { count: shown })}
            </Text>
          )}
        </View>
      ) : null}

      {/* Athletes like you. */}
      {showPeople && (people.loading || list.length > 0) ? (
      <>
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
          {list.map((athlete) => {
            const name = displayName(athlete.full_name);
            const other = (athlete.reasons ?? []).find((r) => r !== SAME_SPORT);
            const reason = other ? reasonLabel(t, other) : null;
            const isFollowing = !!followed[athlete.user_id];
            return (
              <Pressable
                key={athlete.user_id}
                onPress={() => router.push(Routes.profile(athlete.user_id))}
                accessibilityRole="button"
                accessibilityLabel={name}
                style={({ pressed }) => ({
                  ...card,
                  width: CARD,
                  paddingHorizontal: spacing.sm + 2,
                  paddingTop: spacing.sm + 2,
                  paddingBottom: spacing.sm + 2,
                  alignItems: 'center',
                  gap: 2,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Avatar
                  uri={athlete.avatar_url}
                  name={name}
                  size="md"
                  score={athlete.talent_score}
                  verified={athlete.is_verified}
                />
                <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: 6 }}>
                  {name}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {metaLine(
                    positionLabel(t, athlete.position),
                    athlete.age != null ? String(athlete.age) : null,
                    athlete.city,
                  )}
                </Text>
                {reason ? (
                  <View
                    style={{
                      marginTop: 4,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 7,
                      backgroundColor: theme.alpha(theme.play.flame, theme.scheme === 'dark' ? 0.16 : 0.1),
                    }}
                  >
                    <Text
                      variant="caption"
                      color={theme.scheme === 'dark' ? LogoColors.flameInkDark : LogoColors.flameInk}
                      numberOfLines={1}
                      style={{ fontSize: 11 }}
                    >
                      {reason}
                    </Text>
                  </View>
                ) : null}
                <View style={{ flex: 1 }} />
                <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
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
      </>
      ) : null}

      {/* Something to watch in the meantime, while the feed is still empty. */}
      {feedEmpty && clips.data?.length ? (
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
