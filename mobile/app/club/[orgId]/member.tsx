import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Link2, Trash2, UserRoundSearch, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Button,
  Card,
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
import type { BadgeTone } from '@/components/ui';
import { PersonPicker } from '@/components/club/manage/PersonPicker';
import {
  ClubGateScreen,
  FieldLabel,
  findSquad,
  gateStatus,
  idParam,
  paramOf,
  useCloseTo,
  useOrgId,
} from '@/components/club/manage/shared';
import { InfoNote } from '@/components/settings/Notes';
import { positionLabel, positionsFor } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { deleteSquadMember, getClubPage, saveSquadMember, type SquadPerson } from '@/lib/api.club';
import { STAFF_ROLES, type StaffRole } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';
import { errorMessage } from '@/lib/errors';
import { displayName } from '@/lib/format';
import { Routes } from '@/lib/routes';
import type { PersonResult } from '@/types/models';

type Kind = 'player' | 'staff';
type LinkStatus = NonNullable<SquadPerson['link_status']>;

const LINK_TONE: Record<LinkStatus, BadgeTone> = {
  none: 'neutral',
  invited: 'warning',
  accepted: 'success',
  declined: 'neutral',
};

const LINK_LABEL: Record<LinkStatus, string> = {
  none: 'clubManage.member.linkNone',
  invited: 'clubManage.squads.linkInvited',
  accepted: 'clubManage.squads.linkLinked',
  declined: 'clubManage.squads.linkDeclined',
};

/**
 * Add or edit one player or staff member on a squad, and optionally link the
 * line to their AceAiX profile (they are asked to accept first).
 */
export default function ClubSquadMemberScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const orgId = useOrgId();
  const close = useCloseTo(orgId);
  const params = useLocalSearchParams<{ squad?: string; id?: string; kind?: string }>();
  const squadId = idParam(params.squad);
  const memberId = idParam(params.id);
  const kindParam = paramOf(params.kind) === 'staff' ? 'staff' : 'player';

  const page = useAsync(() => getClubPage(orgId as string), [orgId], { enabled: !!orgId });
  const found = useAsync(() => findSquad(orgId as string, squadId as string), [orgId, squadId], {
    enabled: !!orgId && !!squadId,
  });
  const squad = found.data?.squad ?? null;
  const existing =
    memberId && squad ? ([...squad.players, ...squad.staff].find((p) => p.id === memberId) ?? null) : null;

  const [kind, setKind] = useState<Kind>(kindParam);
  const [name, setName] = useState('');
  const [shirt, setShirt] = useState('');
  const [position, setPosition] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRole>('head_coach');
  const [linkedUserId, setLinkedUserId] = useState<string | null>(null);
  const [picked, setPicked] = useState<PersonResult | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filled, setFilled] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [shirtError, setShirtError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (filled || !existing) return;
    setKind(existing.kind);
    setName(existing.display_name);
    setShirt(existing.shirt_number != null ? String(existing.shirt_number) : '');
    setPosition(existing.position ?? '');
    setStaffRole(existing.staff_role ?? 'other');
    setLinkedUserId(existing.linked_user_id);
    setFilled(true);
  }, [existing, filled]);

  const title = t(memberId ? 'clubManage.member.editTitle' : 'clubManage.member.newTitle');
  const header = <Header title={title} back onBack={close} />;

  const status = gateStatus(orgId, page, 'can_post');
  if (status !== 'ok' || !page.data || !orgId) {
    return (
      <ClubGateScreen
        status={status === 'ok' ? 'gone' : status}
        header={header}
        error={page.error}
        onRetry={page.reload}
        orgId={orgId}
        testID="club-member-screen"
      />
    );
  }
  if (!squadId || (found.loading && !found.data) || (found.error && !found.data)) {
    return (
      <ClubGateScreen
        status={!squadId ? 'gone' : found.loading ? 'loading' : 'error'}
        header={header}
        error={found.error}
        onRetry={found.reload}
        orgId={orgId}
        testID="club-member-screen"
      />
    );
  }
  if (!squad || (memberId && !existing)) {
    return (
      <Screen header={header} testID="club-member-screen">
        <EmptyState
          icon={<Users size={26} color={colors.textMuted} />}
          title={t('clubManage.member.goneTitle')}
          body={t('clubManage.member.goneBody')}
          actionLabel={t('clubManage.hub.squads')}
          onAction={() => router.replace(Routes.clubSquads(orgId))}
        />
      </Screen>
    );
  }

  const positions = positionsFor(squad.sport);
  const linkChanged = linkedUserId !== (existing?.linked_user_id ?? null);
  const linkStatus: LinkStatus | null = linkedUserId
    ? linkChanged
      ? 'invited'
      : (existing?.link_status ?? 'invited')
    : null;

  const save = async () => {
    const trimmed = name.trim();
    if (!linkedUserId && trimmed.length < 2) {
      setNameError(t('clubManage.member.nameRequired'));
      return;
    }
    let number: number | null = null;
    if (kind === 'player' && shirt.trim()) {
      number = Number(shirt.trim());
      if (!Number.isInteger(number) || number < 0 || number > 999) {
        setShirtError(t('clubManage.member.shirtInvalid'));
        return;
      }
    }
    setSaving(true);
    try {
      await saveSquadMember(squad.id, memberId, {
        kind,
        display_name: trimmed || null,
        user_id: linkedUserId,
        shirt_number: kind === 'player' ? number : null,
        position: kind === 'player' ? position.trim() || null : null,
        staff_role: kind === 'staff' ? staffRole : null,
      });
      toast.success(
        t(linkChanged && linkedUserId ? 'clubManage.member.savedRequest' : 'clubManage.member.saved'),
      );
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!memberId) return;
    setDeleting(true);
    try {
      await deleteSquadMember(memberId);
      toast.success(t('clubManage.member.deleted'));
      setConfirmDelete(false);
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const squadTitle = squad.name?.trim() || clubLabel(t, 'category', squad.category);

  return (
    <Screen
      header={header}
      keyboardAvoiding
      footer={
        <Button
          label={t('clubManage.member.save')}
          fullWidth
          loading={saving}
          onPress={save}
          testID="club-member-save"
        />
      }
      testID="club-member-screen"
    >
      <View style={{ gap: spacing.xl, paddingBottom: spacing.xl }}>
        <Text variant="caption" tone="muted">
          {t('clubManage.member.squadLine', { squad: squadTitle })}
        </Text>

        <SegmentedControl
          options={[
            { value: 'player' as Kind, label: t('clubManage.member.kindPlayer') },
            { value: 'staff' as Kind, label: t('clubManage.member.kindStaff') },
          ]}
          value={kind}
          onChange={setKind}
          testID="club-member-kind"
        />

        <Input
          label={t('clubManage.member.name')}
          required={!linkedUserId}
          hint={t(squad.is_youth ? 'clubManage.member.nameHintYouth' : 'clubManage.member.nameHint')}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setNameError(null);
          }}
          maxLength={80}
          error={nameError}
          testID="club-member-name"
        />

        {kind === 'player' ? (
          <>
            <Input
              label={t('clubManage.member.shirt')}
              value={shirt}
              onChangeText={(v) => {
                setShirt(v.replace(/[^0-9]/g, ''));
                setShirtError(null);
              }}
              keyboardType="number-pad"
              maxLength={3}
              error={shirtError}
              testID="club-member-shirt"
            />
            <View style={{ gap: spacing.sm }}>
              <FieldLabel>{t('clubManage.member.position')}</FieldLabel>
              {positions.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {positions.map((p) => (
                    <Chip
                      key={p}
                      label={positionLabel(t, p)}
                      selected={position === p}
                      onPress={() => setPosition(position === p ? '' : p)}
                    />
                  ))}
                </View>
              ) : null}
              <Input
                value={positions.includes(position) ? '' : position}
                onChangeText={setPosition}
                placeholder={t('clubManage.member.positionOther')}
                maxLength={40}
                testID="club-member-position"
              />
            </View>
          </>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <FieldLabel>{t('clubManage.member.staffRole')}</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {STAFF_ROLES.map((r) => (
                <Chip
                  key={r}
                  label={clubLabel(t, 'staffRole', r)}
                  selected={staffRole === r}
                  onPress={() => setStaffRole(r)}
                  testID={`club-member-staff-${r}`}
                />
              ))}
            </View>
          </View>
        )}

        {/* Link to a profile */}
        <Card padded level={1} style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Link2 size={18} color={colors.primary} />
            <Text variant="subheading" style={{ flex: 1 }}>
              {t('clubManage.member.linkTitle')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('common.optional')}
            </Text>
          </View>
          <Text variant="caption" tone="secondary">
            {t('clubManage.member.linkBody')}
          </Text>

          {linkedUserId ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar
                uri={picked?.id === linkedUserId ? picked.avatar_url : null}
                name={picked?.id === linkedUserId ? picked.full_name : name}
                size="sm"
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {picked?.id === linkedUserId ? displayName(picked.full_name) : displayName(name)}
                </Text>
                {linkStatus ? (
                  <Badge label={t(LINK_LABEL[linkStatus])} tone={LINK_TONE[linkStatus]} />
                ) : null}
              </View>
              <Button
                label={t('clubManage.member.unlink')}
                size="sm"
                variant="ghost"
                onPress={() => {
                  setLinkedUserId(null);
                  setPicked(null);
                }}
                testID="club-member-unlink"
              />
            </View>
          ) : existing?.link_status === 'declined' ? (
            <Badge label={t('clubManage.squads.linkDeclined')} tone="neutral" />
          ) : null}

          {linkStatus === 'invited' && !linkChanged ? (
            <Text variant="caption" tone="muted">
              {t('clubManage.member.waiting')}
            </Text>
          ) : null}

          <Button
            label={t(linkedUserId ? 'clubManage.member.linkSomeoneElse' : 'clubManage.member.findProfile')}
            variant="secondary"
            icon={<UserRoundSearch size={18} color={colors.text} />}
            onPress={() => setPickerOpen(true)}
            testID="club-member-find"
          />
          <InfoNote icon="shield">{t('clubManage.member.minorsNote')}</InfoNote>
        </Card>

        {memberId ? (
          <Button
            label={t('clubManage.member.delete')}
            variant="ghost"
            icon={<Trash2 size={18} color={colors.danger} />}
            onPress={() => setConfirmDelete(true)}
            testID="club-member-delete"
          />
        ) : null}
      </View>

      <PersonPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        role={kind === 'player' ? 'athlete' : undefined}
        onPick={(p) => {
          setPicked(p);
          setLinkedUserId(p.id);
          if (!name.trim() && p.full_name) setName(p.full_name);
          setPickerOpen(false);
        }}
      />

      <ConfirmSheet
        visible={confirmDelete}
        title={t('clubManage.member.deleteTitle')}
        message={t('clubManage.member.deleteBody', { name: displayName(name) })}
        confirmLabel={t('clubManage.member.delete')}
        destructive
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}
