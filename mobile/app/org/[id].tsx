import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Building2 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, Header, Screen } from '@/components/ui';
import { ClubPageView } from '@/components/club/page/ClubPageView';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A club or academy page. Under the header, the visitor scrolls the whole
 * club: announcements when this viewer has any, then a short preview of each
 * section, and "See all" opens that section on its own screen.
 */
export default function OrganizationScreen() {
  const t = useT();
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof raw === 'string' && UUID.test(raw) ? raw : null;

  if (!id) {
    return (
      <Screen header={<Header back title={t('common.club')} />}>
        <EmptyState
          icon={<Building2 size={26} color={colors.textMuted} />}
          title={t('opportunities.org.missingTitle')}
          body={t('opportunities.org.missingBody')}
          actionLabel={t('opportunities.org.backToDiscover')}
          onAction={() => router.replace(Routes.discover)}
        />
      </Screen>
    );
  }

  return <ClubPageView orgId={id} />;
}
