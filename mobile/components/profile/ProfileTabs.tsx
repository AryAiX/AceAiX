import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/i18n';
import { LayoutToggle, useProfileLayout } from './LayoutToggle';

export type ProfileTab = 'posts' | 'highlights' | 'career';

export const PROFILE_TABS: ProfileTab[] = ['posts', 'highlights', 'career'];

/** Narrows a deep link's `?tab=` value to a tab we actually have. */
export function toProfileTab(value: unknown, fallback: ProfileTab = 'posts'): ProfileTab {
  return typeof value === 'string' && (PROFILE_TABS as string[]).includes(value)
    ? (value as ProfileTab)
    : fallback;
}

/**
 * Posts · Showcase · Career as a full-width segmented bar: equal parts, the
 * open one raised with a blue dot. Under it, the count and the Grid ⇄ Scroll
 * switch.
 */
export function ProfileTabs({
  value,
  onChange,
  postCount = 0,
  clipCount = 0,
}: {
  value: ProfileTab;
  onChange: (tab: ProfileTab) => void;
  /** How many posts and Showcase clips there are. Shown beside the Grid ⇄
      Scroll switch; with nothing to lay out, that row is hidden. */
  postCount?: number;
  clipCount?: number;
}) {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const [layout, setLayout] = useProfileLayout();
  const count = value === 'posts' ? postCount : value === 'highlights' ? clipCount : 0;
  const options: { value: ProfileTab; label: string }[] = [
    { value: 'posts', label: t('common.posts') },
    { value: 'highlights', label: t('profile.tabHighlights') },
    { value: 'career', label: t('profile.tabCareer') },
  ];

  return (
    <View style={{ gap: spacing.sm }}>
      {/* One soft bar split into equal parts; the open part rises as a card
          with a small blue dot. Follows light and dark mode. */}
      <View
        accessibilityRole="tablist"
        testID="profile-tabs"
        style={{
          flexDirection: 'row',
          padding: 4,
          borderRadius: 14,
          backgroundColor: colors.surfaceAlt,
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
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 38,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingHorizontal: 4,
                backgroundColor: active ? colors.surface : 'transparent',
                opacity: pressed && !active ? 0.7 : 1,
                ...(active ? theme.elevation(1) : null),
              })}
            >
              {active ? (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
              ) : null}
              <Text
                variant="bodyStrong"
                color={active ? colors.text : colors.textMuted}
                numberOfLines={1}
                style={{ flexShrink: 1 }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {/* The count and the Grid ⇄ Scroll switch sit on their own row under
          the bar, so the bar gets the full width and every tab name fits. */}
      {count > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="captionStrong" tone="muted">
            {value === 'posts' ? t('profile.postCount', { count }) : t('profile.clipCount', { count })}
          </Text>
          <LayoutToggle value={layout} onChange={setLayout} />
        </View>
      ) : null}
    </View>
  );
}
