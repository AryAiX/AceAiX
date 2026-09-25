import React, { useEffect, useId, useRef } from 'react';
import { Animated, Easing, View, ViewStyle } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { NATIVE_DRIVER } from '@/lib/motion';
import { Text } from '@/components/ui';

/**
 * The drawn pieces the games are made of — shirts, a football, a goal, a
 * keeper, a chevron, a ripple.
 *
 * Colours here are pitch colours, not interface colours: grass, chalk, net and
 * kit read the same in light and dark mode, so they are fixed like the pitch
 * in `Pitch.tsx` rather than taken from the palette. Everything that is a
 * *signal* (lit, right, wrong, you) is passed in from the theme by the caller.
 */
export const PitchInk = {
  grass: '#1E7B3B',
  grassDark: '#17642F',
  chalk: 'rgba(255,255,255,0.85)',
  chalkSoft: 'rgba(255,255,255,0.35)',
  net: 'rgba(255,255,255,0.28)',
  shadow: 'rgba(0,0,0,0.28)',
  ink: '#14161A',
} as const;

/** Colons from `useId()` are not legal in a URL fragment (docs/20 §5). */
export function useSvgId(prefix: string): string {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/**
 * A value that runs 0 → 1 for ever, for the small looping demos and halos.
 * Under reduce-motion it sits still at `still` — a frame that still explains
 * the thing, not a blank.
 */
export function useLoop(periodMs: number, still = 0.6, active = true): Animated.Value {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(still)).current;
  useEffect(() => {
    if (reduced || !active) {
      v.setValue(still);
      return;
    }
    v.setValue(0);
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: periodMs,
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [v, periodMs, still, reduced, active]);
  return v;
}

/**
 * An expanding ring. `loop` repeats it (a target that wants a tap); without it
 * it plays once each time `trigger` changes (a hit). Nothing under
 * reduce-motion — the thing it rings is already lit.
 */
export function Ripple({
  color,
  size,
  loop = false,
  trigger,
  radius,
  period = 1100,
  width = 3,
  grow = 1.8,
  style,
}: {
  color: string;
  size: number;
  loop?: boolean;
  trigger?: unknown;
  radius?: number;
  period?: number;
  width?: number;
  /** How far it spreads, as a multiple of `size`. */
  grow?: number;
  style?: ViewStyle;
}) {
  const reduced = useReducedMotion();
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    p.setValue(0);
    const once = Animated.timing(p, {
      toValue: 1,
      duration: period,
      easing: Easing.out(Easing.quad),
      useNativeDriver: NATIVE_DRIVER,
    });
    const anim = loop ? Animated.loop(once) : once;
    anim.start();
    return () => anim.stop();
  }, [p, loop, period, reduced, trigger]);

  if (reduced) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: radius ?? size / 2,
          borderWidth: width,
          borderColor: color,
          opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
          transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, grow] }) }],
        },
        style,
      ]}
    />
  );
}

// ── A shirt ───────────────────────────────────────────────────────────────────
const SHIRT =
  'M8.2 2.2 L3.6 4.3 L0.8 9.4 L4.6 11.4 L6 9.9 L6 22.4 L18 22.4 L18 9.9 L19.4 11.4 L23.2 9.4 L20.4 4.3 L15.8 2.2 C14.8 4.4 9.2 4.4 8.2 2.2 Z';

/**
 * A player, top-down, as the shirt they wear — a number on it when they have
 * one. The shirt sits on a small shadow so it reads as standing on the grass.
 */
export function Jersey({
  size,
  fill,
  trim = '#FFFFFF',
  number,
  numberColor = '#FFFFFF',
}: {
  size: number;
  fill: string;
  trim?: string;
  number?: string | number;
  numberColor?: string;
}) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          bottom: -1,
          width: size * 0.8,
          height: size * 0.24,
          borderRadius: size,
          backgroundColor: PitchInk.shadow,
        }}
      />
      <Svg width={size} height={size} viewBox="0 0 24 24" style={{ position: 'absolute' }}>
        <Path d={SHIRT} fill={fill} stroke={trim} strokeWidth={1.4} strokeLinejoin="round" />
      </Svg>
      {number != null ? (
        <Text
          style={{
            fontSize: Math.round(size * 0.36),
            lineHeight: Math.round(size * 0.42),
            fontWeight: '800',
            color: numberColor,
            marginTop: size * 0.18,
          }}
        >
          {String(number)}
        </Text>
      ) : null}
    </View>
  );
}

// ── A football ────────────────────────────────────────────────────────────────
function pentagon(cx: number, cy: number, r: number, rot: number): string {
  return Array.from({ length: 5 }, (_, k) => {
    const a = ((rot + k * 72 - 90) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

/** A football with the classic pentagon pattern, in any colour. */
export function Football({
  size,
  fill = '#FFFFFF',
  patch = PitchInk.ink,
  stroke = PitchInk.ink,
}: {
  size: number;
  fill?: string;
  patch?: string;
  stroke?: string;
}) {
  const clip = useSvgId('ball');
  const c = 50;
  const R = 47;
  const inner = pentagon(c, c, 17, 0);
  const seams = Array.from({ length: 5 }, (_, k) => {
    const a = ((k * 72 - 90) * Math.PI) / 180;
    return {
      x1: c + 17 * Math.cos(a),
      y1: c + 17 * Math.sin(a),
      x2: c + 33 * Math.cos(a),
      y2: c + 33 * Math.sin(a),
    };
  });
  const outer = Array.from({ length: 5 }, (_, k) => {
    const a = ((k * 72 - 90) * Math.PI) / 180;
    return pentagon(c + 47 * Math.cos(a), c + 47 * Math.sin(a), 16, k * 72 + 36);
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={clip}>
          <Circle cx={c} cy={c} r={R} />
        </ClipPath>
      </Defs>
      <Circle cx={c} cy={c} r={R} fill={fill} />
      <G clipPath={`url(#${clip})`}>
        <Polygon points={inner} fill={patch} />
        {seams.map((s, i) => (
          <Line key={`s${i}`} {...s} stroke={patch} strokeWidth={3} />
        ))}
        {outer.map((pts, i) => (
          <Polygon key={`o${i}`} points={pts} fill={patch} />
        ))}
        <Circle cx={c - 16} cy={c - 20} r={12} fill="rgba(255,255,255,0.12)" />
      </G>
      <Circle cx={c} cy={c} r={R} fill="none" stroke={stroke} strokeWidth={4} />
    </Svg>
  );
}

// ── A goal, front on ──────────────────────────────────────────────────────────
/**
 * Posts, crossbar and a diamond net, seen from the penalty spot. Decoration:
 * whatever sits on top of it (the four targets in Quick Hands) is the hit area.
 */
export function GoalFront({ width, height, post = 8 }: { width: number; height: number; post?: number }) {
  const step = 16;
  const lines: React.ReactNode[] = [];
  for (let d = -height; d < width + height; d += step) {
    lines.push(
      <Line key={`a${d}`} x1={d} y1={0} x2={d + height} y2={height} stroke={PitchInk.net} strokeWidth={1} />,
      <Line key={`b${d}`} x1={d + height} y1={0} x2={d} y2={height} stroke={PitchInk.net} strokeWidth={1} />,
    );
  }
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Rect x={0} y={0} width={width} height={height} fill="rgba(0,0,0,0.18)" />
      {lines}
      {/* Posts and bar: a shadowed white frame. */}
      <Rect x={2} y={2} width={post} height={height} fill={PitchInk.shadow} />
      <Rect x={width - post + 2} y={2} width={post} height={height} fill={PitchInk.shadow} />
      <Rect x={0} y={0} width={post} height={height} rx={2} fill="#FFFFFF" />
      <Rect x={width - post} y={0} width={post} height={height} rx={2} fill="#FFFFFF" />
      <Rect x={0} y={0} width={width} height={post} rx={2} fill="#FFFFFF" />
    </Svg>
  );
}

// ── A goal, top down ──────────────────────────────────────────────────────────
/**
 * The goal as seen from above the pitch: net depth behind the line, two posts
 * on it. `top` is where the goal line sits.
 */
export function GoalTop({ x, width, depth }: { x: number; width: number; depth: number }) {
  const cells = Math.max(4, Math.round(width / 12));
  return (
    <Svg width={width + 12} height={depth + 8} style={{ position: 'absolute', left: x - 6, top: 0 }}>
      <Rect x={6} y={0} width={width} height={depth} fill="rgba(255,255,255,0.12)" />
      {Array.from({ length: cells + 1 }, (_, i) => (
        <Line
          key={`v${i}`}
          x1={6 + (i * width) / cells}
          y1={0}
          x2={6 + (i * width) / cells}
          y2={depth}
          stroke={PitchInk.net}
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <Line
          key={`h${i}`}
          x1={6}
          y1={((i + 1) * depth) / 4}
          x2={6 + width}
          y2={((i + 1) * depth) / 4}
          stroke={PitchInk.net}
          strokeWidth={1}
        />
      ))}
      <Rect x={6} y={depth - 3} width={width} height={4} fill="#FFFFFF" />
      <Circle cx={6} cy={depth - 1} r={5} fill="#FFFFFF" stroke={PitchInk.ink} strokeWidth={1.5} />
      <Circle cx={6 + width} cy={depth - 1} r={5} fill="#FFFFFF" stroke={PitchInk.ink} strokeWidth={1.5} />
    </Svg>
  );
}

// ── A keeper ──────────────────────────────────────────────────────────────────
/** A goalkeeper, arms out, gloves on. Drawn from the front, `size` tall. */
export function Keeper({ size, kit, glove }: { size: number; kit: string; glove: string }) {
  return (
    <Svg width={size * 1.3} height={size} viewBox="0 0 52 40">
      <Path d="M8 14 L20 17" stroke={kit} strokeWidth={5} strokeLinecap="round" />
      <Path d="M44 14 L32 17" stroke={kit} strokeWidth={5} strokeLinecap="round" />
      <Circle cx={6} cy={13} r={4.2} fill={glove} stroke={PitchInk.ink} strokeWidth={1.2} />
      <Circle cx={46} cy={13} r={4.2} fill={glove} stroke={PitchInk.ink} strokeWidth={1.2} />
      <Rect x={18} y={13} width={16} height={16} rx={5} fill={kit} stroke={PitchInk.ink} strokeWidth={1.2} />
      <Path d="M21 29 L20 38" stroke={PitchInk.ink} strokeWidth={4} strokeLinecap="round" />
      <Path d="M31 29 L32 38" stroke={PitchInk.ink} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={26} cy={7} r={5.5} fill="#F2C9A0" stroke={PitchInk.ink} strokeWidth={1.2} />
    </Svg>
  );
}

// ── A chevron ─────────────────────────────────────────────────────────────────
/** A bold chevron arrow: ‹ or ›, with a shaft so it reads as an arrow. */
export function Chevron({
  dir,
  size,
  color,
  weight = 14,
}: {
  dir: 'left' | 'right';
  size: number;
  color: string;
  weight?: number;
}) {
  const d = dir === 'right' ? 'M 40 18 L 74 50 L 40 82 M 22 50 L 72 50' : 'M 60 18 L 26 50 L 60 82 M 78 50 L 28 50';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d={d} stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// ── A medal ───────────────────────────────────────────────────────────────────
/** A medal on a ribbon: the result of one game. `color` is the tier's hue. */
export function Medal({ size, color, accent }: { size: number; color: string; accent: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 48 48" style={{ position: 'absolute' }}>
        <Path d="M14 2 L22 20 L18 22 L10 4 Z" fill={accent} />
        <Path d="M34 2 L26 20 L30 22 L38 4 Z" fill={accent} />
        <Circle cx={24} cy={30} r={15} fill={color} stroke="#FFFFFF" strokeWidth={2.5} />
        <Circle cx={24} cy={30} r={10.5} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
        <Path d="M24 23.5 L25.9 27.6 L30.3 28 L27 31 L28 35.4 L24 33.1 L20 35.4 L21 31 L17.7 28 L22.1 27.6 Z" fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

// ── A stop sign ───────────────────────────────────────────────────────────────
/** The red octagon of Go / Stop — never a ball, so the two can't be confused. */
export function StopSign({ size, color, label }: { size: number; color: string; label: string }) {
  const pts = Array.from({ length: 8 }, (_, k) => {
    const a = ((k * 45 + 22.5) * Math.PI) / 180;
    return `${(50 + 47 * Math.cos(a)).toFixed(2)},${(50 + 47 * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  const inner = Array.from({ length: 8 }, (_, k) => {
    const a = ((k * 45 + 22.5) * Math.PI) / 180;
    return `${(50 + 40 * Math.cos(a)).toFixed(2)},${(50 + 40 * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        <Polygon points={pts} fill={color} />
        <Polygon points={inner} fill="none" stroke="#FFFFFF" strokeWidth={4} />
      </Svg>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          color: '#FFFFFF',
          fontWeight: '900',
          fontSize: Math.round(size * 0.22),
          letterSpacing: 1,
          maxWidth: size * 0.7,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
