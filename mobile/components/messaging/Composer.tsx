import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/i18n';

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  /** Defaults to the generic "Write a message". */
  placeholder?: string;
  disabled?: boolean;
}

const MAX_LINES = 5;

/** The message box. Grows to five lines, then scrolls inside itself. */
export function Composer({
  value,
  onChangeText,
  onSend,
  placeholder,
  disabled,
}: Props) {
  const theme = useTheme();
  const { colors, radii, spacing, font, size, lineHeight, hit } = theme;
  const t = useT();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const lineH = Math.round(size.md * lineHeight.normal);
  const minHeight: number = hit.min;
  const maxHeight = lineH * MAX_LINES + spacing.md * 2;
  const [height, setHeight] = useState<number>(minHeight);

  /* The screen's KeyboardAvoidingView already lifts this bar, so the home-bar
     inset must only be added while the keyboard is down — otherwise there is a
     dead 34pt gap between the composer and the keyboard on modern iPhones. */
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardUp(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.sm,
        backgroundColor: colors.bg,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: (keyboardUp ? 0 : insets.bottom) + spacing.md,
      }}
    >
      {/* Not an accessibility element of its own: it exists to widen the tap
          target, and VoiceOver should land on the text field inside it. */}
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessible={false}
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: colors.border,
          borderRadius: radii.lg,
          paddingHorizontal: spacing.md + 2,
          justifyContent: 'center',
          minHeight,
        }}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? t('messaging.composerPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          editable={!disabled}
          scrollEnabled={height >= maxHeight}
          onContentSizeChange={(e) =>
            setHeight(
              Math.min(
                Math.max(e.nativeEvent.contentSize.height + spacing.md, minHeight),
                maxHeight,
              ),
            )
          }
          accessibilityLabel={t('common.message')}
          maxLength={4000}
          style={{
            height,
            color: colors.text,
            fontFamily: font.regular,
            fontSize: size.md,
            lineHeight: lineH,
            paddingTop: spacing.md,
            paddingBottom: spacing.md,
            textAlignVertical: 'top',
            // React Native Web draws its own focus ring otherwise.
            ...(({ outlineStyle: 'none' } as unknown) as object),
          }}
        />
      </Pressable>

      <Pressable
        onPress={onSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel={t('messaging.sendMessage')}
        accessibilityState={{ disabled: !canSend }}
        hitSlop={6}
        style={({ pressed }) => ({
          width: hit.min,
          height: hit.min,
          borderRadius: radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: canSend ? colors.primary : colors.surfaceSunken,
          opacity: pressed && canSend ? 0.85 : 1,
        })}
      >
        <Send
          size={19}
          color={canSend ? colors.textOnBrand : colors.textMuted}
          strokeWidth={2.2}
        />
      </Pressable>
    </View>
  );
}
