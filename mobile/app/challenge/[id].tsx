import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BadgeCheck, Film, Trophy, Users } from 'lucide-react-native';

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
  Screen,
  SectionHeader,
  Sheet,
  SkeletonList,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { useAsync, useAction } from '@/hooks/useAsync';
import { useAuth } from '@/providers/AuthProvider';
import {
  challengeLeaderboard,
  enterChallenge,
  myClips,
  judgeChallengeEntry,
  openChallenges,
  withdrawChallengeEntry,
} from '@/lib/api';
import { Routes } from '@/lib/routes';
import { ageBandLabel, deadlineLabel, displayName, relativeTime } from '@/lib/format';
import { useT } from '@/i18n';
import type { Challenge, ChallengeEntry } from '@/types/models';

/**
 * One challenge: the brief, the leaderboard, and the way in.
 *
 * The leaderboard shows claimed and verified results side by side and labels
 * which is which. That is the whole reason a scout can read it — a wall of
 * self-reported numbers is worth nothing, and hiding the unverified ones would
 * mean nobody sees their entry until a coach gets to it.
 */
export default function ChallengeScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [entering, setEntering] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [judging, setJudging] = useState<ChallengeEntry | null>(null);

  const [clipId, setClipId] = useState<string | null>(null);
  const [claimed, setClaimed] = useState('');
  const [note, setNote] = useState('');
  const [judgeValue, setJudgeValue] = useState('');
  const [judgeNote, setJudgeNote] = useState('');

  /* `open_challenges` is the only reader that also knows whether *I* am in it,
     so the detail screen reads the list and picks its row rather than adding a
     second RPC that would have to repeat the same joins. */
  const challengeQuery = useAsync<Challenge | null>(
    async () => {
      const all = await openChallenges(null, 50, 0);
      return all.find((c) => c.id === id) ?? null;
    },
    [id],
    { enabled: !!id, refetchOnFocus: true },
  );

  const board = useAsync<ChallengeEntry[]>(
    () => challengeLeaderboard(id!, 50, 0),
    [id],
    { enabled: !!id },
  );

  const account = useAsync(() => myClips(), [], { enabled: entering });

  const challenge = challengeQuery.data;
  const isMine = challenge?.setter_id === profile?.id;
  const isAthlete = profile?.role === 'athlete';

  const clips = useMemo(() => (account.data ?? []).filter((m) => m.is_public), [account.data]);

  const enter = useAction(async () => {
    if (!id || !clipId) return;
    const value = claimed.trim() ? Number(claimed.trim()) : null;
    await enterChallenge(id, clipId, Number.isFinite(value as number) ? value : null, note);
  });

  const withdraw = useAction(async () => {
    if (id) await withdrawChallengeEntry(id);
  });

  const judge = useAction(async (accept: boolean) => {
    if (!judging) return;
    const value = judgeValue.trim() ? Number(judgeValue.trim()) : null;
    await judgeChallengeEntry(
      judging.entry_id,
      accept,
      Number.isFinite(value as number) ? value : null,
      judgeNote,
    );
  });

  const afterChange = useCallback(() => {
    challengeQuery.refresh();
    board.refresh();
  }, [challengeQuery, board]);

  const submitEntry = useCallback(async () => {
    const ok = await enter.run();
    if (ok === undefined && enter.error) {
      toast.error(enter.error);
      return;
    }
    setEntering(false);
    setClaimed('');
    setNote('');
    setClipId(null);
    toast.success(t(challenge?.my_entry_id ? 'challenges.updated' : 'challenges.submitted'));
    afterChange();
  }, [enter, toast, t, challenge?.my_entry_id, afterChange]);

  const metricNote = challenge?.metric_label
    ? t('challenges.measuredNote', {
        unit: challenge.metric_unit ?? challenge.metric_label,
        direction:
          challenge.metric_better === 'lower'
            ? t('challenges.directionLower')
            : t('challenges.directionHigher'),
      })
    : t('challenges.judgedNote');

  if (challengeQuery.loading && !challenge) {
    return (
      <Screen header={<Header title={t('challenges.title')} back bordered />}>
        <SkeletonList count={3} />
      </Screen>
    );
  }

  if (!challenge) {
    return (
      <Screen header={<Header title={t('challenges.title')} back bordered />}>
        <ErrorState message={challengeQuery.error} onRetry={challengeQuery.reload} />
      </Screen>
    );
  }

  const closing = deadlineLabel(challenge.closes_at);
  const canEnter = isAthlete && challenge.status === 'open';

  return (
    <Screen
      header={<Header title={challenge.title} back bordered />}
      onRefresh={afterChange}
      refreshing={challengeQuery.refreshing || board.refreshing}
      testID="challenge-screen"
      footer={
        canEnter ? (
          <View style={{ gap: spacing.sm }}>
            <Button
              label={t(challenge.my_entry_id ? 'challenges.enterAgain' : 'challenges.enter')}
              fullWidth
              onPress={() => setEntering(true)}
            />
            {challenge.my_entry_id ? (
              <Button
                label={t('challenges.withdraw')}
                variant="ghost"
                fullWidth
                onPress={() => setConfirmWithdraw(true)}
              />
            ) : null}
          </View>
        ) : null
      }
    >
      <View style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
        {/* ── Who set it, and when it ends ── */}
        <Card padded>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Avatar uri={challenge.setter_avatar} name={challenge.setter_name} size="md" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {displayName(challenge.org_name ?? challenge.setter_name)}
                </Text>
                {challenge.setter_verified ? (
                  <BadgeCheck size={14} color={colors.info} />
                ) : null}
              </View>
              <Text variant="caption" tone="muted">
                {challenge.status === 'closed' || !closing
                  ? t('challenges.closed')
                  : closing}
              </Text>
            </View>
            <Badge
              label={t('challenges.entries', { count: challenge.entry_count })}
              tone="neutral"
              icon={<Users size={12} color={colors.textMuted} />}
            />
          </View>
        </Card>

        {/* ── The brief ── */}
        <View style={{ gap: spacing.sm }}>
          <SectionHeader title={t('challenges.briefTitle')} />
          <Card padded>
            <Text variant="body">{challenge.brief}</Text>
          </Card>
        </View>

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title={t('challenges.rulesTitle')} />
          <Card padded tone="alt">
            <Text variant="body" tone="secondary">
              {metricNote}
            </Text>
          </Card>
        </View>

        {/* ── Leaderboard ── */}
        <View style={{ gap: spacing.sm }}>
          <SectionHeader
            title={t('challenges.leaderboardTitle')}
            action={
              board.data?.length
                ? t('challenges.entries', { count: board.data.length })
                : undefined
            }
          />
          {board.loading && !board.data ? (
            <SkeletonList count={3} variant="row" />
          ) : !board.data?.length ? (
            <EmptyState
              compact
              icon={<Trophy size={22} color={colors.textMuted} />}
              title={t('challenges.leaderboardEmpty')}
            />
          ) : (
            <Card padded={false}>
              {board.data.map((entry, index) => (
                <EntryRow
                  key={entry.entry_id}
                  entry={entry}
                  challenge={challenge}
                  mine={entry.user_id === profile?.id}
                  last={index === board.data!.length - 1}
                  onPress={() => router.push(Routes.profile(entry.user_id))}
                  onJudge={
                    isMine
                      ? () => {
                          setJudging(entry);
                          setJudgeValue(
                            entry.verified_value != null
                              ? String(entry.verified_value)
                              : entry.claimed_value != null
                                ? String(entry.claimed_value)
                                : '',
                          );
                          setJudgeNote('');
                        }
                      : undefined
                  }
                />
              ))}
            </Card>
          )}
        </View>
      </View>

      {/* ── Entering ── */}
      <Sheet
        visible={entering}
        onClose={() => setEntering(false)}
        title={t('challenges.chooseClipTitle')}
      >
        <Text variant="body" tone="secondary" style={{ marginBottom: spacing.md }}>
          {t('challenges.chooseClipBody')}
        </Text>

        {account.loading ? (
          <SkeletonList count={2} variant="row" />
        ) : clips.length === 0 ? (
          <EmptyState
            compact
            icon={<Film size={22} color={colors.textMuted} />}
            title={t('challenges.noClipsTitle')}
            body={t('challenges.noClipsBody')}
            actionLabel={t('challenges.noClipsAction')}
            onAction={() => {
              setEntering(false);
              router.push(Routes.editProfile);
            }}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {clips.map((clip) => (
              <Tappable key={clip.id} onPress={() => setClipId(clip.id)}>
                <Card
                  padded="sm"
                  tone={clipId === clip.id ? 'primarySoft' : 'surface'}
                  style={{
                    borderWidth: 1,
                    borderColor: clipId === clip.id ? colors.primary : colors.border,
                  }}
                >
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {clip.title}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {relativeTime(clip.created_at)}
                  </Text>
                </Card>
              </Tappable>
            ))}

            {challenge.metric_label ? (
              <Input
                label={t('challenges.resultLabel')}
                placeholder={t('challenges.resultPlaceholder')}
                value={claimed}
                onChangeText={setClaimed}
                keyboardType="numeric"
              />
            ) : null}

            <Input
              label={t('challenges.noteLabel')}
              placeholder={t('challenges.notePlaceholder')}
              value={note}
              onChangeText={setNote}
              multiline
            />

            <Button
              label={t('challenges.submit')}
              fullWidth
              disabled={!clipId}
              loading={enter.loading}
              onPress={submitEntry}
            />
          </View>
        )}
      </Sheet>

      {/* ── Judging, for the coach who set it ── */}
      <Sheet
        visible={!!judging}
        onClose={() => setJudging(null)}
        title={t('challenges.judgeTitle')}
      >
        <Text variant="body" tone="secondary" style={{ marginBottom: spacing.md }}>
          {t('challenges.judgeBody')}
        </Text>
        {challenge.metric_label ? (
          <Input
            label={t('challenges.judgeValueLabel')}
            value={judgeValue}
            onChangeText={setJudgeValue}
            keyboardType="numeric"
          />
        ) : null}
        <Input
          label={t('challenges.judgeNoteLabel')}
          placeholder={t('challenges.judgeNotePlaceholder')}
          value={judgeNote}
          onChangeText={setJudgeNote}
          multiline
        />
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            label={t('challenges.judgeAccept')}
            fullWidth
            loading={judge.loading}
            onPress={async () => {
              await judge.run(true);
              setJudging(null);
              toast.success(t('challenges.judged'));
              afterChange();
            }}
          />
          <Button
            label={t('challenges.judgeReject')}
            variant="ghost"
            fullWidth
            onPress={async () => {
              await judge.run(false);
              setJudging(null);
              toast.info(t('challenges.sentBack'));
              afterChange();
            }}
          />
        </View>
      </Sheet>

      <ConfirmSheet
        visible={confirmWithdraw}
        onCancel={() => setConfirmWithdraw(false)}
        title={t('challenges.withdrawConfirmTitle')}
        message={t('challenges.withdrawConfirmBody')}
        confirmLabel={t('challenges.withdrawConfirmAction')}
        loading={withdraw.loading}
        onConfirm={async () => {
          await withdraw.run();
          setConfirmWithdraw(false);
          toast.info(t('challenges.withdrawn'));
          afterChange();
        }}
      />
    </Screen>
  );
}

/** One row of the leaderboard. */
function EntryRow({
  entry,
  challenge,
  mine,
  last,
  onPress,
  onJudge,
}: {
  entry: ChallengeEntry;
  challenge: Challenge;
  mine: boolean;
  last: boolean;
  onPress: () => void;
  onJudge?: () => void;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();

  const verified = entry.status === 'verified';
  const value = verified ? entry.verified_value : entry.claimed_value;

  return (
    <Tappable onPress={onJudge ?? onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.divider,
          backgroundColor: mine ? theme.alpha(colors.primary, 0.06) : 'transparent',
        }}
      >
        <Text
          variant="stat"
          tone={entry.rank <= 3 ? 'primary' : 'muted'}
          style={{ width: 34, textAlign: 'center' }}
        >
          {entry.rank}
        </Text>

        <Avatar
          uri={entry.avatar_url}
          name={entry.full_name}
          size="sm"
          score={entry.talent_score ?? undefined}
        />

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {displayName(entry.full_name)}
            {mine ? ` · ${t('challenges.yourEntry')}` : ''}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {[entry.position, entry.age != null ? String(entry.age) : ageBandLabel(entry.age_band)]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          {challenge.metric_label && value != null ? (
            <Text variant="stat">{value}</Text>
          ) : null}
          <Badge
            label={t(verified ? 'challenges.verifiedBadge' : 'challenges.claimedBadge')}
            tone={verified ? 'success' : 'neutral'}
          />
        </View>
      </View>
    </Tappable>
  );
}
