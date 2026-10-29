import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Award,
  CalendarPlus,
  Camera,
  Eye,
  Megaphone,
  PenSquare,
  Radio,
  Settings2,
  ShieldCheck,
  Swords,
  Target,
  Timer,
  Users,
  UsersRound,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, Reveal, SectionHeader, Text } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { ActionTile, ActionTileGrid } from '@/components/club/manage/ActionTile';
import { InfoNote } from '@/components/settings/Notes';
import { useT } from '@/i18n';
import { type ClubMatch, type ClubPage, type VerificationStatus } from '@/lib/api.club';
import { clubLabel } from '@/lib/clubLabels';
import { compactNumber, fullDate, timeOfDay } from '@/lib/format';
import { Routes } from '@/lib/routes';

const VERIFICATION_TONE: Record<VerificationStatus, BadgeTone> = {
  approved: 'success',
  pending: 'info',
  more_info: 'warning',
  rejected: 'danger',
  expired: 'warning',
};

/**
 * The page team's hub: everything a club runs, one tap each.
 *
 * Tiles are filtered by what the viewer may do, so a scorekeeper sees the
 * match and nothing else, and an editor never meets a button that refuses.
 * The screen around it (loading, the gate, the header) stays with the caller.
 */
export function ClubManageHub({ page }: { page: ClubPage }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();

  const org = page.organization;
  const orgId = org.id;
  const viewer = page.viewer;
  const verified = org.verification_status === 'approved';
  const note = page.verification?.review_note ?? null;
  const play = theme.play;

  const matchLine = (m: ClubMatch) =>
    t('clubManage.hub.matchLine', {
      opponent: m.opponent_name,
      when: `${fullDate(m.kickoff_at)} · ${timeOfDay(m.kickoff_at)}`,
    });

  const stats = [
    { key: 'followers', label: t('clubManage.hub.statFollowers'), value: org.followers_count },
    { key: 'posts', label: t('clubManage.hub.statPosts'), value: page.counts.posts },
    { key: 'players', label: t('clubManage.hub.statPlayers'), value: page.counts.players },
    { key: 'awards', label: t('clubManage.hub.statAwards'), value: page.counts.awards },
    { key: 'events', label: t('clubManage.hub.statEvents'), value: page.counts.open_events },
  ];

  return (
    <View style={{ gap: spacing.xl, paddingBottom: spacing.xl }}>
      {/* Who and what */}
      <Reveal>
        <Card padded level={1} style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <ClubLogo uri={org.logo_url} name={org.name} size="lg" />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text variant="heading" numberOfLines={2}>
                {org.name}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <Badge
                  label={clubLabel(t, 'verification', org.verification_status)}
                  tone={VERIFICATION_TONE[org.verification_status] ?? 'neutral'}
                  icon={verified ? <ShieldCheck size={12} color={colors.success} /> : undefined}
                />
                {viewer.role ? (
                  <Badge
                    label={t('clubManage.hub.yourRole', { role: clubLabel(t, 'role', viewer.role) })}
                    tone="primary"
                  />
                ) : null}
              </View>
            </View>
          </View>

          {!verified ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="caption" tone="secondary">
                {t(
                  org.verification_status === 'pending' && page.verification?.submitted_at
                    ? 'clubManage.hub.verifyChecking'
                    : 'clubManage.hub.verifyWhy',
                )}
              </Text>
              {note ? (
                <InfoNote tone="warning" icon="warning">
                  {t('clubManage.hub.reviewNote', { note })}
                </InfoNote>
              ) : null}
              {viewer.can_manage ? (
                <Button
                  label={t('clubManage.hub.finishVerification')}
                  size="sm"
                  variant="secondary"
                  icon={<ShieldCheck size={16} color={colors.primary} />}
                  onPress={() => router.push(Routes.clubEdit(orgId, { section: 'verification' }))}
                  testID="club-manage-verify"
                />
              ) : null}
            </View>
          ) : null}
        </Card>
      </Reveal>

      {/* Numbers */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {stats.map((s) => (
          <View
            key={s.key}
            style={{
              flexGrow: 1,
              flexBasis: '18%',
              minWidth: 64,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.xs,
              borderRadius: theme.radii.md,
              backgroundColor: colors.surfaceAlt,
              alignItems: 'center',
            }}
          >
            <Text variant="stat">{compactNumber(s.value)}</Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {/* The match, for whoever keeps the score */}
      {viewer.can_score && (page.live_match || page.next_match) ? (
        <View>
          <SectionHeader title={t('clubManage.hub.sectionScore')} />
          {page.live_match ? (
            <ActionTile
              wide
              live
              icon={Radio}
              hue={colors.danger}
              title={t('clubManage.hub.liveNow')}
              hint={matchLine(page.live_match)}
              onPress={() => router.push(Routes.match(page.live_match!.id))}
              testID="club-manage-live"
            />
          ) : page.next_match ? (
            <ActionTile
              wide
              icon={Timer}
              hue={play.azure}
              title={t('clubManage.hub.nextMatch')}
              hint={matchLine(page.next_match)}
              onPress={() => router.push(Routes.match(page.next_match!.id))}
              testID="club-manage-next"
            />
          ) : null}
        </View>
      ) : null}

      {/* Content */}
      {viewer.can_post ? (
        <View>
          <SectionHeader title={t('clubManage.hub.sectionContent')} />
          <ActionTileGrid>
            <ActionTile
              icon={PenSquare}
              hue={play.flame}
              title={t('clubManage.hub.newPost')}
              hint={t('clubManage.hub.newPostHint')}
              onPress={() => router.push(Routes.compose)}
              testID="club-manage-post"
            />
            <ActionTile
              icon={Camera}
              hue={play.magenta}
              title={t('clubManage.hub.newStory')}
              hint={t('clubManage.hub.newStoryHint')}
              onPress={() => router.push(Routes.newStory)}
              testID="club-manage-story"
            />
            <ActionTile
              icon={Swords}
              hue={play.azure}
              title={t('clubManage.hub.newMatch')}
              hint={t('clubManage.hub.newMatchHint')}
              onPress={() => router.push(Routes.clubMatchEdit(orgId))}
              testID="club-manage-match"
            />
            <ActionTile
              icon={CalendarPlus}
              hue={play.mint}
              title={t('clubManage.hub.newEvent')}
              hint={t('clubManage.hub.newEventHint')}
              onPress={() => router.push(Routes.clubEventEdit(orgId))}
              testID="club-manage-event"
            />
            <ActionTile
              icon={Target}
              hue={play.violet}
              title={t('clubManage.hub.newChallenge')}
              hint={t(org.is_verified ? 'clubManage.hub.newChallengeHint' : 'clubManage.hub.challengeNeedsVerified')}
              onPress={() =>
                router.push({ pathname: Routes.newChallenge, params: { org: orgId } })
              }
              testID="club-manage-challenge"
            />
            <ActionTile
              icon={UsersRound}
              hue={play.cyan}
              title={t('clubManage.hub.squads')}
              hint={t('clubManage.hub.squadsHint')}
              onPress={() => router.push(Routes.clubSquads(orgId))}
              testID="club-manage-squads"
            />
            <ActionTile
              icon={Award}
              hue={play.amber}
              title={t('clubManage.hub.addAward')}
              hint={t('clubManage.hub.addAwardHint')}
              onPress={() => router.push(Routes.clubAward(orgId))}
              testID="club-manage-award"
            />
          </ActionTileGrid>
        </View>
      ) : null}

      {/* Running the page */}
      {viewer.can_manage ? (
        <View>
          <SectionHeader title={t('clubManage.hub.sectionManage')} />
          <ActionTileGrid>
            <ActionTile
              icon={Megaphone}
              hue={play.flame}
              title={t('clubManage.hub.announcement')}
              hint={t('clubManage.hub.announcementHint')}
              onPress={() => router.push(Routes.clubBroadcast(orgId))}
              testID="club-manage-broadcast"
            />
            <ActionTile
              icon={Users}
              hue={play.violet}
              title={t('clubManage.hub.pageTeam')}
              hint={t('clubManage.hub.pageTeamHint')}
              onPress={() => router.push(Routes.clubTeam(orgId))}
              testID="club-manage-team"
            />
            <ActionTile
              icon={Settings2}
              hue={play.azure}
              title={t('clubManage.hub.editPage')}
              hint={t('clubManage.hub.editPageHint')}
              onPress={() => router.push(Routes.clubEdit(orgId))}
              testID="club-manage-edit"
            />
          </ActionTileGrid>
        </View>
      ) : viewer.role ? (
        <Button
          label={t('clubManage.hub.pageTeam')}
          variant="secondary"
          icon={<Users size={18} color={colors.text} />}
          onPress={() => router.push(Routes.clubTeam(orgId))}
          testID="club-manage-team"
        />
      ) : null}

      <ActionTile
        wide
        icon={Eye}
        hue={play.mint}
        title={t('clubManage.hub.viewPage')}
        hint={t('clubManage.hub.viewPageHint')}
        onPress={() => router.push(Routes.organization(orgId))}
        testID="club-manage-view"
      />
    </View>
  );
}
