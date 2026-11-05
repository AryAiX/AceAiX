import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, Flame, Gauge } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import { Badge, Card, Divider, ListItem, Text } from '@/components/ui';
import { tierLabel } from '@/components/discover/MatchBadge';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/providers/AuthProvider';
import { useProgress } from '@/providers/ProgressProvider';
import { openChallenges, profileViewDigest } from '@/lib/api';
import { Routes } from '@/lib/routes';
import { deadlineLabel, metaLine } from '@/lib/format';
import { useT } from '@/i18n';

/**
 * Your week — the block above the feed.
 *
 * Three things Home already had, in one place: who has been reading your
 * profile, where your Talent Score stands, and what a coach has asked for this
 * week. The views and the challenge load here, as they always did; the score
 * is the snapshot ProgressProvider holds for the whole app (the streak chip in
 * the header reads the same one). Nothing counts down, nothing says you are
 * behind, a row with nothing to say is left out — and with nothing at all, so
 * is the block.
 */
export function HomeSpotlight() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const { profile, isGuardian } = useAuth();
  const { progress } = useProgress();

  const isAthlete = profile?.role === 'athlete';

  const digest = useAsync(() => profileViewDigest(7), [], {
    enabled: isAthlete,
    refetchOnFocus: true,
  });
  const challenges = useAsync(() => openChallenges(null, 5, 0), [], {
    enabled: !isGuardian,
    refetchOnFocus: true,
  });

  const views = isAthlete && digest.data && digest.data.total > 0 ? digest.data : null;
  const score = progress?.score ?? null;
  // Parents cannot enter challenges, so the row has nothing for them (QA-151).
  const challenge = isGuardian
    ? null
    : ((challenges.data ?? []).find((c) => c.status === 'open') ?? null);

  if (!views && !score && !challenge) return null;

  const rows: React.ReactElement[] = [];

  if (views) {
    rows.push(
      <ListItem
        key="views"
        inset
        title={t('views.homeTitle', { count: views.total })}
        subtitle={
          views.professional > 0
            ? t('views.homeProfessional', { count: views.professional })
            : t('views.homeEmptyBody')
        }
        left={
          <RowIcon color={colors.info}>
            <Eye size={18} color={colors.info} />
          </RowIcon>
        }
        right={
          views.new_since_seen > 0 ? (
            <Badge label={t('views.newBadge', { count: views.new_since_seen })} tone="primary" />
          ) : undefined
        }
        onPress={() => router.push(Routes.profileViews)}
        testID="your-week-views"
      />,
    );
  }

  if (score) {
    /* Derived from the number, as ScoreCard does, so a tier string the client
       does not know can never index past TierColors. */
    const tier = tierForScore(score.overall);
    const tierColor = TierColors[tier];
    rows.push(
      <ListItem
        key="score"
        inset
        title={t('common.talentScore')}
        subtitle={t('score.tierLine', { tier: tierLabel(t, tier) })}
        left={
          <RowIcon color={tierColor}>
            <Gauge size={18} color={tierColor} />
          </RowIcon>
        }
        right={
          <Text variant="stat" color={tierColor} style={{ fontSize: 22 }}>
            {Math.round(score.overall)}
          </Text>
        }
        onPress={() => router.push(Routes.score)}
        testID="your-week-score"
      />,
    );
  }

  if (challenge) {
    rows.push(
      <ListItem
        key="challenge"
        inset
        title={challenge.title}
        subtitle={metaLine(
          t('challenges.homeTitle'),
          deadlineLabel(challenge.closes_at),
          t('challenges.entries', { count: challenge.entry_count }),
        )}
        left={
          <RowIcon color={colors.warning}>
            <Flame size={18} color={colors.warning} />
          </RowIcon>
        }
        right={
          <Text variant="captionStrong" tone="primary">
            {t(challenge.my_entry_id ? 'challenges.homeEnteredCta' : 'challenges.homeCta')}
          </Text>
        }
        onPress={() => router.push(Routes.challenge(challenge.id))}
        testID="your-week-challenge"
      />,
    );
  }

  return (
    <Card padded={false} testID="your-week">
      <Text
        variant="overline"
        tone="muted"
        style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}
      >
        {t('feed.yourWeek')}
      </Text>
      {rows.map((row, index) => (
        <React.Fragment key={row.key ?? index}>
          {index > 0 ? <Divider inset={spacing.lg} /> : null}
          {row}
        </React.Fragment>
      ))}
    </Card>
  );
}

/** A small tinted square for a row's icon. */
function RowIcon({ color, children }: { color: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: theme.radii.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.alpha(color, 0.14),
      }}
    >
      {children}
    </View>
  );
}
