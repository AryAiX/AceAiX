import React, { useCallback, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CalendarX, ListOrdered, Pencil, Tv } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Header,
  Reveal,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { AddEventSheet, type AddEventPreset } from '@/components/club/match/AddEventSheet';
import { MatchTimeline } from '@/components/club/match/MatchTimeline';
import { Scoreboard } from '@/components/club/match/Scoreboard';
import { ScorekeeperPanel, type StatusAction } from '@/components/club/match/ScorekeeperPanel';
import { streamPlatform } from '@/components/club/match/matchFormat';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import {
  addMatchEvent,
  deleteMatchEvent,
  getClubMatchPage,
  subscribeToMatch,
  updateMatchLive,
  type ClubMatch,
  type ClubMatchPage,
  type MatchEvent,
  type MatchEventInput,
  type MatchLiveUpdate,
} from '@/lib/api.club';
import { SCORING_KINDS, isAllowedStreamUrl, isLive, type MatchSide } from '@/lib/club';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLL_MS = 30_000;

type Confirm = { kind: 'status'; action: 'fullTime' | 'postpone' | 'cancel' } | { kind: 'event'; event: MatchEvent };

function buzz(kind: 'tap' | 'success' | 'warning') {
  try {
    const p =
      kind === 'tap'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        : Haptics.notificationAsync(
            kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
          );
    p.catch(() => {});
  } catch {
    /* No haptics on this device. */
  }
}

/**
 * A club match: the live score for everyone, and — for the club's
 * scorekeepers — the controls that move it.
 *
 * Live updates arrive over the realtime channel while the screen is in front;
 * a 30-second poll covers networks that drop the socket.
 */
export default function MatchScreen() {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof raw === 'string' && UUID.test(raw) ? raw : null;

  const page = useAsync(() => getClubMatchPage(id as string), [id], { enabled: !!id });
  const data = page.data;

  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [sheet, setSheet] = useState<AddEventPreset | null>(null);
  const [lastPreset, setLastPreset] = useState<AddEventPreset>({ kind: 'goal', side: 'us' });

  /* A quiet re-read: no skeleton, no pull spinner. */
  const mutate = page.mutate;
  const silentReload = useCallback(async () => {
    if (!id) return;
    try {
      const next = await getClubMatchPage(id);
      mutate(() => next);
    } catch {
      /* The next tick or a pull will try again. */
    }
  }, [id, mutate]);

  const reloadRef = useRef(silentReload);
  reloadRef.current = silentReload;

  useFocusEffect(
    useCallback(() => {
      if (!id) return undefined;
      return subscribeToMatch(id, () => {
        void reloadRef.current();
      });
    }, [id]),
  );

  const live = isLive(data?.match.status);
  useFocusEffect(
    useCallback(() => {
      if (!live) return undefined;
      const timer = setInterval(() => {
        void reloadRef.current();
      }, POLL_MS);
      return () => clearInterval(timer);
    }, [live]),
  );

  const patchMatch = useCallback(
    (patch: Partial<ClubMatch>) =>
      mutate((current) => (current ? { ...current, match: { ...current.match, ...patch } } : current)),
    [mutate],
  );

  const runLive = useCallback(
    async (key: string, patch: MatchLiveUpdate, haptic: 'tap' | 'success' | 'warning' = 'tap') => {
      if (!id || busy) return;
      setBusy(key);
      patchMatch(patch as Partial<ClubMatch>);
      buzz(haptic);
      try {
        await updateMatchLive(id, patch);
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setBusy(null);
        void silentReload();
      }
    },
    [busy, id, patchMatch, silentReload, toast],
  );

  const onStatus = useCallback(
    (action: StatusAction) => {
      switch (action) {
        case 'kickoff':
          void runLive(action, { status: 'live', period: '1st half', minute: 0 }, 'success');
          break;
        case 'halfTime':
          void runLive(action, { status: 'half_time' });
          break;
        case 'secondHalf':
          void runLive(action, { status: 'live', period: '2nd half' }, 'success');
          break;
        case 'resume':
          void runLive(action, { status: 'live' });
          break;
        case 'reschedule':
          void runLive(action, { status: 'scheduled' });
          break;
        default:
          setConfirm({ kind: 'status', action });
      }
    },
    [runLive],
  );

  const onScore = useCallback(
    (side: MatchSide, delta: 1 | -1) => {
      if (!data) return;
      const m = data.match;
      const patch: MatchLiveUpdate =
        side === 'us'
          ? { our_score: Math.max(0, m.our_score + delta) }
          : { their_score: Math.max(0, m.their_score + delta) };
      void runLive(`score-${side}`, patch);
    },
    [data, runLive],
  );

  const onAddEvent = useCallback(
    async (input: MatchEventInput) => {
      if (!id || !data || busy) return;
      setBusy('event');
      const scores = SCORING_KINDS.includes(input.kind);
      const points = input.kind === 'point' ? (input.points ?? 1) : 1;
      if (scores) {
        patchMatch(
          input.side === 'us'
            ? { our_score: data.match.our_score + points }
            : { their_score: data.match.their_score + points },
        );
      }
      try {
        await addMatchEvent(id, input);
        buzz(scores ? 'success' : 'tap');
        setSheet(null);
        toast.success(t('clubMatch.addEvent.added'));
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setBusy(null);
        void silentReload();
      }
    },
    [busy, data, id, patchMatch, silentReload, t, toast],
  );

  const onConfirm = useCallback(async () => {
    if (!confirm || !id) return;
    if (confirm.kind === 'status') {
      const status = confirm.action === 'fullTime' ? 'finished' : confirm.action === 'postpone' ? 'postponed' : 'cancelled';
      setConfirm(null);
      void runLive(confirm.action, { status }, confirm.action === 'fullTime' ? 'success' : 'warning');
      return;
    }
    const event = confirm.event;
    setBusy('delete');
    mutate((current) =>
      current ? { ...current, events: current.events.filter((e) => e.id !== event.id) } : current,
    );
    setConfirm(null);
    try {
      await deleteMatchEvent(event.id);
      buzz('tap');
      toast.success(t('clubMatch.match.eventDeleted'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
      void silentReload();
    }
  }, [confirm, id, mutate, runLive, silentReload, t, toast]);

  const openPreset = (preset: AddEventPreset) => {
    setLastPreset(preset);
    setSheet(preset);
  };

  const header = <Header back title={t('clubMatch.match.title')} />;

  if (!id) {
    return (
      <Screen header={header} testID="match-screen">
        <EmptyState
          icon={<CalendarX size={26} color={colors.textMuted} />}
          title={t('clubMatch.match.missingTitle')}
          body={t('clubMatch.match.missingBody')}
        />
      </Screen>
    );
  }

  if (page.loading && !data) {
    return (
      <Screen header={header} testID="match-screen">
        <SkeletonList count={3} />
      </Screen>
    );
  }

  if (page.error && !data) {
    return (
      <Screen header={header} testID="match-screen">
        <ErrorState message={page.error} onRetry={page.reload} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen header={header} testID="match-screen">
        <EmptyState
          icon={<CalendarX size={26} color={colors.textMuted} />}
          title={t('clubMatch.match.goneTitle')}
          body={t('clubMatch.match.goneBody')}
        />
      </Screen>
    );
  }

  const { match, organization: club } = data as ClubMatchPage;
  const platform = streamPlatform(match.stream_url);
  const canWatch = !!match.stream_url && isAllowedStreamUrl(match.stream_url);
  const confirmCopy =
    confirm?.kind === 'status'
      ? confirm.action === 'fullTime'
        ? {
            title: t('clubMatch.score.fullTimeTitle'),
            message: t('clubMatch.score.fullTimeBody', { us: match.our_score, them: match.their_score }),
            label: t('clubMatch.score.fullTime'),
            destructive: false,
          }
        : confirm.action === 'postpone'
          ? {
              title: t('clubMatch.score.postponeTitle'),
              message: t('clubMatch.score.postponeBody'),
              label: t('clubMatch.score.postpone'),
              destructive: true,
            }
          : {
              title: t('clubMatch.score.cancelTitle'),
              message: t('clubMatch.score.cancelBody'),
              label: t('clubMatch.score.cancelMatch'),
              destructive: true,
            }
      : {
          title: t('clubMatch.match.deleteEventTitle'),
          message: t('clubMatch.match.deleteEventBody'),
          label: t('common.delete'),
          destructive: true,
        };

  return (
    <Screen
      header={header}
      onRefresh={page.refresh}
      refreshing={page.refreshing}
      contentStyle={{ gap: spacing.xl, paddingTop: spacing.md }}
      testID="match-screen"
    >
      <Reveal from="scale">
        <Scoreboard match={match} club={club} onOpenClub={() => router.push(Routes.organization(club.id))} />
      </Reveal>

      {canWatch ? (
        <Button
          label={platform ? t('clubMatch.match.watchOn', { platform }) : t('clubMatch.match.watchLive')}
          variant={live ? 'primary' : 'secondary'}
          size="lg"
          fullWidth
          icon={<Tv size={20} color={live ? colors.textOnBrand : colors.text} />}
          onPress={() => {
            Linking.openURL(match.stream_url as string).catch(() => toast.error(t('clubMatch.match.watchFailed')));
          }}
          accessibilityHint={t('clubMatch.match.watchHint')}
          testID="match-watch"
        />
      ) : null}

      {data.can_edit ? (
        <Button
          label={t('clubMatch.match.editFixture')}
          variant="ghost"
          icon={<Pencil size={18} color={colors.text} />}
          onPress={() => router.push({ pathname: Routes.clubMatchEdit(club.id), params: { id: match.id } })}
          style={{ alignSelf: 'flex-start' }}
          testID="match-edit"
        />
      ) : null}

      {data.can_score ? (
        <ScorekeeperPanel
          match={match}
          clubName={club.name}
          busy={busy}
          onStatus={onStatus}
          onClock={(patch) => void runLive('clock', patch)}
          onScore={onScore}
          onAddGoal={(side) => openPreset({ kind: 'goal', side })}
          onAddEvent={() => openPreset({ kind: 'yellow_card', side: 'us' })}
        />
      ) : null}

      <View>
        <SectionHeader title={t('clubMatch.match.timeline')} />
        {data.events.length === 0 ? (
          <EmptyState
            compact
            icon={<ListOrdered size={26} color={colors.textMuted} />}
            title={
              match.status === 'scheduled' ? t('clubMatch.match.timelineNotStarted') : t('clubMatch.match.timelineEmpty')
            }
            body={t('clubMatch.match.timelineEmptyBody')}
          />
        ) : (
          <MatchTimeline
            events={data.events}
            sport={match.sport}
            isHome={match.is_home}
            canScore={data.can_score}
            onOpenProfile={(userId) => router.push(Routes.profile(userId))}
            onDelete={(event) => setConfirm({ kind: 'event', event })}
          />
        )}
      </View>

      {match.notes?.trim() ? (
        <View>
          <SectionHeader title={t('clubMatch.match.notes')} />
          <Card tone="alt">
            <Text variant="body" tone="secondary">
              {match.notes.trim()}
            </Text>
          </Card>
        </View>
      ) : null}

      {data.can_score ? (
        <AddEventSheet
          visible={sheet !== null}
          preset={sheet ?? lastPreset}
          currentMinute={match.minute}
          lineup={data.lineup}
          clubName={club.name}
          opponentName={match.opponent_name}
          busy={busy === 'event'}
          onClose={() => setSheet(null)}
          onSubmit={(input) => void onAddEvent(input)}
        />
      ) : null}

      <ConfirmSheet
        visible={confirm !== null}
        title={confirmCopy.title}
        message={confirmCopy.message}
        confirmLabel={confirmCopy.label}
        cancelLabel={t('common.cancel')}
        destructive={confirmCopy.destructive}
        onConfirm={() => void onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </Screen>
  );
}
