import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ban } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { countryLabel } from '@/constants/sports';
import { getBlockedUsers, unblockUser } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { displayName, metaLine, roleLabel } from '@/lib/format';
import { Routes } from '@/lib/routes';
import type { UserSummary } from '@/types/models';

export default function BlockedAccountsScreen() {
  const theme = useTheme();
  const { spacing, colors } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();

  const blocked = useAsync(getBlockedUsers, [], { refetchOnFocus: true });
  const [target, setTarget] = useState<UserSummary | null>(null);
  const [working, setWorking] = useState(false);

  const confirmUnblock = useCallback(async () => {
    if (!target) return;
    setWorking(true);
    try {
      await unblockUser(target.id);
      blocked.mutate((rows) => (rows ?? []).filter((r) => r.id !== target.id));
      toast.success(t('safety.unblockedToast', { name: displayName(target.full_name) }));
      setTarget(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setWorking(false);
    }
  }, [target, blocked, toast, t]);

  const rows = blocked.data ?? [];

  return (
    <Screen
      header={<Header title={t('safety.blockedTitle')} back bordered />}
      onRefresh={blocked.refresh}
      refreshing={blocked.refreshing}
      testID="settings-blocked"
    >
      <View style={{ paddingTop: spacing.lg, gap: spacing.md }}>
        {blocked.loading ? (
          <SkeletonList count={3} variant="row" />
        ) : blocked.error ? (
          <ErrorState message={blocked.error} onRetry={blocked.reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Ban size={26} color={colors.textMuted} />}
            title={t('safety.blockedEmptyTitle')}
            body={t('safety.blockedEmptyBody')}
          />
        ) : (
          <>
            <Text variant="caption" tone="muted">
              {t('safety.blockedCount', { count: rows.length })}
            </Text>

            {rows.map((user) => (
              <Card key={user.id} padded="sm">
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    minHeight: theme.hit.min,
                  }}
                >
                  <Avatar
                    uri={user.avatar_url}
                    name={user.full_name}
                    size="sm"
                    verified={user.is_verified}
                    onPress={() => router.push(Routes.profile(user.id))}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {displayName(user.full_name)}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {metaLine(
                        roleLabel(user.role),
                        user.city,
                        countryLabel(t, user.country),
                      )}
                    </Text>
                  </View>
                  <Button
                    label={t('common.unblock')}
                    variant="secondary"
                    size="sm"
                    onPress={() => setTarget(user)}
                    testID={`unblock-${user.id}`}
                  />
                </View>
              </Card>
            ))}
          </>
        )}
      </View>

      <ConfirmSheet
        visible={!!target}
        title={
          target
            ? t('safety.unblockConfirmTitle', { name: displayName(target.full_name) })
            : t('common.unblock')
        }
        message={t('safety.unblockConfirmBody')}
        confirmLabel={t('common.unblock')}
        cancelLabel={t('common.cancel')}
        loading={working}
        onConfirm={confirmUnblock}
        onCancel={() => setTarget(null)}
      />
    </Screen>
  );
}
