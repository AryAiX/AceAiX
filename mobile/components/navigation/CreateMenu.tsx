import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Camera, Clapperboard, SquarePen, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { NATIVE_DRIVER } from '@/lib/motion';

export type CreateChoice = 'post' | 'story' | 'highlight';

/** Where the + sits on screen, so the menu can grow out of it. */
export interface PlusFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  frame: PlusFrame | null;
  /** Highlights are an athlete's clips; other accounts don't get that bubble. */
  showHighlight: boolean;
  onPick: (choice: CreateChoice) => void;
  onClose: () => void;
  /** iOS: called once the menu has fully gone, so the next screen can open. */
  onDismiss?: () => void;
}

/* One solid colour each, like the + itself: blue for a post, violet for a
   story, the logo's fire for a highlight. */
const COLOURS: Record<CreateChoice, string> = {
  post: '#2F6BFF',
  story: '#7A6CFF',
  highlight: '#FF7A2C',
};

const BUBBLE = 52;
const GAP = 12;

/**
 * The + menu: the page dims, the + turns into a ×, and three round buttons
 * fan up above it, each with a short label: Post, Story, Highlight. Tap one
 * to start it, or anywhere else to close.
 */
export function CreateMenu({ visible, frame, showHighlight, onPick, onClose, onDismiss }: Props) {
  const theme = useTheme();
  const t = useT();
  const reduced = useReducedMotion();
  const { width: screenWidth } = useWindowDimensions();

  const choices: { key: CreateChoice; label: string; hint: string; Icon: typeof Camera }[] = [
    { key: 'post', label: t('feed.createPost'), hint: t('feed.createPostHint'), Icon: SquarePen },
    { key: 'story', label: t('feed.createStory'), hint: t('feed.createStoryHint'), Icon: Camera },
    ...(showHighlight
      ? [{ key: 'highlight' as const, label: t('feed.createHighlight'), hint: t('feed.createHighlightHint'), Icon: Clapperboard }]
      : []),
  ];

  /* Bubbles rise one after another, nearest the + first. */
  const anims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (!visible) return;
    anims.forEach((a) => a.setValue(reduced ? 1 : 0));
    if (reduced) return;
    Animated.stagger(
      45,
      anims.map((a) =>
        Animated.spring(a, { toValue: 1, friction: 7, tension: 120, useNativeDriver: NATIVE_DRIVER }),
      ),
    ).start();
  }, [visible, reduced, anims]);

  if (!frame) return null;

  /* The column of bubbles is centred on the + and stands just above it:
     each row ends where the bubble's right edge lines up with the +'s centre
     plus half a bubble. */
  const rowRight = Math.max(8, screenWidth - (frame.x + frame.width / 2 + BUBBLE / 2));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={onDismiss}
      statusBarTranslucent
    >
      {/* A darker, blurred backdrop: the page fades out so only the three
          choices stand out. */}
      <BlurView
        intensity={theme.scheme === 'dark' ? 12 : 24}
        tint={theme.scheme === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Pressable
        onPress={onClose}
        accessible={false}
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.scheme === 'dark' ? 'rgba(22,19,39,0.45)' : 'rgba(22,19,39,0.55)' },
        ]}
        testID="create-menu-backdrop"
      />

      {/* The stack: Post nearest the +, then Story, then Highlight. */}
      {choices.map((choice, index) => {
        const anim = anims[index];
        const bottomOfBubble = frame.y - GAP - index * (BUBBLE + GAP);
        return (
          <Animated.View
            key={choice.key}
            style={{
              position: 'absolute',
              top: bottomOfBubble - BUBBLE,
              right: rowRight,
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16 + index * 10, 0] }) },
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              ],
            }}
          >
            <Pressable
              onPress={() => onPick(choice.key)}
              accessibilityRole="button"
              accessibilityLabel={`${choice.label}. ${choice.hint}`}
              testID={`create-${choice.key}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  /* Lifted off the backdrop: a fine light rim in dark mode and
                     a deeper shadow. */
                  borderWidth: theme.scheme === 'dark' ? 1 : 0,
                  borderColor: 'rgba(255,255,255,0.08)',
                  shadowColor: '#0A061E',
                  shadowOpacity: theme.scheme === 'dark' ? 0.6 : 0.25,
                  shadowRadius: theme.scheme === 'dark' ? 16 : 12,
                  shadowOffset: { width: 0, height: theme.scheme === 'dark' ? 10 : 6 },
                  elevation: theme.scheme === 'dark' ? 10 : 6,
                  maxWidth: 230,
                }}
              >
                <Text variant="bodyStrong" numberOfLines={1}>
                  {choice.label}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {choice.hint}
                </Text>
              </View>
              <View
                style={{
                  width: BUBBLE,
                  height: BUBBLE,
                  borderRadius: 17,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: COLOURS[choice.key],
                  shadowColor: COLOURS[choice.key],
                  shadowOpacity: 0.45,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 8,
                }}
              >
                {/* The same raised gloss as the + button. */}
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 0.6 }}
                  style={StyleSheet.absoluteFill}
                />
                <choice.Icon size={22} color="#FFFFFF" strokeWidth={2.3} />
              </View>
            </Pressable>
          </Animated.View>
        );
      })}

      {/* The + turned into a ×, in the same spot, to close. */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        testID="create-menu-close"
        style={({ pressed }) => ({
          position: 'absolute',
          top: frame.y,
          left: frame.x,
          width: frame.width,
          height: frame.height,
          borderRadius: frame.width / 2,
          backgroundColor: theme.colors.surfaceInverse,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <X size={22} color={theme.colors.textInverse} strokeWidth={2.6} />
      </Pressable>
    </Modal>
  );
}
