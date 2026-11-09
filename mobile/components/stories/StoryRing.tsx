import React from 'react';
import { StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/ThemeProvider';
import { LogoSplit } from '@/theme/tokens';

/**
 * The ring around a story avatar.
 *
 * Unseen: the logo's split, blue into fire like the A. Seen: a thin muted
 * line. None: no ring at all, the same footprint.
 */

export type RingState = 'unseen' | 'seen' | 'none';

interface Props {
  size: number;
  state: RingState;
  children: React.ReactNode;
  /** Ring thickness. */
  thickness?: number;
}

export function StoryRing({ size, state, children, thickness = 3 }: Props) {
  const theme = useTheme();

  const gap = 2;
  const inner = size - thickness * 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {state === 'unseen' ? (
        <LinearGradient
          pointerEvents="none"
          colors={LogoSplit.colors}
          locations={LogoSplit.locations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            ...StyleSheet.absoluteFill,
            borderRadius: size / 2,
          }}
        />
      ) : state === 'seen' ? (
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFill,
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: theme.colors.borderStrong,
          }}
        />
      ) : null}

      {/* The gap between ring and photo is the screen colour, which is what
          makes the ring read as a ring. */}
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: theme.colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: inner - gap * 2,
            height: inner - gap * 2,
            borderRadius: (inner - gap * 2) / 2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </View>
      </View>
    </View>
  );
}
