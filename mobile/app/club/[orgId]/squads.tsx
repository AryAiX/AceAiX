import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarRange, Check, Plus, Star, UsersRound } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Chip,
  ConfirmSheet,
  EmptyState,
  Header,
  Input,
  Screen,
  Sheet,
  SkeletonList,
  Switch,
  Text,
  useToast,
} from '@/components/ui';
import { SquadCard } from '@/components/club/manage/SquadCard';
import { ClubGateScreen, FieldLabel, gateStatus, useOrgId } from '@/components/club/manage/shared';
import { InfoNote } from '@/components/settings/Notes';
import { sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import {
  deleteClubSquad,
  getClubPage,
  getClubSquads,
  saveClubSeason,
  saveClubSquad,
  type ClubSeason,
  type ClubSquad,
} from '@/lib/api.club';
import { isYouthCategory } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';

/** "2026–27" for the season that starts this year (from July) or last year. */
function suggestedSeason(now = new Date()): string {
  const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}–${String((start + 1) % 100).padStart(2, '0')}`;
}

/**
 * Seasons, squads, players and coaching staff — the page's rosters.
 */
export default function ClubSquadsScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const orgId = useOrgId();

  const [seasonId, setSeasonId] = useState<string | null>(null);
  const page = useAsync(() => getClubPage(orgId as string), [orgId], { enabled: !!orgId });
  const squads = useAsync(() => getClubSquads(orgId as string, seasonId), [orgId, seasonId], {
    enabled: !!orgId,
    refetchOnFocus: true,
  });

  // New season
  const [seasonSheet, setSeasonSheet] = useState(false);
  const [seasonLabel, setSeasonLabel] = useState('');
  const [seasonCurrent, setSeasonCurrent] = useState(true);
  const [savingSeason, setSavingSeason] = useState(false);
  // Season actions
  const [seasonMenu, setSeasonMenu] = useState<ClubSeason | null>(null);
  // New squad
  const [squadSheet, setSquadSheet] = useState(false);
  const [sport, setSport] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState('');
  const [squadName, setSquadName] = useState('');
  const [savingSquad, setSavingSquad] = useState(false);
  // Delete
  const [toDelete, setToDelete] = useState<ClubSquad | null>(null);
  const [deleting, setDeleting] = useState(false);

  const header = <Header title={t('clubManage.squads.title')} back />;
  const status = gateStatus(orgId, page, 'can_post');
  if (status !== 'ok' || !page.data || !orgId) {
    return (
      <ClubGateScreen
        status={status === 'ok' ? 'gone' : status}
        header={header}
        error={page.error}
        onRetry={page.reload}
        orgId={orgId}
        testID="club-squads-screen"
      />
    );
  }

  const sports = page.data.sports;
  const data = squads.data;
  const seasons = data?.seasons ?? [];
  const activeSeasonId = data?.season_id ?? null;
  const activeSeason = seasons.find((s) => s.id === activeSeasonId) ?? null;

  const chosenSport = sport ?? sports[0]?.sport ?? null;
  const sportCategories = sports.find((s) => s.sport === chosenSport)?.categories ?? [];
  const chosenCategory = customCategory.trim() || category;

  const openSeasonSheet = () => {
    setSeasonLabel(suggestedSeason());
    setSeasonCurrent(true);
    setSeasonSheet(true);
  };

  const saveSeason = async () => {
    if (seasonLabel.trim().length < 2) {
      toast.error(t('clubManage.squads.seasonLabelShort'));
      return;
    }
    setSavingSeason(true);
    try {
      const id = await saveClubSeason(orgId, null, seasonLabel, seasonCurrent);
      toast.success(t('clubManage.squads.seasonSaved'));
      setSeasonSheet(false);
      setSeasonId(id);
      squads.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingSeason(false);
    }
  };

  const makeCurrent = async (season: ClubSeason) => {
    setSeasonMenu(null);
    try {
      await saveClubSeason(orgId, season.id, season.label, true);
      toast.success(t('clubManage.squads.madeCurrent', { season: season.label }));
      setSeasonId(season.id);
      squads.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const openSquadSheet = () => {
    setSport(sports[0]?.sport ?? null);
    setCategory(null);
    setCustomCategory('');
    setSquadName('');
    setSquadSheet(true);
  };

  const saveSquad = async () => {
    if (!activeSeasonId || !chosenSport || !chosenCategory) {
      toast.error(t('clubManage.squads.pickCategory'));
      return;
    }
    setSavingSquad(true);
    try {
      await saveClubSquad(orgId, null, {
        season_id: activeSeasonId,
        sport: chosenSport,
        category: chosenCategory.trim(),
        name: squadName.trim() || null,
      });
      toast.success(t('clubManage.squads.squadSaved'));
      setSquadSheet(false);
      squads.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingSquad(false);
    }
  };

  const removeSquad = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteClubSquad(toDelete.id);
      toast.success(t('clubManage.squads.squadDeleted'));
      setToDelete(null);
      squads.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const openMember = (squadId: string, params: { id?: string; kind?: 'player' | 'staff' }) =>
    router.push({ pathname: Routes.clubSquadMember(orgId), params: { squad: squadId, ...params } });

  return (
    <Screen
      header={header}
      onRefresh={() => {
        page.refresh();
        squads.refresh();
      }}
      refreshing={squads.refreshing}
      testID="club-squads-screen"
    >
      <View style={{ gap: spacing.xl, paddingBottom: spacing.xl }}>
        {/* Seasons */}
        <View style={{ gap: spacing.sm }}>
          <FieldLabel hint={seasons.length > 0 ? t('clubManage.squads.seasonHint') : undefined}>
            {t('clubManage.squads.seasons')}
          </FieldLabel>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}
          >
            {seasons.map((s) => (
              <Chip
                key={s.id}
                label={s.is_current ? t('clubManage.squads.seasonCurrent', { season: s.label }) : s.label}
                selected={s.id === activeSeasonId}
                icon={s.is_current ? <Star size={14} color={colors.warning} /> : undefined}
                onPress={() => {
                  if (s.id === activeSeasonId) setSeasonMenu(s);
                  else setSeasonId(s.id);
                }}
                testID={`club-season-${s.id}`}
              />
            ))}
            <Chip
              label={t('clubManage.squads.newSeason')}
              icon={<Plus size={14} color={colors.text} />}
              onPress={openSeasonSheet}
              testID="club-season-new"
            />
          </ScrollView>
        </View>

        {squads.loading && !data ? (
          <SkeletonList count={2} variant="card" />
        ) : squads.error && !data ? (
          <InfoNote tone="danger" icon="warning" actionLabel={t('common.retry')} onAction={squads.reload}>
            {squads.error}
          </InfoNote>
        ) : !activeSeason ? (
          <EmptyState
            icon={<CalendarRange size={26} color={colors.textMuted} />}
            title={t('clubManage.squads.noSeasonTitle')}
            body={t('clubManage.squads.noSeasonBody')}
            actionLabel={t('clubManage.squads.newSeason')}
            onAction={openSeasonSheet}
          />
        ) : (
          <>
            {(data?.squads ?? []).length === 0 ? (
              <EmptyState
                icon={<UsersRound size={26} color={colors.textMuted} />}
                title={t('clubManage.squads.noSquadsTitle')}
                body={t('clubManage.squads.noSquadsBody', { season: activeSeason.label })}
              />
            ) : (
              (data?.squads ?? []).map((sq) => (
                <SquadCard
                  key={sq.id}
                  squad={sq}
                  onOpenPerson={(p) => openMember(sq.id, { id: p.id })}
                  onAdd={(kind) => openMember(sq.id, { kind })}
                  onDelete={() => setToDelete(sq)}
                />
              ))
            )}
            <Button
              label={t('clubManage.squads.newSquad')}
              variant="secondary"
              icon={<Plus size={18} color={colors.text} />}
              onPress={openSquadSheet}
              disabled={sports.length === 0}
              testID="club-squad-new"
            />
            {sports.length === 0 ? (
              <InfoNote
                tone="warning"
                icon="warning"
                actionLabel={page.data.viewer.can_manage ? t('clubManage.squads.addSports') : undefined}
                onAction={page.data.viewer.can_manage ? () => router.push(Routes.clubEdit(orgId)) : undefined}
              >
                {t('clubManage.squads.noSports')}
              </InfoNote>
            ) : null}
          </>
        )}
      </View>

      {/* New season */}
      <Sheet
        visible={seasonSheet}
        onClose={() => setSeasonSheet(false)}
        title={t('clubManage.squads.newSeason')}
        footer={
          <Button
            label={t('clubManage.squads.saveSeason')}
            fullWidth
            loading={savingSeason}
            onPress={saveSeason}
            testID="club-season-save"
          />
        }
      >
        <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
          <Input
            label={t('clubManage.squads.seasonLabel')}
            value={seasonLabel}
            onChangeText={setSeasonLabel}
            placeholder={suggestedSeason()}
            maxLength={20}
            testID="club-season-label"
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{t('clubManage.squads.makeCurrent')}</Text>
              <Text variant="caption" tone="muted">
                {t('clubManage.squads.makeCurrentHint')}
              </Text>
            </View>
            <Switch
              value={seasonCurrent}
              onValueChange={setSeasonCurrent}
              accessibilityLabel={t('clubManage.squads.makeCurrent')}
            />
          </View>
        </View>
      </Sheet>

      {/* Season actions */}
      <Sheet
        visible={!!seasonMenu}
        onClose={() => setSeasonMenu(null)}
        title={seasonMenu?.label}
        scrollable={false}
      >
        <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
          {seasonMenu?.is_current ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Check size={18} color={colors.success} />
              <Text variant="body" tone="secondary">
                {t('clubManage.squads.alreadyCurrent')}
              </Text>
            </View>
          ) : (
            <Button
              label={t('clubManage.squads.makeCurrent')}
              fullWidth
              icon={<Star size={18} color={colors.textOnBrand} />}
              onPress={() => seasonMenu && makeCurrent(seasonMenu)}
              testID="club-season-make-current"
            />
          )}
        </View>
      </Sheet>

      {/* New squad */}
      <Sheet
        visible={squadSheet}
        onClose={() => setSquadSheet(false)}
        title={t('clubManage.squads.newSquad')}
        subtitle={activeSeason?.label}
        footer={
          <Button
            label={t('clubManage.squads.saveSquad')}
            fullWidth
            loading={savingSquad}
            disabled={!chosenCategory}
            onPress={saveSquad}
            testID="club-squad-save"
          />
        }
      >
        <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
          {sports.length > 1 ? (
            <View style={{ gap: spacing.sm }}>
              <FieldLabel>{t('clubManage.squads.sport')}</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {sports.map((s) => (
                  <Chip
                    key={s.sport}
                    label={sportLabel(t, s.sport)}
                    selected={s.sport === chosenSport}
                    onPress={() => {
                      setSport(s.sport);
                      setCategory(null);
                    }}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={{ gap: spacing.sm }}>
            <FieldLabel>{t('clubManage.squads.category')}</FieldLabel>
            {sportCategories.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {sportCategories.map((c) => (
                  <Chip
                    key={c}
                    label={clubLabel(t, 'category', c)}
                    selected={!customCategory.trim() && category === c}
                    onPress={() => {
                      setCategory(c);
                      setCustomCategory('');
                    }}
                    testID={`club-squad-category-${c}`}
                  />
                ))}
              </View>
            ) : null}
            <Input
              value={customCategory}
              onChangeText={setCustomCategory}
              placeholder={t('clubManage.squads.customCategory')}
              maxLength={30}
              testID="club-squad-custom-category"
            />
            {chosenCategory && isYouthCategory(chosenCategory) ? (
              <Text variant="caption" tone="muted">
                {t('clubManage.squads.youthNote')}
              </Text>
            ) : null}
          </View>

          <Input
            label={t('clubManage.squads.squadName')}
            hint={t('clubManage.squads.squadNameHint')}
            value={squadName}
            onChangeText={setSquadName}
            maxLength={60}
            testID="club-squad-name"
          />
        </View>
      </Sheet>

      <ConfirmSheet
        visible={!!toDelete}
        title={t('clubManage.squads.deleteTitle')}
        message={t('clubManage.squads.deleteBody')}
        confirmLabel={t('clubManage.squads.deleteSquad')}
        destructive
        loading={deleting}
        onConfirm={removeSquad}
        onCancel={() => setToDelete(null)}
      />
    </Screen>
  );
}
