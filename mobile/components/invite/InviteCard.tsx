import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Award, ChevronRight, UserPlus, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { AnimatedGradient, Badge, Card, Skeleton, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { getInviteBadge, getMyCircle, type MyCircle } from '@/lib/api.invites';

/**
 * My invites, on my profile tab — athletes and coaches only (the caller decides).
 * An invitation to start, or my progress toward the next token.
 */
export function MyInviteCard({ refreshKey }: { refreshKey?: number }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const circle = useAsync<MyCircle>(() => getMyCircle(), [refreshKey], { refetchOnFocus: true });

  if (circle.loading && !circle.data) return <Skeleton height={84} radius={theme.radii.lg} />;
  const data = circle.data;
  if (!data || !data.can_invite) return null;

  const go = () => router.push(Routes.invite);
  const started = data.qualified + data.pending > 0 || data.tokens > 0;

  if (!started) {
    return (
      <Card onPress={go} padded={false} level={1} testID="invite-card">
        <AnimatedGradient colors={theme.gradients.warm} radius={theme.radii.lg} style={{ padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="overline" color="rgba(255,255,255,0.85)">{t('invites.circleTitle')}</Text>
              <Text variant="bodyStrong" color="#FFFFFF">{t('invites.cardCta')}</Text>
              <Text variant="caption" color="rgba(255,255,255,0.9)">{t('invites.cardCtaBody')}</Text>
            </View>
            <ChevronRight size={22} color="#FFFFFF" />
          </View>
        </AnimatedGradient>
      </Card>
    );
  }

  const pct = (data.progress / data.per_token) * 100;
  return (
    <Card onPress={go} level={1} padded testID="invite-card">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' }}>
          <Users size={24} color={colors.play.amber} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="overline" tone="muted">{t('invites.circleTitle')}</Text>
          <Text variant="bodyStrong">{t('invites.cardProgress', { n: data.progress, total: data.per_token })}</Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceSunken, overflow: 'hidden' }}>
            <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: colors.play.amber }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Award size={14} color={colors.play.amber} />
            <Text variant="caption" tone="secondary">{t('invites.cardTokens', { n: data.tokens })}</Text>
          </View>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}

/** A tier badge on someone else's profile ("Brought 10+ people to AceAiX"), or nothing. */
export function TheirInviteBadge({ userId }: { userId: string }) {
  const { colors } = useTheme();
  const t = useT();
  const badge = useAsync<{ tier: number } | null>(() => getInviteBadge(userId), [userId]);
  if (!badge.data) return null;
  return (
    <View style={{ flexDirection: 'row' }} testID="invite-badge">
      <Badge
        label={t('invites.badgeTier', { n: badge.data.tier })}
        tone="warning"
        size="md"
        icon={<Users size={12} color={colors.warning} />}
      />
    </View>
  );
}
