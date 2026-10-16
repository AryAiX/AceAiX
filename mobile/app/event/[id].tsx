import React, { useCallback, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BadgeCheck,
  CalendarClock,
  CalendarX,
  CircleCheck,
  MapPin,
  Pencil,
  Ticket,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  AnimatedGradient,
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
  Sheet,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { RegistrationList } from '@/components/club/event/RegistrationList';
import { ageRange, eventWhen, mapsUrl, priceLabel } from '@/components/club/event/eventFormat';
import { InfoNote } from '@/components/settings/Notes';
import { sportEmoji, sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import {
  cancelClubEvent,
  cancelClubEventRegistration,
  getClubEventPage,
  registerForClubEvent,
  type ClubEventGate,
} from '@/lib/api.club';
import { clubLabel } from '@/lib/clubLabels';
import { errorMessage } from '@/lib/errors';
import { metaLine } from '@/lib/format';
import { currentLanguage, type Translate } from '@/lib/i18n-bridge';
import { Routes } from '@/lib/routes';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Why the button is off, in words a 13-year-old and their parent both get. */
function gateCopy(t: Translate, gate: ClubEventGate): { title: string; body: string } | null {
  switch (gate) {
    case 'full':
      return { title: t('clubMatch.event.gateFullTitle'), body: t('clubMatch.event.gateFullBody') };
    case 'closed':
      return { title: t('clubMatch.event.gateClosedTitle'), body: t('clubMatch.event.gateClosedBody') };
    case 'past':
      return { title: t('clubMatch.event.gatePastTitle'), body: t('clubMatch.event.gatePastBody') };
    case 'cancelled':
      return { title: t('clubMatch.event.gateCancelledTitle'), body: t('clubMatch.event.gateCancelledBody') };
    case 'age_out_of_range':
      return { title: t('clubMatch.event.gateAgeTitle'), body: t('clubMatch.event.gateAgeBody') };
    case 'not_signed_in':
      return { title: t('clubMatch.event.gateSignInTitle'), body: t('clubMatch.event.gateSignInBody') };
    case 'minor_needs_verified_club':
      return { title: t('clubMatch.event.gateVerifiedTitle'), body: t('clubMatch.event.gateVerifiedBody') };
    case 'guardian_consent_required':
      return { title: t('clubMatch.event.gateGuardianTitle'), body: t('clubMatch.event.gateGuardianBody') };
    default:
      return null;
  }
}

function Fact({ icon, label, value, action }: { icon: React.ReactNode; label: string; value: string; action?: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 }}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant="bodyStrong">{value}</Text>
      </View>
      {action}
    </View>
  );
}

/**
 * A club event — trial, camp, clinic, tournament. Everything someone needs to
 * decide, then one button. When they cannot register, the page says why
 * instead of greying out a button and leaving them guessing.
 */
export default function ClubEventScreen() {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const router = useRouter();
  const toast = useToast();
  const locale = currentLanguage();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof raw === 'string' && UUID.test(raw) ? raw : null;

  const page = useAsync(() => getClubEventPage(id as string), [id], { enabled: !!id, refetchOnFocus: true });

  const [registerOpen, setRegisterOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'register' | 'leave' | 'cancelEvent' | null>(null);
  const [confirm, setConfirm] = useState<'leave' | 'cancelEvent' | null>(null);

  const register = useCallback(async () => {
    if (!id) return;
    setBusy('register');
    try {
      await registerForClubEvent(id, note);
      setRegisterOpen(false);
      setNote('');
      toast.success(t('clubMatch.event.registeredToast'));
      page.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }, [id, note, page, t, toast]);

  const onConfirm = useCallback(async () => {
    if (!id || !confirm) return;
    const action = confirm;
    setBusy(action);
    try {
      if (action === 'leave') {
        await cancelClubEventRegistration(id);
        toast.success(t('clubMatch.event.leftToast'));
      } else {
        await cancelClubEvent(id);
        toast.success(t('clubMatch.event.cancelledToast'));
      }
      setConfirm(null);
      page.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }, [confirm, id, page, t, toast]);

  const header = <Header back title={t('clubMatch.event.title')} />;

  if (!id) {
    return (
      <Screen header={header} testID="club-event-screen">
        <EmptyState
          icon={<CalendarX size={26} color={colors.textMuted} />}
          title={t('clubMatch.event.missingTitle')}
          body={t('clubMatch.event.missingBody')}
        />
      </Screen>
    );
  }
  if (page.loading && !page.data) {
    return (
      <Screen header={header} testID="club-event-screen">
        <SkeletonList count={3} />
      </Screen>
    );
  }
  if (page.error && !page.data) {
    return (
      <Screen header={header} testID="club-event-screen">
        <ErrorState message={page.error} onRetry={page.reload} />
      </Screen>
    );
  }
  if (!page.data) {
    return (
      <Screen header={header} testID="club-event-screen">
        <EmptyState
          icon={<CalendarX size={26} color={colors.textMuted} />}
          title={t('clubMatch.event.goneTitle')}
          body={t('clubMatch.event.goneBody')}
        />
      </Screen>
    );
  }

  const data = page.data;
  const { event, organization: club, gate } = data;
  const manager = data.can_manage;
  const cancelled = event.status === 'cancelled';
  const upcoming = new Date(event.starts_at).getTime() > Date.now();
  const registered = !!data.my_registration;
  const sportLine = metaLine(
    event.sport ? `${sportEmoji(event.sport)} ${sportLabel(t, event.sport)}` : null,
    clubLabel(t, 'category', event.category),
  );
  const places =
    data.spots_left == null
      ? t('clubMatch.event.unlimited')
      : data.spots_left === 0
        ? t('clubMatch.event.noPlacesLeft')
        : t('clubMatch.event.placesLeft', { count: data.spots_left });
  const blocked = gateCopy(t, gate);

  /* ── Call to action ── */
  let footer: React.ReactNode = null;
  let notice: React.ReactNode = null;
  if (manager) {
    footer = null;
  } else if (registered) {
    footer = (
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' }}>
          <CircleCheck size={20} color={colors.success} />
          <Text variant="bodyStrong" tone="success">
            {t('clubMatch.event.youreRegistered')}
          </Text>
        </View>
        {!cancelled && upcoming ? (
          <Button
            label={t('clubMatch.event.cancelMyPlace')}
            variant="secondary"
            fullWidth
            loading={busy === 'leave'}
            onPress={() => setConfirm('leave')}
            testID="club-event-leave"
          />
        ) : null}
      </View>
    );
  } else if (gate === 'ok') {
    footer = (
      <Button
        label={t('clubMatch.event.register')}
        size="lg"
        fullWidth
        icon={<Ticket size={20} color={colors.textOnBrand} />}
        onPress={() => setRegisterOpen(true)}
        testID="club-event-register"
      />
    );
  } else if (gate === 'own_club') {
    notice = <InfoNote tone="neutral">{t('clubMatch.event.ownClubBody')}</InfoNote>;
  } else if (blocked) {
    footer = (
      <Button label={blocked.title} size="lg" fullWidth disabled onPress={() => {}} testID="club-event-blocked" />
    );
    notice =
      gate === 'guardian_consent_required' ? (
        <InfoNote
          tone="warning"
          icon="shield"
          actionLabel={t('clubMatch.event.askGuardian')}
          onAction={() => router.push(Routes.settingsGuardian)}
        >
          {blocked.body}
        </InfoNote>
      ) : (
        <InfoNote tone={gate === 'minor_needs_verified_club' ? 'warning' : 'info'} icon={gate === 'minor_needs_verified_club' ? 'shield' : 'info'}>
          {blocked.body}
        </InfoNote>
      );
  }

  return (
    <Screen
      header={header}
      onRefresh={page.refresh}
      refreshing={page.refreshing}
      contentStyle={{ gap: spacing.xl, paddingTop: spacing.md }}
      footer={footer}
      testID="club-event-screen"
    >
      <Reveal from="scale">
        <AnimatedGradient
          colors={cancelled ? [colors.surfaceInverse, colors.textSecondary] : theme.gradients.warm}
          radius={radii.xl}
          style={{ padding: spacing.xl, gap: spacing.md }}
        >
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Badge label={clubLabel(t, 'eventKind', event.kind)} tone="neutral" solid />
            {cancelled ? <Badge label={t('clubMatch.event.cancelledBadge')} tone="danger" solid /> : null}
          </View>
          <Text variant="title" color={colors.textOnBrand}>
            {event.title}
          </Text>
          <Text variant="bodyStrong" color={colors.textOnBrand}>
            {eventWhen(event.starts_at, event.ends_at, locale)}
          </Text>
        </AnimatedGradient>
      </Reveal>

      <Pressable
        onPress={() => router.push(Routes.organization(club.id))}
        accessibilityRole="link"
        accessibilityLabel={t('clubMatch.match.openClub', { name: club.name })}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <ClubLogo uri={club.logo_url} name={club.name} size="sm" />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {club.name}
          </Text>
          {club.is_verified ? (
            <BadgeCheck size={18} color={colors.info} fill={colors.infoSoft} strokeWidth={2.2} />
          ) : null}
        </View>
      </Pressable>

      {notice}

      <Card tone="alt" style={{ gap: spacing.xs }}>
        <Fact
          icon={<CalendarClock size={18} color={colors.textMuted} />}
          label={t('clubMatch.event.when')}
          value={eventWhen(event.starts_at, event.ends_at, locale)}
        />
        {event.location ? (
          <Fact
            icon={<MapPin size={18} color={colors.textMuted} />}
            label={t('clubMatch.event.where')}
            value={event.location}
            action={
              <Button
                label={t('clubMatch.event.openMaps')}
                size="sm"
                variant="ghost"
                onPress={() => {
                  Linking.openURL(mapsUrl(event.location as string)).catch(() => {});
                }}
              />
            }
          />
        ) : null}
        <Fact
          icon={<Users size={18} color={colors.textMuted} />}
          label={t('clubMatch.event.whoFor')}
          value={ageRange(t, event.age_min, event.age_max)}
        />
        {sportLine ? (
          <Fact icon={<Trophy size={18} color={colors.textMuted} />} label={t('clubMatch.event.sport')} value={sportLine} />
        ) : null}
        <Fact
          icon={<Wallet size={18} color={colors.textMuted} />}
          label={t('clubMatch.event.price')}
          value={priceLabel(t, event.price, event.currency, locale)}
        />
        <Fact icon={<Ticket size={18} color={colors.textMuted} />} label={t('clubMatch.event.places')} value={places} />
      </Card>

      {event.description?.trim() ? (
        <View>
          <SectionHeader title={t('clubMatch.event.about')} />
          <Text variant="body" tone="secondary">
            {event.description.trim()}
          </Text>
        </View>
      ) : null}

      {registered && data.my_registration?.note ? (
        <Card tone="primarySoft" style={{ gap: spacing.xs }}>
          <Text variant="captionStrong" tone="secondary">
            {t('clubMatch.event.yourNote')}
          </Text>
          <Text variant="body">{data.my_registration.note}</Text>
        </Card>
      ) : null}

      {manager ? (
        <View style={{ gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Button
              label={t('clubMatch.event.edit')}
              variant="secondary"
              icon={<Pencil size={18} color={colors.text} />}
              onPress={() => router.push({ pathname: '/club/[orgId]/event-edit', params: { orgId: club.id, id: event.id } })}
              style={{ flexGrow: 1 }}
              testID="club-event-edit"
            />
            {!cancelled ? (
              <Button
                label={t('clubMatch.event.cancelEvent')}
                variant="danger"
                loading={busy === 'cancelEvent'}
                onPress={() => setConfirm('cancelEvent')}
                style={{ flexGrow: 1 }}
                testID="club-event-cancel"
              />
            ) : null}
          </View>

          <View>
            <SectionHeader
              title={
                event.capacity != null
                  ? t('clubMatch.event.registeredOf', { count: event.registration_count, capacity: event.capacity })
                  : t('clubMatch.event.registeredCount', { count: event.registration_count })
              }
            />
            <RegistrationList
              registrations={data.registrations ?? []}
              onOpen={(userId) => router.push(Routes.profile(userId))}
            />
          </View>
        </View>
      ) : null}

      <Sheet
        visible={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title={t('clubMatch.event.registerTitle')}
        subtitle={event.title}
        footer={
          <Button
            label={t('clubMatch.event.confirmRegister')}
            size="lg"
            fullWidth
            loading={busy === 'register'}
            onPress={() => void register()}
            testID="club-event-register-confirm"
          />
        }
      >
        <Input
          label={t('clubMatch.event.noteLabel')}
          placeholder={t('clubMatch.event.notePlaceholder')}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={400}
        />
      </Sheet>

      <ConfirmSheet
        visible={confirm !== null}
        title={confirm === 'leave' ? t('clubMatch.event.leaveTitle') : t('clubMatch.event.cancelEventTitle')}
        message={confirm === 'leave' ? t('clubMatch.event.leaveBody') : t('clubMatch.event.cancelEventBody')}
        confirmLabel={confirm === 'leave' ? t('clubMatch.event.cancelMyPlace') : t('clubMatch.event.cancelEvent')}
        cancelLabel={t('clubMatch.event.keep')}
        destructive
        loading={busy !== null && busy !== 'register'}
        onConfirm={() => void onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </Screen>
  );
}
