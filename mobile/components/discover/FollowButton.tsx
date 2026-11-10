import React from 'react';

import { Button } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Check } from 'lucide-react-native';

interface Props {
  following: boolean;
  pending?: boolean;
  onPress: () => void;
  /** Who or what is being followed — used for the screen-reader label. */
  name: string;
  /** No longer changes the look (Follow is the same everywhere). */
  solid?: boolean;
}

/* One Follow everywhere: a blue outline; Following is grey with a tick.
   `solid` is kept so older callers still compile; it no longer changes the look. */
export function FollowButton({ following, pending, onPress, name }: Props) {
  const t = useT();
  const { colors } = useTheme();

  return (
    <Button
      label={following ? t('common.following') : t('common.follow')}
      variant={following ? 'secondary' : 'outline'}
      icon={following ? <Check size={16} color={colors.textSecondary} strokeWidth={2.6} /> : undefined}
      size="sm"
      loading={pending}
      onPress={onPress}
      accessibilityLabel={
        following ? t('discover.unfollowA11y', { name }) : t('discover.followA11y', { name })
      }
    />
  );
}
