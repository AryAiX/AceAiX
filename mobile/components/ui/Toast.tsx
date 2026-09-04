import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface ToastPayload {
  message: string;
  tone?: ToastTone;
  /** ms; defaults to 3200 (5000 for errors so people can actually read them). */
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  show: (payload: ToastPayload) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const insets = useSafeAreaInsets();

  const [toast, setToast] = useState<(ToastPayload & { id: number }) | null>(null);
  const translate = useRef(new Animated.Value(-140)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(translate, {
      toValue: -140,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [translate]);

  const show = useCallback(
    (payload: ToastPayload) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ ...payload, id: Date.now() });
      translate.setValue(-140);
      Animated.timing(translate, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      const ms = payload.duration ?? (payload.tone === 'error' ? 5000 : 3200);
      timer.current = setTimeout(hide, ms);
    },
    [translate, hide],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message: string) => show({ message, tone: 'success' }),
      error: (message: string) => show({ message, tone: 'error' }),
      info: (message: string) => show({ message, tone: 'info' }),
    }),
    [show],
  );

  const tone = toast?.tone ?? 'info';
  const skin = {
    success: { bg: colors.successSoft, fg: colors.success, Icon: CheckCircle2 },
    error: { bg: colors.dangerSoft, fg: colors.danger, Icon: XCircle },
    warning: { bg: colors.warningSoft, fg: colors.warning, Icon: AlertTriangle },
    info: { bg: colors.infoSoft, fg: colors.info, Icon: Info },
  }[tone];

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: insets.top + spacing.sm,
            left: spacing.lg,
            right: spacing.lg,
            transform: [{ translateY: translate }],
            zIndex: 9999,
          }}
        >
          <Pressable
            onPress={hide}
            accessibilityRole="alert"
            accessibilityLiveRegion={Platform.OS === 'android' ? 'polite' : undefined}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderLeftWidth: 4,
              borderLeftColor: skin.fg,
              borderRadius: radii.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              ...theme.elevation(2),
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: skin.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <skin.Icon size={16} color={skin.fg} />
            </View>
            <Text variant="caption" style={{ flex: 1 }} numberOfLines={3}>
              {toast.message}
            </Text>
            {toast.actionLabel && toast.onAction ? (
              <Pressable
                onPress={() => {
                  toast.onAction?.();
                  hide();
                }}
                hitSlop={8}
              >
                <Text variant="captionStrong" tone="primary">
                  {toast.actionLabel}
                </Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
