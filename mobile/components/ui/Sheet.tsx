import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';
import { Text } from './Text';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Fraction of screen height, 0–1. Defaults to content-sized with a cap. */
  height?: number;
  footer?: React.ReactNode;
  scrollable?: boolean;
  contentStyle?: ViewStyle;
  testID?: string;
}

/**
 * Bottom sheet built on the platform Modal — no reanimated dependency
 * (this project stubs reanimated out for build stability).
 */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  height,
  footer,
  scrollable = true,
  contentStyle,
  testID,
}: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const insets = useSafeAreaInsets();
  const screenH = Dimensions.get('window').height;

  const translate = useRef(new Animated.Value(screenH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translate, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      translate.setValue(screenH);
      backdrop.setValue(0);
    }
  }, [visible, translate, backdrop, screenH]);

  const maxHeight = height ? screenH * height : screenH * 0.88;

  const body = (
    <View style={[{ paddingHorizontal: spacing.lg }, contentStyle]}>{children}</View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          style={{
            ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const),
            backgroundColor: colors.overlay,
            opacity: backdrop,
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View
            style={{
              transform: [{ translateY: translate }],
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xxl,
              borderTopRightRadius: radii.xxl,
              maxHeight,
              paddingBottom: insets.bottom + spacing.lg,
              ...theme.elevation(3),
            }}
          >
            {/* grabber */}
            <View style={{ alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.sm }}>
              <View
                style={{
                  width: 44,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: colors.borderStrong,
                }}
              />
            </View>

            {title ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  paddingHorizontal: spacing.lg,
                  paddingBottom: spacing.md,
                  gap: spacing.md,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="heading">{title}</Text>
                  {subtitle ? (
                    <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.surfaceAlt,
                  }}
                >
                  <X size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : null}

            {scrollable ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: spacing.lg }}
              >
                {body}
              </ScrollView>
            ) : (
              body
            )}

            {footer ? (
              <View
                style={{
                  paddingHorizontal: spacing.lg,
                  paddingTop: spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: colors.divider,
                }}
              >
                {footer}
              </View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

interface ConfirmProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  const theme = useTheme();

  return (
    <Sheet visible={visible} onClose={onCancel} title={title} scrollable={false}>
      <Text variant="body" tone="secondary" style={{ marginBottom: theme.spacing.xl }}>
        {message}
      </Text>
      <View style={{ gap: theme.spacing.sm }}>
        <Button
          label={confirmLabel}
          variant={destructive ? 'danger' : 'primary'}
          fullWidth
          loading={loading}
          onPress={onConfirm}
        />
        <Button label={cancelLabel} variant="ghost" fullWidth onPress={onCancel} />
      </View>
    </Sheet>
  );
}
