import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/i18n';
import { Text } from './Text';

interface Props {
  title?: string;
  subtitle?: string;
  /** Show a back chevron. Defaults to true when the router can go back. */
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  left?: React.ReactNode;
  /** Large left-aligned title in the display face — used on tab roots. */
  large?: boolean;
  bordered?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function Header({
  title,
  subtitle,
  back,
  onBack,
  right,
  left,
  large,
  bordered = false,
  style,
  testID,
}: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();

  const showBack = back ?? false;

  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          minHeight: 56,
          borderBottomWidth: bordered ? 1 : 0,
          borderBottomColor: colors.divider,
          backgroundColor: 'transparent',
        },
        style,
      ]}
    >
      {showBack ? (
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceAlt,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
      ) : (
        left
      )}

      <View style={{ flex: 1 }}>
        {title ? (
          <Text variant={large ? 'title' : 'heading'} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View style={{ flexDirection: 'row', gap: spacing.sm }}>{right}</View> : null}
    </View>
  );
}
