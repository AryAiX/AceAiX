import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, Flame } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, Divider, ListItem, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/providers/AuthProvider';
import { openChallenges, profileViewDigest } from '@/lib/api';
import { Routes } from '@/lib/routes';
import { deadlineLabel, metaLine } from '@/lib/format';
import { useT } from '@/i18n';

/** Ink for words and icons on the sunny ombre: dark enough to read on yellow. */
const WARM_INK = '#9A3A06';

/**
 * Your week — the block above the feed.
 *
 * Two things Home already had, in one place: who has been reading your
 * profile, and what a coach has asked for this week. The Talent Score lives on
 * Profile only, so Home is not one more place to watch a number. Nothing
 * counts down, nothing says you are behind, a row with nothing to say is left
 * out — and with nothing at all, so is the block.
 */
export function HomeSpotlight({ showChallenge = true }: { showChallenge?: boolean } = {}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
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

  const views = isAthlete && digest.data && digest.data.total > 0 ? digest.data : null;
  // Parents cannot enter challenges, so the row has nothing for them (QA-151).
  // Home's Following tab is people, so the challenge row stays on Playfeed.
  const challenge = isGuardian || !showChallenge
    ? null
    : ((challenges.data ?? []).find((c) => c.status === 'open') ?? null);

  if (!views && !challenge) return null;

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
          <RowIcon color={colors.warning} fill={theme.alpha('#FFFFFF', 0.7)}>
            <Flame size={18} color={WARM_INK} strokeWidth={2.4} />
          </RowIcon>
        }
        right={
          <Text variant="captionStrong" color={WARM_INK}>
            {t(challenge.my_entry_id ? 'challenges.homeEnteredCta' : 'challenges.homeCta')}
          </Text>
        }
        onPress={() => router.push(Routes.challenge(challenge.id))}
        testID="your-week-challenge"
      />,
    );
  }

  /* With a challenge on, the whole block wears a sunny yellow → orange ombre
     (mostly yellow) and a warm rim: a challenge has a clock on it, and warm is
     the colour of time. Without one it stays a plain card. */
  const sunny = !!challenge;

  return (
    <Card
      padded={false}
      style={sunny ? { overflow: 'hidden', borderWidth: 1.5, borderColor: theme.play.amber } : undefined}
      testID="your-week"
    >
      {sunny ? (
        <LinearGradient
          colors={[
            theme.alpha(theme.colors.sun, 0.62),
            theme.alpha(theme.play.amber, 0.5),
            theme.alpha(theme.play.flame, 0.42),
          ]}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Text
        variant="overline"
        color={sunny ? WARM_INK : undefined}
        tone={sunny ? undefined : 'muted'}
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
function RowIcon({
  color,
  fill,
  children,
}: {
  color: string;
  /** Overrides the tint, e.g. a light chip on the ombre. */
  fill?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: theme.radii.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: fill ?? theme.alpha(color, 0.14),
      }}
    >
      {children}
    </View>
  );
}
