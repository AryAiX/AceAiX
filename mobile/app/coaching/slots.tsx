import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Chip, ErrorState, Header, Screen, SkeletonList, Text, useToast } from '@/components/ui';
import { DayStrip } from '@/components/coaching/DayStrip';
import { ServiceCard } from '@/components/coaching/ServiceCard';
import { InfoNote } from '@/components/settings/Notes';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { addCoachingSlots, getMyCoaching } from '@/lib/api.coaching';
import { REPEAT_WEEKS, TIME_OPTIONS, buildStarts, dayKey, nextDays } from '@/lib/coaching';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import { toggleTag } from '@/lib/sponsorship';

/**
 * Open times for one service: tick days, tick start times, optionally repeat
 * weekly. Every combination becomes a bookable slot of the service's length.
 * The database skips anything in the past or overlapping a slot already open.
 */
export default function CoachingSlotsScreen() {
  const { spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ service?: string }>();

  const mine = useAsync(getMyCoaching, []);
  const services = useMemo(() => (mine.data?.services ?? []).filter((s) => s.is_active), [mine.data]);
  const [picked, setPicked] = useState<string | null>(typeof params.service === 'string' ? params.service : null);
  const serviceId = picked ?? (services.length === 1 ? services[0].id : null);
  const service = services.find((s) => s.id === serviceId) ?? null;

  const days = useMemo(() => nextDays(new Date(), 14), []);
  const [dayKeys, setDayKeys] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [weeks, setWeeks] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  const starts = useMemo(
    () =>
      buildStarts(
        days.filter((d) => dayKeys.includes(dayKey(d))),
        times,
        weeks,
        new Date(),
      ),
    [days, dayKeys, times, weeks],
  );

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace(Routes.coaching);
  };

  const submit = async () => {
    if (!service || starts.length === 0) {
      toast.error(t('coaching.pickSomething'));
      return;
    }
    setSaving(true);
    try {
      const added = await addCoachingSlots(service.id, starts);
      toast.success(
        added === starts.length
          ? t('coaching.slotsAdded', { n: added })
          : t('coaching.slotsSkipped', { added, skipped: starts.length - added }),
      );
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const header = <Header title={t('coaching.addTimes')} back onBack={close} />;

  if (mine.loading && !mine.data) {
    return (
      <Screen header={header} testID="coaching-slots-screen">
        <SkeletonList count={3} variant="row" />
      </Screen>
    );
  }
  if (!mine.data) {
    return (
      <Screen header={header} testID="coaching-slots-screen">
        <ErrorState message={mine.error ?? t('common.somethingWentWrong')} onRetry={mine.reload} />
      </Screen>
    );
  }
  if (mine.data.role !== 'coach' || services.length === 0) {
    return (
      <Screen header={header} testID="coaching-slots-screen">
        <InfoNote
          tone="warning"
          icon="warning"
          actionLabel={mine.data.role === 'coach' ? t('coaching.newService') : undefined}
          onAction={mine.data.role === 'coach' ? () => router.replace(Routes.coachingService) : undefined}
        >
          {mine.data.role === 'coach' ? t('coaching.noServicesBody') : t('errors.coachOnly')}
        </InfoNote>
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={
        <Button
          label={starts.length > 0 ? `${t('coaching.openTimes')} · ${starts.length}` : t('coaching.openTimes')}
          fullWidth
          loading={saving}
          disabled={!service || starts.length === 0}
          onPress={submit}
          testID="coaching-slots-submit"
        />
      }
      testID="coaching-slots-screen"
    >
      <View style={{ gap: spacing.xl }}>
        {service && (services.length === 1 || picked) ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="captionStrong" tone="secondary">
              {t('coaching.slotsFor', { service: service.title })}
            </Text>
            {services.length > 1 ? (
              <Button
                label={t('coaching.chooseService')}
                variant="ghost"
                size="sm"
                onPress={() => setPicked(null)}
                style={{ alignSelf: 'flex-start' }}
              />
            ) : null}
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            <Text variant="captionStrong" tone="secondary">
              {t('coaching.chooseService')}
            </Text>
            {services.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                selected={s.id === serviceId}
                onPress={() => setPicked(s.id)}
                testID={`slots-service-${s.id}`}
              />
            ))}
          </View>
        )}

        {service ? (
          <>
            <View style={{ gap: spacing.md }}>
              <Text variant="captionStrong" tone="secondary">
                {t('coaching.pickDays')}
              </Text>
              <DayStrip
                days={days.map((d) => ({ key: dayKey(d), date: d }))}
                selected={dayKeys}
                onSelect={(key) => setDayKeys((list) => toggleTag(list, key))}
                testID="slots-days"
              />
            </View>

            <View style={{ gap: spacing.md }}>
              <Text variant="captionStrong" tone="secondary">
                {t('coaching.pickTimes')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {TIME_OPTIONS.map((time) => (
                  <Chip
                    key={time}
                    label={time}
                    selected={times.includes(time)}
                    onPress={() => setTimes((list) => toggleTag(list, time))}
                    testID={`slots-time-${time}`}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: spacing.md }}>
              <Text variant="captionStrong" tone="secondary">
                {t('coaching.repeat')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {REPEAT_WEEKS.map((n) => (
                  <Chip
                    key={n}
                    label={n === 1 ? t('coaching.repeatOnce') : t('coaching.repeatWeeks', { n })}
                    selected={weeks === n}
                    onPress={() => setWeeks(n)}
                  />
                ))}
              </View>
            </View>

            <Text variant="caption" tone="muted">
              {t('coaching.slotsSummary', { n: starts.length })}
            </Text>
          </>
        ) : null}
      </View>
    </Screen>
  );
}
