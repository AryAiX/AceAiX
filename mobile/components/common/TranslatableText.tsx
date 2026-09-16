import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { translate, mightNeedTranslation } from '@/lib/api.translate';
import { useI18n, useT } from '@/i18n';

/**
 * A body of text with "See translation" under it, the way Instagram does it.
 *
 * Three rules it follows, all of them about not being annoying:
 *
 *   * It never translates on its own. Somebody's words are shown as they wrote
 *     them until a reader asks otherwise — auto-translating a feed is how you
 *     end up reading a machine's opinion of a friend's joke.
 *   * If no provider is configured, or the call fails, the line disappears
 *     rather than showing an error. A feature that cannot work should look
 *     absent, not broken.
 *   * "Show original" is always one tap away, and it is the same tap, in the
 *     same place.
 */

interface Props {
  text: string | null | undefined;
  variant?: 'body' | 'caption' | 'bodyStrong';
  tone?: 'primary' | 'secondary' | 'muted';
  color?: string;
  numberOfLines?: number;
  /** Dimmer link colour, for use on a saturated tile. */
  onColour?: boolean;
  /**
   * Makes the text itself tappable — for a feed caption, where tapping opens
   * the post. The translation line is a separate target inside the same
   * component, so the two never fight over one gesture and the caption is
   * still rendered exactly once.
   */
  onPressText?: () => void;
  pressLabel?: string;
  /** Trailing content under the text and above the translate line. */
  footer?: React.ReactNode;
  /**
   * Suppresses the translate line. Used while a caption is truncated: swapping
   * three visible lines for a translation of the whole post replaces words the
   * reader can see with words they cannot check.
   */
  offer?: boolean;
  testID?: string;
}

export function TranslatableText({
  text,
  variant = 'body',
  tone,
  color,
  numberOfLines,
  onColour = false,
  onPressText,
  pressLabel,
  footer,
  offer: offerProp = true,
  testID,
}: Props) {
  const theme = useTheme();
  const t = useT();
  const { language } = useI18n();

  const [translated, setTranslated] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [busy, setBusy] = useState(false);
  /* Set once a call comes back with nothing. The line then stays hidden for
     this post rather than inviting a tap that will not do anything. */
  const [unavailable, setUnavailable] = useState(false);

  const onToggle = useCallback(async () => {
    if (showing) {
      setShowing(false);
      return;
    }
    if (translated) {
      setShowing(true);
      return;
    }

    setBusy(true);
    const result = await translate(text ?? '', language);
    setBusy(false);

    if (!result) {
      setUnavailable(true);
      return;
    }
    setTranslated(result.translated);
    setShowing(true);
  }, [language, showing, text, translated]);

  if (!text?.trim()) return null;

  const offer = offerProp && !unavailable && mightNeedTranslation(text, language);

  const body = (
    <Text variant={variant} tone={tone} color={color} numberOfLines={numberOfLines}>
      {showing && translated ? translated : text}
    </Text>
  );
  const linkColour = onColour ? 'rgba(255,255,255,0.85)' : theme.colors.textMuted;

  return (
    <View testID={testID}>
      {onPressText ? (
        <Pressable
          onPress={onPressText}
          accessibilityRole="button"
          accessibilityLabel={pressLabel}
        >
          {body}
          {footer}
        </Pressable>
      ) : (
        <>
          {body}
          {footer}
        </>
      )}

      {offer ? (
        <Pressable
          onPress={onToggle}
          disabled={busy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t(showing ? 'common.showOriginal' : 'common.seeTranslation')}
          accessibilityState={{ busy }}
          testID={testID ? `${testID}-translate` : undefined}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            minHeight: 28,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          {busy ? <ActivityIndicator size="small" color={linkColour} /> : null}
          <Text variant="caption" color={linkColour}>
            {t(showing ? 'common.showOriginal' : 'common.seeTranslation')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
