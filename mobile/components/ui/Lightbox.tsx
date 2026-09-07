import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { huePair } from '@/theme/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import { Text } from './Text';

interface Props {
  visible: boolean;
  uri: string | null;
  /** Shown under the picture — usually whose photo it is. */
  caption?: string | null;
  onClose: () => void;
}

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Tap a photo, see the photo.
 *
 * The profile picture was a 88pt circle and that was the only size it had. On a
 * network where the picture *is* the introduction, being unable to look at
 * someone properly is a real gap — so any avatar can now open into this.
 *
 * It shows the image square and uncropped, because the circle is a frame we
 * impose and not how the person took the photo.
 */
export function Lightbox({ visible, uri, caption, onClose }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();

  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      enter.setValue(0);
      return;
    }
    if (reduced) {
      enter.setValue(1);
      return;
    }
    Animated.spring(enter, {
      toValue: 1,
      useNativeDriver: true,
      speed: 16,
      bounciness: 5,
    }).start();
  }, [enter, reduced, visible]);

  /* Android's back gesture should close the viewer, not the screen behind it. */
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose, visible]);

  const dismiss = useCallback(() => {
    if (reduced) {
      onClose();
      return;
    }
    Animated.timing(enter, {
      toValue: 0,
      duration: 160,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [enter, onClose, reduced]);

  /*
   * No photo is still something to look at. Most accounts in a young network
   * have not uploaded one, and returning null here would make the tap do
   * nothing at all on exactly those profiles — the monogram opens instead, in
   * the person's own colour, at the size the photo would have been.
   */
  const side = Math.min(width - spacing.xl * 2, height * 0.62);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(6,5,14,0.94)',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: enter,
          },
        ]}
      >
        {/* Anywhere outside the picture closes it. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={dismiss}
        />

        <Animated.View
          style={{
            alignItems: 'center',
            gap: spacing.lg,
            transform: [
              { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
            ],
          }}
          pointerEvents="box-none"
        >
          {uri ? (
            <Image
              source={{ uri }}
              style={{
                width: side,
                height: side,
                borderRadius: radii.xxl,
                backgroundColor: colors.surfaceAlt,
              }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
              testID="lightbox-image"
            />
          ) : (
            <View
              style={{
                width: side,
                height: side,
                borderRadius: radii.xxl,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              testID="lightbox-image"
            >
              <LinearGradient
                colors={huePair(caption)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View>
                <Text variant="hero" color="#FFFFFF">
                  {initials(caption)}
                </Text>
              </View>
            </View>
          )}
          {caption ? (
            <Text variant="bodyStrong" color="#FFFFFF" align="center">
              {caption}
            </Text>
          ) : null}
        </Animated.View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={dismiss}
          hitSlop={12}
          testID="lightbox-close"
          style={({ pressed }) => ({
            position: 'absolute',
            top: spacing.giant,
            right: spacing.xl,
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.14)',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <X size={22} color="#FFFFFF" strokeWidth={2.4} />
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
