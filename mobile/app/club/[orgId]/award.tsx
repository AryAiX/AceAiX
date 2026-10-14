import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Link2, Trash2, Trophy } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Chip,
  ConfirmSheet,
  EmptyState,
  Header,
  Input,
  Screen,
  SegmentedControl,
  Text,
  useToast,
} from '@/components/ui';
import { ImageField } from '@/components/club/manage/ImageField';
import {
  ClubGateScreen,
  FieldLabel,
  acceptedSquadPeople,
  gateStatus,
  idParam,
  useCloseTo,
  useOrgId,
} from '@/components/club/manage/shared';
import { InfoNote } from '@/components/settings/Notes';
import { sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { deleteClubAward, getClubAwards, getClubPage, saveClubAward } from '@/lib/api.club';
import { AWARD_PLACEMENTS, type AwardPlacement, type AwardRecipientKind } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';
import { errorMessage } from '@/lib/errors';

const RECIPIENTS: AwardRecipientKind[] = ['club', 'player', 'coach'];

/** Add or edit a trophy, a title or an individual award on the page. */
export default function ClubAwardScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const toast = useToast();
  const orgId = useOrgId();
  const close = useCloseTo(orgId);
  const params = useLocalSearchParams<{ id?: string }>();
  const awardId = idParam(params.id);

  const page = useAsync(() => getClubPage(orgId as string), [orgId], { enabled: !!orgId });
  const awards = useAsync(() => getClubAwards(orgId as string), [orgId], { enabled: !!orgId && !!awardId });
  const people = useAsync(() => acceptedSquadPeople(orgId as string), [orgId], { enabled: !!orgId });
  const existing = awardId ? (awards.data?.find((a) => a.id === awardId) ?? null) : null;

  const [title, setTitle] = useState('');
  const [competition, setCompetition] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [season, setSeason] = useState('');
  const [sport, setSport] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [placement, setPlacement] = useState<AwardPlacement>('winner');
  const [recipient, setRecipient] = useState<AwardRecipientKind>('club');
  const [recipientName, setRecipientName] = useState('');
  const [recipientUser, setRecipientUser] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: string; year?: string; name?: string }>({});
  const [filled, setFilled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (filled || !existing) return;
    setTitle(existing.title);
    setCompetition(existing.competition ?? '');
    setYear(existing.year != null ? String(existing.year) : '');
    setSeason(existing.season_label ?? '');
    setSport(existing.sport);
    setCategory(existing.category ?? '');
    setPlacement(existing.placement);
    setRecipient(existing.recipient_kind);
    setRecipientName(existing.recipient_name ?? '');
    setRecipientUser(existing.recipient_user_id);
    setImage(existing.image_url);
    setDescription(existing.description ?? '');
    setFilled(true);
  }, [existing, filled]);

  const header = (
    <Header title={t(awardId ? 'clubManage.award.editTitle' : 'clubManage.award.newTitle')} back onBack={close} />
  );
  const status = gateStatus(orgId, page, 'can_post');
  if (status !== 'ok' || !page.data || !orgId) {
    return (
      <ClubGateScreen
        status={status === 'ok' ? 'gone' : status}
        header={header}
        error={page.error}
        onRetry={page.reload}
        orgId={orgId}
        testID="club-award-screen"
      />
    );
  }
  if (awardId && !existing) {
    if (awards.loading || awards.error) {
      return (
        <ClubGateScreen
          status={awards.loading ? 'loading' : 'error'}
          header={header}
          error={awards.error}
          onRetry={awards.reload}
          orgId={orgId}
          testID="club-award-screen"
        />
      );
    }
    return (
      <Screen header={header} testID="club-award-screen">
        <EmptyState
          icon={<Trophy size={26} color={colors.textMuted} />}
          title={t('clubManage.award.goneTitle')}
          body={t('clubManage.award.goneBody')}
          actionLabel={t('common.back')}
          onAction={close}
        />
      </Screen>
    );
  }

  const sports = page.data.sports;
  const chosenSport = sport ?? (sports.length === 1 ? sports[0].sport : null);
  const categories = sports.find((s) => s.sport === chosenSport)?.categories ?? [];
  const candidates = (people.data ?? []).filter((p) =>
    recipient === 'player' ? p.kind === 'player' : p.kind === 'staff',
  );

  const save = async () => {
    const yearNum = year.trim() ? Number(year.trim()) : null;
    const next = {
      title: title.trim().length < 2 ? t('clubManage.award.titleRequired') : undefined,
      year:
        yearNum !== null && (!Number.isInteger(yearNum) || yearNum < 1850 || yearNum > 2100)
          ? t('clubManage.award.yearInvalid')
          : undefined,
      name:
        recipient !== 'club' && !recipientUser && recipientName.trim().length < 2
          ? t('clubManage.award.nameRequired')
          : undefined,
    };
    setErrors(next);
    if (next.title || next.year || next.name) return;

    setSaving(true);
    try {
      await saveClubAward(orgId, awardId, {
        title: title.trim(),
        competition: competition.trim() || null,
        year: yearNum,
        season_label: season.trim() || null,
        sport: chosenSport,
        category: category.trim() || null,
        placement,
        recipient_kind: recipient,
        recipient_name: recipient === 'club' ? null : recipientName.trim() || null,
        recipient_user_id: recipient === 'club' ? null : recipientUser,
        image_url: image,
        description: description.trim() || null,
      });
      toast.success(t('clubManage.award.saved'));
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!awardId) return;
    setDeleting(true);
    try {
      await deleteClubAward(awardId);
      toast.success(t('clubManage.award.deleted'));
      setConfirmDelete(false);
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen
      header={header}
      keyboardAvoiding
      footer={
        <Button
          label={t('clubManage.award.save')}
          fullWidth
          loading={saving}
          onPress={save}
          testID="club-award-save"
        />
      }
      testID="club-award-screen"
    >
      <View style={{ gap: spacing.xl, paddingBottom: spacing.xl }}>
        <Input
          label={t('clubManage.award.fieldTitle')}
          required
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            setErrors((e) => ({ ...e, title: undefined }));
          }}
          placeholder={t('clubManage.award.fieldTitlePlaceholder')}
          maxLength={120}
          error={errors.title}
          testID="club-award-title"
        />

        <View style={{ gap: spacing.sm }}>
          <FieldLabel>{t('clubManage.award.placement')}</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {AWARD_PLACEMENTS.map((p) => (
              <Chip
                key={p}
                label={clubLabel(t, 'placement', p)}
                selected={placement === p}
                onPress={() => setPlacement(p)}
                testID={`club-award-placement-${p}`}
              />
            ))}
          </View>
        </View>

        <Input
          label={t('clubManage.award.competition')}
          value={competition}
          onChangeText={setCompetition}
          placeholder={t('clubManage.award.competitionPlaceholder')}
          maxLength={120}
        />

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input
              label={t('clubManage.award.year')}
              value={year}
              onChangeText={(v) => {
                setYear(v.replace(/[^0-9]/g, ''));
                setErrors((e) => ({ ...e, year: undefined }));
              }}
              keyboardType="number-pad"
              maxLength={4}
              error={errors.year}
              testID="club-award-year"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label={t('clubManage.award.season')}
              value={season}
              onChangeText={setSeason}
              placeholder="2025–26"
              maxLength={20}
            />
          </View>
        </View>

        {sports.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <FieldLabel>{t('clubManage.award.sport')}</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {sports.map((s) => (
                <Chip
                  key={s.sport}
                  label={sportLabel(t, s.sport)}
                  selected={chosenSport === s.sport}
                  onPress={() => setSport(chosenSport === s.sport ? null : s.sport)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <FieldLabel>{t('clubManage.award.category')}</FieldLabel>
          {categories.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {categories.map((c) => (
                <Chip
                  key={c}
                  label={clubLabel(t, 'category', c)}
                  selected={category === c}
                  onPress={() => setCategory(category === c ? '' : c)}
                />
              ))}
            </View>
          ) : null}
          <Input
            value={categories.includes(category) ? '' : category}
            onChangeText={setCategory}
            placeholder={t('clubManage.squads.customCategory')}
            maxLength={30}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <FieldLabel>{t('clubManage.award.recipient')}</FieldLabel>
          <SegmentedControl
            options={RECIPIENTS.map((r) => ({ value: r, label: clubLabel(t, 'recipient', r) }))}
            value={recipient}
            onChange={(r) => {
              setRecipient(r);
              setRecipientUser(null);
            }}
            testID="club-award-recipient"
          />
        </View>

        {recipient !== 'club' ? (
          <View style={{ gap: spacing.md }}>
            <Input
              label={t(recipient === 'player' ? 'clubManage.award.playerName' : 'clubManage.award.coachName')}
              required={!recipientUser}
              value={recipientName}
              onChangeText={(v) => {
                setRecipientName(v);
                setErrors((e) => ({ ...e, name: undefined }));
              }}
              maxLength={80}
              error={errors.name}
              testID="club-award-recipient-name"
            />
            <View style={{ gap: spacing.sm }}>
              <FieldLabel hint={t('clubManage.award.linkHint')}>{t('clubManage.award.linkTitle')}</FieldLabel>
              {candidates.length === 0 ? (
                <Text variant="caption" tone="muted">
                  {people.loading ? t('common.loading') : t('clubManage.award.linkNone')}
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {candidates.map((p) => (
                    <Chip
                      key={`${p.user_id}:${p.kind}`}
                      label={`${p.name} · ${clubLabel(t, 'category', p.squad)}`}
                      icon={<Link2 size={14} color={recipientUser === p.user_id ? colors.primary : colors.textMuted} />}
                      selected={recipientUser === p.user_id}
                      onPress={() => {
                        if (recipientUser === p.user_id) {
                          setRecipientUser(null);
                          return;
                        }
                        setRecipientUser(p.user_id);
                        setRecipientName(p.name);
                        setErrors((e) => ({ ...e, name: undefined }));
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}

        <ImageField
          label={t('clubManage.award.image')}
          value={image}
          onChange={setImage}
          testID="club-award-image"
        />

        <Input
          label={t('clubManage.award.description')}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={600}
        />

        <InfoNote icon="info">{t('clubManage.award.publicNote')}</InfoNote>

        {awardId ? (
          <Button
            label={t('clubManage.award.delete')}
            variant="ghost"
            icon={<Trash2 size={18} color={colors.danger} />}
            onPress={() => setConfirmDelete(true)}
            testID="club-award-delete"
          />
        ) : null}
      </View>

      <ConfirmSheet
        visible={confirmDelete}
        title={t('clubManage.award.deleteTitle')}
        message={t('clubManage.award.deleteBody')}
        confirmLabel={t('clubManage.award.delete')}
        destructive
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}
