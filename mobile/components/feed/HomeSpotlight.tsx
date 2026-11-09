import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, ArrowRight, Eye, Flame, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Text, isRTL } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/providers/AuthProvider';
import { openChallenges, profileViewDigest } from '@/lib/api';
import { Routes } from '@/lib/routes';
import { deadlineLabel, metaLine } from '@/lib/format';
import { useT } from '@/i18n';
import { isChallengeLive } from '@/components/challenges/ChallengeCard';

/** The challenge ombre, coral to pink — the same sweep as Play's + button —
    with white words on it. */
/* The challenge card is one solid flame orange, no ombre. */
const CHALLENGE_FILL = '#FF7A2C';
const ON_OMBRE = '#FFFFFF';

/** The flame red-orange of the AceAiX logo: the views title label and its arrow.
    The same in light and dark mode. */
const FLAME_LABEL = '#F04A23';
/** Points the way "forward" reads: right, or left in Arabic. */
const ArrowForward = isRTL ? ArrowLeft : ArrowRight;

/* Profile views: put away until someone new looks. What was on screen when
   the × was tapped is kept on the phone, and the pop-up comes back as soon as
   the total or the "new" count goes past it. */
const VIEWS_BASELINE = 'home.yourWeek.viewsBaseline';
/* Keys from the first version, cleared once so nothing old lingers. */
const OLD_KEYS = ['home.yourWeek.dismissedViews', 'home.yourWeek.dismissedChallenge'];

type ViewsBaseline = { total: number; fresh: number };

async function readViewsBaseline(): Promise<ViewsBaseline | null> {
  try {
    const raw = await AsyncStorage.getItem(VIEWS_BASELINE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ViewsBaseline>;
    return typeof parsed.total === 'number' && typeof parsed.fresh === 'number'
      ? { total: parsed.total, fresh: parsed.fresh }
      : null;
  } catch {
    return null;
  }
}

function saveViewsBaseline(baseline: ViewsBaseline | null) {
  const write = baseline
    ? AsyncStorage.setItem(VIEWS_BASELINE, JSON.stringify(baseline))
    : AsyncStorage.removeItem(VIEWS_BASELINE);
  write.catch(() => undefined);
}

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
 * own like a notification and can be put away with its ×: the views pop-up
 * comes back with the next new view, the challenge the next time the app is
 * opened from closed. Notifications shows both, always. The Talent
 * Score lives on Profile only, so Home is not one more place to watch a
 * number. With nothing to say, nothing is shown.
 */
export function HomeSpotlight({
  showChallenge = true,
  pinned = false,
}: {
  showChallenge?: boolean;
  /** Notifications: always shown, no ×, whatever was put away on Home. */
  pinned?: boolean;
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
  const challenges = useAsync(() => openChallenges(null, 5, 0), [], {
    enabled: !isGuardian,
    refetchOnFocus: true,
  });

  /* undefined until the phone has been read, so a put-away pop-up does not
     flash up for a moment on every open. */
  const [baseline, setBaseline] = useState<ViewsBaseline | null | undefined>(undefined);
  const [challengePutAway, setChallengePutAway] = useState<string | null>(challengePutAwayThisRun);
  useEffect(() => {
    void readViewsBaseline().then(setBaseline);
    AsyncStorage.multiRemove(OLD_KEYS).catch(() => undefined);
  }, []);

  const rawViews = isAthlete && digest.data && digest.data.total > 0 ? digest.data : null;

  /* The week is a rolling seven days, so the total can drop as old views age
     out, and opening the list resets the "new" count. Follow both down, so the
     next new view is always a step up from where things stand. */
  useEffect(() => {
    if (!baseline || !digest.data) return;
    const total = Math.min(baseline.total, digest.data.total);
    const fresh = Math.min(baseline.fresh, digest.data.new_since_seen);
    if (total !== baseline.total || fresh !== baseline.fresh) {
      const next = { total, fresh };
      setBaseline(next);
      saveViewsBaseline(next);
    }
  }, [baseline, digest.data]);

  // Parents cannot enter challenges, so the card has nothing for them (QA-151).
  // Home's Following tab is people, so the challenge card stays on Playfeed;
  // Notifications always shows it.
  const rawChallenge =
    isGuardian || (!showChallenge && !pinned)
      ? null
      : ((challenges.data ?? []).find(isChallengeLive) ?? null);

  const somethingNew =
    baseline === null ||
    (baseline !== undefined &&
      rawViews != null &&
      (rawViews.total > baseline.total || rawViews.new_since_seen > baseline.fresh));
  const views = rawViews && (pinned || somethingNew) ? rawViews : null;
  const challenge =
    rawChallenge && (pinned || challengePutAway !== rawChallenge.id) ? rawChallenge : null;

  if (!views && !challenge) return null;

  const putAwayViews = () => {
    if (!rawViews) return;
    const next = { total: rawViews.total, fresh: rawViews.new_since_seen };
    setBaseline(next);
    saveViewsBaseline(next);
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
          <View style={[tile, { backgroundColor: colors.primary }]}>
            <Eye size={19} color={ON_OMBRE} />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <View
              style={{
                alignSelf: 'flex-start',
                maxWidth: '100%',
                backgroundColor: FLAME_LABEL,
                borderRadius: 7,
                paddingVertical: 5,
                paddingHorizontal: 9,
              }}
            >
              {/* Two lines at most: with the arrow and the × beside it, one
                  line cut the title short on an ordinary phone. */}
              <Text variant="captionStrong" color="#FFFFFF" numberOfLines={2}>
                {t('views.homeTitle', { count: views.total })}
              </Text>
            </View>
            {/* The "new" badge rides on the subtitle line, so the title gets the width. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {views.new_since_seen > 0 ? (
                <Badge label={t('views.newBadge', { count: views.new_since_seen })} tone="primary" />
              ) : null}
              <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                {views.professional > 0
                  ? t('views.homeProfessional', { count: views.professional })
                  : t('views.homeEmptyBody')}
              </Text>
            </View>
          </View>
          {/* Decorative: the whole card is already the way in. */}
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: theme.alpha(FLAME_LABEL, 0.12),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowForward size={17} color={FLAME_LABEL} strokeWidth={2.4} />
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
