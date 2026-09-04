import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Check,
  Clock,
  Mail,
  MessageCircle,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmSheet,
  Divider,
  ErrorState,
  Header,
  Input,
  Screen,
  SegmentedControl,
  Skeleton,
  Text,
  useToast,
} from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { useAuth } from '@/providers/AuthProvider';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import {
  getGuardianConsents,
  guardianConversationOverview,
  requestGuardianConsent,
  revokeGuardianConsent,
} from '@/lib/api';
import { getGuardianLinks, resendGuardianConsentEmail } from '@/lib/api.settings';
import { errorMessage } from '@/lib/errors';
import { displayName, fullDate, metaLine, relativeTime, roleLabel } from '@/lib/format';
import { COMPANY } from '@/lib/legal';
import { Routes } from '@/lib/routes';
import type { GuardianConsent } from '@/types/models';

type Relationship = 'parent' | 'guardian' | 'other';

/** The stored relationship is a database value; only its label is translated. */
const RELATIONSHIP_KEYS: { value: Relationship; labelKey: string }[] = [
  { value: 'parent', labelKey: 'safety.relationshipParent' },
  { value: 'guardian', labelKey: 'safety.relationshipGuardian' },
  { value: 'other', labelKey: 'safety.relationshipOther' },
];

/** How long the emailed consent link stays valid. */
const CONSENT_LINK_DAYS = 14;

/** What a guardian approved, spelled out one permission at a time. */
function ScopeList({ consent }: { consent: GuardianConsent }) {
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

// ── The minor's view ─────────────────────────────────────────────────────────
function MinorView() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { refreshProfile } = useAuth();

  const consents = useAsync(getGuardianConsents, [], { refetchOnFocus: true });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState<Relationship>('parent');
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const relationships = useMemo(
    () => RELATIONSHIP_KEYS.map((r) => ({ value: r.value, label: t(r.labelKey) })),
    [t],
  );

  const rows = useMemo(() => consents.data ?? [], [consents.data]);
  const granted = useMemo(() => rows.find((c) => c.status === 'granted') ?? null, [rows]);
  const pending = useMemo(() => rows.find((c) => c.status === 'pending') ?? null, [rows]);
  const lastRevoked = useMemo(() => rows.find((c) => c.status === 'revoked') ?? null, [rows]);
  const current = granted ?? pending;

  const send = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      setFormError(t('safety.nameRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError(t('safety.emailInvalid'));
      return;
    }

    setFormError(null);
    setSending(true);
    try {
      await requestGuardianConsent(trimmedName, trimmedEmail, relationship);
      setName('');
      setEmail('');
      await consents.reload();
      toast.success(t('safety.requestSentToast'));
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }, [name, email, relationship, consents, toast, t]);

  const resend = useCallback(async () => {
    if (!pending) return;
    setResending(true);
    try {
      await resendGuardianConsentEmail(pending.id);
      toast.success(t('safety.resentToast'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setResending(false);
    }
  }, [pending, toast, t]);

  const revoke = useCallback(async () => {
    if (!granted) return;
    setRevoking(true);
    try {
      await revokeGuardianConsent(granted.id);
      await consents.reload();
      await refreshProfile();
      setConfirmRevoke(false);
      toast.info(t('safety.consentWithdrawnToast'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRevoking(false);
    }
  }, [granted, consents, refreshProfile, toast, t]);

  if (consents.loading) {
    return (
      <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
        <Skeleton height={120} radius={theme.radii.lg} />
        <Skeleton height={200} radius={theme.radii.lg} />
      </View>
    );
  }

  if (consents.error) {
    return <ErrorState message={consents.error} onRetry={consents.reload} />;
  }

  return (
    <View style={{ paddingTop: spacing.lg, gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">{t('safety.minorHeading')}</Text>
        <Text variant="caption" tone="secondary">
          {t('safety.minorIntro')}
        </Text>
      </View>

      {/* ── Granted ─────────────────────────────────────────────────── */}
      {granted ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <ShieldCheck size={22} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{t('safety.consentApproved')}</Text>
              <Text variant="caption" tone="muted">
                {t('safety.consentGrantedMeta', {
                  name: granted.guardian_name,
                  date: fullDate(granted.granted_at ?? granted.created_at),
                })}
              </Text>
            </View>
            <Badge label={t('safety.consentActive')} tone="success" />
          </View>

          <Divider style={{ marginVertical: spacing.md }} />

          <Text variant="overline" tone="muted" style={{ marginBottom: spacing.sm }}>
            {t('safety.whatTheyApproved')}
          </Text>
          <ScopeList consent={granted} />

          <Divider style={{ marginVertical: spacing.md }} />

          <Text variant="caption" tone="muted">
            {t('safety.changeConsentNote', {
              name: granted.guardian_name,
              email: granted.guardian_email,
              contact: COMPANY.privacyEmail,
            })}
          </Text>

          <Button
            label={t('safety.withdrawPermission')}
            variant="danger"
            size="sm"
            fullWidth
            onPress={() => setConfirmRevoke(true)}
            style={{ marginTop: spacing.md }}
            testID="revoke-consent"
          />
        </Card>
      ) : null}

      {/* ── Pending ─────────────────────────────────────────────────── */}
      {!granted && pending ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Clock size={22} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{t('safety.consentWaitingTitle')}</Text>
              <Text variant="caption" tone="muted">
                {t('safety.consentSentOn', { date: fullDate(pending.created_at) })}
              </Text>
            </View>
            <Badge label={t('safety.consentPending')} tone="warning" />
          </View>

          <Divider style={{ marginVertical: spacing.md }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Mail size={16} color={colors.textMuted} />
            <Text variant="caption" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
              {pending.guardian_email}
            </Text>
          </View>

          <Text variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
            {t('safety.consentEmailNote', { count: CONSENT_LINK_DAYS })}
          </Text>

          <Button
            label={t('safety.resendEmail')}
            variant="secondary"
            size="sm"
            fullWidth
            loading={resending}
            onPress={resend}
            style={{ marginTop: spacing.md }}
            testID="resend-consent"
          />
        </Card>
      ) : null}

      {/* ── Revoked, with nothing active ────────────────────────────── */}
      {!current && lastRevoked ? (
        <InfoNote tone="warning" icon="warning">
          {t('safety.consentRevokedNote', { date: fullDate(lastRevoked.created_at) })}
        </InfoNote>
      ) : null}

      {/* ── The request form ────────────────────────────────────────── */}
      {!granted ? (
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text variant="heading">
              {pending ? t('safety.askSomeoneElse') : t('safety.askForPermission')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('safety.requestFormHint')}
            </Text>
          </View>

          <Input
            label={t('safety.guardianNameLabel')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholder={t('safety.guardianNamePlaceholder')}
            testID="guardian-name"
          />
          <Input
            label={t('safety.guardianEmailLabel')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            /* An example address, not a sentence — it stays as it is written. */
            placeholder="parent@example.com"
            error={formError}
            testID="guardian-email"
          />

          <View style={{ gap: spacing.sm }}>
            <Text variant="captionStrong" tone="secondary">
              {t('safety.relationshipQuestion')}
            </Text>
            <SegmentedControl
              options={relationships}
              value={relationship}
              onChange={setRelationship}
            />
          </View>

          <InfoNote tone="info" icon="shield">
            {t('safety.guardianEmailUseNote')}
          </InfoNote>

          <Button
            label={pending ? t('safety.sendNewRequest') : t('safety.sendRequest')}
            fullWidth
            loading={sending}
            onPress={send}
            testID="send-consent-request"
          />

          {pending ? (
            <Text variant="caption" tone="muted">
              {t('safety.replacesPending')}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Text variant="overline" tone="muted">
          {t('safety.whatChangesHeading')}
        </Text>
        <Text variant="caption" tone="secondary">
          {t('safety.whatChangesBody')}
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

      <ConfirmSheet
        visible={confirmRevoke}
        title={t('safety.withdrawConfirmTitle')}
        message={t('safety.withdrawConfirmBody')}
        confirmLabel={t('safety.withdraw')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={revoking}
        onConfirm={revoke}
        onCancel={() => setConfirmRevoke(false)}
      />
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

// ── The guardian's view ──────────────────────────────────────────────────────
function GuardianView() {
  const theme = useTheme();
  const { spacing } = theme;
  const router = useRouter();
  const t = useT();

  const links = useAsync(getGuardianLinks, [], { refetchOnFocus: true });
  const rows = links.data ?? [];

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
                    link.minor ? () => router.push(Routes.profile(link.minor!.id)) : undefined
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

export default function GuardianSettingsScreen() {
  const t = useT();
  const { profile, isGuardian } = useAuth();
  const title = isGuardian ? t('safety.guardianAthletesTitle') : t('safety.guardianTitle');

  return (
    <Screen header={<Header title={title} back bordered />} testID="settings-guardian">
      {isGuardian ? <GuardianView /> : profile?.is_minor ? <MinorView /> : <AdultView />}
    </Screen>
  );
}

/** An adult athlete or recruiter who reached this screen has nothing to do here. */
function AdultView() {
  const theme = useTheme();
  const t = useT();
  return (
    <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.md }}>
      <Text variant="heading">{t('safety.adultNothingTitle')}</Text>
      <Text variant="caption" tone="secondary">
        {t('safety.adultNothingBody')}
      </Text>
    </View>
  );
}
