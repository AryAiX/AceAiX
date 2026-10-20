import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, Mail } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, Text } from '@/components/ui';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getMyClubPages } from '@/lib/api.club';
import { clubLabel } from '@/lib/clubLabels';
import { Routes } from '@/lib/routes';

/**
 * On my own profile: the club page I run (or the way to set one up, for a club
 * account), and any page team I have been invited to help run.
 */
export function MyClubCard({ isClubAccount, refreshKey }: { isClubAccount: boolean; refreshKey?: number }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const pages = useAsync(getMyClubPages, [refreshKey], { refetchOnFocus: true });
  if (!pages.data) return null;

  const managed =
    pages.data.find((p) => p.status === 'active' && p.role === 'owner') ??
    pages.data.find((p) => p.status === 'active' && p.role === 'manager') ??
    null;
  const invites = pages.data.filter((p) => p.status === 'pending');

  return (
    <>
      {managed ? (
        <Card padded level={1} style={{ gap: spacing.md }} testID="my-club-card">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <ClubLogo uri={managed.logo_url} name={managed.name} size="md" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="subheading" numberOfLines={1}>
                {managed.name}
              </Text>
              <Badge
                label={clubLabel(t, 'verification', managed.verification_status)}
                tone={managed.is_verified ? 'success' : 'warning'}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              label={t('clubManage.profile.viewPage')}
              size="sm"
              onPress={() => router.push(Routes.organization(managed.id))}
              style={{ flex: 1 }}
              testID="my-club-view"
            />
            <Button
              label={t('clubManage.profile.manage')}
              size="sm"
              variant="secondary"
              onPress={() => router.push(Routes.clubManage(managed.id))}
              style={{ flex: 1 }}
              testID="my-club-manage"
            />
          </View>
        </Card>
      ) : isClubAccount ? (
        <Card padded tone="primarySoft" style={{ gap: spacing.md }} testID="my-club-setup-card">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Building2 size={20} color={colors.primary} />
            <Text variant="subheading" style={{ flex: 1 }}>
              {t('clubManage.profile.setupTitle')}
            </Text>
          </View>
          <Text variant="caption" tone="secondary">
            {t('clubManage.profile.setupBody')}
          </Text>
          <Button
            label={t('clubManage.profile.setupAction')}
            size="sm"
            onPress={() => router.push(Routes.clubSetup)}
            testID="my-club-setup"
          />
        </Card>
      ) : null}

      {invites.map((p) => (
        <Card
          key={p.id}
          padded
          level={1}
          onPress={() => router.push(Routes.organization(p.id))}
          testID={`my-club-invite-${p.id}`}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <ClubLogo uri={p.logo_url} name={p.name} size="sm" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong" numberOfLines={2}>
                {t('clubManage.profile.invited', { name: p.name })}
              </Text>
              <Text variant="caption" tone="muted">
                {t('clubManage.profile.invitedRole', { role: clubLabel(t, 'role', p.role) })}
              </Text>
            </View>
            <Mail size={18} color={colors.primary} />
          </View>
        </Card>
      ))}
    </>
  );
}
