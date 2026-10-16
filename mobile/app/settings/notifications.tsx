import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import {
  Award,
  Bell,
  BellRing,
  Briefcase,
  CalendarDays,
  Heart,
  Mail,
  MessageCircle,
  MessageSquare,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Card,
  Chip,
  ErrorState,
  Header,
  Input,
  Screen,
  Sheet,
  Skeleton,
  Text,
  useToast,
} from '@/components/ui';
import { SettingsGroup, SettingsRow, SettingsSwitchRow } from '@/components/settings/SettingsGroup';
import { SavedBadge } from '@/components/settings/Notes';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { getNotificationPreferences, saveNotificationPreferences } from '@/lib/api';
import {
  getPushPermissionState,
  hasPushPermission,
  pushSupported,
  requestPushPermissionSafely,
} from '@/lib/api.settings';
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
  meetups: true,
  meetup_places: [],
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
  const { profile } = useAuth();

  const loaded = useAsync(getNotificationPreferences, []);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [placeDraft, setPlaceDraft] = useState<string[]>([]);
  const [placeInput, setPlaceInput] = useState('');
  const [placesSaving, setPlacesSaving] = useState(false);

  const [pushGranted, setPushGranted] = useState(true);
  const [pushBlocked, setPushBlocked] = useState(false);
  const [asking, setAsking] = useState(false);

  const pending = useRef<Partial<Prefs>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loaded.data) {
      setPrefs({
        ...DEFAULTS,
        ...loaded.data,
        meetup_places: Array.isArray(loaded.data.meetup_places) ? loaded.data.meetup_places : [],
      });
    }
  }, [loaded.data]);

  /* On web there is nothing to grant, so the card below stays away rather than
     offering to turn on something a browser cannot receive. */
  useEffect(() => {
    if (!pushSupported) return;
    let cancelled = false;
    Promise.all([hasPushPermission(), getPushPermissionState()]).then(([granted, state]) => {
      if (cancelled) return;
      setPushGranted(granted);
      setPushBlocked(state === 'blocked');
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
      const state = await getPushPermissionState();
      if (state === 'blocked') {
        await Linking.openSettings();
        toast.info(t('settings.pushStillOff'));
        return;
      }
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

  const openPlaces = useCallback(() => {
    setPlaceDraft(prefs.meetup_places);
    setPlaceInput('');
    setPlacesOpen(true);
  }, [prefs.meetup_places]);

  const addPlace = useCallback(() => {
    const next = placeInput.trim();
    if (!next) return;
    setPlaceDraft((current) => {
      if (current.length >= 5) return current;
      if (current.some((place) => place.toLowerCase() === next.toLowerCase())) return current;
      return [...current, next];
    });
    setPlaceInput('');
  }, [placeInput]);

  const savePlaces = useCallback(async () => {
    setPlacesSaving(true);
    try {
      await saveNotificationPreferences({ meetup_places: placeDraft });
      setPrefs((current) => ({ ...current, meetup_places: placeDraft }));
      setPlacesOpen(false);
      loaded.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPlacesSaving(false);
    }
  }, [loaded, placeDraft, toast]);

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
      { key: 'meetups' as const, title: t('settings.notifyMeetups'), Icon: CalendarDays },
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
                  label={t(pushBlocked ? 'settings.openSystemSettings' : 'settings.turnOnPush')}
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
            <React.Fragment key={row.key}>
              <SettingsSwitchRow
                title={row.title}
                icon={icon(row.Icon)}
                value={prefs[row.key]}
                onValueChange={(v) => update({ [row.key]: v } as Partial<Prefs>)}
                testID={`pref-${row.key}`}
              />
              {/* Audience is on hold. When it ships, this row must also be
                  hidden for audience accounts (&& !isAudience) - see QA-60. */}
              {row.key === 'meetups' && prefs.meetups && profile?.is_minor === false ? (
                <SettingsRow
                  title={t('settings.meetupPlaces')}
                  subtitle={
                    prefs.meetup_places.length > 0
                      ? prefs.meetup_places.join(', ')
                      : t('settings.meetupPlacesOnlyCity')
                  }
                  onPress={openPlaces}
                  testID="pref-meetup-places"
                />
              ) : null}
            </React.Fragment>
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

      <Sheet
        visible={placesOpen}
        onClose={() => {
          if (placesSaving) return;
          setPlacesOpen(false);
        }}
        title={t('settings.meetupPlaces')}
      >
        <Text variant="caption" tone="secondary">
          {t('settings.meetupPlacesBody')}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginTop: spacing.lg,
          }}
        >
          <Input
            value={placeInput}
            onChangeText={setPlaceInput}
            maxLength={80}
            autoCapitalize="words"
            autoCorrect={false}
            containerStyle={{ flex: 1 }}
            testID="meetup-place-input"
            onSubmitEditing={addPlace}
          />
          <Button
            label={t('settings.meetupPlaceAdd')}
            size="sm"
            disabled={placeDraft.length >= 5}
            onPress={addPlace}
            testID="meetup-place-add"
          />
        </View>
        {placeDraft.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm,
              marginTop: spacing.lg,
            }}
          >
            {placeDraft.map((place, index) => (
              <Chip
                key={`${place}-${index}`}
                label={place}
                icon={<X size={14} color={colors.textMuted} />}
                onPress={() => setPlaceDraft((current) => current.filter((_, i) => i !== index))}
                testID={`meetup-place-${index}`}
              />
            ))}
          </View>
        ) : null}
        <Button
          label={t('common.save')}
          fullWidth
          loading={placesSaving}
          disabled={placesSaving}
          style={{ marginTop: spacing.lg }}
          onPress={savePlaces}
          testID="meetup-places-save"
        />
      </Sheet>
    </Screen>
  );
}
