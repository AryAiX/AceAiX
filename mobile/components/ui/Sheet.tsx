import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/i18n';
import { NATIVE_DRIVER } from '@/lib/motion';
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
  /**
   * When false, nothing dismisses the sheet: no close button, backdrop taps
   * do nothing, Escape is ignored, and the Android back button is swallowed.
   * Leave unset for the usual sheet, which closes on all of those.
   */
  dismissable?: boolean;
  /**
   * Hide the close button while leaving backdrop, back, and swipe dismissal
   * alone. Leave unset: a dismissable sheet with a title still shows the X.
   */
  hideClose?: boolean;
  /**
   * Dragging the sheet downward closes it. Off unless asked, so existing
   * sheets do not gain a gesture.
   */
  swipeToDismiss?: boolean;
  /** The line above `footer`. Leave unset to keep it. */
  footerDivider?: boolean;
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
  dismissable = true,
  hideClose = false,
  swipeToDismiss = false,
  footerDivider = true,
}: Props) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  const [keyboardH, setKeyboardH] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !visible) {
      setKeyboardH(0);
      return;
    }
    const show = Keyboard.addListener('keyboardWillShow', (e) =>
      setKeyboardH(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardH(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [visible]);

  const translate = useRef(new Animated.Value(screenH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const sheetRef = useRef<View>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const dismissableRef = useRef(dismissable);
  const swipeRef = useRef(swipeToDismiss && dismissable);
  const screenHRef = useRef(screenH);
  const drag = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    onCloseRef.current = onClose;
    dismissableRef.current = dismissable;
    swipeRef.current = swipeToDismiss && dismissable;
    screenHRef.current = screenH;
  }, [onClose, dismissable, swipeToDismiss, screenH]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        swipeRef.current && gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.2,
      onPanResponderMove: (_, gesture) => {
        drag.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldClose = gesture.dy > 96 || gesture.vy > 0.9;
        if (swipeRef.current && shouldClose) {
          Animated.timing(drag, {
            toValue: screenHRef.current,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: NATIVE_DRIVER,
          }).start(() => onCloseRef.current());
          return;
        }
        Animated.spring(drag, {
          toValue: 0,
          useNativeDriver: NATIVE_DRIVER,
          speed: 20,
          bounciness: 4,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(drag, {
          toValue: 0,
          useNativeDriver: NATIVE_DRIVER,
          speed: 20,
          bounciness: 4,
        }).start();
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      drag.setValue(0);
      Animated.parallel([
        Animated.timing(translate, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: NATIVE_DRIVER }),
      ]).start();
    } else {
      translate.setValue(screenH);
      backdrop.setValue(0);
    }
  }, [visible, translate, backdrop, drag, screenH]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;

    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = sheetRef.current as unknown as HTMLElement | null;
    const focusable = () =>
      Array.from(
        root?.querySelectorAll<HTMLElement>(
          'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute('disabled'));

    const focusTimer = window.setTimeout(() => focusable()[0]?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (dismissableRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      previousFocus.current?.focus();
      previousFocus.current = null;
    };
  }, [visible]);

  /* The navigator also listens for back. Swallowing it here keeps a forced
     update from popping the screen underneath the sheet. */
  useEffect(() => {
    if (!visible || dismissable || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible, dismissable]);

  const baseMaxHeight = height ? screenH * height : screenH * 0.88;
  const maxHeight =
    keyboardH > 0
      ? Math.min(baseMaxHeight, screenH - keyboardH - insets.top - spacing.md)
      : baseMaxHeight;

  const body = (
    <View style={[{ paddingHorizontal: spacing.lg }, contentStyle]}>{children}</View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => {
        if (dismissable) onClose();
      }}
      statusBarTranslucent
      testID={testID}
    >
      <View
        ref={sheetRef}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        accessibilityViewIsModal
      >
        <Animated.View
          style={{
            ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const),
            backgroundColor: colors.overlay,
            opacity: backdrop,
          }}
        >
          {dismissable ? (
            <Pressable
              style={{ flex: 1 }}
              onPress={onClose}
              focusable={false}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            />
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </Animated.View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View
            {...(swipeToDismiss && dismissable ? pan.panHandlers : {})}
            style={{
              transform: [
                {
                  translateY: swipeToDismiss ? Animated.add(translate, drag) : translate,
                },
              ],
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xxl,
              borderTopRightRadius: radii.xxl,
              maxHeight,
              paddingBottom: keyboardH > 0 ? spacing.lg : insets.bottom + spacing.lg,
              ...theme.elevation(3),
            }}
          >
            {dismissable ? (
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
            ) : (
              <View style={{ height: spacing.lg }} />
            )}

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
                {dismissable && !hideClose ? (
                  <Pressable
                    onPress={onClose}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close')}
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
                ) : null}
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
                  borderTopWidth: footerDivider ? 1 : 0,
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
  confirmLabel,
  cancelLabel,
  destructive,
  loading,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  const theme = useTheme();
  const t = useT();

  return (
    <Sheet visible={visible} onClose={onCancel} title={title} scrollable={false}>
      <Text variant="body" tone="secondary" style={{ marginBottom: theme.spacing.xl }}>
        {message}
      </Text>
      <View style={{ gap: theme.spacing.sm }}>
        <Button
          label={confirmLabel ?? t('common.confirm')}
          variant={destructive ? 'danger' : 'primary'}
          fullWidth
          loading={loading}
          onPress={onConfirm}
        />
        <Button
          label={cancelLabel ?? t('common.cancel')}
          variant="ghost"
          fullWidth
          onPress={onCancel}
        />
      </View>
    </Sheet>
  );
}
