import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, Mail, UserMinus, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmSheet,
  Divider,
  EmptyState,
  Header,
  Input,
  ListItem,
  Screen,
  SectionHeader,
  Sheet,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { RolePicker } from '@/components/club/manage/RolePicker';
import { ClubGateScreen, FieldLabel, gateStatus, useOrgId } from '@/components/club/manage/shared';
import { InfoNote } from '@/components/settings/Notes';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import {
  getClubPage,
  getClubTeam,
  inviteClubMember,
  removeClubMember,
  setClubMemberRole,
  type ClubTeamMember,
} from '@/lib/api.club';
import { INVITABLE_ROLES, isValidEmail, type InvitableRole } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';
import { errorMessage } from '@/lib/errors';
import { displayName } from '@/lib/format';
import { Routes } from '@/lib/routes';

const asInvitable = (role: string): InvitableRole =>
  (INVITABLE_ROLES as readonly string[]).includes(role) ? (role as InvitableRole) : 'editor';

/**
 * The people who run a page. Managers invite, change roles and remove;
 * everyone on the team can see who else is on it, and leave.
 */
export default function ClubTeamScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const orgId = useOrgId();

  const page = useAsync(() => getClubPage(orgId as string), [orgId], { enabled: !!orgId });
  const team = useAsync(() => getClubTeam(orgId as string), [orgId], { enabled: !!orgId });

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<InvitableRole>('editor');
  const [inviting, setInviting] = useState(false);

  const [selected, setSelected] = useState<ClubTeamMember | null>(null);
  const [newRole, setNewRole] = useState<InvitableRole>('editor');
  const [savingRole, setSavingRole] = useState(false);
  const [confirm, setConfirm] = useState<'remove' | 'leave' | null>(null);
  const [removing, setRemoving] = useState(false);

  const header = <Header title={t('clubManage.team.title')} back />;
  const status = gateStatus(orgId, page, 'team');
  if (status !== 'ok' || !page.data || !orgId) {
    return (
      <ClubGateScreen
        status={status === 'ok' ? 'gone' : status}
        header={header}
        error={page.error}
        onRetry={page.reload}
        orgId={orgId}
        testID="club-team-screen"
      />
    );
  }

  const canManage = page.data.viewer.can_manage;
  const members = team.data ?? [];
  const me = members.find((m) => m.is_self) ?? null;

  const invite = async () => {
    if (!isValidEmail(email)) {
      setEmailError(t('clubManage.team.emailInvalid'));
      return;
    }
    setInviting(true);
    try {
      await inviteClubMember(orgId, email, inviteRole);
      toast.success(
        t('clubManage.team.invited', { name: displayName(email) }),
      );
      setEmail('');
      team.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setInviting(false);
    }
  };

  const openMember = (member: ClubTeamMember) => {
    if (member.role === 'owner') return;
    if (!canManage && !member.is_self) return;
    setSelected(member);
    setNewRole(asInvitable(member.role));
  };

  const saveRole = async () => {
    if (!selected) return;
    setSavingRole(true);
    try {
      await setClubMemberRole(orgId, selected.user_id, newRole);
      toast.success(t('clubManage.team.roleSaved'));
      setSelected(null);
      team.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingRole(false);
    }
  };

  const remove = async () => {
    const target = confirm === 'leave' ? me : selected;
    if (!target) return;
    setRemoving(true);
    try {
      await removeClubMember(orgId, target.user_id);
      if (confirm === 'leave') {
        toast.success(t('clubManage.team.left'));
        setConfirm(null);
        setSelected(null);
        router.replace(Routes.organization(orgId));
        return;
      }
      toast.success(t('clubManage.team.removed'));
      setConfirm(null);
      setSelected(null);
      team.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRemoving(false);
    }
  };

  const selfSheet = selected?.is_self ?? false;

  return (
    <Screen
      header={header}
      keyboardAvoiding
      onRefresh={() => {
        page.refresh();
        team.refresh();
      }}
      refreshing={team.refreshing}
      testID="club-team-screen"
    >
      <View style={{ gap: spacing.xl, paddingBottom: spacing.xl }}>
        <View>
          <SectionHeader title={t('clubManage.team.members')} />
          {team.loading && !team.data ? (
            <SkeletonList count={3} variant="row" />
          ) : team.error && !team.data ? (
            <InfoNote tone="danger" icon="warning" actionLabel={t('common.retry')} onAction={team.reload}>
              {team.error}
            </InfoNote>
          ) : members.length === 0 ? (
            <EmptyState
              compact
              icon={<Users size={24} color={colors.textMuted} />}
              title={t('clubManage.team.emptyTitle')}
            />
          ) : (
            <Card padded={false} level={1}>
              {members.map((m, i) => {
                const tappable = m.role !== 'owner' && (canManage || m.is_self);
                return (
                  <View key={m.user_id}>
                    {i > 0 ? <Divider /> : null}
                    <ListItem
                      inset
                      title={displayName(m.full_name)}
                      subtitle={clubLabel(t, 'role', m.role)}
                      left={<Avatar uri={m.avatar_url} name={m.full_name} size="sm" />}
                      right={
                        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                          {m.status === 'pending' ? (
                            <Badge label={t('clubManage.team.invitedTag')} tone="warning" />
                          ) : null}
                          {m.is_self ? <Badge label={t('clubManage.team.you')} tone="primary" /> : null}
                        </View>
                      }
                      showChevron={tappable}
                      onPress={tappable ? () => openMember(m) : undefined}
                      testID={`club-team-member-${m.user_id}`}
                    />
                  </View>
                );
              })}
            </Card>
          )}
        </View>

        {canManage ? (
          <Card padded level={1} style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.xs }}>
              <Text variant="subheading">{t('clubManage.team.inviteTitle')}</Text>
              <Text variant="caption" tone="secondary">
                {t('clubManage.team.inviteBody')}
              </Text>
            </View>
            <Input
              label={t('clubManage.team.email')}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setEmailError(null);
              }}
              placeholder={t('clubManage.team.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icon={<Mail size={18} color={colors.textMuted} />}
              error={emailError}
              testID="club-team-email"
            />
            <View style={{ gap: spacing.sm }}>
              <FieldLabel>{t('clubManage.team.role')}</FieldLabel>
              <RolePicker value={inviteRole} onChange={setInviteRole} testIDPrefix="club-invite-role" />
            </View>
            <InfoNote icon="shield">{t('clubManage.team.adultsOnly')}</InfoNote>
            <Button
              label={t('clubManage.team.sendInvite')}
              fullWidth
              loading={inviting}
              disabled={!email.trim()}
              onPress={invite}
              testID="club-team-invite"
            />
          </Card>
        ) : (
          <InfoNote>{t('clubManage.team.viewOnly')}</InfoNote>
        )}

        {me && me.role !== 'owner' ? (
          <Button
            label={t('clubManage.team.leave')}
            variant="ghost"
            icon={<LogOut size={18} color={colors.danger} />}
            onPress={() => setConfirm('leave')}
            testID="club-team-leave"
          />
        ) : null}
      </View>

      <Sheet
        visible={!!selected && confirm === null}
        onClose={() => setSelected(null)}
        title={selected ? displayName(selected.full_name) : undefined}
        subtitle={selected ? clubLabel(t, 'role', selected.role) : undefined}
        footer={
          selfSheet || !canManage ? undefined : (
            <Button
              label={t('clubManage.team.saveRole')}
              fullWidth
              loading={savingRole}
              disabled={!selected || newRole === selected.role}
              onPress={saveRole}
              testID="club-team-save-role"
            />
          )
        }
      >
        <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
          {canManage && !selfSheet ? (
            <View style={{ gap: spacing.sm }}>
              <FieldLabel>{t('clubManage.team.changeRole')}</FieldLabel>
              <RolePicker value={newRole} onChange={setNewRole} testIDPrefix="club-member-role" />
            </View>
          ) : null}
          {selfSheet ? (
            <Button
              label={t('clubManage.team.leave')}
              variant="danger"
              fullWidth
              icon={<LogOut size={18} color={colors.textOnBrand} />}
              onPress={() => setConfirm('leave')}
            />
          ) : canManage ? (
            <Button
              label={t('clubManage.team.remove')}
              variant="ghost"
              fullWidth
              icon={<UserMinus size={18} color={colors.danger} />}
              onPress={() => setConfirm('remove')}
              testID="club-team-remove"
            />
          ) : null}
        </View>
      </Sheet>

      <ConfirmSheet
        visible={confirm !== null}
        title={t(confirm === 'leave' ? 'clubManage.team.leaveTitle' : 'clubManage.team.removeTitle')}
        message={
          confirm === 'leave'
            ? t('clubManage.team.leaveBody', { club: page.data.organization.name })
            : t('clubManage.team.removeBody', { name: displayName(selected?.full_name) })
        }
        confirmLabel={t(confirm === 'leave' ? 'clubManage.team.leave' : 'clubManage.team.remove')}
        destructive
        loading={removing}
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      />
    </Screen>
  );
}
