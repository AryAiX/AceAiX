import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Clock, Minus, Plus, RadioTower } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Chip, Input, Sheet, Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { ClubMatch } from '@/lib/api.club';
import { type MatchSide } from '@/lib/club';

import { PERIOD_PRESETS, parseWhole, periodLabel } from './matchFormat';

export type StatusAction = 'kickoff' | 'halfTime' | 'secondHalf' | 'fullTime' | 'postpone' | 'cancel' | 'resume' | 'reschedule';

interface Props {
  match: ClubMatch;
  clubName: string;
  /** The action in flight, if any; every control waits for it. */
  busy: string | null;
  onStatus: (action: StatusAction) => void;
  onClock: (patch: { minute?: number | null; period?: string | null }) => void;
  onScore: (side: MatchSide, delta: 1 | -1) => void;
  onAddGoal: (side: MatchSide) => void;
  onAddEvent: () => void;
}

/**
 * The touchline remote. Everything is big, one tap, and only the buttons that
 * make sense right now are shown — nobody should have to think at 0–0 in the
 * 89th minute.
 */
export function ScorekeeperPanel({ match, clubName, busy, onStatus, onClock, onScore, onAddGoal, onAddEvent }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const [clockOpen, setClockOpen] = useState(false);

  const locked = busy !== null;
  const running = match.status === 'live' || match.status === 'half_time';
  const scoring = running || match.status === 'finished';

  const statusButtons: { action: StatusAction; label: string; variant: 'primary' | 'secondary' | 'ghost' | 'danger' }[] = [];
  switch (match.status) {
    case 'scheduled':
      statusButtons.push({ action: 'kickoff', label: t('clubMatch.score.kickOff'), variant: 'primary' });
      statusButtons.push({ action: 'postpone', label: t('clubMatch.score.postpone'), variant: 'secondary' });
      statusButtons.push({ action: 'cancel', label: t('clubMatch.score.cancelMatch'), variant: 'ghost' });
      break;
    case 'live':
      statusButtons.push({ action: 'halfTime', label: t('clubMatch.score.halfTime'), variant: 'secondary' });
      statusButtons.push({ action: 'fullTime', label: t('clubMatch.score.fullTime'), variant: 'danger' });
      break;
    case 'half_time':
      statusButtons.push({ action: 'secondHalf', label: t('clubMatch.score.secondHalf'), variant: 'primary' });
      statusButtons.push({ action: 'fullTime', label: t('clubMatch.score.fullTime'), variant: 'danger' });
      break;
    case 'finished':
      statusButtons.push({ action: 'resume', label: t('clubMatch.score.resume'), variant: 'ghost' });
      break;
    default:
      statusButtons.push({ action: 'reschedule', label: t('clubMatch.score.backToUpcoming'), variant: 'secondary' });
  }

  const sides: { side: MatchSide; name: string; value: number }[] = [
    { side: 'us', name: clubName, value: match.our_score },
    { side: 'them', name: match.opponent_name, value: match.their_score },
  ];
  if (!match.is_home) sides.reverse();

  const round = (delta: 1 | -1, side: MatchSide, name: string, value: number) => (
    <Pressable
      onPress={() => onScore(side, delta)}
      disabled={locked || (delta < 0 && value <= 0)}
      accessibilityRole="button"
      accessibilityLabel={
        delta > 0 ? t('clubMatch.score.plusA11y', { name }) : t('clubMatch.score.minusA11y', { name })
      }
      hitSlop={6}
      style={({ pressed }) => ({
        width: theme.hit.comfortable,
        height: theme.hit.comfortable,
        borderRadius: theme.hit.comfortable / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: locked || (delta < 0 && value <= 0) ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      {delta > 0 ? <Plus size={22} color={colors.text} /> : <Minus size={22} color={colors.text} />}
    </Pressable>
  );

  return (
    <Card style={{ gap: spacing.lg, borderWidth: 1.5, borderColor: colors.primaryBorder }} testID="match-scorekeeper">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <RadioTower size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text variant="subheading">{t('clubMatch.score.panelTitle')}</Text>
          <Text variant="caption" tone="muted">
            {t('clubMatch.score.panelHint')}
          </Text>
        </View>
      </View>

      {/* State of the game */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {statusButtons.map((b) => (
          <Button
            key={b.action}
            label={b.label}
            variant={b.variant}
            size="lg"
            loading={busy === b.action}
            disabled={locked}
            onPress={() => onStatus(b.action)}
            style={{ flexGrow: 1, minWidth: 140 }}
            testID={`match-status-${b.action}`}
          />
        ))}
      </View>

      {/* Clock */}
      {running ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('clubMatch.score.clock')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Pressable
              onPress={() => setClockOpen(true)}
              disabled={locked}
              accessibilityRole="button"
              accessibilityLabel={t('clubMatch.score.setClock')}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                minHeight: theme.hit.comfortable,
                paddingHorizontal: spacing.md,
                borderRadius: radii.md,
                backgroundColor: colors.surfaceAlt,
                opacity: pressed ? 0.7 : 1,
              })}
              testID="match-clock"
            >
              <Clock size={18} color={colors.textMuted} />
              <Text variant="stat">
                {match.minute != null ? t('clubMatch.match.minute', { minute: match.minute }) : '–'}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                {periodLabel(t, match.period)}
              </Text>
            </Pressable>
            {([1, 5] as const).map((n) => (
              <Button
                key={n}
                label={t('clubMatch.score.plusMinutes', { n })}
                variant="secondary"
                size="md"
                disabled={locked}
                onPress={() => onClock({ minute: (match.minute ?? 0) + n })}
                accessibilityLabel={t('clubMatch.score.addMinutesA11y', { n })}
                testID={`match-minute-plus-${n}`}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Score */}
      {scoring ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('clubMatch.score.scoreTitle')}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {sides.map((s) => (
              <View
                key={s.side}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.md,
                  borderRadius: radii.lg,
                  backgroundColor: colors.surfaceAlt,
                }}
              >
                <Text variant="captionStrong" numberOfLines={1} align="center">
                  {s.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  {round(-1, s.side, s.name, s.value)}
                  <Text variant="display" style={{ minWidth: 40 }} align="center">
                    {s.value}
                  </Text>
                  {round(1, s.side, s.name, s.value)}
                </View>
                <Button
                  label={t('clubMatch.score.addGoal')}
                  size="md"
                  variant={s.side === 'us' ? 'primary' : 'secondary'}
                  icon={<Plus size={18} color={s.side === 'us' ? colors.textOnBrand : colors.text} />}
                  disabled={locked}
                  onPress={() => onAddGoal(s.side)}
                  accessibilityLabel={t('clubMatch.score.addGoalFor', { name: s.name })}
                  fullWidth
                  testID={`match-add-goal-${s.side}`}
                />
              </View>
            ))}
          </View>
          <Text variant="caption" tone="muted">
            {t('clubMatch.score.scoreHint')}
          </Text>
        </View>
      ) : null}

      {scoring ? (
        <Button
          label={t('clubMatch.score.addEvent')}
          variant="secondary"
          size="lg"
          fullWidth
          disabled={locked}
          onPress={onAddEvent}
          testID="match-add-event"
        />
      ) : null}

      <ClockSheet
        visible={clockOpen}
        minute={match.minute}
        period={match.period}
        onClose={() => setClockOpen(false)}
        onSave={(patch) => {
          setClockOpen(false);
          onClock(patch);
        }}
      />
    </Card>
  );
}

function ClockSheet({
  visible,
  minute,
  period,
  onClose,
  onSave,
}: {
  visible: boolean;
  minute: number | null;
  period: string | null;
  onClose: () => void;
  onSave: (patch: { minute: number | null; period: string | null }) => void;
}) {
  const { spacing } = useTheme();
  const t = useT();
  const [minuteText, setMinuteText] = useState('');
  const [periodText, setPeriodText] = useState('');

  useEffect(() => {
    if (!visible) return;
    setMinuteText(minute != null ? String(minute) : '');
    setPeriodText(period ?? '');
  }, [visible, minute, period]);

  const value = parseWhole(minuteText);
  const bad = minuteText.trim() !== '' && (value == null || value > 200);
  const preset = PERIOD_PRESETS.find((p) => p.toLowerCase() === periodText.trim().toLowerCase());

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('clubMatch.score.setClock')}
      footer={
        <Button
          label={t('common.save')}
          fullWidth
          size="lg"
          disabled={bad}
          onPress={() => onSave({ minute: value, period: periodText.trim() || null })}
        />
      }
    >
      <View style={{ gap: spacing.lg }}>
        <Input
          label={t('clubMatch.score.minuteLabel')}
          value={minuteText}
          onChangeText={(v) => setMinuteText(v.replace(/[^0-9]/g, '').slice(0, 3))}
          keyboardType="number-pad"
          maxLength={3}
          error={bad ? t('clubMatch.addEvent.minuteBad') : null}
          autoFocus
        />
        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('clubMatch.score.periodLabel')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {PERIOD_PRESETS.map((p) => (
              <Chip key={p} label={periodLabel(t, p)} selected={preset === p} onPress={() => setPeriodText(p)} />
            ))}
          </View>
          <Input
            placeholder={t('clubMatch.score.periodPlaceholder')}
            value={preset ? '' : periodText}
            onChangeText={setPeriodText}
            maxLength={20}
            accessibilityLabel={t('clubMatch.score.periodLabel')}
          />
        </View>
      </View>
    </Sheet>
  );
}
