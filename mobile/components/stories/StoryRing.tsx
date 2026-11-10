import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { StorySweep } from '@/theme/tokens';

/**
 * The ring around a story avatar.
 *
 * Unseen: a sweep around the circle, fire into a touch of yellow, then deep
 * purple brightening to sky blue (StorySweep). Seen: a thin muted line.
 * None: no ring at all, the same footprint.
 */

/* The sweep is drawn as short arcs, each one colour. 4° each, so the hard
   yellow-to-purple join (at 225°) falls exactly on an arc boundary. */
const STEP = 4;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function colourAt(angle: number): string {
  for (let i = 0; i < StorySweep.length - 1; i++) {
    const [a0, c0] = StorySweep[i];
    const [a1, c1] = StorySweep[i + 1];
    if (angle >= a0 && angle < a1) {
      const f = a1 === a0 ? 0 : (angle - a0) / (a1 - a0);
      const p = hexToRgb(c0);
      const q = hexToRgb(c1);
      const mix = p.map((v, k) => Math.round(v + (q[k] - v) * f));
      return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
    }
  }
  return StorySweep[StorySweep.length - 1][1];
}

const START = StorySweep[0][0];
const SEGMENTS = Array.from({ length: 360 / STEP }, (_, i) => {
  const from = START + i * STEP;
  return { from, to: from + STEP, colour: colourAt(from + STEP / 2) };
});

function arc(c: number, r: number, from: number, to: number): string {
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const x0 = c + r * Math.cos(rad(from));
  const y0 = c + r * Math.sin(rad(from));
  const x1 = c + r * Math.cos(rad(to));
  const y1 = c + r * Math.sin(rad(to));
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

function SweepRing({ size, thickness }: { size: number; thickness: number }) {
  const paths = useMemo(() => {
    const c = size / 2;
    const r = c - thickness / 2;
    /* Each arc runs half a degree into the next so no hairline shows. */
    return SEGMENTS.map((s) => ({ d: arc(c, r, s.from, s.to + 0.5), colour: s.colour }));
  }, [size, thickness]);
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
      {paths.map((p, i) => (
        <Path key={i} d={p.d} stroke={p.colour} strokeWidth={thickness} fill="none" />
      ))}
    </Svg>
  );
}

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
        <SweepRing size={size} thickness={thickness + 0.5} />
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
