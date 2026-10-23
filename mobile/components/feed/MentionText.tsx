import React from 'react';
import {
  Text as RNText,
  type GestureResponderEvent,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Text, type TextTone, type TextVariant } from '@/components/ui';
import { splitMentions, type MentionSpan } from '@/lib/mentions';
import { Routes } from '@/lib/routes';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * A caption or comment with its @-names drawn as links.
 *
 * The plain words and the names are sibling spans inside one text node, so a
 * tap on a name does not also fire the caption's own tap. Spans do not set
 * their own alignment: the paragraph direction, including right to left,
 * comes from the surrounding text.
 */

interface Props {
  text: string;
  mentions?: readonly MentionSpan[] | null;
  variant?: TextVariant;
  tone?: TextTone;
  color?: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  /** Tap on the words that are not a mention. */
  onPressText?: () => void;
  pressLabel?: string;
  /**
   * Opens the named person's profile. Callers that sit in a sheet pass the
   * same handler as an author tap, so the sheet closes before the navigation.
   * Without it, the mention pushes `/u/{id}` itself.
   */
  onOpenProfile?: (userId: string) => void;
}

export function MentionText({
  text,
  mentions,
  variant = 'body',
  tone,
  color,
  numberOfLines,
  style,
  onPressText,
  pressLabel,
  onOpenProfile,
}: Props) {
  const theme = useTheme();
  const router = useRouter();
  const pieces = splitMentions(text, mentions);
  const { colors, font, size, lineHeight } = theme;

  if (pieces.length === 0) return null;

  const fontSize = variant === 'caption' || variant === 'captionStrong' ? size.sm : size.md;
  const plainColor = color ?? toneColor(colors, tone);
  const runStyle: TextStyle = {
    fontSize,
    lineHeight: fontSize * lineHeight.normal,
    fontFamily:
      variant === 'bodyStrong' || variant === 'captionStrong' ? font.semibold : font.regular,
    color: plainColor,
  };

  const openMention = (userId: string, event: GestureResponderEvent) => {
    stopPress(event);
    if (onOpenProfile) onOpenProfile(userId);
    else router.push(Routes.profile(userId));
  };

  let labelledPlain = false;

  return (
    <Text variant={variant} tone={tone} color={color} numberOfLines={numberOfLines} style={style}>
      {pieces.map((piece, index) => {
        if (piece.kind === 'mention') {
          return (
            <RNText
              key={`m-${piece.user_id}-${index}`}
              style={[runStyle, { color: colors.primary, fontFamily: font.semibold }]}
              onPress={(event) => openMention(piece.user_id, event)}
              suppressHighlighting
              accessibilityRole="link"
            >
              {piece.text}
            </RNText>
          );
        }

        if (!onPressText) return piece.text;

        const label = !labelledPlain ? pressLabel : undefined;
        labelledPlain = true;
        return (
            <RNText
              key={`t-${index}`}
              style={runStyle}
              onPress={onPressText}
              suppressHighlighting
              accessibilityRole="button"
              accessibilityLabel={label}
            >
            {piece.text}
          </RNText>
        );
      })}
    </Text>
  );
}

/** A mention tap must not continue on to a caption Pressable around this text. */
function stopPress(event: GestureResponderEvent): void {
  const withStop = event as GestureResponderEvent & { stopPropagation?: () => void };
  withStop.stopPropagation?.();
  const native = event.nativeEvent as { stopPropagation?: () => void };
  native.stopPropagation?.();
}

function toneColor(
  colors: {
    text: string;
    textSecondary: string;
    textMuted: string;
    textInverse: string;
    primary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    textOnBrand: string;
  },
  tone: TextTone | undefined,
): string {
  switch (tone) {
    case 'secondary':
      return colors.textSecondary;
    case 'muted':
      return colors.textMuted;
    case 'inverse':
      return colors.textInverse;
    case 'primary':
      return colors.primary;
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.danger;
    case 'info':
      return colors.info;
    case 'onBrand':
      return colors.textOnBrand;
    default:
      return colors.text;
  }
}
