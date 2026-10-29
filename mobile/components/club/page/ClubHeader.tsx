import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, ChevronRight, Settings2, ShieldCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Text } from '@/components/ui';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { countryLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import type { ClubPage } from '@/lib/api.club';
import { clubLabel } from '@/lib/clubLabels';
import { COVER_ASPECT } from '@/lib/coverCrop';
import { compactNumber, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';

const LOGO = 72;
const RING = 3;

interface Props {
  page: ClubPage;
  following: boolean;
  followers: number;
  followBusy: boolean;
  onToggleFollow: () => void;
}

/**
 * Cover, crest, name and the two buttons people come for: Follow, and — for
 * the page team — Manage.
 */
export function ClubHeader({ page, following, followers, followBusy, onToggleFollow }: Props) {
  const t = useT();
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const router = useRouter();

  const org = page.organization;
  const viewer = page.viewer;
  const story = page.story;
  const team = viewer.can_manage || viewer.can_post || viewer.can_score;

  const place = metaLine(org.city, countryLabel(t, org.country));
  const meta = metaLine(
    clubLabel(t, 'type', org.type),
    place,
    org.founded_year ? t('club.page.founded', { year: org.founded_year }) : null,
  );
  const followerLabel = t('opportunities.org.followers', {
    count: followers,
    value: compactNumber(followers),
  });

  /* The crest: a rounded square, framed by the story sweep when the page has
     one live — bright while unseen, a quiet line once watched. */
  const crest = (
    <ClubLogo uri={org.logo_url} name={org.name} size="lg" style={{ borderRadius: radii.lg - RING }} />
  );
  const frameRadius = radii.lg + RING;
  const logo = story ? (
    <Pressable
      onPress={() => router.push(Routes.storyOf(story.author_id))}
      accessibilityRole="button"
      accessibilityLabel={t('club.page.storyA11y', { name: org.name })}
      testID="club-story"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, alignSelf: 'flex-start' })}
    >
      {story.unseen > 0 ? (
        <LinearGradient
          colors={[theme.gradients.action[0], theme.gradients.action[1], theme.gradients.party[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: RING, borderRadius: frameRadius }}
        >
          <View style={{ padding: 2, backgroundColor: colors.bg, borderRadius: radii.lg }}>{crest}</View>
        </LinearGradient>
      ) : (
        <View
          style={{
            padding: 2,
            borderWidth: 1.5,
            borderColor: colors.borderStrong,
            borderRadius: frameRadius,
            backgroundColor: colors.bg,
          }}
        >
          {crest}
        </View>
      )}
    </Pressable>
  ) : (
    <View
      style={{
        alignSelf: 'flex-start',
        padding: RING,
        backgroundColor: colors.bg,
        borderRadius: frameRadius,
        width: LOGO + RING * 2,
      }}
    >
      {crest}
    </View>
  );

  const verification = page.verification;
  const showStatus = viewer.can_manage && !org.is_verified;

  return (
    <View>
      {/* Cover. Same wide band as a profile cover, so a cropped photo fills it. */}
      <View
        style={{
          width: '100%',
          aspectRatio: COVER_ASPECT,
          backgroundColor: colors.surfaceAlt,
          borderBottomLeftRadius: radii.xl,
          borderBottomRightRadius: radii.xl,
          overflow: 'hidden',
        }}
      >
        {org.cover_url ? (
          <Image
            source={{ uri: org.cover_url }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <LinearGradient
            colors={theme.gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        {/* The crest laps onto the cover, the way a badge sits on a shirt. */}
        <View
          style={{
            marginTop: -spacing.huge,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          {logo}
          {team ? (
            <Button
              label={t('club.page.manage')}
              size="sm"
              icon={<Settings2 size={16} color={colors.textOnBrand} />}
              onPress={() => router.push(Routes.clubManage(org.id))}
              accessibilityLabel={t('club.page.manageA11y', { name: org.name })}
              testID="club-manage"
            />
          ) : null}
        </View>

        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text variant="title" style={{ flexShrink: 1 }} numberOfLines={2}>
              {org.name}
            </Text>
            {org.is_verified ? (
              <BadgeCheck
                size={20}
                color={colors.info}
                fill={colors.infoSoft}
                strokeWidth={2.2}
                accessibilityLabel={clubLabel(t, 'verification', 'approved')}
              />
            ) : null}
          </View>
          {org.name_local ? (
            <Text variant="bodyStrong" tone="secondary">
              {org.name_local}
            </Text>
          ) : null}
          {meta ? (
            <Text variant="caption" tone="muted">
              {meta}
            </Text>
          ) : null}
        </View>

        {page.sports.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {page.sports.map((s) => (
              <Badge key={s.sport} label={sportLabel(t, s.sport)} tone="primary" />
            ))}
          </View>
        ) : null}

        {showStatus ? (
          <Pressable
            onPress={() => router.push(Routes.clubEdit(org.id, { section: 'verification' }))}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              minHeight: theme.hit.min,
              paddingHorizontal: spacing.md,
              borderRadius: radii.md,
              backgroundColor: colors.warningSoft,
              opacity: pressed ? 0.8 : 1,
            })}
            testID="club-verification"
          >
            <ShieldCheck size={16} color={colors.warning} />
            <Text variant="captionStrong" color={colors.warning} style={{ flex: 1 }}>
              {verification?.submitted_at
                ? clubLabel(t, 'verification', org.verification_status)
                : t('club.page.getVerified')}
            </Text>
            <ChevronRight size={16} color={colors.warning} />
          </Pressable>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Text variant="captionStrong" tone="secondary" style={{ flex: 1 }}>
            {followerLabel}
          </Text>
          {team ? null : (
            <Button
              label={following ? t('common.following') : t('common.follow')}
              variant={following ? 'secondary' : 'primary'}
              size="sm"
              loading={followBusy}
              onPress={onToggleFollow}
              accessibilityLabel={
                following
                  ? t('opportunities.org.unfollowA11y', { name: org.name })
                  : t('opportunities.org.followA11y', { name: org.name })
              }
              testID="club-follow"
            />
          )}
        </View>
      </View>
    </View>
  );
}
