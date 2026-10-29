import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, Mail } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, Text } from '@/components/ui';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { useT } from '@/i18n';
import { managedClubPage, type MyClubPage } from '@/lib/api.club';
import { clubLabel } from '@/lib/clubLabels';
import { Routes } from '@/lib/routes';

/** View page and Manage, for a page this person already helps run. */
function ClubAccessCard({ page, testSuffix = '' }: { page: MyClubPage; testSuffix?: string }) {
  const { spacing } = useTheme();
  const t = useT();
  const router = useRouter();

  return (
    <Card padded level={1} style={{ gap: spacing.md }} testID={`my-club-card${testSuffix}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <ClubLogo uri={page.logo_url} name={page.name} size="md" />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="subheading" numberOfLines={1}>
            {page.name}
          </Text>
          <Badge
            label={clubLabel(t, 'verification', page.verification_status)}
            tone={page.is_verified ? 'success' : 'warning'}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label={t('clubManage.profile.viewPage')}
          size="sm"
          onPress={() => router.push(Routes.organization(page.id))}
          style={{ flex: 1 }}
          testID={`my-club-view${testSuffix}`}
        />
        <Button
          label={t('clubManage.profile.manage')}
          size="sm"
          variant="secondary"
          onPress={() => router.push(Routes.clubManage(page.id))}
          style={{ flex: 1 }}
          testID={`my-club-manage${testSuffix}`}
        />
      </View>
    </Card>
  );
}

/**
 * On my own profile: the club page I run (or the way to set one up, for a club
 * account), every active page I edit or keep score for, and any page team I
 * have been invited to help run.
 *
 * A club account that already runs a page hides this card's owner/manager
 * row; the profile draws the control room there instead. Editor and
 * scorekeeper cards stay.
 */
export function MyClubCard({
  isClubAccount,
  pages,
  hideManagedCard = false,
}: {
  isClubAccount: boolean;
  /** From the profile screen's `my_club_pages` load. Null while that is still out. */
  pages: MyClubPage[] | null;
  /** Skip the owner/manager card. Setup, editor and scorekeeper cards, and invitations still render. */
  hideManagedCard?: boolean;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  if (!pages) return null;

  const managed = managedClubPage(pages);
  const invites = pages.filter((p) => p.status === 'pending');
  const helping = pages.filter(
    (p) => p.status === 'active' && (p.role === 'editor' || p.role === 'scorekeeper'),
  );

  return (
    <>
      {managed && !hideManagedCard ? (
        <ClubAccessCard page={managed} />
      ) : !managed && isClubAccount ? (
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

      {helping.map((p) => (
        <ClubAccessCard key={p.id} page={p} testSuffix={`-${p.id}`} />
      ))}

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
