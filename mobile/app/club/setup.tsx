import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, ExternalLink, PenSquare, Rocket } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  Reveal,
  Screen,
  SkeletonList,
  Text,
} from '@/components/ui';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { ClubSetupWizard, VERIFICATION_TONE } from '@/components/club/setup';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { getMyManagedClub } from '@/lib/api.club';
import { clubLabel } from '@/lib/clubLabels';
import { Routes } from '@/lib/routes';

/**
 * Set up a club or academy page — for club accounts that finished onboarding
 * before pages existed. New club accounts get the same wizard inside
 * onboarding.
 */
export default function ClubSetupScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const { profile } = useAuth();
  const isClub = profile?.role === 'club';

  const mine = useAsync(getMyManagedClub, [isClub], { enabled: isClub });
  const [running, setRunning] = useState(false);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace(Routes.home);
  };

  const header = <Header title={t('clubSetup.screen.title')} back onBack={close} />;

  if (!profile) {
    return (
      <Screen header={header} testID="club-setup-screen">
        <SkeletonList count={3} variant="row" />
      </Screen>
    );
  }

  if (!isClub) {
    return (
      <Screen header={header} testID="club-setup-screen">
        <EmptyState
          icon={<Building2 size={28} color={colors.primary} />}
          title={t('clubSetup.screen.notClubTitle')}
          body={t('clubSetup.screen.notClubBody')}
          actionLabel={t('clubSetup.screen.backHome')}
          onAction={() => router.replace(Routes.home)}
        />
      </Screen>
    );
  }

  if (running) {
    return (
      <ClubSetupWizard
        mode="standalone"
        onExit={() => setRunning(false)}
        onFinished={(orgId) => router.replace(Routes.organization(orgId))}
      />
    );
  }

  if (mine.loading && !mine.data) {
    return (
      <Screen header={header} testID="club-setup-screen">
        <SkeletonList count={3} variant="row" />
      </Screen>
    );
  }

  if (mine.error) {
    return (
      <Screen header={header} testID="club-setup-screen">
        <ErrorState message={mine.error} onRetry={mine.reload} />
      </Screen>
    );
  }

  const page = mine.data;

  return (
    <Screen header={header} testID="club-setup-screen">
      <View style={{ gap: spacing.xl, paddingTop: spacing.md }}>
        {page ? (
          <Reveal>
            <Card level={1} style={{ gap: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <ClubLogo uri={page.logo_url} name={page.name} size="lg" />
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text variant="heading" numberOfLines={2}>
                    {page.name}
                  </Text>
                  <Badge
                    label={clubLabel(t, 'verification', page.verification_status)}
                    tone={VERIFICATION_TONE[page.verification_status] ?? 'neutral'}
                  />
                </View>
              </View>
              <Text variant="body" tone="secondary">
                {t('clubSetup.screen.hasPageBody')}
              </Text>
              <View style={{ gap: spacing.sm }}>
                <Button
                  label={t('clubSetup.screen.openPage')}
                  fullWidth
                  icon={<ExternalLink size={18} color={colors.textOnBrand} />}
                  onPress={() => router.push(Routes.organization(page.id))}
                  testID="club-setup-open-page"
                />
                <Button
                  label={t('clubSetup.screen.continueSetup')}
                  variant="secondary"
                  fullWidth
                  icon={<Rocket size={18} color={colors.text} />}
                  onPress={() => setRunning(true)}
                  testID="club-setup-continue-setup"
                />
                <Button
                  label={t('clubSetup.screen.editPage')}
                  variant="ghost"
                  fullWidth
                  icon={<PenSquare size={18} color={colors.primary} />}
                  onPress={() => router.push(Routes.clubEdit(page.id))}
                  testID="club-setup-edit-page"
                />
              </View>
            </Card>
          </Reveal>
        ) : (
          <Reveal>
            <EmptyState
              icon={<Rocket size={28} color={colors.primary} />}
              title={t('clubSetup.screen.startTitle')}
              body={t('clubSetup.screen.startBody')}
              actionLabel={t('clubSetup.screen.start')}
              onAction={() => setRunning(true)}
            />
          </Reveal>
        )}
      </View>
    </Screen>
  );
}
