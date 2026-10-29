import React, { useEffect, useState } from 'react';
import { Platform, Pressable, View, type TextStyle } from 'react-native';

import { useT } from '@/i18n';
import { Text, type TextTone, type TextVariant } from './Text';

/** Semibold at the same size as the paragraph. */
const LINK_VARIANT: Partial<Record<TextVariant, TextVariant>> = {
  body: 'bodyStrong',
  bodyStrong: 'bodyStrong',
  caption: 'captionStrong',
  captionStrong: 'captionStrong',
};

/** flexShrink holds the line in its row. On web, break-word wraps a token that would overflow. */
const WRAP: TextStyle =
  Platform.OS === 'web' ? ({ flexShrink: 1, wordBreak: 'break-word' } as TextStyle) : { flexShrink: 1 };

interface Props {
  text: string;
  /** Collapsed height. The link shows only when the text actually runs past it. */
  lines?: number;
  variant?: 'body' | 'bodyStrong' | 'caption' | 'captionStrong';
  tone?: TextTone;
  /**
   * Place the paragraph and the link separately. The link is omitted when the
   * text fits. Used where the link must sit outside a parent button.
   */
  children?: (paragraph: React.ReactNode, link: React.ReactNode | null) => React.ReactNode;
}

/**
 * A paragraph held to `lines` until the reader opens it.
 * "Read more" is its own button, so the card or action under the same finger
 * does not run as well.
 */
export function ExpandableText({
  text,
  lines = 3,
  variant = 'body',
  tone = 'secondary',
  children,
}: Props) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [cutOff, setCutOff] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setExpanded(false);
    setCutOff(false);
  }, [text, lines]);

  if (!text.trim()) return null;

  const paragraph = (
    <View
      style={{ alignSelf: 'stretch', minWidth: 0 }}
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.width);
        setWidth((prev) => (prev === next ? prev : next));
      }}
    >
      <Text
        variant={variant}
        tone={tone}
        numberOfLines={expanded ? undefined : lines}
        style={WRAP}
      >
        {text}
      </Text>
      {/* numberOfLines hides the extra lines from onTextLayout, so the real
          count comes from an unconstrained copy of the same width and size.
          The width has to be the laid-out width: an absolute child otherwise
          measures as one long line and the link never appears. */}
      {width > 0 ? (
        <View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          collapsable={false}
          style={{ position: 'absolute', left: 0, top: 0, width, opacity: 0 }}
        >
          <Text
            variant={variant}
            style={[WRAP, { width }]}
            onTextLayout={(event) => {
              const next = event.nativeEvent.lines.length > lines;
              setCutOff((prev) => (prev === next ? prev : next));
            }}
          >
            {text}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const link = cutOff ? (
    <Pressable
      onPress={(event) => {
        event.stopPropagation();
        setExpanded((open) => !open);
      }}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      hitSlop={8}
      style={{ alignSelf: 'flex-start', borderWidth: 0 }}
    >
      <Text
        variant={LINK_VARIANT[variant] ?? 'bodyStrong'}
        tone="primary"
        style={{ textDecorationLine: 'none' }}
      >
        {expanded ? t('coaching.showLess') : t('coaching.readMore')}
      </Text>
    </Pressable>
  ) : null;

  if (children) return children(paragraph, link);

  return (
    <View style={{ alignSelf: 'stretch', minWidth: 0 }}>
      {paragraph}
      {link}
    </View>
  );
}
