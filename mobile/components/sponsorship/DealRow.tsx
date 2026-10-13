import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Badge, Button, Card, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { startConversation } from '@/lib/api';
import { respondSponsorship, withdrawSponsorship, type Deal } from '@/lib/api.sponsorship';
import { errorMessage } from '@/lib/errors';
import { displayName, relativeTime } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { amountLabel, dealHeading, statusTone } from '@/lib/sponsorship';

/**
 * One offer or application, with the action that belongs to whoever is reading:
 * answer it, withdraw it, or — once accepted — message the other side.
 */
export function DealRow({ deal, onChanged }: { deal: Deal; onChanged: () => void }) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<'accept' | 'decline' | 'withdraw' | 'message' | null>(null);

  const heading = dealHeading(deal);
  const sponsor = displayName(deal.sponsor_name);
  const athlete = displayName(deal.athlete_name);
  const otherId = heading.name === 'sponsor' ? deal.sponsor_user_id : deal.athlete_user_id;
  const otherName = heading.name === 'sponsor' ? sponsor : athlete;
  const otherAvatar = heading.name === 'sponsor' ? deal.sponsor_avatar : deal.athlete_avatar;
  const about = deal.request_title ?? deal.call_title;
  const amount = amountLabel(deal.amount, deal.currency);

  const act = async (kind: 'accept' | 'decline' | 'withdraw') => {
    setBusy(kind);
    try {
      if (kind === 'withdraw') await withdrawSponsorship(deal.id);
      else await respondSponsorship(deal.id, kind === 'accept');
      toast.success(t('sponsorship.answered'));
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const message = async () => {
    setBusy('message');
    try {
      const id = await startConversation(otherId);
      router.push(Routes.chat(id));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card padded level={1} style={{ gap: spacing.md }} testID={`deal-${deal.id}`}>
      <Card
        level={0}
        padded={false}
        onPress={() => router.push(Routes.profile(otherId))}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      >
        <Avatar
          uri={otherAvatar}
          name={otherName}
          size="md"
          verified={heading.name === 'sponsor' && deal.sponsor_verified}
        />
        <View style={{ flex: 1, gap: 1 }}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {t(`sponsorship.${heading.key}`, { name: otherName })}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {[about, relativeTime(deal.created_at)].filter(Boolean).join(' · ')}
          </Text>
          {deal.my_side === 'guardian' ? (
            <Text variant="caption" tone="info" numberOfLines={1}>
              {t('sponsorship.forChild', { name: athlete })}
            </Text>
          ) : null}
        </View>
        <Badge label={t(`sponsorship.status.${deal.status}`)} tone={statusTone(deal.status)} size="md" />
      </Card>

      {amount ? (
        <Text variant="subheading" tone="success">
          {amount}
        </Text>
      ) : null}
      {deal.message ? (
        <Text variant="body" tone="secondary">
          {deal.message}
        </Text>
      ) : null}

      {deal.can_respond ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {/* A guardian can refuse an application their child sent, not accept
              it — accepting is the sponsor's to do. */}
          {deal.my_side !== 'guardian' || deal.initiated_by === 'sponsor' ? (
            <Button
              label={t('sponsorship.accept')}
              size="sm"
              loading={busy === 'accept'}
              disabled={busy !== null}
              onPress={() => act('accept')}
              style={{ flex: 1 }}
              testID={`deal-accept-${deal.id}`}
            />
          ) : null}
          <Button
            label={t('sponsorship.decline')}
            variant="secondary"
            size="sm"
            loading={busy === 'decline'}
            disabled={busy !== null}
            onPress={() => act('decline')}
            style={{ flex: 1 }}
            testID={`deal-decline-${deal.id}`}
          />
        </View>
      ) : null}

      {deal.can_withdraw ? (
        <Button
          label={t('sponsorship.withdraw')}
          variant="ghost"
          size="sm"
          loading={busy === 'withdraw'}
          disabled={busy !== null}
          onPress={() => act('withdraw')}
          style={{ alignSelf: 'flex-start' }}
          testID={`deal-withdraw-${deal.id}`}
        />
      ) : null}

      {deal.status === 'accepted' && deal.my_side !== 'guardian' ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" tone="muted">
            {t('sponsorship.acceptedNote')}
          </Text>
          <Button
            label={t('sponsorship.message')}
            variant="secondary"
            size="sm"
            loading={busy === 'message'}
            onPress={message}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
      ) : null}
    </Card>
  );
}
