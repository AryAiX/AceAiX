import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays, Check, MapPin, Users, Wallet, X } from 'lucide-react-native';

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
  Reveal,
  Screen,
  SectionHeader,
  Sheet,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { TranslatableText } from '@/components/common/TranslatableText';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { errorMessage } from '@/lib/errors';
import { fullDate, metaLine } from '@/lib/format';
import { sportLabel } from '@/constants/sports';
import {
  cancelMeetup,
  decideRequest,
  getMeetup,
  leaveMeetup,
  requestToJoin,
} from '@/lib/api.meetups';

/**
 * One game: where, when, who is going, and the one thing you can do about it.
 *
 * The screen has three audiences and shows a different bottom half to each —
 * a stranger sees the ask-to-join button, someone who is going sees the roster,
 * and the host sees the requests waiting on them. Everything above that is the
 * same for all three, because the facts of the game do not change with who is
 * reading.
 */
export default function MeetupScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const toast = useToast();

  const detail = useAsync(() => getMeetup(id!), [id], { refetchOnFocus: true });

  const [askOpen, setAskOpen] = useState(false);
  const [askText, setAskText] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const data = detail.data;
  const meetup = data?.meetup;
  const isHost = data?.my_status === 'host';
  const isIn = data?.my_status === 'joined' || isHost;

  const onAsk = useCallback(async () => {
    setBusy(true);
    try {
      await requestToJoin(id!, askText);
      setAskOpen(false);
      setAskText('');
      toast.success(t('meetups.askSent'));
      detail.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [askText, detail, id, t, toast]);

  const onDecide = useCallback(
    async (userId: string, accept: boolean, name: string | null) => {
      try {
        await decideRequest(id!, userId, accept);
        toast.success(
          accept ? t('meetups.accepted', { name: name ?? '' }) : t('meetups.declinedToast'),
        );
        detail.reload();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    },
    [detail, id, t, toast],
  );

  const onLeave = useCallback(async () => {
    setBusy(true);
    try {
      await leaveMeetup(id!);
      setLeaveOpen(false);
      toast.success(t('meetups.left'));
      detail.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [detail, id, t, toast]);

  const onCancel = useCallback(async () => {
    setBusy(true);
    try {
      await cancelMeetup(id!);
      setCancelOpen(false);
      toast.success(t('meetups.cancelled_toast'));
      detail.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [detail, id, t, toast]);

  const header = <Header back title={meetup?.title ?? t('meetups.title')} />;

  if (detail.error && !data) {
    return (
      <Screen header={header}>
        <ErrorState message={detail.error} onRetry={detail.reload} />
      </Screen>
    );
  }
  if (!data || !meetup) {
    return (
      <Screen header={header}>
        <SkeletonList count={3} />
      </Screen>
    );
  }

  const left = meetup.spots_left;
  const full = left <= 0;
  const cancelled = meetup.status === 'cancelled';
  const spotsColour = cancelled || full ? colors.textMuted : left <= 2 ? colors.play.flame : colors.play.mint;

  return (
    <Screen header={header} contentStyle={{ gap: spacing.xl }} testID="meetup-screen">
      {/* ── The facts ── */}
      <Reveal>
        <Card padded>
          <Text variant="title" numberOfLines={3}>
            {meetup.title}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
            <Badge label={sportLabel(t, meetup.sport)} tone="neutral" />
            <Badge
              label={t(
                `meetups.level${meetup.level.charAt(0).toUpperCase()}${meetup.level.slice(1)}`,
              )}
              tone="neutral"
            />
            {cancelled ? <Badge label={t('meetups.cancelled')} tone="danger" /> : null}
          </View>

          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <Fact
              icon={<CalendarDays size={16} color={colors.textMuted} />}
              text={fullDate(meetup.starts_at)}
            />
            <Fact
              icon={<MapPin size={16} color={colors.textMuted} />}
              text={metaLine(meetup.venue, meetup.area, meetup.city, meetup.country) ?? meetup.city}
            />
            <Fact
              icon={<Users size={16} color={spotsColour} />}
              text={`${t('meetups.spotsOf', { taken: meetup.spots_taken, total: meetup.spots_total })} · ${
                full ? t('meetups.full') : t('meetups.spotsLeft', { count: left })
              }`}
              color={spotsColour}
            />
            {meetup.cost_note ? (
              <Fact
                icon={<Wallet size={16} color={colors.textMuted} />}
                text={t('meetups.costEach', { cost: meetup.cost_note })}
              />
            ) : null}
          </View>

          {meetup.note ? (
            <View style={{ marginTop: spacing.lg }}>
              {/* The host's own words, in whatever language they wrote them. */}
              <TranslatableText text={meetup.note} variant="caption" tone="secondary" />
            </View>
          ) : null}
        </Card>
      </Reveal>

      {/* ── The host ── */}
      <Reveal index={1}>
        <SectionHeader title={t('meetups.host')} />
        <Card padded onPress={() => router.push(Routes.profile(data.host.user_id))}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar
              uri={data.host.avatar_url}
              name={data.host.full_name}
              size="md"
              verified={data.host.is_verified}
            />
            <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
              {data.host.full_name}
            </Text>
          </View>
        </Card>
      </Reveal>

      {/* ── Requests, for the host only ── */}
      {isHost && data.pending ? (
        <Reveal index={2}>
          <SectionHeader
            title={t('meetups.requests')}
            action={
              data.pending.length > 0
                ? t('meetups.requests', { count: data.pending.length })
                : undefined
            }
            onAction={data.pending.length > 0 ? () => {} : undefined}
          />
          {data.pending.length === 0 ? (
            <Text variant="caption" tone="muted">
              {t('meetups.noRequests')}
            </Text>
          ) : (
            <Card padded={false}>
              {data.pending.map((person, index) => (
                <View key={person.user_id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={{ padding: spacing.lg, gap: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                      <Avatar
                        uri={person.avatar_url}
                        name={person.full_name}
                        size="sm"
                        verified={person.is_verified}
                      />
                      <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                        {person.full_name}
                      </Text>
                    </View>

                    {person.message ? (
                      <TranslatableText
                        text={person.message}
                        variant="caption"
                        tone="secondary"
                      />
                    ) : null}

                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <Button
                        label={t('meetups.accept')}
                        size="sm"
                        style={{ flex: 1 }}
                        fullWidth
                        icon={<Check size={15} color={colors.textOnBrand} />}
                        accessibilityLabel={t('meetups.a11yAccept', {
                          name: person.full_name ?? '',
                        })}
                        onPress={() => onDecide(person.user_id, true, person.full_name)}
                      />
                      <Button
                        label={t('meetups.decline')}
                        size="sm"
                        variant="secondary"
                        style={{ flex: 1 }}
                        fullWidth
                        icon={<X size={15} color={colors.text} />}
                        accessibilityLabel={t('meetups.a11yDecline', {
                          name: person.full_name ?? '',
                        })}
                        onPress={() => onDecide(person.user_id, false, person.full_name)}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </Reveal>
      ) : null}

      {/* ── Who is going, for people who are ── */}
      {isIn && data.roster ? (
        <Reveal index={3}>
          <SectionHeader title={t('meetups.going')} />
          <Card padded={false}>
            {data.roster.map((person, index) => (
              <View key={person.user_id}>
                {index > 0 ? <Divider /> : null}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.lg,
                  }}
                >
                  <Avatar
                    uri={person.avatar_url}
                    name={person.full_name}
                    size="sm"
                    verified={person.is_verified}
                  />
                  <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                    {person.full_name}
                  </Text>
                  {person.status === 'host' ? (
                    <Badge label={t('meetups.host')} tone="neutral" />
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        </Reveal>
      ) : null}

      {/* ── The one thing you can do ── */}
      {!cancelled ? (
        <View style={{ gap: spacing.sm }}>
          {isHost ? (
            <Button
              label={t('meetups.cancel')}
              variant="danger"
              fullWidth
              onPress={() => setCancelOpen(true)}
            />
          ) : data.my_status === 'joined' ? (
            <Button
              label={t('meetups.leave')}
              variant="secondary"
              fullWidth
              onPress={() => setLeaveOpen(true)}
            />
          ) : data.my_status === 'requested' ? (
            <Button label={t('meetups.requested')} variant="secondary" fullWidth disabled />
          ) : data.my_status === 'declined' ? (
            <Button label={t('meetups.declined')} variant="secondary" fullWidth disabled />
          ) : (
            <Button
              label={full ? t('meetups.full') : t('meetups.askToJoin')}
              fullWidth
              disabled={full}
              onPress={() => setAskOpen(true)}
            />
          )}
        </View>
      ) : null}

      {/* ── Asking ── */}
      <Sheet visible={askOpen} onClose={() => setAskOpen(false)} title={t('meetups.askToJoin')}>
        <Input
          label={t('meetups.askMessage')}
          placeholder={t('meetups.askMessagePlaceholder')}
          value={askText}
          onChangeText={setAskText}
          multiline
          maxLength={300}
        />
        <Button
          label={t('meetups.askToJoin')}
          fullWidth
          loading={busy}
          style={{ marginTop: spacing.lg }}
          onPress={onAsk}
        />
      </Sheet>

      <ConfirmSheet
        visible={leaveOpen}
        title={t('meetups.leaveConfirmTitle')}
        message={t('meetups.leaveConfirmBody')}
        confirmLabel={t('meetups.leave')}
        destructive
        loading={busy}
        onConfirm={onLeave}
        onCancel={() => setLeaveOpen(false)}
      />

      <ConfirmSheet
        visible={cancelOpen}
        title={t('meetups.cancelConfirmTitle')}
        message={t('meetups.cancelConfirmBody')}
        confirmLabel={t('meetups.cancel')}
        destructive
        loading={busy}
        onConfirm={onCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </Screen>
  );
}

function Fact({
  icon,
  text,
  color,
}: {
  icon: React.ReactNode;
  text: string;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <View>{icon}</View>
      <Text variant="body" color={color} style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}
