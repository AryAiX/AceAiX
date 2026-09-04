import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export type TextVariant =
  | 'hero'          // splash / onboarding headline
  | 'display'       // big score numbers
  | 'title'         // screen title
  | 'heading'       // section heading
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'captionStrong'
  | 'overline'      // ALL-CAPS label
  | 'stat';         // condensed numeric

export type TextTone =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'inverse'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'onBrand';

interface Props extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextStyle['textAlign'];
  /** Overrides tone. Use only for tier/brand colours computed at runtime. */
  color?: string;
}

export function Text({
  variant = 'body',
  tone = 'default',
  align,
  color,
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const { colors, font, size, lineHeight } = theme;

  const variantStyle: Record<TextVariant, TextStyle> = {
    hero: {
      fontFamily: font.displayBlack,
      fontSize: size.hero,
      lineHeight: size.hero * lineHeight.tight,
      letterSpacing: -0.5,
    },
    display: {
      fontFamily: font.displayBlack,
      fontSize: size.display,
      lineHeight: size.display * lineHeight.tight,
      letterSpacing: -0.4,
    },
    title: {
      fontFamily: font.display,
      fontSize: size.xxl,
      lineHeight: size.xxl * lineHeight.tight,
      letterSpacing: 0.2,
    },
    heading: {
      fontFamily: font.bold,
      fontSize: size.lg,
      lineHeight: size.lg * lineHeight.snug,
      letterSpacing: -0.1,
    },
    subheading: {
      fontFamily: font.semibold,
      fontSize: size.md,
      lineHeight: size.md * lineHeight.snug,
    },
    body: {
      fontFamily: font.regular,
      fontSize: size.md,
      lineHeight: size.md * lineHeight.normal,
    },
    bodyStrong: {
      fontFamily: font.semibold,
      fontSize: size.md,
      lineHeight: size.md * lineHeight.normal,
    },
    caption: {
      fontFamily: font.regular,
      fontSize: size.sm,
      lineHeight: size.sm * lineHeight.normal,
    },
    captionStrong: {
      fontFamily: font.semibold,
      fontSize: size.sm,
      lineHeight: size.sm * lineHeight.normal,
    },
    overline: {
      fontFamily: font.bold,
      fontSize: size.xxs,
      lineHeight: size.xxs * lineHeight.normal,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    stat: {
      fontFamily: font.display,
      fontSize: size.xl,
      lineHeight: size.xl * lineHeight.tight,
      letterSpacing: 0.3,
    },
  };

  const toneColor: Record<TextTone, string> = {
    default: colors.text,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    inverse: colors.textInverse,
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    info: colors.info,
    onBrand: colors.textOnBrand,
  };

  return (
    <RNText
      {...rest}
      style={[
        variantStyle[variant],
        { color: color ?? toneColor[tone] },
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
