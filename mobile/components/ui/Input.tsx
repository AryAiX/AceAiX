import React, { forwardRef, useId, useState } from 'react';
import {
  Pressable,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/i18n';
import { Text } from './Text';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  containerStyle?: ViewStyle;
  /** Renders a show/hide toggle and forces secureTextEntry. */
  password?: boolean;
  required?: boolean;
}

export const Input = forwardRef<TextInput, Props>(function Input(
  {
    label,
    hint,
    error,
    icon,
    rightSlot,
    containerStyle,
    password,
    required,
    multiline,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing, font, size } = theme;
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const descriptionId = useId();

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <Text variant="captionStrong" tone="secondary">
          {label}
          {required ? <Text variant="captionStrong" tone="danger">{' *'}</Text> : null}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor,
          borderRadius: radii.md,
          paddingHorizontal: spacing.lg,
          minHeight: multiline ? 112 : 52,
          gap: spacing.sm,
        }}
      >
        {icon ? <View style={{ paddingTop: multiline ? spacing.md : 0 }}>{icon}</View> : null}

        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          secureTextEntry={password ? hidden : rest.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={{
            flex: 1,
            color: colors.text,
            fontFamily: font.regular,
            fontSize: size.md,
            paddingVertical: multiline ? spacing.md : 0,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
          accessibilityLabel={label ?? rest.placeholder}
          accessibilityState={{ ...rest.accessibilityState, disabled: rest.editable === false }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? descriptionId : undefined}
          {...rest}
        />

        {password ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              hidden ? t('common.showPassword') : t('common.hidePassword')
            }
          >
            {hidden ? (
              <EyeOff size={20} color={colors.textMuted} />
            ) : (
              <Eye size={20} color={colors.textMuted} />
            )}
          </Pressable>
        ) : (
          rightSlot
        )}
      </View>

      {error ? (
        <Text
          nativeID={descriptionId}
          variant="caption"
          tone="danger"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text nativeID={descriptionId} variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
