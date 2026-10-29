import React from 'react';
import { View } from 'react-native';
import { Megaphone } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Card, ErrorState, SectionHeader, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { getClubBroadcasts } from '@/lib/api.club';
import { relativeTime } from '@/lib/format';
import { PreviewRow } from './PreviewRow';

const LATEST = 5;

/**
 * Latest announcements the viewer can read, above the other sections.
 * Hidden when there are none: a visitor only receives the ones sent to them,
 * so an empty line would be wrong.
 */
export function AnnouncementsSection({ orgId, refreshKey }: { orgId: string; refreshKey: number }) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const broadcasts = useAsync(() => getClubBroadcasts(orgId, LATEST), [orgId, refreshKey]);

  if (broadcasts.loading && broadcasts.data == null) return null;

  const rows = broadcasts.data ?? [];
  const failed = broadcasts.error != null && broadcasts.data == null;
  if (!failed && rows.length === 0) return null;

  return (
    <View
      testID="club-section-announcements"
      style={{ marginTop: spacing.xl, paddingHorizontal: spacing.lg, gap: spacing.md }}
    >
      <SectionHeader title={t('club.tabs.announcements')} style={{ marginBottom: 0 }} />
      {failed ? (
        <ErrorState message={broadcasts.error} onRetry={broadcasts.reload} compact />
      ) : (
        <PreviewRow>
          {rows.map((b) => (
            <Card key={b.id} tone="accentSoft" style={{ gap: spacing.xs }} testID={`club-broadcast-${b.id}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Megaphone size={14} color={colors.textSecondary} />
                <Text variant="overline" tone="secondary" style={{ flex: 1 }}>
                  {t('club.posts.announcement')}
                </Text>
                <Text variant="caption" tone="muted">
                  {relativeTime(b.created_at)}
                </Text>
              </View>
              <Text variant="bodyStrong">{b.title}</Text>
              <Text variant="body" tone="secondary">
                {b.body}
              </Text>
            </Card>
          ))}
        </PreviewRow>
      )}
    </View>
  );
}
