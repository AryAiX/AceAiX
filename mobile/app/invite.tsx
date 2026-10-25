import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Award, Gift, Link2, Share2, Ticket, UserCheck, UserPlus, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  AnimatedGradient,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Header,
  Input,
  Reveal,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { useUnread } from '@/providers/UnreadProvider';
import { errorMessage } from '@/lib/errors';
import { fullDate, roleLabel } from '@/lib/format';
import { shareContent } from '@/lib/share';
import { claimInvite, getMyCircle, type MyCircle } from '@/lib/api.invites';
import { inviteLink, isInviteCode, normalizeInviteCode, tokenProgress } from '@/lib/invites/code';

/**
 * Invite friends — my link, my circle, my tokens.
 *
 * One screen, decided by `referral_my_circle`:
 *
 *   athlete or coach → the link and code to share, a ring toward the next
 *                      token, the friends who joined (first names only), and
 *                      the token history
 *   anyone else      → who invited them, if anyone
 *   a new account    → a field to enter a friend's code (first 14 days)
 */
export default function InviteScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const toast = useToast();
  const { subscribeNotifications } = useUnread();
  /*
   * Coming back to this screen already refetches in the background:
   * `refetchOnFocus` is a `useFocusEffect` inside `useAsync`, and that mode
   * does not raise the full-screen loader while data is on screen.
   */
  const circle = useAsync<MyCircle>(() => getMyCircle(), [], { refetchOnFocus: true });
  const reloadCircle = useRef(circle.reload);
  reloadCircle.current = circle.reload;

  useEffect(() => {
    return subscribeNotifications((payload) => {
      if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') return;
      const type = payload.new?.type;
      if (type !== 'referral_joined' && type !== 'referral_token') return;
      void reloadCircle.current();
    });
  }, [subscribeNotifications]);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const header = <Header back title={t('invites.title')} />;

  if (circle.loading && !circle.data) {
    return (
      <Screen header={header}>
        <SkeletonList count={3} />
      </Screen>
    );
  }
  if (circle.error || !circle.data) {
    return (
      <Screen header={header}>
        <ErrorState message={circle.error} onRetry={circle.reload} />
      </Screen>
    );
  }

  const data = circle.data;
  const link = data.code ? inviteLink(data.code) : null;
  const toNext = data.per_token - data.progress;

  const share = async () => {
    if (!link || !data.code) return;
    try {
      const outcome = await shareContent({
        title: t('invites.shareTitle'),
        message: t('invites.shareMessage', { link, code: data.code }),
        url: link,
      });
      if (outcome === 'copied') toast.success(t('invites.copied'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const claim = async () => {
    const normalized = normalizeInviteCode(code);
    if (!isInviteCode(normalized)) {
      setCodeError(t('invites.enterCodeInvalid'));
      return;
    }
    setCodeError(null);
    setClaiming(true);
    try {
      const out = await claimInvite(normalized);
      toast.success(t('invites.claimed', { name: out.inviter?.first_name ?? '' }));
      setCode('');
      await circle.reload();
    } catch (err) {
      setCodeError(errorMessage(err));
    } finally {
      setClaiming(false);
    }
  };

  const invitedBy = data.invited_by ? (
    <Card padded style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }} testID="invite-invited-by">
      <Avatar uri={data.invited_by.avatar_url} name={data.invited_by.first_name} size="sm" />
      <Text variant="bodyStrong" style={{ flex: 1 }}>
        {t('invites.invitedBy', { name: data.invited_by.first_name ?? '' })}
      </Text>
      <UserCheck size={18} color={colors.success} />
    </Card>
  ) : null;

  const enterCode = data.can_enter_code ? (
    <Card padded style={{ gap: spacing.md }} testID="invite-enter-code">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ticket size={18} color={colors.play.violet} />
        <Text variant="subheading">{t('invites.enterCodeTitle')}</Text>
      </View>
      <Text tone="secondary">{t('invites.enterCodeBody')}</Text>
      <Input
        value={code}
        onChangeText={(v) => setCode(normalizeInviteCode(v))}
        placeholder={t('invites.enterCodePlaceholder')}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={9}
        error={codeError}
        testID="invite-code-input"
      />
      <Button label={t('invites.enterCodeAction')} variant="secondary" loading={claiming} onPress={claim} testID="invite-code-submit" />
    </Card>
  ) : null;

  if (!data.can_invite) {
    return (
      <Screen header={header} scroll contentStyle={{ gap: spacing.xl }} testID="invite-not-eligible">
        {invitedBy}
        {enterCode}
        {!invitedBy && !enterCode ? (
          <EmptyState
            icon={<Users size={26} color={colors.textMuted} />}
            title={t('invites.notEligibleTitle')}
            body={t('invites.notEligibleBody')}
          />
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen header={header} scroll contentStyle={{ gap: spacing.xxl }} testID="invite-screen">
      <Reveal>
        <AnimatedGradient colors={theme.gradients.warm} radius={theme.radii.xl} style={{ padding: spacing.xl, gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <TokenRing progress={tokenProgress(data.qualified, data.per_token)} label={`${data.progress}/${data.per_token}`} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="overline" color="rgba(255,255,255,0.85)">
                {t('invites.circleTitle')}
              </Text>
              <Text variant="title" color="#FFFFFF">
                {t('invites.nextToken', { n: toNext })}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Stat label={t('invites.countedLabel')} value={data.qualified} />
            <Stat label={t('invites.pendingLabel')} value={data.pending} />
            <Stat label={t('invites.tokensLabel')} value={data.tokens} icon={<Award size={14} color="#FFFFFF" />} />
          </View>
        </AnimatedGradient>
      </Reveal>

      <Card padded style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Link2 size={18} color={colors.primary} />
          <Text variant="subheading">{t('invites.linkTitle')}</Text>
        </View>
        <Text tone="secondary" selectable numberOfLines={1} testID="invite-link">
          {link}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text variant="caption" tone="muted">
            {t('invites.codeLabel')}
          </Text>
          <Text variant="heading" selectable style={{ letterSpacing: 3 }} testID="invite-code">
            {data.code}
          </Text>
        </View>
        <Button label={t('invites.share')} fullWidth icon={<Share2 size={18} color="#FFFFFF" />} onPress={share} testID="invite-share" />
      </Card>

      {invitedBy}
      {enterCode}

      <View style={{ gap: spacing.md }}>
        <SectionHeader title={t('invites.membersTitle')} />
        {data.members.length === 0 ? (
          <Text tone="muted">{t('invites.membersEmpty')}</Text>
        ) : (
          <Card padded={false}>
            {data.members.map((m, i) => (
              <View key={`${m.first_name}-${m.joined_at}`}>
                {i > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md }}>
                  <Avatar uri={m.avatar_url} name={m.first_name} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{m.first_name}</Text>
                    <Text variant="caption" tone="muted">
                      {roleLabel(m.role)} · {fullDate(m.joined_at)}
                    </Text>
                  </View>
                  <Badge
                    label={m.status === 'qualified' ? t('invites.statusQualified') : t('invites.statusPending')}
                    tone={m.status === 'qualified' ? 'success' : 'warning'}
                  />
                </View>
              </View>
            ))}
          </Card>
        )}
      </View>

      <Card padded style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Gift size={18} color={colors.play.amber} />
          <Text variant="subheading">{t('invites.howTitle')}</Text>
        </View>
        {[t('invites.how1'), t('invites.how2'), t('invites.how3')].map((line, i) => (
          <View key={line} style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Text variant="captionStrong" tone="muted">{i + 1}.</Text>
            <Text tone="secondary" style={{ flex: 1 }}>{line}</Text>
          </View>
        ))}
      </Card>

      {data.ledger.length ? (
        <View style={{ gap: spacing.sm }}>
          <SectionHeader title={t('invites.ledgerTitle')} />
          {data.ledger.map((l) => (
            <View key={l.created_at} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
              <Text tone={l.amount > 0 ? 'success' : 'muted'}>
                {l.amount > 0 ? t('invites.ledgerGained', { n: l.amount }) : t('invites.ledgerLost', { n: -l.amount })}
              </Text>
              <Text variant="caption" tone="muted">{fullDate(l.created_at)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <InfoNote tone="info" icon="info">
        {t('invites.tokensNote')}
      </InfoNote>
    </Screen>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flex: 1, padding: spacing.sm, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon}
        <Text variant="heading" color="#FFFFFF">{value}</Text>
      </View>
      <Text variant="caption" color="rgba(255,255,255,0.9)">{label}</Text>
    </View>
  );
}

/** A ring that fills toward the next token: ten friends who count, one token. */
export function TokenRing({ progress, label, size = 84 }: { progress: number; label: string; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.3)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#FFFFFF"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))}
        />
      </Svg>
      <UserPlus size={18} color="#FFFFFF" />
      <Text variant="captionStrong" color="#FFFFFF">{label}</Text>
    </View>
  );
}
