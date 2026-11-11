import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Plus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Text } from '@/components/ui';
import { fullDate, timeOfDay } from '@/lib/format';

/** "12 Oct 2026 · 18:30" — the one way the club page prints a moment. */
export function whenLabel(iso: string | null | undefined): string {
  const day = fullDate(iso);
  const time = timeOfDay(iso);
  return day && time ? `${day} · ${time}` : day;
}

/** The page team's "add something" button, top end of a tab. */
export function TabAction({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
      <Button
        label={label}
        size="sm"
        variant="secondary"
        icon={<Plus size={16} color={colors.text} strokeWidth={2.4} />}
        onPress={onPress}
        testID={testID}
      />
    </View>
  );
}

/** Props every club section body takes. */
export interface ClubTabProps {
  orgId: string;
  canPost: boolean;
  /** Bumped by pull-to-refresh. */
  refreshKey: number;
  /**
   * Public-page preview. When set, show at most this many items and skip the
   * page team's add buttons. An empty preview is one muted line, not the
   * full empty state.
   * Matches treats it as the cap on recent results and still shows the live
   * match, or the next one. About uses it only as the switch into preview.
   */
  limit?: number;
  /** Preview only: whether this section has anything to show, including a load error. */
  onHasItems?: (has: boolean) => void;
}

/** The public page's one muted line when a preview has nothing to show. */
export function PreviewEmpty({ title }: { title: string }) {
  return (
    <Text variant="caption" tone="muted">
      {title}
    </Text>
  );
}

/**
 * Tell the public page whether a preview has anything to show.
 * `null` means the first load is still out: the heading stays, without "See all"
 * and without the empty line.
 */
export function useReportItems(onHasItems: ((has: boolean) => void) | undefined, has: boolean | null) {
  useEffect(() => {
    if (has == null || !onHasItems) return;
    onHasItems(has);
  }, [has, onHasItems]);
}

/** First response has not arrived yet. An error is not "still loading". */
export function previewPending(data: unknown, error: string | null | undefined): boolean {
  return data == null && !error;
}
