import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Brain,
  CalendarCheck,
  Check,
  Compass,
  Handshake,
  MessageCircle,
  Search,
  Users,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  ErrorState,
  Skeleton,
  Text,
  useToast,
} from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { guardianConversationOverview } from '@/lib/api';
import { getGuardianLinks, requestUnderageAgeAppeal } from '@/lib/api.settings';
import { errorMessage } from '@/lib/errors';
import { displayName, fullDate, metaLine, relativeTime, roleLabel } from '@/lib/format';
import { COMPANY } from '@/lib/legal';
import { Routes } from '@/lib/routes';
import type { GuardianConsent } from '@/types/models';

/** How long the emailed consent link stays valid. */
export const CONSENT_LINK_DAYS = 14;

/** What a guardian approved, spelled out one permission at a time. */
export function ScopeList({ consent }: { consent: GuardianConsent }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();

  const scopes = [
    {
      granted: consent.allow_discovery,
      Icon: Search,
      label: t('safety.scopeDiscovery'),
      off: t('safety.scopeDiscoveryOff'),
    },
    {
      granted: consent.allow_messaging,
      Icon: MessageCircle,
      label: t('safety.scopeMessaging'),
      off: t('safety.scopeMessagingOff'),
    },
    {
      granted: consent.allow_media,
      Icon: Users,
      label: t('safety.scopeMedia'),
      off: t('safety.scopeMediaOff'),
    },
    {
      granted: !!consent.allow_assessments,
      Icon: Brain,
      label: t('intelligence.scopeAssessments'),
      off: t('intelligence.scopeAssessmentsOff'),
    },
    {
      granted: !!consent.allow_sponsorship,
      Icon: Handshake,
      label: t('sponsorship.scopeSponsorship'),
      off: t('sponsorship.scopeSponsorshipOff'),
    },
    {
      granted: !!consent.allow_bookings,
      Icon: CalendarCheck,
      label: t('coaching.scopeBookings'),
      off: t('coaching.scopeBookingsOff'),
    },
    {
      granted: !!consent.allow_mindset,
      Icon: Compass,
      label: t('sportFit.scopeMindset'),
      off: t('sportFit.scopeMindsetOff'),
    },
  ];

  return (
    <View style={{ gap: spacing.sm }}>
      {scopes.map((scope) => (
        <View key={scope.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {scope.granted ? (
            <Check size={16} color={colors.success} strokeWidth={3} />
          ) : (
            <X size={16} color={colors.textMuted} strokeWidth={3} />
          )}
          <Text
            variant="caption"
            tone={scope.granted ? 'secondary' : 'muted'}
            style={{ flex: 1 }}
          >
            {scope.granted ? scope.label : scope.off}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Who a young person is talking to.
 *
 * Names, roles and message counts — never the messages themselves. The notice
 * shown inside a minor's chat promises a guardian can see that a conversation
 * exists, so this is where that promise is kept. Reading anything more would
 * be a different, and much worse, product.
 */
function ConversationOverview({ minorUserId }: { minorUserId: string }) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();
  const overview = useAsync(() => guardianConversationOverview(minorUserId), [minorUserId]);
  const rows = overview.data ?? [];

  if (overview.loading) return <Skeleton height={40} radius={theme.radii.md} />;
  if (overview.error) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="overline" tone="muted">
        {t('safety.whoTheyTalkTo')}
      </Text>

      {rows.length === 0 ? (
        <Text variant="caption" tone="muted">
          {t('safety.noConversations')}
        </Text>
      ) : (
        rows.map((row) => (
          <View
            key={row.conversation_id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="captionStrong" numberOfLines={1}>
                {metaLine(
                  displayName(row.other_name, t('common.member')),
                  row.other_verified ? t('common.verified') : null,
                )}
              </Text>
              <Text variant="caption" tone="muted">
                {metaLine(
                  roleLabel(row.other_role),
                  t('common.messages', { count: row.message_count }),
                  row.last_message_at ? relativeTime(row.last_message_at) : null,
                )}
              </Text>
            </View>
          </View>
        ))
      )}

      <Text variant="caption" tone="muted">
        {t('safety.messageContentsNote', { email: COMPANY.safetyEmail })}
      </Text>
    </View>
  );
}

/**
 * The children linked to a guardian, and what each approval allows.
 *
 * This is the body of Parent and guardian settings for a guardian account.
 * The settings screen keeps its own back button around it. The Children tab
 * uses the same body. The list refetches whenever the screen is focused.
 */
export function GuardianAthletes() {
  const theme = useTheme();
  const { spacing } = theme;
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const [appealing, setAppealing] = useState<string | null>(null);

  const links = useAsync(getGuardianLinks, [], { refetchOnFocus: true });
  const rows = links.data ?? [];

  const requestAgeReview = useCallback(async (minorUserId: string) => {
    setAppealing(minorUserId);
    try {
      await requestUnderageAgeAppeal(minorUserId);
      toast.success(t('safety.guardianAgeReviewDone'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAppealing(null);
    }
  }, [t, toast]);

  return (
    <View style={{ paddingTop: spacing.lg, gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">{t('safety.approvingHeading')}</Text>
        <Text variant="caption" tone="secondary">
          {t('safety.approvingBody1')}
        </Text>
        <Text variant="caption" tone="secondary">
          {t('safety.approvingBody2', {
            count: CONSENT_LINK_DAYS,
            email: COMPANY.privacyEmail,
          })}
        </Text>
      </View>

      <InfoNote tone="info" icon="shield">
        {t('safety.guardianPhishingNote')}
      </InfoNote>

      <View style={{ gap: spacing.md }}>
        <Text variant="overline" tone="muted">
          {t('safety.linkedAthletes')}
        </Text>

        {links.loading ? (
          <Skeleton height={90} radius={theme.radii.lg} />
        ) : links.error ? (
          <ErrorState message={links.error} onRetry={links.reload} compact />
        ) : rows.length === 0 ? (
          <Card padded="sm">
            <Text variant="caption" tone="muted">
              {t('safety.noLinkedAthletes')}
            </Text>
          </Card>
        ) : (
          rows.map((link) => (
            <Card key={link.id} padded="sm">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Avatar
                  uri={link.minor?.avatar_url}
                  name={link.minor?.full_name}
                  size="sm"
                  onPress={
                    link.minor?.is_discoverable
                      ? () => router.push(Routes.profile(link.minor!.id))
                      : undefined
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {displayName(link.minor?.full_name, t('common.athlete'))}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {link.status === 'granted'
                      ? t('safety.linkApprovedOn', {
                          date: fullDate(link.granted_at ?? link.created_at),
                        })
                      : link.status === 'pending'
                        ? t('safety.linkRequestedOn', { date: fullDate(link.created_at) })
                        : link.status === 'revoked'
                          ? t('safety.linkWithdrawn')
                          : t('safety.linkExpired')}
                  </Text>
                </View>
                <Badge
                  label={
                    link.status === 'granted'
                      ? t('safety.consentApproved')
                      : link.status === 'pending'
                        ? t('safety.consentPending')
                        : link.status === 'revoked'
                          ? t('safety.badgeWithdrawn')
                          : t('safety.badgeExpired')
                  }
                  tone={
                    link.status === 'granted'
                      ? 'success'
                      : link.status === 'pending'
                        ? 'warning'
                        : 'neutral'
                  }
                />
              </View>

              {link.status === 'granted' ? (
                <>
                  <Divider style={{ marginVertical: spacing.md }} />
                  <ScopeList consent={link} />
                  {link.allow_messaging ? (
                    <>
                      <Divider style={{ marginVertical: spacing.md }} />
                      <ConversationOverview minorUserId={link.minor_user_id} />
                    </>
                  ) : null}
                </>
              ) : null}
              {link.minor?.is_suspended ? (
                <Button
                  label={t('safety.guardianAgeReview')}
                  variant="secondary"
                  size="sm"
                  fullWidth
                  loading={appealing === link.minor_user_id}
                  onPress={() => requestAgeReview(link.minor_user_id)}
                  style={{ marginTop: spacing.md }}
                />
              ) : null}
            </Card>
          ))
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" tone="muted">
          {t('safety.guardianContactNote', {
            privacyEmail: COMPANY.privacyEmail,
            safetyEmail: COMPANY.safetyEmail,
          })}
        </Text>
        <Text
          variant="captionStrong"
          tone="primary"
          accessibilityRole="link"
          accessibilityLabel={t('safety.readChildSafety')}
          onPress={() => router.push(Routes.childSafety)}
          style={{ paddingVertical: spacing.md }}
        >
          {t('safety.readChildSafety')}
        </Text>
      </View>
    </View>
  );
}
