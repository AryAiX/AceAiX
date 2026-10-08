import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Brain, Flag, Goal, Sparkles, Star, Timer } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { AnimatedGradient, Shine, Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { NATIVE_DRIVER } from '@/lib/motion';
import { cardBackground, stickerKey } from '@/lib/stories';
import type { StoryCard } from '@/lib/api.stories';

/**
 * A card story, drawn natively — no image, nothing to upload.
 *
 * The background is one of the theme's own gradients, drifting; the sticker
 * sits at the top, the stat is the loudest thing on the card in the display
 * face, and the sentence underneath says what it means. Everything on it is
 * white because every gradient is saturated in both schemes (docs/20 rule 1).
 */

const ON_COLOUR = '#FFFFFF';
const SOFT_ON_COLOUR = 'rgba(255,255,255,0.22)';

/** The sticker's icon. Unknown or missing stickers get a sparkle. */
export function StickerIcon({
  sticker,
  size,
  color,
  strokeWidth = 2.2,
}: {
  sticker: unknown;
  size: number;
  color: string;
  strokeWidth?: number;
}) {
  const props = { size, color, strokeWidth };
  switch (stickerKey(sticker)) {
    case 'goal':
      return <Goal {...props} />;
    case 'trial':
      return <Flag {...props} />;
    case 'pb':
      return <Timer {...props} />;
    case 'gameiq':
      return <Brain {...props} />;
    case 'star':
      return <Star {...props} />;
    default:
      return <Sparkles {...props} />;
  }
}

interface Props {
  card: Partial<StoryCard>;
  /** Smaller type for the composer's preview. */
  compact?: boolean;
  /** Changing this replays the entrance, e.g. when the preview is edited. */
  playKey?: string;
  /** Round the corners — the viewer is edge to edge, the preview is not. */
  radius?: number;
}

export function StoryCardView({ card, compact = false, playKey, radius }: Props) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  const background = cardBackground(card.background);
  const stat = (card.stat ?? '').trim();
  const text = (card.text ?? '').trim();

  useEffect(() => {
    if (reduced) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    const animation = Animated.spring(enter, {
      toValue: 1,
      speed: 10,
      bounciness: 9,
      useNativeDriver: NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [enter, reduced, playKey, background]);

  const rise = (distance: number, from = 0) => ({
    opacity: enter.interpolate({ inputRange: [from, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
    ],
  });

  const stickerSize = compact ? 44 : 76;
  const statSize = compact ? 54 : 104;

  return (
    <AnimatedGradient
      colors={theme.gradients[background]}
      period={10}
      radius={radius}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      <Shine every={4} radius={radius} />
      <View
        style={{
          alignItems: 'center',
          paddingHorizontal: compact ? theme.spacing.lg : theme.spacing.xxxl,
          gap: compact ? theme.spacing.sm : theme.spacing.lg,
        }}
      >
        <Animated.View
          style={{
            width: stickerSize,
            height: stickerSize,
            borderRadius: stickerSize / 2,
            backgroundColor: SOFT_ON_COLOUR,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: enter,
            transform: [
              { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              { rotate: enter.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
            ],
          }}
        >
          <StickerIcon sticker={card.sticker} size={stickerSize * 0.52} color={ON_COLOUR} />
        </Animated.View>

        {stat ? (
          <Animated.View style={rise(24, 0.1)}>
            <Text
              color={ON_COLOUR}
              align="center"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                fontFamily: theme.font.displayBlack,
                fontSize: statSize,
                lineHeight: statSize * 1.05,
                letterSpacing: -1,
              }}
            >
              {stat}
            </Text>
          </Animated.View>
        ) : null}

        <Animated.View style={rise(32, 0.25)}>
          <Text
            variant={compact ? 'subheading' : 'title'}
            color={ON_COLOUR}
            align="center"
            style={compact ? undefined : { fontSize: 26, lineHeight: 33 }}
          >
            {text}
          </Text>
        </Animated.View>
      </View>
    </AnimatedGradient>
  );
}
