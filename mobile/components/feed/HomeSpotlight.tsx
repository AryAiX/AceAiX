import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Eye, Flame, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Badge, ChevronForward, Text } from '@/components/ui';
import { groupedRowStyle } from '@/components/discover/groupedRow';
import { LogoColors } from '@/theme/tokens';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/providers/AuthProvider';
import { getMyChallengeViewer, openChallenges, profileViewDigest } from '@/lib/api';
import { ageFrom, pickChallenge } from '@/lib/challengeFit';
import { Routes } from '@/lib/routes';
import { deadlineLabel, displayName, metaLine } from '@/lib/format';
import { useT } from '@/i18n';
import { isChallengeLive } from '@/components/challenges/ChallengeCard';

/** The challenge ombre, coral to pink — the same sweep as Play's + button —
    with white words on it. */
/* The challenge card is one solid flame orange, no ombre. */
const CHALLENGE_FILL = '#FF7A2C';
const ON_OMBRE = '#FFFFFF';


/* The faces on Home's views card: 28 across with a 2.5 white ring, overlapping. */
const FACE = 33;
const FACE_OVERLAP = 10;

/* Profile views: shown every time the app is opened from closed. The × puts
   it away for this run only (kept in memory), and it comes back sooner if
   someone new looks while the app is open. */
type ViewsBaseline = { total: number; fresh: number };
let viewsPutAwayThisRun: ViewsBaseline | null = null;

/** Kept outside the component, the same way the feed's mute setting is. */
function putViewsAwayForThisRun(baseline: ViewsBaseline) {
  viewsPutAwayThisRun = baseline;
}

/* Keys from earlier versions, cleared once so nothing old lingers. */
const OLD_KEYS = [
  'home.yourWeek.dismissedViews',
  'home.yourWeek.dismissedChallenge',
  'home.yourWeek.viewsBaseline',
];

/* The challenge: put away for as long as the app is open. Kept in memory only,
   so closing the app fully (swiping it away) and opening it again brings the
   challenge back. Going to the background and back does not. */
let challengePutAwayThisRun: string | null = null;

/** Kept outside the component, the same way the feed's mute setting is. */
function putChallengeAwayForThisRun(id: string) {
  challengePutAwayThisRun = id;
}

/**
 * Your week — above the feed, as nudge pop-ups.
 *
 * Who has been reading your profile, on a white pop-up with a blue round
 * icon; this week's challenge, on the coral → pink ombre. Each floats on its
 * own like a notification and can be put away with its ×: both come back
 * the next time the app is opened from closed (the views one sooner, with a
 * new view). Notifications shows both, always. The Talent
 * Score lives on Profile only, so Home is not one more place to watch a
 * number. With nothing to say, nothing is shown.
 */
export function HomeSpotlight({
  showChallenge = true,
  pinned = false,
  onReady,
}: {
  showChallenge?: boolean;
  /** Notifications: always shown, no ×, whatever was put away on Home. */
  pinned?: boolean;
  /** Called once everything the card needs has arrived (or failed). */
  onReady?: () => void;
} = {}) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const router = useRouter();
  const { profile, isGuardian } = useAuth();

  const isAthlete = profile?.role === 'athlete';

  const digest = useAsync(() => profileViewDigest(7), [], {
    enabled: isAthlete,
    refetchOnFocus: true,
  });
  /* Twenty open ones to choose from, and who you are, so the card can show
     one in your sport that you are old enough to enter. */
  const challenges = useAsync(() => openChallenges(null, 20, 0), [], {
    enabled: !isGuardian,
    refetchOnFocus: true,
  });
  const viewer = useAsync(() => getMyChallengeViewer().catch(() => ({ sports: [], birthDate: null })), [], {
    enabled: isAthlete,
  });

  const [baseline, setBaseline] = useState<ViewsBaseline | null>(viewsPutAwayThisRun);
  const [challengePutAway, setChallengePutAway] = useState<string | null>(challengePutAwayThisRun);
  useEffect(() => {
    AsyncStorage.multiRemove(OLD_KEYS).catch(() => undefined);
  }, []);

  const rawViews = isAthlete && digest.data && digest.data.total > 0 ? digest.data : null;

  // Parents cannot enter challenges, so the card has nothing for them (QA-151).
  // Home's Following tab is people, so the challenge card stays on Playfeed;
  // Notifications always shows it.
  const rawChallenge =
    isGuardian || (!showChallenge && !pinned)
      ? null
      : pickChallenge((challenges.data ?? []).filter(isChallengeLive), {
          sports: viewer.data?.sports ?? [],
          age: ageFrom(viewer.data?.birthDate),
          band: profile?.age_band ?? null,
        });

  const somethingNew =
    baseline === null ||
    (rawViews != null &&
      (rawViews.total > baseline.total || rawViews.new_since_seen > baseline.fresh));
  const views = rawViews && (pinned || somethingNew) ? rawViews : null;
  const challenge =
    rawChallenge && (pinned || challengePutAway !== rawChallenge.id) ? rawChallenge : null;

  /* Wait for all three answers before showing anything, so the rows arrive
     together and in their final order: no challenge first and views half a
     second later, and no challenge swapped once we know your sport and age. */
  const settled = !digest.loading && !challenges.loading && !viewer.loading;
  useEffect(() => {
    if (settled) onReady?.();
  }, [settled, onReady]);

  if (!settled) return null;
  if (!views && !challenge) return null;

  const putAwayViews = () => {
    if (!rawViews) return;
    const next = { total: rawViews.total, fresh: rawViews.new_since_seen };
    putViewsAwayForThisRun(next);
    setBaseline(next);
  };
  const putAwayChallenge = (id: string) => {
    putChallengeAwayForThisRun(id);
    setChallengePutAway(id);
  };

  /** The × in a card's corner. */
  /** The × tucked into a card's top corner, so the card itself reads the same
      as its pinned copy in Notifications. */
  const close = (onPress: () => void, color: string, testID: string) => (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={t('common.close')}
      testID={testID}
      style={({ pressed }) => ({
        position: 'absolute',
        top: 5,
        right: 5,
        padding: 3,
        opacity: pressed ? 0.5 : 0.7,
      })}
    >
      <X size={14} color={color} strokeWidth={2.4} />
    </Pressable>
  );


  /* Home's views card: the faces of the verified coaches and clubs who
     looked (two at most), and how many others. */
  const faces = (views?.named ?? []).slice(0, 2);
  const others = views ? Math.max(0, views.total - faces.length) : 0;
  const first = faces[0];
  const firstName = first
    ? first.role === 'club'
      ? (first.organization ?? displayName(first.full_name))
      : displayName(first.full_name)
    : '';
  const moreNamed = (views?.named.length ?? 0) - 1;
  /* The name is drawn in bold, so the sentence keeps its {{name}} slot and is
     split around it; every language puts the name where it reads naturally. */
  const includingParts = (
    moreNamed > 0 ? t('views.includingMore', { count: moreNamed }) : t('views.including')
  ).split(/(\{\{name\}\})/);

  /* Notifications: the same two things as quiet rows in one white card,
     under "Your week", so the page reads as one calm list. */
  if (pinned) {
    const rows = [views ? 'views' : null, challenge ? 'challenge' : null].filter(
      (r): r is 'views' | 'challenge' => r != null,
    );
    const row = (index: number) => ({
      ...groupedRowStyle(index, rows.length, colors, radii.xl),
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    });
    const roundIcon = (bg: string) => ({
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: bg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    });
    return (
      <View testID="your-week">
        <Text variant="overline" tone="muted" accessibilityRole="header" style={{ marginBottom: spacing.sm }}>
          {t('feed.yourWeek')}
        </Text>
        {views ? (
          <Pressable
            onPress={() => router.push(Routes.profileViews)}
            accessibilityRole="button"
            accessibilityLabel={t('views.homeTitle', { count: views.total })}
            testID="your-week-views"
            style={({ pressed }) => [row(0), { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={roundIcon(colors.primarySoft)}>
              <Eye size={19} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text variant="bodyStrong" numberOfLines={2}>
                {t('views.homeTitle', { count: views.total })}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {views.professional > 0
                  ? t('views.homeProfessional', { count: views.professional })
                  : t('views.homeEmptyBody')}
              </Text>
            </View>
            {views.new_since_seen > 0 ? (
              <Badge label={t('views.newBadge', { count: views.new_since_seen })} tone="primary" />
            ) : (
              <ChevronForward size={18} color={colors.textMuted} />
            )}
          </Pressable>
        ) : null}
        {challenge ? (
          <Pressable
            onPress={() => router.push(Routes.challenge(challenge.id))}
            accessibilityRole="button"
            accessibilityLabel={challenge.title}
            testID="your-week-challenge"
            style={({ pressed }) => [row(views ? 1 : 0), { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={roundIcon(theme.alpha(LogoColors.flame, theme.scheme === 'dark' ? 0.2 : 0.12))}>
              <Flame size={19} color={LogoColors.flame} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {challenge.title}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {metaLine(
                  deadlineLabel(challenge.closes_at),
                  t('challenges.entries', { count: challenge.entry_count }),
                )}
              </Text>
            </View>
            <Badge
              label={t(challenge.my_entry_id ? 'challenges.homeEnteredCta' : 'challenges.homeCta')}
              tone="flame"
            />
          </Pressable>
        ) : null}
      </View>
    );
  }

  const card = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
  };
  const tile = {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View style={{ gap: spacing.sm }} testID="your-week">
      {views ? (
        <Pressable
          onPress={() => router.push(Routes.profileViews)}
          accessibilityRole="button"
          accessibilityLabel={t('views.homeTitle', { count: views.total })}
          testID="your-week-views"
          style={({ pressed }) => ({
            ...card,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.85 : 1,
            shadowColor: '#140C46',
            shadowOpacity: 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 5,
          })}
        >
          {faces.length > 0 ? (
            /* Who looked: the verified coaches and clubs, overlapping, then
               a +N for everybody else. */
            <View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={{ flexDirection: 'row' }}
            >
              {faces.map((viewer, i) => (
                <View
                  key={viewer.user_id}
                  style={{
                    marginStart: i === 0 ? 0 : -FACE_OVERLAP,
                    borderRadius: FACE / 2,
                    borderWidth: 2.5,
                    borderColor: colors.surface,
                  }}
                >
                  <Avatar uri={viewer.avatar_url} name={viewer.full_name} size="xs" />
                </View>
              ))}
              {others > 0 ? (
                <View
                  style={{
                    marginStart: -FACE_OVERLAP,
                    minWidth: FACE,
                    height: FACE,
                    paddingHorizontal: 4,
                    borderRadius: FACE / 2,
                    borderWidth: 2.5,
                    borderColor: colors.surface,
                    backgroundColor: colors.success,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text variant="captionStrong" color="#FFFFFF" style={{ fontSize: 10 }}>
                    {`+${others > 99 ? 99 : others}`}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            /* Nobody verified looked: a calm green eye. */
            <View style={[tile, { backgroundColor: theme.alpha(colors.success, 0.14) }]}>
              <Eye size={19} color={colors.success} />
            </View>
          )}

          <View style={{ flex: 1, gap: 3, paddingEnd: spacing.sm }}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {t('views.homeTitle', { count: views.total })}
            </Text>
            {faces.length > 0 ? (
              <Text variant="caption" tone="muted" numberOfLines={2}>
                {includingParts.map((part, i) =>
                  part === '{{name}}' ? (
                    <Text key={i} variant="captionStrong">
                      {firstName}
                    </Text>
                  ) : (
                    part
                  ),
                )}
                {views.new_since_seen > 0 ? (
                  <>
                    {' · '}
                    <Text variant="captionStrong" tone="success">
                      {t('views.newBadge', { count: views.new_since_seen })}
                    </Text>
                  </>
                ) : null}
              </Text>
            ) : (
              <Text variant="caption" tone="muted" numberOfLines={2}>
                {views.professional > 0
                  ? t('views.homeProfessional', { count: views.professional })
                  : t('views.homeEmptyBody')}
              </Text>
            )}
          </View>

          {/* Decorative: the whole card is already the way in. */}
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={{ alignItems: 'flex-end', gap: 6 }}
          >
            {faces.length === 0 && views.new_since_seen > 0 ? (
              <Badge label={t('views.newBadge', { count: views.new_since_seen })} tone="success" />
            ) : null}
            <ChevronForward size={18} color={colors.textMuted} />
          </View>
          {pinned ? null : close(putAwayViews, colors.textMuted, 'your-week-views-close')}
        </Pressable>
      ) : null}

      {challenge ? (
        <Pressable
          onPress={() => router.push(Routes.challenge(challenge.id))}
          accessibilityRole="button"
          accessibilityLabel={challenge.title}
          testID="your-week-challenge"
          style={({ pressed }) => ({
            ...card,
            backgroundColor: CHALLENGE_FILL,
            opacity: pressed ? 0.9 : 1,
            shadowColor: CHALLENGE_FILL,
            shadowOpacity: 0.3,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          })}
        >
          <View style={[tile, { backgroundColor: theme.alpha(ON_OMBRE, 0.25) }]}>
            <Flame size={19} color={ON_OMBRE} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" color={ON_OMBRE} numberOfLines={1}>
              {challenge.title}
            </Text>
            <Text variant="caption" color={theme.alpha(ON_OMBRE, 0.88)} numberOfLines={1}>
              {metaLine(
                deadlineLabel(challenge.closes_at),
                t('challenges.entries', { count: challenge.entry_count }),
              )}
            </Text>
          </View>
          <Text variant="captionStrong" color={ON_OMBRE}>
            {t(challenge.my_entry_id ? 'challenges.homeEnteredCta' : 'challenges.homeCta')}
          </Text>
          {pinned ? null : close(() => putAwayChallenge(challenge.id), ON_OMBRE, 'your-week-challenge-close')}
        </Pressable>
      ) : null}
    </View>
  );
}
