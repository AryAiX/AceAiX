import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Chip, Input, SegmentedControl, Sheet, Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { ClubMatchPage, MatchEventInput } from '@/lib/api.club';
import { MATCH_EVENT_KINDS, type MatchEventKind, type MatchSide } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';

import { parseWhole } from './matchFormat';

export interface AddEventPreset {
  kind: MatchEventKind;
  side: MatchSide;
}

interface Props {
  visible: boolean;
  preset: AddEventPreset;
  currentMinute: number | null;
  lineup: ClubMatchPage['lineup'];
  clubName: string;
  opponentName: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: MatchEventInput) => void;
}

const POINTS = [1, 2, 3, 4, 5, 6];

/**
 * One moment of the game: what, who, when. Opened from "Add goal" with the
 * kind and side already chosen, so a goal is two taps on the touchline.
 */
export function AddEventSheet({
  visible,
  preset,
  currentMinute,
  lineup,
  clubName,
  opponentName,
  busy,
  onClose,
  onSubmit,
}: Props) {
  const { spacing } = useTheme();
  const t = useT();

  const [kind, setKind] = useState<MatchEventKind>(preset.kind);
  const [side, setSide] = useState<MatchSide>(preset.side);
  const [minute, setMinute] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [points, setPoints] = useState(1);
  const [detail, setDetail] = useState('');

  /* Every opening starts clean, from the button that opened it. */
  useEffect(() => {
    if (!visible) return;
    setKind(preset.kind);
    setSide(preset.side);
    setMinute(currentMinute != null ? String(currentMinute) : '');
    setMemberId(null);
    setName('');
    setPoints(preset.kind === 'point' ? 2 : 1);
    setDetail('');
  }, [visible, preset, currentMinute]);

  const players = side === 'us' && lineup && lineup.length > 0 ? lineup : null;
  const minuteValue = parseWhole(minute);
  const minuteBad = minute.trim() !== '' && (minuteValue == null || minuteValue > 200);

  const submit = () => {
    if (minuteBad) return;
    onSubmit({
      kind,
      side,
      minute: minuteValue,
      points: kind === 'point' ? points : undefined,
      squad_member_id: side === 'us' ? memberId : null,
      player_name: memberId ? null : name.trim() || null,
      detail: detail.trim() || null,
    });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('clubMatch.addEvent.title')}
      footer={
        <Button
          label={t('clubMatch.addEvent.add')}
          fullWidth
          size="lg"
          loading={busy}
          disabled={busy || minuteBad}
          onPress={submit}
          testID="match-add-event-submit"
        />
      }
      testID="match-add-event-sheet"
    >
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('clubMatch.addEvent.kind')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {MATCH_EVENT_KINDS.map((k) => (
              <Chip
                key={k}
                label={clubLabel(t, 'matchEvent', k)}
                selected={kind === k}
                onPress={() => {
                  setKind(k);
                  if (k === 'point' && points === 1) setPoints(2);
                }}
                testID={`match-event-kind-${k}`}
              />
            ))}
          </View>
        </View>

        {kind !== 'period' ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="captionStrong" tone="secondary">
              {t('clubMatch.addEvent.side')}
            </Text>
            <SegmentedControl<MatchSide>
              value={side}
              onChange={(v) => {
                setSide(v);
                setMemberId(null);
              }}
              options={[
                { value: 'us', label: `${clubLabel(t, 'side', 'us')} · ${clubName}` },
                { value: 'them', label: `${clubLabel(t, 'side', 'them')} · ${opponentName}` },
              ]}
            />
            {kind === 'own_goal' ? (
              <Text variant="caption" tone="muted">
                {t('clubMatch.addEvent.ownGoalHint')}
              </Text>
            ) : null}
          </View>
        ) : null}

        {kind === 'point' ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="captionStrong" tone="secondary">
              {t('clubMatch.addEvent.points')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {POINTS.map((p) => (
                <Chip key={p} label={`+${p}`} selected={points === p} onPress={() => setPoints(p)} />
              ))}
            </View>
          </View>
        ) : null}

        <Input
          label={t('clubMatch.addEvent.minute')}
          value={minute}
          onChangeText={(v) => setMinute(v.replace(/[^0-9]/g, '').slice(0, 3))}
          keyboardType="number-pad"
          maxLength={3}
          error={minuteBad ? t('clubMatch.addEvent.minuteBad') : null}
        />

        {kind !== 'period' && kind !== 'timeout' ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="captionStrong" tone="secondary">
              {t('clubMatch.addEvent.player')}
            </Text>
            {players ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {players.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.shirt_number != null ? `${p.shirt_number} · ${p.display_name}` : p.display_name}
                    selected={memberId === p.id}
                    onPress={() => {
                      setMemberId(memberId === p.id ? null : p.id);
                      setName('');
                    }}
                  />
                ))}
              </View>
            ) : null}
            {!memberId ? (
              <Input
                placeholder={players ? t('clubMatch.addEvent.orTypeName') : t('clubMatch.addEvent.playerPlaceholder')}
                value={name}
                onChangeText={setName}
                maxLength={80}
                autoCapitalize="words"
                accessibilityLabel={t('clubMatch.addEvent.player')}
              />
            ) : null}
          </View>
        ) : null}

        <Input
          label={t('clubMatch.addEvent.detail')}
          placeholder={t('clubMatch.addEvent.detailPlaceholder')}
          value={detail}
          onChangeText={setDetail}
          maxLength={200}
        />
      </View>
    </Sheet>
  );
}
