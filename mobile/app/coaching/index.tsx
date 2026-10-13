import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, CalendarPlus, MapPin, Plus, Video } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Header,
  Input,
  Reveal,
  Screen,
  SectionHeader,
  SkeletonList,
  Switch,
  Text,
  useToast,
} from '@/components/ui';
import { DayStrip } from '@/components/coaching/DayStrip';
import { ServiceCard } from '@/components/coaching/ServiceCard';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import {
  cancelCoachingBooking,
  cancelCoachingSlot,
  getMyCoaching,
  setCoachingServiceActive,
  setCoachingStatus,
  type CoachSlot,
  type MyBooking,
  type MyCoaching,
} from '@/lib/api.coaching';
import { dayKey, groupByDay, isUpcoming, timeRange, whenLabel } from '@/lib/coaching';
import { errorMessage } from '@/lib/errors';
import { displayName } from '@/lib/format';
import { currentLanguage } from '@/lib/i18n-bridge';
import { Routes } from '@/lib/routes';
import { amountLabel } from '@/lib/sponsorship';

/**
 * Coaching, for whoever is reading.
 *
 * A coach gets their side: the "taking students" switch, what they offer, and
 * the calendar with who is coming. Everyone gets the sessions they booked — a
 * coach can be somebody else's student — and a guardian sees their children's.
 */
export default function CoachingScreen() {
  const { spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const state = useAsync(getMyCoaching, [], { refetchOnFocus: true });
  const data = state.data;

  const header = (
    <Header title={t(data?.role === 'coach' ? 'coaching.calendarTitle' : 'coaching.myBookings')} back />
  );

  if (state.loading && !data) {
    return (
      <Screen header={header} testID="coaching-screen">
        <SkeletonList count={3} variant="card" />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen header={header} testID="coaching-screen">
        <ErrorState message={state.error ?? t('common.somethingWentWrong')} onRetry={state.reload} />
      </Screen>
    );
  }

  return (
    <Screen header={header} onRefresh={state.refresh} refreshing={state.refreshing} testID="coaching-screen">
      <View style={{ gap: spacing.xl }}>
        {data.role === 'coach' ? <CoachSide data={data} onChanged={state.refresh} /> : null}

        {data.role === 'guardian' ? (
          <Text variant="body" tone="secondary">
            {t('coaching.guardianIntro')}
          </Text>
        ) : null}

        {data.role !== 'coach' || data.bookings.length > 0 ? (
          <BookingsSide
            bookings={data.bookings}
            showTitle={data.role === 'coach'}
            onChanged={state.refresh}
            onFind={() => router.push({ pathname: Routes.discover, params: { view: 'coaches' } })}
          />
        ) : null}

        <Text variant="caption" tone="muted" align="center">
          {t('coaching.payNote')}
        </Text>
      </View>
    </Screen>
  );
}

// ── The coach's side ─────────────────────────────────────────────────────────
function CoachSide({ data, onChanged }: { data: MyCoaching; onChanged: () => void }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const locale = currentLanguage();

  const [accepting, setAccepting] = useState(data.accepting);
  const [headline, setHeadline] = useState(data.headline ?? '');
  const [savingStatus, setSavingStatus] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelSlot, setCancelSlot] = useState<CoachSlot | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    setAccepting(data.accepting);
    setHeadline(data.headline ?? '');
  }, [data.accepting, data.headline]);

  const saveStatus = useCallback(
    async (next: boolean, line: string) => {
      setSavingStatus(true);
      try {
        await setCoachingStatus(next, line);
        toast.success(t('coaching.statusSaved'));
        onChanged();
      } catch (err) {
        setAccepting(data.accepting);
        toast.error(errorMessage(err));
      } finally {
        setSavingStatus(false);
      }
    },
    [data.accepting, onChanged, t, toast],
  );

  const days = useMemo(() => groupByDay(data.slots), [data.slots]);
  const todayKey = dayKey(new Date());
  const [day, setDay] = useState<string | null>(null);
  /* Open on today if it has anything, else the next day that does. */
  const shownKey = day ?? days.find((d) => d.key >= todayKey)?.key ?? days.at(-1)?.key ?? null;
  const shown = days.find((d) => d.key === shownKey) ?? null;
  const activeServices = data.services.filter((s) => s.is_active);

  return (
    <>
      <Card padded level={1} tone={accepting ? 'primarySoft' : 'surface'} style={{ gap: spacing.md }} testID="coaching-status">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="subheading">{t(accepting ? 'coaching.accepting' : 'coaching.notAccepting')}</Text>
            <Text variant="caption" tone="muted">
              {t('coaching.acceptingHint')}
            </Text>
          </View>
          <Switch
            value={accepting}
            disabled={savingStatus}
            onValueChange={(next) => {
              setAccepting(next);
              saveStatus(next, headline);
            }}
            accessibilityLabel={t('coaching.accepting')}
          />
        </View>
        <Input
          label={t('coaching.headlineLabel')}
          value={headline}
          onChangeText={setHeadline}
          placeholder={t('coaching.headlinePlaceholder')}
          maxLength={140}
          testID="coaching-headline"
        />
        {headline.trim() !== (data.headline ?? '') ? (
          <Button
            label={t('coaching.saveStatus')}
            variant="secondary"
            size="sm"
            loading={savingStatus}
            onPress={() => saveStatus(accepting, headline)}
            style={{ alignSelf: 'flex-start' }}
          />
        ) : null}
      </Card>

      <View>
        <SectionHeader
          title={t('coaching.services')}
          action={t('coaching.newService')}
          onAction={() => router.push(Routes.coachingService)}
        />
        {data.services.length === 0 ? (
          <EmptyState
            compact
            title={t('coaching.noServices')}
            body={t('coaching.noServicesBody')}
            actionLabel={t('coaching.newService')}
            onAction={() => router.push(Routes.coachingService)}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {data.services.map((service) => (
              <ServiceCard key={service.id} service={service} testID={`my-service-${service.id}`}>
                <Text variant="caption" tone="muted">
                  {t('coaching.upcomingSlots', { n: service.upcoming_slots })}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {service.is_active ? (
                    <Button
                      label={t('coaching.addTimes')}
                      size="sm"
                      icon={<CalendarPlus size={15} color={colors.textOnBrand} />}
                      onPress={() =>
                        router.push({ pathname: Routes.coachingSlots, params: { service: service.id } })
                      }
                      testID={`service-add-times-${service.id}`}
                    />
                  ) : null}
                  <Button
                    label={t('coaching.editService')}
                    variant="secondary"
                    size="sm"
                    onPress={() => router.push({ pathname: Routes.coachingService, params: { id: service.id } })}
                  />
                  <Button
                    label={t(service.is_active ? 'coaching.retire' : 'coaching.restore')}
                    variant="ghost"
                    size="sm"
                    loading={busyId === service.id}
                    onPress={async () => {
                      setBusyId(service.id);
                      try {
                        await setCoachingServiceActive(service.id, !service.is_active);
                        onChanged();
                      } catch (err) {
                        toast.error(errorMessage(err));
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  />
                </View>
              </ServiceCard>
            ))}
          </View>
        )}
      </View>

      <View>
        <SectionHeader
          title={t('coaching.calendar')}
          action={activeServices.length > 0 ? t('coaching.addTimes') : undefined}
          onAction={activeServices.length > 0 ? () => router.push(Routes.coachingSlots) : undefined}
        />
        {days.length === 0 ? (
          <EmptyState
            compact
            icon={<CalendarDays size={24} color={colors.textMuted} />}
            title={t('coaching.noSlotsYet')}
            actionLabel={activeServices.length > 0 ? t('coaching.addTimes') : undefined}
            onAction={activeServices.length > 0 ? () => router.push(Routes.coachingSlots) : undefined}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            <DayStrip
              days={days.map((d) => ({
                key: d.key,
                date: d.date,
                count: d.items.reduce((n, s) => n + s.bookings.length, 0),
              }))}
              selected={shownKey}
              onSelect={setDay}
              testID="calendar-days"
            />
            {(shown?.items ?? []).map((slot, i) => (
              <Reveal key={slot.id} index={i}>
                <Card padded level={1} style={{ gap: spacing.sm }} testID={`calendar-slot-${slot.id}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="subheading">{timeRange(slot.starts_at, slot.ends_at, locale)}</Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {slot.service_title}
                      </Text>
                    </View>
                    <Badge
                      label={t('coaching.bookedCount', { n: slot.bookings.length, total: slot.capacity })}
                      tone={slot.bookings.length >= slot.capacity ? 'success' : slot.bookings.length > 0 ? 'info' : 'neutral'}
                      size="md"
                    />
                  </View>
                  {slot.bookings.length === 0 ? (
                    <Text variant="caption" tone="muted">
                      {t('coaching.nobodyYet')}
                    </Text>
                  ) : (
                    slot.bookings.map((b) => {
                      const who = displayName(b.full_name);
                      return (
                        <Pressable
                          key={b.id}
                          onPress={() => router.push(Routes.profile(b.athlete_user_id))}
                          accessibilityRole="button"
                          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                        >
                          <Avatar uri={b.avatar_url} name={who} size="sm" />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                              <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                                {who}
                              </Text>
                              {b.is_minor ? <Badge label={t('common.under18')} tone="info" /> : null}
                            </View>
                            {b.location && slot.location_mode === 'flexible' ? (
                              <Text variant="caption" tone="secondary" numberOfLines={1}>
                                {b.location}
                              </Text>
                            ) : null}
                            {b.note ? (
                              <Text variant="caption" tone="muted" numberOfLines={2}>
                                {b.note}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                  {isUpcoming(slot.starts_at, new Date()) ? (
                    <Button
                      label={t('coaching.cancelSlot')}
                      variant="ghost"
                      size="sm"
                      onPress={() => setCancelSlot(slot)}
                      style={{ alignSelf: 'flex-start' }}
                      testID={`calendar-cancel-${slot.id}`}
                    />
                  ) : null}
                </Card>
              </Reveal>
            ))}
          </View>
        )}
        {activeServices.length > 0 ? (
          <Button
            label={t('coaching.addTimes')}
            fullWidth
            icon={<Plus size={18} color={colors.textOnBrand} />}
            onPress={() => router.push(Routes.coachingSlots)}
            style={{ marginTop: spacing.lg }}
            testID="coaching-add-times"
          />
        ) : null}
      </View>

      <ConfirmSheet
        visible={!!cancelSlot}
        title={t('coaching.cancelSlot')}
        message={t('coaching.cancelSlotBody')}
        confirmLabel={t('coaching.cancelSlot')}
        cancelLabel={t('coaching.keepIt')}
        destructive
        loading={cancelling}
        onCancel={() => setCancelSlot(null)}
        onConfirm={async () => {
          if (!cancelSlot) return;
          setCancelling(true);
          try {
            await cancelCoachingSlot(cancelSlot.id);
            toast.success(t('coaching.slotCancelled'));
            setCancelSlot(null);
            onChanged();
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setCancelling(false);
          }
        }}
      />
    </>
  );
}

// ── What I booked ────────────────────────────────────────────────────────────
function BookingsSide({
  bookings,
  showTitle,
  onChanged,
  onFind,
}: {
  bookings: MyBooking[];
  showTitle: boolean;
  onChanged: () => void;
  onFind: () => void;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const locale = currentLanguage();
  const [cancel, setCancel] = useState<MyBooking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const now = new Date();
  const upcoming = bookings.filter((b) => b.status === 'booked' && isUpcoming(b.starts_at, now));
  const rest = bookings.filter((b) => !(b.status === 'booked' && isUpcoming(b.starts_at, now))).reverse();

  const row = (b: MyBooking, live: boolean) => {
    const coach = displayName(b.coach_name);
    const price = b.price == null ? null : amountLabel(b.price, b.currency);
    return (
      <Card key={b.id} padded level={1} style={{ gap: spacing.sm, opacity: live ? 1 : 0.75 }} testID={`booking-${b.id}`}>
        <Pressable
          onPress={() => router.push(Routes.profile(b.coach_user_id))}
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          <Avatar uri={b.coach_avatar} name={coach} size="md" verified={b.coach_verified} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {b.service_title}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {t('coaching.withCoach', { name: coach })}
            </Text>
            {b.for_child ? (
              <Text variant="caption" tone="info" numberOfLines={1}>
                {t('coaching.forChild', { name: displayName(b.athlete_name) })}
              </Text>
            ) : null}
          </View>
          {price ? (
            <Text variant="captionStrong" tone="secondary">
              {price}
            </Text>
          ) : null}
        </Pressable>
        <Text variant="subheading">{whenLabel(b.starts_at, locale)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {b.location_mode === 'online' ? (
            <Video size={13} color={colors.textMuted} />
          ) : (
            <MapPin size={13} color={colors.textMuted} />
          )}
          <Text variant="caption" tone="muted" style={{ flex: 1 }}>
            {b.location_mode === 'online' ? t('coaching.mode.online') : b.location}
          </Text>
        </View>
        {b.status === 'cancelled' ? (
          <Badge
            label={t(`coaching.cancelledBy.${b.cancelled_by ?? 'coach'}`)}
            tone="danger"
            style={{ alignSelf: 'flex-start' }}
          />
        ) : null}
        {live ? (
          <Button
            label={t('coaching.cancelBooking')}
            variant="ghost"
            size="sm"
            onPress={() => setCancel(b)}
            style={{ alignSelf: 'flex-start' }}
            testID={`booking-cancel-${b.id}`}
          />
        ) : null}
      </Card>
    );
  };

  return (
    <>
      <View>
        <SectionHeader
          title={showTitle ? t('coaching.myBookings') : t('coaching.upcoming')}
          action={t('coaching.findCoach')}
          onAction={onFind}
        />
        {upcoming.length === 0 ? (
          <EmptyState
            compact
            icon={<CalendarDays size={24} color={colors.textMuted} />}
            title={t('coaching.noBookings')}
            body={t('coaching.noBookingsBody')}
            actionLabel={t('coaching.findCoach')}
            onAction={onFind}
          />
        ) : (
          <View style={{ gap: spacing.md }}>{upcoming.map((b) => row(b, true))}</View>
        )}
      </View>
      {rest.length > 0 ? (
        <View>
          <SectionHeader title={t('coaching.past')} />
          <View style={{ gap: spacing.md }}>{rest.map((b) => row(b, false))}</View>
        </View>
      ) : null}

      <ConfirmSheet
        visible={!!cancel}
        title={t('coaching.cancelBooking')}
        message={t('coaching.cancelBookingBody')}
        confirmLabel={t('coaching.cancelBooking')}
        cancelLabel={t('coaching.keepIt')}
        destructive
        loading={cancelling}
        onCancel={() => setCancel(null)}
        onConfirm={async () => {
          if (!cancel) return;
          setCancelling(true);
          try {
            await cancelCoachingBooking(cancel.id);
            toast.success(t('coaching.bookingCancelled'));
            setCancel(null);
            onChanged();
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setCancelling(false);
          }
        }}
      />
    </>
  );
}
