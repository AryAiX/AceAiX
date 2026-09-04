import React from 'react';

import { Button } from '@/components/ui';
import { useT } from '@/i18n';

interface Props {
  following: boolean;
  pending?: boolean;
  onPress: () => void;
  /** Who or what is being followed — used for the screen-reader label. */
  name: string;
}

export function FollowButton({ following, pending, onPress, name }: Props) {
  const t = useT();

  return (
    <Button
      label={following ? t('common.following') : t('common.follow')}
      variant={following ? 'secondary' : 'primary'}
      size="sm"
      loading={pending}
      onPress={onPress}
      accessibilityLabel={
        following ? t('discover.unfollowA11y', { name }) : t('discover.followA11y', { name })
      }
    />
  );
}
