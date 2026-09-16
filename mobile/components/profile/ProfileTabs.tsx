import React from 'react';

import { SegmentedControl } from '@/components/ui';
import { useT } from '@/i18n';

export type ProfileTab = 'posts' | 'highlights' | 'career';

export const PROFILE_TABS: ProfileTab[] = ['posts', 'highlights', 'career'];

/** Narrows a deep link's `?tab=` value to a tab we actually have. */
export function toProfileTab(value: unknown, fallback: ProfileTab = 'posts'): ProfileTab {
  return typeof value === 'string' && (PROFILE_TABS as string[]).includes(value)
    ? (value as ProfileTab)
    : fallback;
}

export function ProfileTabs({
  value,
  onChange,
}: {
  value: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}) {
  const t = useT();
  return (
    <SegmentedControl<ProfileTab>
      value={value}
      onChange={onChange}
      testID="profile-tabs"
      options={[
        { value: 'posts', label: t('common.posts') },
        { value: 'highlights', label: t('profile.tabHighlights') },
        { value: 'career', label: t('profile.tabCareer') },
      ]}
    />
  );
}
