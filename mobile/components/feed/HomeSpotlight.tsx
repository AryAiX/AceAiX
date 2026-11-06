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

/** The challenge ombre, coral to pink — the same sweep as Play's + button —
    with white words on it. */
const OMBRE: [string, string] = ['#F06A4E', '#E3428A'];
const ON_OMBRE = '#FFFFFF';

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
  /* With a challenge on, the whole block wears the coral → pink ombre, white
     words on it. Without one it stays a plain card. */
  const sunny = !!challenge;
  const onTile = theme.alpha('#FFFFFF', 0.22);

  if (views) {
    rows.push(
      <ListItem
        key="views"
        inset
        onColor={sunny ? ON_OMBRE : undefined}
        title={t('views.homeTitle', { count: views.total })}
        subtitle={
          views.professional > 0
            ? t('views.homeProfessional', { count: views.professional })
            : t('views.homeEmptyBody')
        }
        left={
          <RowIcon color={colors.info} fill={sunny ? onTile : undefined}>
            <Eye size={18} color={sunny ? ON_OMBRE : colors.info} />
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
        onColor={ON_OMBRE}
        title={challenge.title}
        subtitle={metaLine(
          t('challenges.homeTitle'),
          deadlineLabel(challenge.closes_at),
          t('challenges.entries', { count: challenge.entry_count }),
        )}
        left={
          <RowIcon color={colors.warning} fill={onTile}>
            <Flame size={18} color={ON_OMBRE} strokeWidth={2.4} />
          </RowIcon>
        }
        right={
          <Text variant="captionStrong" color={ON_OMBRE}>
            {t(challenge.my_entry_id ? 'challenges.homeEnteredCta' : 'challenges.homeCta')}
          </Text>
        }
        onPress={() => router.push(Routes.challenge(challenge.id))}
        testID="your-week-challenge"
      />,
    );
  }

  return (
    <Card
      padded={false}
      style={sunny ? { overflow: 'hidden', borderWidth: 0 } : undefined}
      testID="your-week"
    >
      {sunny ? (
        <LinearGradient
          colors={OMBRE}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Text
        variant="overline"
        color={sunny ? ON_OMBRE : undefined}
        tone={sunny ? undefined : 'muted'}
        style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}
      >
        {t('feed.yourWeek')}
      </Text>
      {rows.map((row, index) => (
        <React.Fragment key={row.key ?? index}>
          {index > 0 ? (
            sunny ? (
              <View style={{ height: 1, marginLeft: spacing.lg, backgroundColor: theme.alpha('#FFFFFF', 0.3) }} />
            ) : (
              <Divider inset={spacing.lg} />
            )
          ) : null}
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
