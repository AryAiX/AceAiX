import React from 'react';
import { View } from 'react-native';
import { Plus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';
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

/** Props every lazily loaded tab body takes. */
export interface ClubTabProps {
  orgId: string;
  canPost: boolean;
  /** Bumped by pull-to-refresh while this tab is open. */
  refreshKey: number;
}
