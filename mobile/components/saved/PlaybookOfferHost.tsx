import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import { NATIVE_DRIVER } from '@/lib/motion';
import { useOfferedPlaybookItem, type PlaybookItem } from '@/lib/playbooks';
import { PlaybookSheet } from './PlaybookSheet';

const SHOW_MS = 4000;

/**
 * Right after something is saved, a small bar rises at the bottom:
 * "Saved · Add to playbook". Tapping it opens the playbook sheet; left
 * alone, it goes away. Mounted once, at the root.
 */
export function PlaybookOfferHost() {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [offered, clear] = useOfferedPlaybookItem();
  const [sheetItem, setSheetItem] = useState<Omit<PlaybookItem, 'addedAt'> | null>(null);
  const shown = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!offered) return;
    if (timer.current) clearTimeout(timer.current);
    const show = Animated.timing(shown, { toValue: 1, duration: reduced ? 0 : 220, useNativeDriver: NATIVE_DRIVER });
    show.start();
    timer.current = setTimeout(() => {
      Animated.timing(shown, { toValue: 0, duration: reduced ? 0 : 200, useNativeDriver: NATIVE_DRIVER }).start(
        () => clear(),
      );
    }, SHOW_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [offered, shown, clear, reduced]);

  const open = () => {
    if (!offered) return;
    if (timer.current) clearTimeout(timer.current);
    shown.setValue(0);
    setSheetItem(offered);
    clear();
  };

  return (
    <>
      {offered ? (
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: spacing.lg,
            right: spacing.lg,
            /* Above the tab dock. */
            bottom: Math.max(insets.bottom, 12) + 84,
            opacity: shown,
            transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }}
        >
          <Pressable
            onPress={open}
            accessibilityRole="button"
            accessibilityLabel={`${t('common.saved')}. ${t('feed.playbooks.addTo')}`}
            testID="playbook-offer"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingHorizontal: spacing.lg,
              minHeight: 52,
              borderRadius: radii.xl,
              backgroundColor: colors.surfaceInverse,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <Bookmark size={18} color={colors.primary} fill={colors.primary} />
            <Text variant="bodyStrong" color={colors.textInverse} style={{ flex: 1 }}>
              {t('common.saved')}
            </Text>
            <View>
              <Text variant="bodyStrong" color={colors.primary}>
                {t('feed.playbooks.addTo')}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
      <PlaybookSheet item={sheetItem} onClose={() => setSheetItem(null)} />
    </>
  );
}
