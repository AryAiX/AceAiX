import React from 'react';

import { Header, Screen } from '@/components/ui';
import { ClubManageHub } from '@/components/club/manage/ClubManageHub';
import { ClubGateScreen, gateStatus, useOrgId } from '@/components/club/manage/shared';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getClubPage } from '@/lib/api.club';

/**
 * The page team's hub, on its own screen. The body is ClubManageHub, which a
 * club account also sees on its profile.
 */
export default function ClubManageScreen() {
  const t = useT();
  const orgId = useOrgId();

  const state = useAsync(() => getClubPage(orgId as string), [orgId], {
    enabled: !!orgId,
    refetchOnFocus: true,
  });

  const header = <Header title={t('clubManage.hub.title')} back />;
  const status = gateStatus(orgId, state, 'any');
  if (status !== 'ok' || !state.data || !orgId) {
    return (
      <ClubGateScreen
        status={status === 'ok' ? 'gone' : status}
        header={header}
        error={state.error}
        onRetry={state.reload}
        orgId={orgId}
        testID="club-manage-screen"
      />
    );
  }

  return (
    <Screen
      header={header}
      onRefresh={state.refresh}
      refreshing={state.refreshing}
      testID="club-manage-screen"
    >
      <ClubManageHub page={state.data} />
    </Screen>
  );
}
