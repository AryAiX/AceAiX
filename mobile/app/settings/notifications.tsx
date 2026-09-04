import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  Award,
  Bell,
  BellRing,
  Briefcase,
  Heart,
  Mail,
  MessageCircle,
  MessageSquare,
  Sparkles,
  UserPlus,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, ErrorState, Header, Screen, Skeleton, Text, useToast } from '@/components/ui';
import { SettingsGroup, SettingsSwitchRow } from '@/components/settings/SettingsGroup';
import { SavedBadge } from '@/components/settings/Notes';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getNotificationPreferences, saveNotificationPreferences } from '@/lib/api';
import { hasPushPermission, requestPushPermissionSafely } from '@/lib/api.settings';
import { errorMessage } from '@/lib/errors';
import type { NotificationPreferences } from '@/types/models';

type Prefs = Omit<NotificationPreferences, 'user_id'>;

const DEFAULTS: Prefs = {
  follows: true,
  messages: true,
  comments: true,
  likes: true,
  opportunities: true,
  applications: true,
  scout_interest: true,
  score_updates: true,
  push_enabled: true,
  email_enabled: true,
};

const SAVE_DELAY = 600;
const SAVED_VISIBLE_FOR = 1800;

export default function NotificationSettingsScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const toast = useToast();
  const t = useT();

  const loaded = useAsync(getNotificationPreferences, []);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  const [pushGranted, setPushGranted] = useState(true);
  const [asking, setAsking] = useState(false);

  const pending = useRef<Partial<Prefs>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loaded.data) setPrefs({ ...DEFAULTS, ...loaded.data });
  }, [loaded.data]);

  useEffect(() => {
    let cancelled = false;
    hasPushPermission().then((granted) => {
      if (!cancelled) setPushGranted(granted);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;

    try {
      await saveNotificationPreferences(patch);
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), SAVED_VISIBLE_FOR);
    } catch (err) {
      toast.error(errorMessage(err));
      loaded.reload();
    }
  }, [toast, loaded]);

  /* Switches save themselves. Flipping four in a row should be one write, so
     changes are collected and sent once the person stops toggling. */
  const update = useCallback(
    (patch: Partial<Prefs>) => {
      setPrefs((current) => ({ ...current, ...patch }));
      pending.current = { ...pending.current, ...patch };
      setSaved(false);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flush();
      }, SAVE_DELAY);
    },
    [flush],
  );

  const enablePush = useCallback(async () => {
    setAsking(true);
    try {
      const granted = await requestPushPermissionSafely();
      setPushGranted(granted);
      if (granted) {
        update({ push_enabled: true });
      } else {
        toast.info(t('settings.pushStillOff'));
      }
    } finally {
      setAsking(false);
    }
  }, [update, toast, t]);

  const icon = useCallback(
    (Icon: typeof Bell) => <Icon size={17} color={colors.text} />,
    [colors.text],
  );

  const activityRows = useMemo(
    () => [
      { key: 'follows' as const, title: t('settings.notifyFollows'), Icon: UserPlus },
      { key: 'messages' as const, title: t('settings.notifyMessages'), Icon: MessageCircle },
      { key: 'comments' as const, title: t('settings.notifyComments'), Icon: MessageSquare },
      { key: 'likes' as const, title: t('settings.notifyLikes'), Icon: Heart },
    ],
    [t],
  );

  const opportunityRows = useMemo(
    () => [
      { key: 'opportunities' as const, title: t('settings.notifyOpportunities'), Icon: Briefcase },
      { key: 'applications' as const, title: t('settings.notifyApplications'), Icon: Award },
      { key: 'scout_interest' as const, title: t('settings.notifyScoutInterest'), Icon: Sparkles },
      { key: 'score_updates' as const, title: t('settings.notifyScoreUpdates'), Icon: Bell },
    ],
    [t],
  );

  if (loaded.loading) {
    return (
      <Screen header={<Header title={t('settings.notificationsTitle')} back bordered />}>
        <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
          <Skeleton height={180} radius={theme.radii.lg} />
          <Skeleton height={180} radius={theme.radii.lg} />
        </View>
      </Screen>
    );
  }

  if (loaded.error) {
    return (
      <Screen header={<Header title={t('settings.notificationsTitle')} back bordered />}>
        <ErrorState message={loaded.error} onRetry={loaded.reload} />
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header title={t('settings.notificationsTitle')} back bordered />}
      testID="settings-notifications"
    >
      <View style={{ paddingTop: spacing.lg }}>
        {!pushGranted ? (
          <Card tone="primarySoft" style={{ marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <BellRing size={20} color={colors.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: spacing.sm }}>
                <Text variant="bodyStrong">{t('settings.pushOffTitle')}</Text>
                <Text variant="caption" tone="secondary">
                  {t('settings.pushOffBody')}
                </Text>
                <Button
                  label={t('settings.turnOnPush')}
                  size="sm"
                  loading={asking}
                  onPress={enablePush}
                  style={{ marginTop: spacing.xs }}
                />
              </View>
            </View>
          </Card>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.md,
            minHeight: 22,
          }}
        >
          <Text variant="caption" tone="muted">
            {t('settings.autoSaveNote')}
          </Text>
          <SavedBadge visible={saved} />
        </View>

        <SettingsGroup title={t('settings.sectionHowWeReach')}>
          <SettingsSwitchRow
            title={t('settings.pushTitle')}
            subtitle={t('settings.pushSubtitle')}
            icon={icon(Bell)}
            value={prefs.push_enabled}
            onValueChange={(v) => update({ push_enabled: v })}
            testID="pref-push"
          />
          <SettingsSwitchRow
            title={t('settings.emailTitle')}
            subtitle={t('settings.emailSubtitle')}
            icon={icon(Mail)}
            value={prefs.email_enabled}
            onValueChange={(v) => update({ email_enabled: v })}
            testID="pref-email"
          />
        </SettingsGroup>

        <SettingsGroup
          title={t('settings.sectionActivity')}
          footer={t('settings.activityFooter')}
        >
          {activityRows.map((row) => (
            <SettingsSwitchRow
              key={row.key}
              title={row.title}
              icon={icon(row.Icon)}
              value={prefs[row.key]}
              onValueChange={(v) => update({ [row.key]: v } as Partial<Prefs>)}
              testID={`pref-${row.key}`}
            />
          ))}
        </SettingsGroup>

        <SettingsGroup title={t('settings.sectionOpportunities')}>
          {opportunityRows.map((row) => (
            <SettingsSwitchRow
              key={row.key}
              title={row.title}
              icon={icon(row.Icon)}
              value={prefs[row.key]}
              onValueChange={(v) => update({ [row.key]: v } as Partial<Prefs>)}
              testID={`pref-${row.key}`}
            />
          ))}
        </SettingsGroup>

        <Text variant="caption" tone="muted">
          {t('settings.noMarketingNote')}
        </Text>
      </View>
    </Screen>
  );
}
