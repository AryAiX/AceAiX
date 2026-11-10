import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SearchX } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { ChevronForward, EmptyState, SkeletonList, Text } from '@/components/ui';
import { isChallengeLive } from '@/components/challenges/ChallengeCard';
import { ClubCard } from '@/components/discover/ClubCard';
import { CoachRow } from '@/components/discover/CoachRow';
import { groupedRowStyle } from '@/components/discover/groupedRow';
import { MediaGrid } from '@/components/profile/MediaGrid';
import { opportunityTypeLabel, sportEmoji, sportLabel, positionLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { discoverAthletes, openChallenges, searchOrganizations, searchPeople } from '@/lib/api';
import { openOpportunities } from '@/lib/api.opportunities';
import { findMeetups } from '@/lib/api.meetups';
import { getSponsors } from '@/lib/api.sponsorship';
import { searchPosts } from '@/lib/api.search';
import { daysUntil, metaLine, roleLabel, truncate } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { matchScore, orderSections, rankBy, relevantPeople, type SectionKey } from '@/lib/searchRank';
import type { Challenge, PersonResult } from '@/types/models';
import { ResultRow, SectionHead } from './SearchParts';
import { useFollowState } from './useFollowState';

const POSTS_ON_ALL = 6;
const ROWS_ON_ALL = 3;

interface Props {
  /** What was typed, settled. */
  term: string;
  /** The same, with a translated sport name turned back into English. */
  queryForSearch: string;
  /** Set when the word is a sport ("tennis"). */
  sportKey: string | null;
  onSeePeople: () => void;
  onSeePosts: () => void;
  /** Called before leaving for a result, so the word joins recent searches. */
  onOpen: () => void;
  endPadding: number;
}

/**
 * "All": the best few of each kind, in an order chosen from what matched.
 * Every lookup is one the app already makes elsewhere; the ranking rules are
 * in lib/searchRank.ts.
 */
export function AllResults({
  term,
  queryForSearch,
  sportKey,
  onSeePeople,
  onSeePosts,
  onOpen,
  endPadding,
}: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const follow = useFollowState();
  const enabled = term.length > 0;

  /* Each kind is fetched on its own, so one slow or failing lookup never
     holds the others back. A failure just leaves that section out. */
  const people = useAsync(
    async () => {
      const [byName, bySport] = await Promise.all([
        searchPeople(queryForSearch, undefined, 30).catch(() => [] as PersonResult[]),
        sportKey
          ? discoverAthletes({ sport: sportKey, sort: 'match' }, 0, 5).catch(() => [])
          : Promise.resolve([]),
      ]);
      const named = relevantPeople(byName, term, (p) => p.full_name);
      if (named.length > 0 || !sportKey) return { term, rows: named };
      /* A sport was typed and nobody is called that: the best fits in that
         sport are the relevant people. */
      const athletes: PersonResult[] = bySport.map((a) => ({
        id: a.user_id,
        role: 'athlete' as const,
        full_name: a.full_name,
        avatar_url: a.avatar_url,
        bio: null,
        city: a.city,
        country: a.country,
        is_verified: a.is_verified,
        is_minor: a.is_minor,
        followers_count: 0,
        sport: a.sport,
        position: a.position,
        talent_score: a.talent_score,
        tier: a.tier,
        is_following: false,
      }));
      return { term, rows: athletes };
    },
    [term, queryForSearch, sportKey],
    { enabled },
  );
  const posts = useAsync(async () => ({ term, rows: await searchPosts(term, 0) }), [term], { enabled });
  const clubs = useAsync(
    async () => ({ term, rows: await searchOrganizations(queryForSearch, 12) }),
    [term, queryForSearch],
    { enabled },
  );
  const trials = useAsync(async () => ({ term, rows: await openOpportunities(50) }), [term], { enabled });
  const challenges = useAsync(async () => ({ term, rows: await openChallenges(null, 50) }), [term], { enabled });
  const meetups = useAsync(async () => ({ term, rows: await findMeetups({ limit: 40 }) }), [term], { enabled });
  const sponsors = useAsync(
    async () => ({ term, rows: await getSponsors(queryForSearch) }),
    [term, queryForSearch],
    { enabled },
  );

  const fresh = <R,>(page: { term: string; rows: R[] } | null | undefined): R[] | null =>
    page && page.term === term ? page.rows : null;

  /* What matches, best first. A sport word also matches anything in that sport. */
  const sportWords = (value: string | null | undefined) => [value, sportLabel(t, value)];
  const clubRows = useMemo(() => {
    const rows = fresh(clubs.data);
    return rows ? rankBy(rows, term, (c) => [c.name, c.city, c.league]).slice(0, ROWS_ON_ALL) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubs.data, term]);
  const trialRows = useMemo(() => {
    const rows = fresh(trials.data);
    return rows
      ? rankBy(rows, term, (o) => [o.title, o.org_name, ...sportWords(o.sport), o.location, opportunityTypeLabel(t, o.type)])
      : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trials.data, term]);
  const challengeRows = useMemo(() => {
    const rows = fresh(challenges.data);
    /* Only ones you can still enter, or that are being judged: a closed
       challenge is a dead end. */
    return rows
      ? rankBy(
          rows.filter((c) => c.status === 'judging' || isChallengeLive(c)),
          term,
          (c) => [c.title, ...sportWords(c.sport), c.org_name, c.setter_name],
        )
      : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenges.data, term]);
  const meetupRows = useMemo(() => {
    const rows = fresh(meetups.data);
    return rows
      ? rankBy(rows, term, (m) => [m.title, ...sportWords(m.sport), m.city, m.area, m.venue, m.host_name])
      : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetups.data, term]);
  const sponsorRows = useMemo(() => {
    const rows = fresh(sponsors.data);
    if (!rows) return null;
    return sportKey
      ? rows.filter((s) => s.sports.some((sport) => matchScore(sportKey, sport, sportLabel(t, sport)) >= 3))
      : rankBy(rows, term, (s) => [s.company_name, s.full_name, s.industry]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sponsors.data, term, sportKey]);
  const peopleRows = fresh(people.data);
  const postRows = fresh(posts.data);

  const counts: Record<SectionKey, number> = {
    people: peopleRows?.length ?? 0,
    posts: postRows?.length ?? 0,
    clubs: clubRows?.length ?? 0,
    trials: trialRows?.length ?? 0,
    challenges: challengeRows?.length ?? 0,
    meetups: meetupRows?.length ?? 0,
    sponsors: sponsorRows?.length ?? 0,
  };
  const best: Partial<Record<SectionKey, number>> = {
    people: matchScore(term, peopleRows?.[0]?.full_name),
    clubs: matchScore(term, clubRows?.[0]?.name),
    trials: matchScore(term, trialRows?.[0]?.title),
    challenges: matchScore(term, challengeRows?.[0]?.title),
    sponsors: matchScore(term, sponsorRows?.[0]?.company_name, sponsorRows?.[0]?.full_name),
  };
  const order = orderSections(best, counts);

  /* Still loading if the two that lead (posts, people) have not come back. */
  const waiting = (!postRows && !posts.error) || (!peopleRows && !people.error);
  const lookups = [people, posts, clubs, trials, challenges, meetups, sponsors];
  const allSettled = lookups.every(
    (l) => !!l.error || (l.data as { term: string } | null)?.term === term,
  );

  const rowStyle = (index: number, count: number) => groupedRowStyle(index, count, colors, theme.radii.xl);
  const go = (href: Parameters<typeof router.push>[0]) => {
    onOpen();
    router.push(href);
  };

  /* Two lines per person: the name, then what they play and where. A
     player's sport and position say more than the word "Athlete". */
  const personLine = (p: PersonResult) =>
    metaLine(
      p.role === 'athlete' ? null : roleLabel(p.role),
      p.sport ? sportLabel(t, p.sport) : null,
      p.role === 'athlete' && p.position ? positionLabel(t, p.position) : null,
      p.city || p.country,
    );

  /* The section already says Challenges, so the label says how long is left. */
  const challengeTime = (c: Challenge) => {
    if (c.status === 'judging') return t('challenges.judging');
    return t('challenges.daysLeft', { count: Math.max(daysUntil(c.closes_at) ?? 0, 0) });
  };

  function section(key: SectionKey) {
    switch (key) {
      case 'people': {
        const rows = peopleRows ?? [];
        return (
          <View key={key}>
            <SectionHead
              title={t('discover.search.secPeople')}
              action={t('discover.search.findPlayer')}
              onAction={onSeePeople}
              testID="search-all-people-more"
            />
            {rows.map((person, index) => (
              <CoachRow
                key={person.id}
                grouped={rowStyle(index, rows.length)}
                person={person}
                following={follow.isPersonFollowed(person.id)}
                pending={follow.pendingId === person.id}
                onToggleFollow={(p, next) => follow.togglePerson(p.id, next, p.followers_count)}
                onOpen={onOpen}
                subtitle={personLine(person)}
              />
            ))}
          </View>
        );
      }
      case 'posts': {
        const rows = (postRows ?? []).slice(0, POSTS_ON_ALL);
        return (
          <View key={key}>
            <SectionHead
              title={t('discover.search.secPosts')}
              action={t('discover.search.seeAll')}
              onAction={onSeePosts}
              testID="search-all-posts-more"
            />
            <MediaGrid
              tiles={rows.map((post) => ({
                id: post.id,
                uri: post.media?.[0]?.thumbnail ?? post.media?.[0]?.url ?? null,
                isVideo: post.media?.[0]?.type === 'video',
                caption: post.caption ? truncate(post.caption, 60) : null,
              }))}
              onPressTile={(id) => go(Routes.post(id))}
            />
          </View>
        );
      }
      case 'clubs': {
        const rows = clubRows ?? [];
        return (
          <View key={key}>
            <SectionHead
              title={t('discover.search.secClubs')}
              action={t('discover.search.seeAll')}
              onAction={() => go(Routes.discoverSection('clubs', queryForSearch))}
              testID="search-all-clubs-more"
            />
            {rows.map((club, index) => (
              <ClubCard
                key={club.id}
                grouped={rowStyle(index, rows.length)}
                organization={{
                  ...club,
                  followers_count: Math.max(
                    0,
                    club.followers_count +
                      (follow.isOrgFollowed(club.id) === follow.orgFetched(club.id)
                        ? 0
                        : follow.isOrgFollowed(club.id)
                          ? 1
                          : -1),
                  ),
                }}
                following={follow.isOrgFollowed(club.id)}
                pending={follow.pendingId === club.id}
                onToggleFollow={(org, next) => follow.toggleOrg(org.id, next)}
                onOpen={onOpen}
                oneLine
              />
            ))}
          </View>
        );
      }
      case 'trials': {
        const rows = (trialRows ?? []).slice(0, ROWS_ON_ALL);
        return (
          <View key={key}>
            <SectionHead
              title={t('discover.search.secTrials')}
              action={t('discover.search.seeAll')}
              onAction={() => go(Routes.opportunitiesSearch(term))}
              testID="search-all-trials-more"
            />
            {rows.map((trial, index) => (
              <ResultRow
                key={trial.id}
                grouped={rowStyle(index, rows.length)}
                left={<Text style={{ fontSize: 22, lineHeight: 28 }}>{sportEmoji(trial.sport)}</Text>}
                title={trial.title}
                subtitle={metaLine(trial.org_name ?? trial.poster?.full_name, trial.location)}
                label={opportunityTypeLabel(t, trial.type)}
                warm
                onPress={() => go(Routes.opportunity(trial.id))}
              />
            ))}
          </View>
        );
      }
      case 'challenges': {
        const rows = (challengeRows ?? []).slice(0, ROWS_ON_ALL);
        return (
          <View key={key}>
            <SectionHead
              title={t('discover.search.secChallenges')}
              action={t('discover.search.seeAll')}
              onAction={() => go(Routes.challenges)}
              testID="search-all-challenges-more"
            />
            {rows.map((challenge, index) => (
              <ResultRow
                key={challenge.id}
                grouped={rowStyle(index, rows.length)}
                left={<Text style={{ fontSize: 22, lineHeight: 28 }}>{sportEmoji(challenge.sport)}</Text>}
                title={challenge.title}
                subtitle={metaLine(challenge.org_name ?? challenge.setter_name, sportLabel(t, challenge.sport))}
                label={challengeTime(challenge)}
                warm
                onPress={() => go(Routes.challenge(challenge.id))}
              />
            ))}
          </View>
        );
      }
      case 'meetups': {
        const rows = (meetupRows ?? []).slice(0, ROWS_ON_ALL);
        return (
          <View key={key}>
            <SectionHead
              title={t('discover.search.secMeetups')}
              action={t('discover.search.seeAll')}
              onAction={() => go(Routes.meetups)}
              testID="search-all-meetups-more"
            />
            {rows.map((meetup, index) => (
              <ResultRow
                key={meetup.id}
                grouped={rowStyle(index, rows.length)}
                left={<Text style={{ fontSize: 22, lineHeight: 28 }}>{sportEmoji(meetup.sport)}</Text>}
                title={meetup.title}
                subtitle={metaLine(meetup.area ?? meetup.city, shortDay(meetup.starts_at))}
                label={t('discover.search.meetupLabel')}
                onPress={() => go(Routes.meetup(meetup.id))}
              />
            ))}
          </View>
        );
      }
      case 'sponsors': {
        const rows = (sponsorRows ?? []).slice(0, ROWS_ON_ALL);
        return (
          <View key={key}>
            <SectionHead
              title={t('discover.search.secSponsors')}
              action={t('discover.search.seeAll')}
              onAction={() => go(Routes.discoverSection('sponsors', queryForSearch))}
              testID="search-all-sponsors-more"
            />
            {rows.map((sponsor, index) => (
              <ResultRow
                key={sponsor.user_id}
                grouped={rowStyle(index, rows.length)}
                title={sponsor.company_name || sponsor.full_name || ''}
                subtitle={metaLine(sponsor.industry, sponsor.sports.map((s) => sportLabel(t, s)).join(', '))}
                onPress={() => go(Routes.profile(sponsor.user_id))}
              />
            ))}
          </View>
        );
      }
      default:
        return null;
    }
  }

  const sportCard = sportKey ? (
    <Pressable
      onPress={onSeePeople}
      accessibilityRole="button"
      accessibilityLabel={sportLabel(t, sportKey)}
      testID="search-all-sport"
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          marginTop: spacing.md,
          opacity: pressed ? 0.7 : 1,
        },
        rowStyle(0, 1),
      ]}
    >
      <Text style={{ fontSize: 28, lineHeight: 34 }}>{sportEmoji(sportKey)}</Text>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{sportLabel(t, sportKey)}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {t('discover.search.sportCardBody', { sport: sportLabel(t, sportKey) })}
        </Text>
      </View>
      <ChevronForward size={18} color={colors.textMuted} />
    </Pressable>
  ) : null;

  return (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: endPadding }}
      testID="search-all"
    >
      {sportCard}
      {order.map(section)}
      {waiting && order.length === 0 ? (
        <View style={{ marginTop: spacing.lg }}>
          <SkeletonList count={4} variant="row" />
        </View>
      ) : null}
      {!waiting && allSettled && order.length === 0 && !sportKey ? (
        <EmptyState
          icon={<SearchX size={26} color={colors.textMuted} />}
          title={t('discover.search.emptyTitle', { term })}
          body={t('discover.search.emptyBody')}
        />
      ) : null}
    </ScrollView>
  );
}

function shortDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
