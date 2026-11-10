import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, Check } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import { Avatar, Button, Text, useToast } from '@/components/ui';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { positionLabel, sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { searchOrganizations } from '@/lib/api';
import { getBookableCoaches } from '@/lib/api.coaching';
import {
  followedOrganizationIds,
  followedUserIds,
  leaderboard,
  toggleOrganizationFollow,
} from '@/lib/api.discover';
import { getSponsorCalls } from '@/lib/api.sponsorship';
import { errorMessage } from '@/lib/errors';
import { applyToggleFollow, knownFollowCount } from '@/lib/followCounts';
import { displayName, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { rangeLabel } from '@/lib/sponsorship';
import { useAuth } from '@/providers/AuthProvider';
import { LeaderboardPodium } from './LeaderboardPodium';
import { LeaderboardRow } from './LeaderboardRow';
import { tierLabel } from './MatchBadge';

/**
 * The short rows that sit between the clips on the athlete's Discover. Each
 * one loads on its own when it scrolls into view, and stays out of the way
 * (renders nothing) when it has nothing to show.
 */
type Slot = 'players' | 'coaches' | 'board' | 'clubs' | 'sponsors';

/** After which grid row each one appears: every second row, in this order. */
const SLOTS: Record<number, Slot> = { 1: 'players', 3: 'coaches', 5: 'board', 7: 'clubs', 9: 'sponsors' };

export function discoverRowAfter(rowIndex: number): React.ReactElement | null {
  const slot = SLOTS[rowIndex];
  if (!slot) return null;
  if (slot === 'players') return <PlayersToKnow />;
  if (slot === 'coaches') return <CoachesTakingStudents />;
  if (slot === 'board') return <TopOfTheBoard />;
  if (slot === 'clubs') return <ClubsToFollow />;
  return <SponsorCalls />;
}

const CARD_WIDTH = 148;

function RowHeader({ title, link, onLink }: { title: string; link: string; onLink: () => void }) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.sm,
      }}
    >
      <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
        {title}
      </Text>
      <Pressable onPress={onLink} hitSlop={10} accessibilityRole="link">
        <Text variant="captionStrong" color={colors.primary}>
          {link}
        </Text>
      </Pressable>
    </View>
  );
}

function Shelf({ children }: { children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
    >
      {children}
    </ScrollView>
  );
}

function Section({ children, testID }: { children: React.ReactNode; testID: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ paddingVertical: spacing.lg }} testID={testID}>
      {children}
    </View>
  );
}

// ── Players to know ──────────────────────────────────────────────────────────
function PlayersToKnow() {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { profile } = useAuth();
  const viewerId = profile?.id ?? null;

  const board = useAsync(() => leaderboard(undefined, undefined, 20), []);
  const follows = useAsync(() => followedUserIds(), []);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const followed = useMemo(() => new Set(follows.data ?? []), [follows.data]);

  /* People to meet: not you, and not someone you already follow. */
  const people = useMemo(
    () =>
      (board.data ?? [])
        .filter((row) => row.user_id !== viewerId && !followed.has(row.user_id))
        .slice(0, 8),
    [board.data, viewerId, followed],
  );

  const toggle = useCallback(
    async (userId: string) => {
      const was = overrides[userId] ?? followed.has(userId);
      setOverrides((o) => ({ ...o, [userId]: !was }));
      try {
        const result = await applyToggleFollow({
          targetId: userId,
          myId: viewerId,
          wasFollowing: was,
          targetFollowers: knownFollowCount(userId, 'followers') ?? null,
          myFollowing: knownFollowCount(viewerId ?? '', 'following') ?? profile?.following_count ?? 0,
        });
        setOverrides((o) => ({ ...o, [userId]: result.following }));
      } catch (err) {
        setOverrides((o) => ({ ...o, [userId]: was }));
        toast.error(errorMessage(err));
      }
    },
    [followed, overrides, profile?.following_count, toast, viewerId],
  );

  if (people.length === 0) return null;

  return (
    <Section testID="discover-row-players">
      <RowHeader
        title={t('discover.rows.players')}
        link={t('discover.rows.searchPlayer')}
        onLink={() => router.push(Routes.search)}
      />
      <Shelf>
        {people.map((row) => {
          const name = displayName(row.full_name);
          const first = name.split(' ')[0] || name;
          const tier = tierForScore(row.overall);
          const following = overrides[row.user_id] ?? false;
          return (
            <Pressable
              key={row.athlete_id}
              onPress={() => router.push(Routes.profile(row.user_id))}
              accessibilityRole="button"
              accessibilityLabel={metaLine(name, positionLabel(t, row.position), tierLabel(t, tier))}
              style={({ pressed }) => ({
                width: CARD_WIDTH,
                borderRadius: radii.xl,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                overflow: 'hidden',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              {/* A pitch-coloured band, the same family as the club cards. */}
              <LinearGradient
                colors={theme.huePair(row.user_id)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ height: 64, alignItems: 'flex-end', padding: spacing.sm }}
              >
                <View
                  style={{
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: radii.sm,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                  }}
                >
                  <Text variant="overline" color={TierColors[tier]} style={{ fontSize: 9 }}>
                    {tierLabel(t, tier)}
                  </Text>
                </View>
              </LinearGradient>
              <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, marginTop: -24 }}>
                <View style={{ alignSelf: 'flex-start', borderRadius: 999, borderWidth: 3, borderColor: colors.surface }}>
                  <Avatar uri={row.avatar_url} name={name} size="md" />
                </View>
                <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: spacing.xs }}>
                  {first}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {metaLine(positionLabel(t, row.position) || sportLabel(t, row.sport), row.country)}
                </Text>
                <Button
                  label={following ? t('common.following') : t('common.follow')}
                  variant={following ? 'secondary' : 'outline'}
                  icon={following ? <Check size={16} color={colors.textSecondary} strokeWidth={2.6} /> : undefined}
                  size="sm"
                  onPress={() => void toggle(row.user_id)}
                  style={{ marginTop: spacing.sm }}
                  accessibilityLabel={
                    following ? t('discover.unfollowA11y', { name }) : t('discover.followA11y', { name })
                  }
                />
              </View>
            </Pressable>
          );
        })}
      </Shelf>
    </Section>
  );
}

// ── Coaches taking students ──────────────────────────────────────────────────
function CoachesTakingStudents() {
  const { colors, radii, spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const coaches = useAsync(() => getBookableCoaches(), []);
  const rows = (coaches.data ?? []).slice(0, 8);
  if (rows.length === 0) return null;

  return (
    <Section testID="discover-row-coaches">
      <RowHeader
        title={t('discover.rows.coaches')}
        link={t('common.seeAll')}
        onLink={() => router.push(Routes.discoverSection('coaches'))}
      />
      <Shelf>
        {rows.map((coach) => {
          const name = displayName(coach.full_name);
          return (
            <Pressable
              key={coach.id}
              onPress={() => router.push(Routes.profile(coach.id))}
              accessibilityRole="button"
              accessibilityLabel={metaLine(name, coach.specialty, coach.city)}
              style={({ pressed }) => ({
                width: 236,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: radii.xl,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Avatar uri={coach.avatar_url} name={name} size="md" verified={coach.is_verified} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {name}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {metaLine(coach.specialty || coach.headline, coach.city || coach.country)}
                </Text>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 2,
                    borderRadius: radii.pill,
                    backgroundColor: colors.successSoft,
                  }}
                >
                  <Text variant="captionStrong" tone="success" style={{ fontSize: 11 }}>
                    {t('coaching.takingStudentsFilter')}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </Shelf>
    </Section>
  );
}

// ── Top of the board ─────────────────────────────────────────────────────────
function TopOfTheBoard() {
  const { spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const { profile } = useAuth();
  const viewerId = profile?.id ?? null;
  const board = useAsync(() => leaderboard(undefined, undefined, 50), []);
  const rows = board.data ?? [];
  if (rows.length < 3) return null;
  /* Your own place, if you are on the board and not already on the podium. */
  const mine = rows.find((row) => row.user_id === viewerId && row.rank > 3);

  return (
    <Section testID="discover-row-board">
      <RowHeader
        title={t('discover.rows.board')}
        link={t('discover.tabLeaderboard')}
        onLink={() => router.push(Routes.discoverSection('leaderboard'))}
      />
      <View style={{ paddingHorizontal: spacing.lg }}>
        <LeaderboardPodium top={rows.slice(0, 3)} viewerId={viewerId} />
        {mine ? <LeaderboardRow entry={mine} isYou /> : null}
      </View>
    </Section>
  );
}

// ── Clubs to follow ──────────────────────────────────────────────────────────
function ClubsToFollow() {
  const { colors, radii, spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const clubs = useAsync(() => searchOrganizations('', 30), []);
  const follows = useAsync(() => followedOrganizationIds(), []);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const followed = useMemo(() => new Set(follows.data ?? []), [follows.data]);
  const rows = useMemo(
    () => (clubs.data ?? []).filter((club) => !followed.has(club.id)).slice(0, 8),
    [clubs.data, followed],
  );
  if (!follows.data || rows.length === 0) return null;

  const toggle = async (id: string) => {
    const was = overrides[id] ?? false;
    setOverrides((o) => ({ ...o, [id]: !was }));
    try {
      const result = await toggleOrganizationFollow(id, was);
      setOverrides((o) => ({ ...o, [id]: result }));
    } catch (err) {
      setOverrides((o) => ({ ...o, [id]: was }));
      toast.error(errorMessage(err));
    }
  };

  return (
    <Section testID="discover-row-clubs">
      <RowHeader
        title={t('discover.rows.clubs')}
        link={t('common.seeAll')}
        onLink={() => router.push(Routes.discoverSection('clubs'))}
      />
      <Shelf>
        {rows.map((club) => {
          const following = overrides[club.id] ?? false;
          return (
            <Pressable
              key={club.id}
              onPress={() => router.push(Routes.organization(club.id))}
              accessibilityRole="button"
              accessibilityLabel={club.name}
              style={({ pressed }) => ({
                width: CARD_WIDTH,
                padding: spacing.md,
                gap: spacing.xs,
                borderRadius: radii.xl,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <ClubLogo uri={club.logo_url} name={club.name} size="md" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs }}>
                <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {club.name}
                </Text>
                {club.is_verified ? <BadgeCheck size={14} color={colors.info} /> : null}
              </View>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {club.league || club.city || club.country || ' '}
              </Text>
              <Button
                label={following ? t('common.following') : t('common.follow')}
                variant={following ? 'secondary' : 'outline'}
                icon={following ? <Check size={16} color={colors.textSecondary} strokeWidth={2.6} /> : undefined}
                size="sm"
                onPress={() => void toggle(club.id)}
                style={{ marginTop: spacing.xs }}
                accessibilityLabel={
                  following
                    ? t('discover.unfollowA11y', { name: club.name })
                    : t('discover.followA11y', { name: club.name })
                }
              />
            </Pressable>
          );
        })}
      </Shelf>
    </Section>
  );
}

// ── Sponsors looking for athletes ────────────────────────────────────────────
function SponsorCalls() {
  const { colors, radii, spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const calls = useAsync(() => getSponsorCalls({ limit: 6 }), []);
  const rows = (calls.data ?? []).slice(0, 6);
  if (rows.length === 0) return null;
  const openSponsors = () => router.push(Routes.discoverSection('sponsors'));

  return (
    <Section testID="discover-row-sponsors">
      <RowHeader title={t('discover.rows.sponsors')} link={t('common.seeAll')} onLink={openSponsors} />
      <Shelf>
        {rows.map((call) => {
          const brand = call.company_name || displayName(call.sponsor_name);
          const range = rangeLabel(call.amount_min, call.amount_max, call.currency);
          return (
            <Pressable
              key={call.call_id}
              onPress={openSponsors}
              accessibilityRole="button"
              accessibilityLabel={metaLine(brand, call.title, range)}
              style={({ pressed }) => ({
                width: 280,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.md,
                borderRadius: radii.xl,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Avatar uri={call.sponsor_avatar} name={brand} size="md" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {brand}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {call.title}
                </Text>
                {range ? (
                  <Text variant="captionStrong" tone="success" numberOfLines={1}>
                    {range}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </Shelf>
    </Section>
  );
}
