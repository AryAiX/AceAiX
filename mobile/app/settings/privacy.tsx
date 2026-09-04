import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Globe, Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Card,
  Divider,
  Header,
  Screen,
  Skeleton,
  Switch,
  Text,
  useToast,
} from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { RadioGroup, type RadioOption } from '@/components/settings/RadioGroup';
import { useAuth } from '@/providers/AuthProvider';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getGuardianConsents, setDiscoverable, setMessagePrivacy } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import type { MessagePrivacy } from '@/types/models';

/**
 * `value` is what the database stores and enforces; it never changes with the
 * language. Only the label and its hint are translated.
 */
const OPTION_KEYS: { value: MessagePrivacy; label: string; hint: string }[] = [
  {
    value: 'everyone',
    label: 'settings.privacyEveryone',
    hint: 'settings.privacyEveryoneHint',
  },
  {
    value: 'verified',
    label: 'settings.privacyVerified',
    hint: 'settings.privacyVerifiedHint',
  },
  {
    value: 'following',
    label: 'settings.privacyFollowing',
    hint: 'settings.privacyFollowingHint',
  },
  {
    value: 'nobody',
    label: 'settings.privacyNobody',
    hint: 'settings.privacyNobodyHint',
  },
];

export default function PrivacySettingsScreen() {
  const theme = useTheme();
  const { spacing, colors } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { profile, refreshProfile } = useAuth();

  const isMinor = !!profile?.is_minor;

  const [privacy, setPrivacy] = useState<MessagePrivacy>(
    (profile?.allow_messages_from as MessagePrivacy) ?? 'everyone',
  );
  const [discoverable, setDiscoverableState] = useState(!!profile?.is_discoverable);
  const [saving, setSaving] = useState(false);

  // Only a minor's discovery depends on a consent record; an adult never
  // needs the round trip.
  const consents = useAsync(getGuardianConsents, [isMinor], {
    enabled: isMinor,
    refetchOnFocus: isMinor,
  });

  /* The profile in context is the source of truth: every change below writes,
     then refreshes it, so mirroring it back keeps the controls honest even if
     a write lands from somewhere else. */
  useEffect(() => {
    if (!profile) return;
    setPrivacy((profile.allow_messages_from as MessagePrivacy) ?? 'everyone');
    setDiscoverableState(!!profile.is_discoverable);
  }, [profile]);

  /* Discovery for a minor is gated on a granted consent that includes it —
     the same condition the database checks, so the switch never lies. */
  const discoveryConsent = useMemo(() => {
    const granted = (consents.data ?? []).find((c) => c.status === 'granted');
    return !!granted?.allow_discovery;
  }, [consents.data]);

  const discoveryLocked = isMinor && !discoveryConsent;

  // The database forces a minor down to 'verified', so offering "Everyone"
  // would be showing a choice that silently does not stick.
  const options = useMemo<RadioOption<MessagePrivacy>[]>(
    () =>
      OPTION_KEYS.filter((o) => !(isMinor && o.value === 'everyone')).map((o) => ({
        value: o.value,
        label: t(o.label),
        hint: t(o.hint),
      })),
    [isMinor, t],
  );

  const changePrivacy = useCallback(
    async (next: MessagePrivacy) => {
      const previous = privacy;
      setPrivacy(next);
      setSaving(true);
      try {
        await setMessagePrivacy(next);
        await refreshProfile();
      } catch (err) {
        setPrivacy(previous);
        toast.error(errorMessage(err));
      } finally {
        setSaving(false);
      }
    },
    [privacy, refreshProfile, toast],
  );

  const changeDiscoverable = useCallback(
    async (next: boolean) => {
      const previous = discoverable;
      setDiscoverableState(next);
      try {
        await setDiscoverable(next);
        await refreshProfile();
      } catch (err) {
        setDiscoverableState(previous);
        toast.error(errorMessage(err));
      }
    },
    [discoverable, refreshProfile, toast],
  );

  return (
    <Screen
      header={<Header title={t('settings.privacyTitle')} back bordered />}
      testID="settings-privacy"
    >
      <View style={{ paddingTop: spacing.lg, gap: spacing.xxl }}>
        {/* ── Messaging ─────────────────────────────────────────────── */}
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text variant="heading">{t('settings.messagePrivacyHeading')}</Text>
            <Text variant="caption" tone="muted">
              {t('settings.messagePrivacyHint')}
            </Text>
          </View>

          <RadioGroup
            options={options}
            value={privacy}
            onChange={changePrivacy}
            disabled={saving}
            testID="message-privacy"
          />

          {isMinor ? (
            <InfoNote tone="info" icon="shield">
              {t('safety.minorMessagingNote')}
            </InfoNote>
          ) : null}
        </View>

        {/* ── Discovery ─────────────────────────────────────────────── */}
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text variant="heading">{t('settings.discoveryHeading')}</Text>
            <Text variant="caption" tone="muted">
              {t('settings.discoveryHint')}
            </Text>
          </View>

          {consents.loading && isMinor ? (
            <Skeleton height={64} radius={theme.radii.lg} />
          ) : (
            <Card padded="sm">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  minHeight: theme.hit.min,
                }}
              >
                <Search size={18} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{t('settings.discoverable')}</Text>
                  <Text variant="caption" tone="muted">
                    {discoveryLocked
                      ? t('safety.discoveryWaitingGuardian')
                      : discoverable
                        ? t('settings.discoverableOn')
                        : t('settings.discoverableOff')}
                  </Text>
                </View>
                <Switch
                  value={discoveryLocked ? false : discoverable}
                  onValueChange={changeDiscoverable}
                  disabled={discoveryLocked}
                  accessibilityLabel={t('settings.discoveryHeading')}
                />
              </View>
            </Card>
          )}

          {discoveryLocked ? (
            <InfoNote
              tone="warning"
              icon="lock"
              actionLabel={t('safety.askGuardian')}
              onAction={() => router.push(Routes.settingsGuardian)}
            >
              {t('safety.guardianApprovalNeeded')}
            </InfoNote>
          ) : null}
        </View>

        {/* ── The public web ────────────────────────────────────────── */}
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text variant="heading">{t('settings.publicWebHeading')}</Text>
          </View>

          <Card padded="sm">
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Globe size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: spacing.sm }}>
                {isMinor ? (
                  <Text variant="caption" tone="secondary">
                    {t('safety.minorNeverPublic')}
                  </Text>
                ) : (
                  <>
                    <Text variant="caption" tone="secondary">
                      {t('settings.publicWebAdult', {
                        setting: t('settings.discoveryHeading'),
                      })}
                    </Text>
                    <Divider />
                    <Text variant="caption" tone="muted">
                      {t('safety.minorsNeverPublicNote')}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </Card>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" tone="muted">
            {t('safety.blockingExplainer', {
              settings: t('settings.title'),
              blocked: t('safety.blockedTitle'),
            })}
          </Text>
          <Text
            variant="captionStrong"
            tone="primary"
            accessibilityRole="link"
            accessibilityLabel={t('settings.readPrivacyPolicy')}
            onPress={() => router.push(Routes.privacy)}
            style={{ paddingVertical: spacing.md }}
          >
            {t('settings.readPrivacyPolicy')}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
