import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Eye, Flame } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  AnimatedGradient,
  AnimatedNumber,
  Reveal,
  Shine,
  Tappable,
  Text,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/providers/AuthProvider';
import { openChallenges, profileViewDigest } from '@/lib/api';
import { Routes } from '@/lib/routes';
import { deadlineLabel } from '@/lib/format';
import { useT } from '@/i18n';

/**
 * The two things above the feed.
 *
 * Both answer "why open this today" without asking for anything: who has been
 * reading your profile, and what a coach has asked for this week. Neither
 * counts down, neither says you are behind, and both disappear entirely when
 * there is nothing to say — an empty card is worse than no card.
 *
 * They used to be ordinary cards under a 20%-opacity tint, which on the light
 * scheme is a white card with a suggestion of colour on one corner. They are
 * now the colour: a full gradient, white type, and a highlight that crosses
 * every few seconds. These are the two tiles at the top of the app's first
 * screen, and they should look like the best thing on it.
 */
/* Both tiles are saturated in either scheme, so their type is white in either
   scheme — this is one of the few places a literal belongs over a token. */
const ON_COLOUR = '#FFFFFF';
const SOFT_ON_COLOUR = 'rgba(255,255,255,0.82)';

export function HomeSpotlight() {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();
  const router = useRouter();
  const { profile } = useAuth();

  const isAthlete = profile?.role === 'athlete';

  const digest = useAsync(() => profileViewDigest(7), [], {
    enabled: isAthlete,
    refetchOnFocus: true,
  });
  const challenges = useAsync(() => openChallenges(null, 5, 0), [], { refetchOnFocus: true });

  const views = digest.data;
  const challenge = (challenges.data ?? []).find((c) => c.status === 'open') ?? null;

  if (!views?.total && !challenge) return null;

  return (
    <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
      {isAthlete && views && views.total > 0 ? (
        <Reveal from="scale">
          <Tappable
            onPress={() => router.push(Routes.profileViews)}
            accessibilityLabel={t('views.title')}
          >
            <AnimatedGradient
              colors={theme.gradients.cool}
              period={11}
              radius={theme.radii.lg}
              style={theme.elevation(2)}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.lg,
                }}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.22)',
                  }}
                >
                  <Eye size={22} color={ON_COLOUR} />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <AnimatedNumber value={views.total} variant="stat" color={ON_COLOUR} />
                    <Text
                      variant="bodyStrong"
                      color={ON_COLOUR}
                      numberOfLines={1}
                      style={{ flex: 1 }}
                    >
                      {t('views.title')}
                    </Text>
                  </View>
                  <Text variant="caption" color={SOFT_ON_COLOUR} numberOfLines={1}>
                    {views.professional > 0
                      ? t('views.homeProfessional', { count: views.professional })
                      : t('views.homeEmptyBody')}
                  </Text>
                </View>

                {views.new_since_seen > 0 ? (
                  /* `Badge` paints from the palette, and every one of its tones
                     is tuned for a surface — on a saturated tile they all read
                     as smudges. White pill, tile-coloured type. */
                  <View
                    style={{
                      backgroundColor: ON_COLOUR,
                      borderRadius: 999,
                      paddingHorizontal: spacing.sm + 2,
                      paddingVertical: 3,
                    }}
                  >
                    <Text variant="overline" color={theme.gradients.cool[2]}>
                      {t('views.newBadge', { count: views.new_since_seen })}
                    </Text>
                  </View>
                ) : (
                  <ChevronRight size={18} color={SOFT_ON_COLOUR} />
                )}
              </View>
              <Shine every={6} radius={theme.radii.lg} />
            </AnimatedGradient>
          </Tappable>
        </Reveal>
      ) : null}

      {challenge ? (
        <Reveal from="scale" index={1}>
          <Tappable
            onPress={() => router.push(Routes.challenge(challenge.id))}
            accessibilityLabel={challenge.title}
          >
            <AnimatedGradient
              colors={theme.gradients.warm}
              period={9}
              radius={theme.radii.lg}
              style={theme.elevation(2)}
            >
              <View style={{ padding: spacing.lg, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Flame size={14} color={ON_COLOUR} />
                  <Text variant="overline" color={ON_COLOUR}>
                    {t('challenges.homeTitle')}
                  </Text>
                </View>

                <Text variant="subheading" color={ON_COLOUR} numberOfLines={2}>
                  {challenge.title}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: spacing.xs,
                  }}
                >
                  <Text variant="caption" color={SOFT_ON_COLOUR}>
                    {deadlineLabel(challenge.closes_at) ?? ''}
                    {' · '}
                    {t('challenges.entries', { count: challenge.entry_count })}
                  </Text>
                  <Text variant="captionStrong" color={ON_COLOUR}>
                    {t(challenge.my_entry_id ? 'challenges.homeEnteredCta' : 'challenges.homeCta')}
                  </Text>
                </View>
              </View>
              <Shine every={8} radius={theme.radii.lg} />
            </AnimatedGradient>
          </Tappable>
        </Reveal>
      ) : null}

    </View>
  );
}
