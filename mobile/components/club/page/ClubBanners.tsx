import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, ChevronRight, Shirt, UserPlus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Text, useToast } from '@/components/ui';
import { sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import {
  respondClubInvite,
  respondSquadLink,
  type ClubMatch,
  type ClubPage,
  type SquadLinkForMe,
} from '@/lib/api.club';
import { scoreLine } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';
import { AppError, errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import { LiveDot } from './MatchCard';
import { whenLabel } from './shared';

/** A soft card with a line of text and Accept / Decline. */
function AskCard({
  icon,
  text,
  busy,
  onAnswer,
  extra,
  testID,
}: {
  icon: React.ReactNode;
  text: string;
  busy: 'accept' | 'decline' | null;
  onAnswer: (accept: boolean) => void;
  extra?: React.ReactNode;
  testID?: string;
}) {
  const t = useT();
  const { spacing } = useTheme();
  return (
    <Card tone="primarySoft" style={{ gap: spacing.md }} testID={testID}>
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        {icon}
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {text}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label={t('club.banners.accept')}
          size="sm"
          loading={busy === 'accept'}
          disabled={busy !== null}
          onPress={() => onAnswer(true)}
          style={{ flex: 1 }}
        />
        <Button
          label={t('club.banners.decline')}
          size="sm"
          variant="secondary"
          loading={busy === 'decline'}
          disabled={busy !== null}
          onPress={() => onAnswer(false)}
          style={{ flex: 1 }}
        />
      </View>
      {extra}
    </Card>
  );
}

function InviteBanner({ orgId, role, onDone }: { orgId: string; role: string; onDone: () => void }) {
  const t = useT();
  const toast = useToast();
  const { colors } = useTheme();
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);

  const answer = async (accept: boolean) => {
    setBusy(accept ? 'accept' : 'decline');
    try {
      await respondClubInvite(orgId, accept);
      toast.success(t(accept ? 'club.banners.inviteAccepted' : 'club.banners.inviteDeclined'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AskCard
      icon={<UserPlus size={22} color={colors.primary} />}
      text={t('club.banners.invite', { role: clubLabel(t, 'role', role) })}
      busy={busy}
      onAnswer={answer}
      testID="club-invite"
    />
  );
}

function SquadLinkBanner({
  link,
  clubName,
  onDone,
}: {
  link: SquadLinkForMe;
  clubName: string;
  onDone: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { colors } = useTheme();
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [needsGuardian, setNeedsGuardian] = useState(false);

  const answer = async (accept: boolean) => {
    setBusy(accept ? 'accept' : 'decline');
    try {
      await respondSquadLink(link.id, accept);
      toast.success(t(accept ? 'club.banners.squadAccepted' : 'club.banners.squadDeclined'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
      if (err instanceof AppError && err.hint === 'guardian_consent_required') setNeedsGuardian(true);
    } finally {
      setBusy(null);
    }
  };

  const vars = {
    club: clubName,
    category: clubLabel(t, 'category', link.category),
    sport: sportLabel(t, link.sport),
  };

  return (
    <AskCard
      icon={<Shirt size={22} color={colors.primary} />}
      text={
        link.kind === 'staff' ? t('club.banners.squadStaff', vars) : t('club.banners.squadPlayer', vars)
      }
      busy={busy}
      onAnswer={answer}
      testID={`club-squad-link-${link.id}`}
      extra={
        needsGuardian ? (
          <Button
            label={t('club.banners.guardian')}
            size="sm"
            variant="ghost"
            onPress={() => router.push(Routes.settingsGuardian)}
          />
        ) : null
      }
    />
  );
}

/** Our score first in the sentence, home first on the board. */
function LiveBanner({ match, clubName }: { match: ClubMatch; clubName: string }) {
  const t = useT();
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const router = useRouter();
  const { home, away } = scoreLine(match);
  const homeName = match.is_home ? clubName : match.opponent_name;
  const awayName = match.is_home ? match.opponent_name : clubName;
  const white = colors.textOnBrand;

  return (
    <Pressable
      onPress={() => router.push(Routes.match(match.id))}
      accessibilityRole="button"
      accessibilityLabel={t('club.banners.liveA11y', {
        home: homeName,
        homeScore: home,
        away: awayName,
        awayScore: away,
      })}
      testID="club-live-banner"
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      <View style={{ borderRadius: radii.lg, overflow: 'hidden', padding: spacing.lg, gap: spacing.sm }}>
        <LinearGradient
          colors={theme.gradients.action}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <LiveDot color={white} />
          <Text variant="overline" color={white} style={{ flex: 1 }}>
            {match.minute != null && match.status === 'live'
              ? `${t('club.banners.live')} · ${t('club.matches.minute', { n: match.minute })}`
              : match.status === 'half_time'
                ? `${t('club.banners.live')} · ${clubLabel(t, 'matchStatus', 'half_time')}`
                : t('club.banners.live')}
          </Text>
          <ChevronRight size={18} color={white} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Text variant="bodyStrong" color={white} style={{ flex: 1 }} numberOfLines={2}>
            {homeName}
          </Text>
          <Text variant="display" color={white}>
            {`${home} – ${away}`}
          </Text>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text variant="bodyStrong" color={white} numberOfLines={2}>
              {awayName}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function NextMatchBanner({ match }: { match: ClubMatch }) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const router = useRouter();

  return (
    <Card
      tone="alt"
      onPress={() => router.push(Routes.match(match.id))}
      accessibilityRole="button"
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      testID="club-next-match"
    >
      <CalendarDays size={22} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="overline" tone="muted">
          {t('club.banners.nextMatch')}
        </Text>
        <Text variant="bodyStrong" numberOfLines={1}>
          {t(match.is_home ? 'club.banners.vsHome' : 'club.banners.vsAway', { name: match.opponent_name })}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {whenLabel(match.kickoff_at)}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Card>
  );
}

/** Everything that should be seen before the tabs: asks first, then the score. */
export function ClubBanners({ page, onChanged }: { page: ClubPage; onChanged: () => void }) {
  const { spacing } = useTheme();
  const org = page.organization;
  const invited = page.viewer.squad_links.filter((l) => l.status === 'invited');

  const items: React.ReactNode[] = [];
  if (page.viewer.pending_invite) {
    items.push(
      <InviteBanner key="invite" orgId={org.id} role={page.viewer.pending_invite.role} onDone={onChanged} />,
    );
  }
  for (const link of invited) {
    items.push(<SquadLinkBanner key={link.id} link={link} clubName={org.name} onDone={onChanged} />);
  }
  if (page.live_match) {
    items.push(<LiveBanner key="live" match={page.live_match} clubName={org.name} />);
  } else if (page.next_match) {
    items.push(<NextMatchBanner key="next" match={page.next_match} />);
  }

  if (items.length === 0) return null;
  return <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>{items}</View>;
}
