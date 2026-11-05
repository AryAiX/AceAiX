import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/i18n';

export type ProfileTab = 'posts' | 'highlights' | 'career';

export const PROFILE_TABS: ProfileTab[] = ['posts', 'highlights', 'career'];

/** Narrows a deep link's `?tab=` value to a tab we actually have. */
export function toProfileTab(value: unknown, fallback: ProfileTab = 'posts'): ProfileTab {
  return typeof value === 'string' && (PROFILE_TABS as string[]).includes(value)
    ? (value as ProfileTab)
    : fallback;
}

/**
 * Posts · Highlights · Career as text tabs with an underline under the open
 * one, over a hairline — lighter than a switch, so the profile's sections read
 * as pages of one profile rather than as a setting.
 */
export function ProfileTabs({
  value,
  onChange,
}: {
  value: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}) {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const options: { value: ProfileTab; label: string }[] = [
    { value: 'posts', label: t('common.posts') },
    { value: 'highlights', label: t('profile.tabHighlights') },
    { value: 'career', label: t('profile.tabCareer') },
  ];

  return (
    <View
      accessibilityRole="tablist"
      testID="profile-tabs"
      style={{
        flexDirection: 'row',
        gap: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            testID={`profile-tabs-${opt.value}`}
            hitSlop={{ top: 8, bottom: 0, left: 8, right: 8 }}
            style={{ paddingVertical: spacing.sm, minHeight: 40, justifyContent: 'center' }}
          >
            <Text variant="captionStrong" color={active ? colors.primary : colors.textMuted}>
              {opt.label}
            </Text>
            {/* The underline sits on the hairline, so it reads as part of it. */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: -1,
                height: 2,
                borderRadius: 1,
                backgroundColor: active ? colors.primary : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
