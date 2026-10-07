import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BadgeCheck, CalendarX } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  Header,
  Input,
  Screen,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { DayStrip } from '@/components/coaching/DayStrip';
import { ServiceCard } from '@/components/coaching/ServiceCard';
import { InfoNote } from '@/components/settings/Notes';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { bookCoachingSlot, getCoachBookingPage, type BookableSlot } from '@/lib/api.coaching';
import { clockTime, groupByDay } from '@/lib/coaching';
import { errorMessage } from '@/lib/errors';
import { displayName } from '@/lib/format';
import { currentLanguage } from '@/lib/i18n-bridge';
import { Routes } from '@/lib/routes';

/**
 * Book a coach: pick what, pick a day, pick a time, say where if it is yours
 * to say, and book. Three choices and a button, top to bottom.
 *
 * The page comes from one RPC that already knows whether this viewer may book
 * (`gate`), so the screen explains a refusal before the form rather than
 * after the tap.
 */
export default function CoachBookingScreen() {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const locale = currentLanguage();
  const params = useLocalSearchParams<{ coachId: string }>();
  const coachId = String(params.coachId ?? '');

  const page = useAsync(() => getCoachBookingPage(coachId), [coachId], { refetchOnFocus: true });
  const data = page.data;

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [where, setWhere] = useState('');
  const [note, setNote] = useState('');
  const [whereError, setWhereError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const services = useMemo(() => data?.services ?? [], [data]);
  const service = services.find((s) => s.id === serviceId) ?? null;

  /* One service: it is the choice. */
  useEffect(() => {
    if (!serviceId && services.length === 1) setServiceId(services[0].id);
  }, [serviceId, services]);

  const days = useMemo(
    () => groupByDay((data?.slots ?? []).filter((s) => s.service_id === serviceId)),
    [data, serviceId],
  );
  const dayGroup = days.find((d) => d.key === day) ?? null;
  const slot: BookableSlot | null = dayGroup?.items.find((s) => s.id === slotId) ?? null;

  /* Changing the service resets the day to the first one with a free place. */
  useEffect(() => {
    if (!serviceId) return;
    const first = days.find((d) => d.items.some((s) => s.spots_left > 0)) ?? days[0] ?? null;
    setDay(first?.key ?? null);
    setSlotId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace(Routes.discover);
  };

  const book = async () => {
    if (!slot || !service) return;
    if (service.location_mode === 'flexible' && where.trim().length < 3) {
      setWhereError(t('errors.coachingLocationRequired'));
      return;
    }
    setBooking(true);
    try {
      await bookCoachingSlot(slot.id, note, service.location_mode === 'flexible' ? where : '');
      toast.success(t('coaching.bookingDone'));
      router.replace(Routes.coaching);
    } catch (err) {
      toast.error(errorMessage(err));
      page.reload();
    } finally {
      setBooking(false);
    }
  };

  const name = displayName(data?.coach.full_name);
  const header = <Header title={data ? t('coaching.bookTitle', { name }) : t('coaching.cardBook')} back onBack={close} />;

  if (page.loading && !data) {
    return (
      <Screen header={header} testID="coach-booking-screen">
        <SkeletonList count={3} variant="card" />
      </Screen>
    );
  }
  if (page.error && !data) {
    return (
      <Screen header={header} testID="coach-booking-screen">
        <ErrorState message={page.error} onRetry={page.reload} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen header={header} testID="coach-booking-screen">
        <EmptyState icon={<CalendarX size={28} color={colors.textMuted} />} title={t('coaching.unavailable')} />
      </Screen>
    );
  }

  const canBook = data.gate === 'ok';

  return (
    <Screen
      header={header}
      keyboardAvoiding
      footer={
        canBook && slot && !slot.my_booking_id ? (
          <Button
            label={t('coaching.confirmBooking')}
            fullWidth
            loading={booking}
            onPress={book}
            testID="coach-booking-confirm"
          />
        ) : undefined
      }
      testID="coach-booking-screen"
    >
      <View style={{ gap: spacing.xl }}>
        <Pressable
          onPress={() => router.push(Routes.profile(data.coach.id))}
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          <Avatar uri={data.coach.avatar_url} name={name} size="lg" />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text variant="heading" numberOfLines={1} style={{ flexShrink: 1 }}>
                {name}
              </Text>
              {data.coach.is_verified ? <BadgeCheck size={18} color={colors.info} /> : null}
            </View>
            <Text variant="caption" tone={data.coach.accepting ? 'success' : 'muted'}>
              {t(data.coach.accepting ? 'coaching.accepting' : 'coaching.notAccepting')}
            </Text>
            {data.coach.headline ? (
              <Text variant="body" tone="secondary">
                {data.coach.headline}
              </Text>
            ) : null}
          </View>
        </Pressable>

        {data.gate === 'coach_not_accepting' ? (
          <InfoNote tone="neutral">{t('coaching.notAcceptingBody')}</InfoNote>
        ) : null}
        {data.gate === 'minor_needs_verified_coach' ? (
          <InfoNote tone="warning" icon="warning">
            {t('coaching.minorNeedsVerified')}
          </InfoNote>
        ) : null}
        {data.gate === 'guardian_consent_required' ? (
          <InfoNote
            tone="warning"
            icon="warning"
            actionLabel={t('coaching.askGuardian')}
            onAction={() => router.push({ pathname: Routes.settingsGuardian, params: { add: 'bookings' } })}
          >
            {`${t('coaching.guardianTitle')}. ${t('coaching.guardianBody')}`}
          </InfoNote>
        ) : null}
        {data.gate === 'own_calendar' ? (
          <InfoNote
            tone="info"
            actionLabel={t('coaching.manageCalendar')}
            onAction={() => router.push(Routes.coaching)}
          >
            {t('coaching.ownCalendar')}
          </InfoNote>
        ) : null}

        {services.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <Text variant="captionStrong" tone="secondary">
              {t('coaching.chooseService')}
            </Text>
            {services.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                selected={s.id === serviceId}
                onPress={() => setServiceId(s.id)}
                testID={`booking-service-${s.id}`}
              />
            ))}
          </View>
        ) : data.coach.accepting ? (
          <EmptyState compact title={t('coaching.noTimes')} body={t('coaching.noTimesBody')} />
        ) : null}

        {service ? (
          days.length === 0 ? (
            <EmptyState
              compact
              icon={<CalendarX size={24} color={colors.textMuted} />}
              title={t('coaching.noTimes')}
              body={t('coaching.noTimesBody')}
            />
          ) : (
            <>
              <View style={{ gap: spacing.md }}>
                <Text variant="captionStrong" tone="secondary">
                  {t('coaching.chooseDay')}
                </Text>
                <DayStrip
                  days={days.map((d) => ({
                    key: d.key,
                    date: d.date,
                    count: d.items.filter((s) => s.spots_left > 0).length,
                  }))}
                  selected={day}
                  onSelect={(key) => {
                    setDay(key);
                    setSlotId(null);
                  }}
                  testID="booking-days"
                />
              </View>

              <View style={{ gap: spacing.md }}>
                <Text variant="captionStrong" tone="secondary">
                  {t('coaching.chooseTime')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {(dayGroup?.items ?? []).map((s) => {
                    const mine = !!s.my_booking_id;
                    const full = s.spots_left <= 0 && !mine;
                    const on = s.id === slotId;
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => setSlotId(s.id)}
                        disabled={full || mine || !canBook}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on, disabled: full || mine }}
                        testID={`booking-slot-${s.id}`}
                        style={({ pressed }) => ({
                          minWidth: 96,
                          paddingVertical: spacing.sm,
                          paddingHorizontal: spacing.md,
                          borderRadius: radii.md,
                          alignItems: 'center',
                          borderWidth: 1.5,
                          borderColor: on ? colors.primary : mine ? colors.success : colors.border,
                          backgroundColor: on ? colors.primary : mine ? colors.successSoft : colors.surface,
                          opacity: full ? 0.45 : pressed ? 0.7 : 1,
                        })}
                      >
                        <Text variant="bodyStrong" color={on ? colors.textOnBrand : colors.text}>
                          {clockTime(s.starts_at, locale)}
                        </Text>
                        <Text
                          variant="caption"
                          color={on ? colors.textOnBrand : mine ? colors.success : colors.textMuted}
                        >
                          {mine
                            ? t('coaching.youBooked')
                            : full
                              ? t('coaching.full')
                              : s.capacity > 1
                                ? t('coaching.spotsLeft', { n: s.spots_left })
                                : t('coaching.minutes', { n: service.duration_minutes })}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          )
        ) : null}

        {canBook && slot && service ? (
          <View style={{ gap: spacing.lg }}>
            {service.location_mode === 'flexible' ? (
              <Input
                label={t('coaching.whereYouChoose')}
                required
                value={where}
                onChangeText={(v) => {
                  setWhere(v);
                  setWhereError(null);
                }}
                placeholder={t('coaching.wherePlaceholder')}
                maxLength={160}
                error={whereError}
                testID="booking-where"
              />
            ) : (
              <View style={{ gap: 2 }}>
                <Text variant="captionStrong" tone="secondary">
                  {t('coaching.whereLabel')}
                </Text>
                <Text variant="body">
                  {service.location_mode === 'online' ? t('coaching.mode.online') : service.location}
                </Text>
              </View>
            )}
            <Input
              label={t('coaching.noteLabel')}
              value={note}
              onChangeText={setNote}
              placeholder={t('coaching.notePlaceholder')}
              multiline
              maxLength={400}
              testID="booking-note"
            />
            <Text variant="caption" tone="muted">
              {t('coaching.payNote')}
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
