import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, ConfirmSheet, Header, Input, Screen, SectionHeader, SegmentedControl, Text, useToast } from '@/components/ui';
import { ChipField, FormGateScreen, primaryAddress, useFormParams, type FormGate } from '@/components/club/event/formShared';
import { WhenField } from '@/components/club/event/WhenField';
import { STREAM_PLATFORM_NAMES } from '@/components/club/match/matchFormat';
import { sportEmoji, sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import {
  deleteClubMatch,
  getClubMatchPage,
  getClubPage,
  getClubSquads,
  saveClubMatch,
} from '@/lib/api.club';
import { isAllowedStreamUrl } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';

type EditableStatus = 'scheduled' | 'postponed' | 'cancelled';
const EDITABLE_STATUSES: EditableStatus[] = ['scheduled', 'postponed', 'cancelled'];
const NO_SQUAD = '__none__';

/**
 * Create or edit a fixture. Live states (kick-off, score, full time) are not
 * here: they belong to the scorekeeper on the match page.
 */
export default function ClubMatchEditScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { orgId, editId, badEditId } = useFormParams();

  const page = useAsync(() => getClubPage(orgId as string), [orgId], { enabled: !!orgId });
  const squads = useAsync(() => getClubSquads(orgId as string), [orgId], { enabled: !!orgId });
  const existing = useAsync(() => getClubMatchPage(editId as string), [editId], { enabled: !!editId });

  const [sport, setSport] = useState('');
  const [squadId, setSquadId] = useState<string>(NO_SQUAD);
  const [category, setCategory] = useState('');
  const [opponent, setOpponent] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [competition, setCompetition] = useState('');
  const [venue, setVenue] = useState('');
  const [kickoff, setKickoff] = useState<Date | null>(null);
  const [stream, setStream] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<EditableStatus>('scheduled');
  const [liveStatus, setLiveStatus] = useState(false);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* Fill the form once, from the fixture being edited or the page's defaults. */
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || !page.data) return;
    if (editId) {
      if (!existing.data) return;
      const m = existing.data.match;
      setSport(m.sport);
      setSquadId(m.squad_id ?? NO_SQUAD);
      setCategory(m.category ?? '');
      setOpponent(m.opponent_name);
      setIsHome(m.is_home);
      setCompetition(m.competition ?? '');
      setVenue(m.venue ?? '');
      setKickoff(new Date(m.kickoff_at));
      setStream(m.stream_url ?? '');
      setNotes(m.notes ?? '');
      if ((EDITABLE_STATUSES as string[]).includes(m.status)) setStatus(m.status as EditableStatus);
      else setLiveStatus(true);
    } else {
      if (page.data.sports.length === 1) setSport(page.data.sports[0].sport);
      setVenue(primaryAddress(page.data));
    }
    hydrated.current = true;
  }, [editId, existing.data, page.data]);

  const sportCategories = useMemo(
    () => page.data?.sports.find((s) => s.sport === sport)?.categories ?? [],
    [page.data, sport],
  );
  const sportSquads = useMemo(
    () => (squads.data?.squads ?? []).filter((s) => s.sport === sport),
    [squads.data, sport],
  );
  const squad = sportSquads.find((s) => s.id === squadId) ?? null;

  const header = <Header back title={editId ? t('clubMatch.fixture.editTitle') : t('clubMatch.fixture.newTitle')} />;

  let gate: FormGate | null = null;
  if (!orgId || badEditId) gate = 'invalid';
  else if (page.loading || (editId && existing.loading)) gate = 'loading';
  else if (page.error || (editId && existing.error)) gate = 'error';
  else if (!page.data || (editId && (!existing.data || existing.data.match.organization_id !== orgId))) gate = 'gone';
  else if (!page.data.viewer.can_post) gate = 'denied';

  if (gate || !page.data || !orgId) {
    return (
      <FormGateScreen
        gate={gate ?? 'gone'}
        header={header}
        error={page.error ?? existing.error}
        onRetry={() => {
          page.reload();
          if (editId) existing.reload();
        }}
        orgId={orgId}
        testID="club-match-edit-screen"
      />
    );
  }

  const streamBad = !isAllowedStreamUrl(stream);
  const errors = {
    sport: !sport ? t('clubMatch.fixture.sportRequired') : null,
    opponent: opponent.trim().length < 2 ? t('clubMatch.fixture.opponentRequired') : null,
    kickoff: !kickoff ? t('clubMatch.fixture.kickoffRequired') : null,
    stream: streamBad ? t('clubMatch.fixture.streamInvalid') : null,
  };
  const valid = !errors.sport && !errors.opponent && !errors.kickoff && !errors.stream;

  const save = async () => {
    setTried(true);
    if (!valid || !kickoff) return;
    setSaving(true);
    try {
      const id = await saveClubMatch(orgId, editId, {
        sport,
        squad_id: squad ? squad.id : null,
        category: squad ? squad.category : category.trim() || null,
        competition: competition.trim() || null,
        opponent_name: opponent.trim(),
        is_home: isHome,
        venue: venue.trim() || null,
        kickoff_at: kickoff.toISOString(),
        stream_url: stream.trim() || null,
        notes: notes.trim() || null,
        ...(editId && !liveStatus ? { status } : {}),
      });
      toast.success(editId ? t('clubMatch.fixture.saved') : t('clubMatch.fixture.created'));
      router.replace(Routes.match(id));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editId) return;
    setDeleting(true);
    try {
      await deleteClubMatch(editId);
      setConfirmDelete(false);
      toast.success(t('clubMatch.fixture.deleted'));
      router.replace(Routes.organization(orgId));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const onHomeChange = (home: boolean) => {
    setIsHome(home);
    const ours = primaryAddress(page.data);
    if (home && !venue.trim()) setVenue(ours);
    if (!home && venue.trim() === ours) setVenue('');
  };

  return (
    <Screen
      header={header}
      keyboardAvoiding
      contentStyle={{ gap: spacing.xl, paddingTop: spacing.md }}
      footer={
        <Button
          label={editId ? t('common.save') : t('clubMatch.fixture.create')}
          fullWidth
          size="lg"
          loading={saving}
          disabled={saving || (tried && !valid)}
          onPress={() => void save()}
          testID="club-match-save"
        />
      }
      testID="club-match-edit-screen"
    >
      {/* What */}
      <View style={{ gap: spacing.lg }}>
        <SectionHeader title={t('clubMatch.fixture.sectionWhat')} />
        <ChipField
          label={t('clubMatch.fixture.sport')}
          options={page.data.sports.map((s) => ({
            value: s.sport,
            label: `${sportEmoji(s.sport)} ${sportLabel(t, s.sport)}`,
          }))}
          value={sport || null}
          onChange={(v) => {
            setSport(v);
            setSquadId(NO_SQUAD);
            setCategory('');
          }}
        />
        {tried && errors.sport ? (
          <Text variant="caption" tone="danger">
            {errors.sport}
          </Text>
        ) : null}

        {sport && sportSquads.length > 0 ? (
          <ChipField
            label={t('clubMatch.fixture.squad')}
            options={[
              { value: NO_SQUAD, label: t('clubMatch.fixture.noSquad') },
              ...sportSquads.map((s) => ({
                value: s.id,
                label: s.name?.trim() || clubLabel(t, 'category', s.category),
              })),
            ]}
            value={squadId}
            onChange={(v) => {
              setSquadId(v);
              const picked = sportSquads.find((s) => s.id === v);
              if (picked) setCategory(picked.category);
            }}
            hint={t('clubMatch.fixture.squadHint')}
          />
        ) : null}

        {sport && !squad ? (
          <View style={{ gap: spacing.sm }}>
            {sportCategories.length > 0 ? (
              <ChipField
                label={t('clubMatch.fixture.category')}
                options={sportCategories.map((c) => ({ value: c, label: clubLabel(t, 'category', c) }))}
                value={sportCategories.includes(category) ? category : null}
                onChange={setCategory}
              />
            ) : null}
            <Input
              label={sportCategories.length > 0 ? undefined : t('clubMatch.fixture.category')}
              placeholder={t('clubMatch.fixture.categoryPlaceholder')}
              value={category}
              onChangeText={setCategory}
              maxLength={30}
              accessibilityLabel={t('clubMatch.fixture.category')}
            />
          </View>
        ) : null}
      </View>

      {/* Who */}
      <View style={{ gap: spacing.lg }}>
        <SectionHeader title={t('clubMatch.fixture.sectionWho')} />
        <Input
          label={t('clubMatch.fixture.opponent')}
          placeholder={t('clubMatch.fixture.opponentPlaceholder')}
          value={opponent}
          onChangeText={setOpponent}
          maxLength={120}
          autoCapitalize="words"
          required
          error={tried ? errors.opponent : null}
          testID="club-match-opponent"
        />
        <SegmentedControl<'home' | 'away'>
          value={isHome ? 'home' : 'away'}
          onChange={(v) => onHomeChange(v === 'home')}
          options={[
            { value: 'home', label: t('clubMatch.match.home') },
            { value: 'away', label: t('clubMatch.match.away') },
          ]}
        />
        <Input
          label={t('clubMatch.fixture.competition')}
          placeholder={t('clubMatch.fixture.competitionPlaceholder')}
          value={competition}
          onChangeText={setCompetition}
          maxLength={120}
        />
      </View>

      {/* Where and when */}
      <View style={{ gap: spacing.lg }}>
        <SectionHeader title={t('clubMatch.fixture.sectionWhen')} />
        <WhenField
          label={t('clubMatch.fixture.kickoff')}
          value={kickoff}
          onChange={setKickoff}
          required
          pastDays={60}
          error={tried ? errors.kickoff : null}
          testID="club-match-kickoff"
        />
        <Input
          label={t('clubMatch.fixture.venue')}
          placeholder={t('clubMatch.fixture.venuePlaceholder')}
          value={venue}
          onChangeText={setVenue}
          maxLength={200}
        />
      </View>

      {/* Extras */}
      <View style={{ gap: spacing.lg }}>
        <SectionHeader title={t('clubMatch.fixture.sectionMore')} />
        <Input
          label={t('clubMatch.fixture.stream')}
          placeholder="https://"
          value={stream}
          onChangeText={setStream}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          maxLength={300}
          hint={t('clubMatch.fixture.streamHint', { platforms: STREAM_PLATFORM_NAMES.join(', ') })}
          error={stream.trim() ? errors.stream : null}
        />
        <Input
          label={t('clubMatch.fixture.notes')}
          placeholder={t('clubMatch.fixture.notesPlaceholder')}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={1000}
        />
        {editId && !liveStatus ? (
          <ChipField
            label={t('clubMatch.fixture.status')}
            options={EDITABLE_STATUSES.map((s) => ({ value: s, label: clubLabel(t, 'matchStatus', s) }))}
            value={status}
            onChange={setStatus}
          />
        ) : null}
      </View>

      {editId ? (
        <Button
          label={t('clubMatch.fixture.delete')}
          variant="ghost"
          icon={<Trash2 size={18} color={colors.danger} />}
          onPress={() => setConfirmDelete(true)}
          style={{ alignSelf: 'flex-start' }}
          testID="club-match-delete"
        />
      ) : null}

      <ConfirmSheet
        visible={confirmDelete}
        title={t('clubMatch.fixture.deleteTitle')}
        message={t('clubMatch.fixture.deleteBody')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}
