import React from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import {
  ArrowLeftRight,
  Check,
  CircleCheck,
  Crosshair,
  Eye,
  EyeOff,
  Goal,
  Hourglass,
  MousePointerClick,
  Move,
  OctagonX,
  Pointer,
  ScanEye,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { alpha } from '@/theme/tokens';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { giTest, type GiTestKey } from '@/lib/gi/catalogue';
import { Chevron, Football, GoalFront, GoalTop, Jersey, Keeper, PitchInk, StopSign, useLoop } from './art';

/**
 * "How to play", shown on every game's intro card: a small looping demo of the
 * mechanic — something lights, a finger taps it — and three short bullets.
 *
 * Every demo is driven by one 0 → 1 value and interpolates its whole scene
 * from it, so a demo is a single animation, and under reduce-motion it is one
 * still frame chosen to show the moment that matters (`STILL`).
 */

const W = 260;
const H = 150;
const PERIOD = 3200;

type P = Animated.Value;

const iv = (p: P, input: number[], output: number[]) =>
  p.interpolate({ inputRange: input, outputRange: output, extrapolate: 'clamp' });

/** The frame each demo freezes on under reduce-motion. */
const STILL: Record<GiTestKey, number> = {
  pitch_decision: 0.62,
  anticipation: 0.8,
  tracking: 0.82,
  go_no_go: 0.24,
  flanker: 0.56,
  reaction: 0.56,
};

export function HowToPlay({ test }: { test: GiTestKey }) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const info = giTest(test)!;
  const hue = colors.play[info.hue];
  const p = useLoop(PERIOD, STILL[test]);
  const stem = `intelligence.tests.${info.i18n}`;
  const icons = BULLET_ICONS[test];

  return (
    <View style={{ alignSelf: 'stretch', gap: spacing.md }} testID="gi-howto">
      <Text variant="overline" tone="muted" style={{ textAlign: 'center' }}>
        {t('intelligence.howTitle')}
      </Text>
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{
          alignSelf: 'center',
          width: W,
          height: H,
          borderRadius: radii.lg,
          overflow: 'hidden',
          backgroundColor: SURFACE_GRASS[test] ? PitchInk.grass : alpha(hue, 0.1),
          borderWidth: SURFACE_GRASS[test] ? 0 : 1,
          borderColor: alpha(hue, 0.25),
        }}
      >
        <Scene test={test} p={p} hue={hue} />
      </View>
      <View style={{ gap: spacing.sm }}>
        {icons.map((Icon, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: alpha(hue, 0.14),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={17} color={hue} strokeWidth={2.4} />
            </View>
            <Text variant="body" style={{ flex: 1 }}>
              {t(`${stem}.step${i + 1}`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const SURFACE_GRASS: Record<GiTestKey, boolean> = {
  pitch_decision: true,
  anticipation: true,
  tracking: true,
  go_no_go: false,
  flanker: false,
  reaction: true,
};

const BULLET_ICONS: Record<GiTestKey, (typeof Eye)[]> = {
  pitch_decision: [Eye, Timer, MousePointerClick],
  anticipation: [Eye, EyeOff, Crosshair],
  tracking: [Sparkles, Move, MousePointerClick],
  go_no_go: [CircleCheck, OctagonX, Zap],
  flanker: [ScanEye, ArrowLeftRight, EyeOff],
  reaction: [Goal, Zap, Hourglass],
};

function Scene({ test, p, hue }: { test: GiTestKey; p: P; hue: string }) {
  switch (test) {
    case 'pitch_decision':
      return <PitchDemo p={p} hue={hue} />;
    case 'anticipation':
      return <AnticipationDemo p={p} hue={hue} />;
    case 'tracking':
      return <TrackingDemo p={p} hue={hue} />;
    case 'go_no_go':
      return <GoNoGoDemo p={p} />;
    case 'flanker':
      return <FlankerDemo p={p} hue={hue} />;
    case 'reaction':
      return <ReactionDemo p={p} hue={hue} />;
  }
}

// ── Shared bits ──────────────────────────────────────────────────────────────
/**
 * The finger. `xs`/`ys` are keyframes at `input`; it dips while `press`
 * (a [start, end] window) is on.
 */
function Finger({
  p,
  input,
  xs,
  ys,
  press,
}: {
  p: P;
  input: number[];
  xs: number[];
  ys: number[];
  press: [number, number];
}) {
  const size = 30;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: [
          // The fingertip, not the icon's corner, lands on the keyframe.
          { translateX: iv(p, input, xs.map((x) => x - size * 0.4)) },
          { translateY: iv(p, input, ys.map((y) => y - 2)) },
          { scale: iv(p, [press[0] - 0.04, press[0], press[1], press[1] + 0.04], [1, 0.82, 0.82, 1]) },
        ],
      }}
    >
      <Pointer size={size} color={PitchInk.ink} fill="#FFFFFF" strokeWidth={1.6} />
    </Animated.View>
  );
}

/** A ring that bursts where the finger lands, at `at`. */
function TapRing({ p, at, x, y, color, size = 36 }: { p: P; at: number; x: number; y: number; color: string; size?: number }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: color,
        opacity: iv(p, [at - 0.01, at, at + 0.14], [0, 0.95, 0]),
        transform: [{ scale: iv(p, [at, at + 0.14], [0.5, 1.6]) }],
      }}
    />
  );
}

function Pos({ x, y, size, children, style }: { x: number; y: number; size: number; children: React.ReactNode; style?: object }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }, style]}
    >
      {children}
    </Animated.View>
  );
}

// ── Pitch Decision ───────────────────────────────────────────────────────────
function PitchDemo({ p, hue }: { p: P; hue: string }) {
  const { colors } = useTheme();
  const you = { x: 78, y: 110 };
  const mate0 = { x: 196, y: 112 };
  const mate = { x: 204, y: 44 };
  const J = 30;
  return (
    <>
      <Svg width={W} height={H} style={{ position: 'absolute' }}>
        <Rect x={3} y={3} width={W - 6} height={H - 6} stroke={PitchInk.chalkSoft} strokeWidth={2} fill="none" />
        <Rect x={W * 0.25} y={3} width={W * 0.5} height={36} stroke={PitchInk.chalkSoft} strokeWidth={2} fill="none" />
        <Line x1={mate0.x} y1={mate0.y} x2={mate.x} y2={mate.y} stroke={PitchInk.chalkSoft} strokeWidth={2} strokeDasharray="2 5" />
      </Svg>
      {/* The pass lane appears when the play freezes. */}
      <Animated.View style={{ position: 'absolute', opacity: iv(p, [0.36, 0.42, 0.92, 0.98], [0, 1, 1, 0]) }}>
        <Svg width={W} height={H}>
          <Line x1={you.x} y1={you.y} x2={mate.x} y2={mate.y} stroke="#FFFFFF" strokeWidth={2.5} strokeDasharray="7 6" />
        </Svg>
      </Animated.View>
      <Pos x={150} y={122} size={J} style={{ transform: [{ translateX: iv(p, [0, 0.36], [-14, 0]) }] }}>
        <Jersey size={J} fill={colors.danger} />
      </Pos>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: [
            { translateX: iv(p, [0, 0.36], [mate0.x - J / 2, mate.x - J / 2]) },
            { translateY: iv(p, [0, 0.36], [mate0.y - J / 2, mate.y - J / 2]) },
          ],
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            left: -6,
            top: -6,
            width: J + 12,
            height: J + 12,
            borderRadius: (J + 12) / 2,
            borderWidth: 2.5,
            borderColor: '#FFFFFF',
            opacity: iv(p, [0.38, 0.44, 0.9, 0.96], [0, 1, 1, 0]),
          }}
        />
        <Jersey size={J} fill={colors.play.azure} number={9} />
      </Animated.View>
      <Pos x={you.x} y={you.y} size={J}>
        <Jersey size={J} fill={hue} number={10} />
      </Pos>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: [
            { translateX: iv(p, [0.66, 0.8], [you.x + 8, mate.x - 4]) },
            { translateY: iv(p, [0.66, 0.8], [you.y + 6, mate.y + 10]) },
          ],
        }}
      >
        <Football size={13} />
      </Animated.View>
      <TapRing p={p} at={0.62} x={mate.x} y={mate.y} color="#FFFFFF" size={44} />
      <Finger p={p} input={[0.42, 0.58, 0.72, 0.9]} xs={[150, mate.x, mate.x, 170]} ys={[190, mate.y, mate.y, 190]} press={[0.6, 0.66]} />
    </>
  );
}

// ── Read the Ball ────────────────────────────────────────────────────────────
function curve(q: number) {
  // A quadratic from the launch to the goal line, like `ballAt`.
  const s = { x: 70, y: 140 };
  const c = { x: 215, y: 80 };
  const e = { x: 150, y: 14 };
  return {
    x: (1 - q) * (1 - q) * s.x + 2 * (1 - q) * q * c.x + q * q * e.x,
    y: (1 - q) * (1 - q) * s.y + 2 * (1 - q) * q * c.y + q * q * e.y,
  };
}

function AnticipationDemo({ p, hue }: { p: P; hue: string }) {
  const { colors } = useTheme();
  const VIS = 0.55; // share of the flight shown
  const qs = [0, 0.1, 0.2, 0.3, 0.4, 0.5, VIS];
  const pts = qs.map(curve);
  const input = qs.map((q) => (q / VIS) * 0.4);
  const seen = Array.from({ length: 12 }, (_, i) => curve((i / 11) * VIS));
  const rest = Array.from({ length: 10 }, (_, i) => curve(VIS + (i / 9) * (1 - VIS)));
  const guessX = 140;
  return (
    <>
      <GoalTop x={W / 2 - 50} width={100} depth={14} />
      <Svg width={W} height={H} style={{ position: 'absolute' }}>
        <Line x1={0} y1={14} x2={W} y2={14} stroke="#FFFFFF" strokeWidth={2} />
      </Svg>
      <Pos x={W / 2} y={30} size={34}>
        <Keeper size={26} kit={colors.play.amber} glove={colors.play.lime} />
      </Pos>
      {/* The dotted trail of what was seen. */}
      <Animated.View style={{ position: 'absolute', opacity: iv(p, [0, 0.1, 0.95, 1], [0, 1, 1, 0]) }}>
        <Svg width={W} height={H}>
          {seen.map((pt, i) => (
            <Circle key={i} cx={pt.x} cy={pt.y} r={2.2} fill="rgba(255,255,255,0.7)" />
          ))}
        </Svg>
      </Animated.View>
      {/* The rest of the flight, drawn on reveal. */}
      <Animated.View style={{ position: 'absolute', opacity: iv(p, [0.72, 0.78, 0.95, 1], [0, 1, 1, 0]) }}>
        <Svg width={W} height={H}>
          <Path
            d={`M ${rest.map((r) => `${r.x.toFixed(1)} ${r.y.toFixed(1)}`).join(' L ')}`}
            stroke={colors.play.lime}
            strokeWidth={2.5}
            strokeDasharray="5 5"
            fill="none"
          />
          <Circle cx={rest[rest.length - 1].x} cy={14} r={6} fill={colors.play.lime} />
        </Svg>
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          opacity: iv(p, [0, 0.02, 0.4, 0.42], [0, 1, 1, 0]),
          transform: [
            { translateX: iv(p, input, pts.map((q) => q.x - 9)) },
            { translateY: iv(p, input, pts.map((q) => q.y - 9)) },
          ],
        }}
      >
        <Football size={18} />
      </Animated.View>
      <Pos x={guessX} y={14} size={14} style={{ opacity: iv(p, [0.6, 0.62, 0.95, 1], [0, 1, 1, 0]) }}>
        <View style={{ flex: 1, borderRadius: 7, backgroundColor: hue, borderWidth: 2, borderColor: '#FFFFFF' }} />
      </Pos>
      <TapRing p={p} at={0.6} x={guessX} y={14} color="#FFFFFF" />
      <Finger p={p} input={[0.42, 0.56, 0.66, 0.8]} xs={[200, guessX, guessX, 210]} ys={[180, 14, 14, 180]} press={[0.58, 0.63]} />
    </>
  );
}

// ── Track the Runners ────────────────────────────────────────────────────────
const RUNNERS = [
  { xs: [60, 140, 190], ys: [40, 100, 60], target: true },
  { xs: [120, 70, 110], ys: [40, 90, 118], target: false },
  { xs: [190, 200, 70], ys: [110, 40, 50], target: true },
  { xs: [200, 110, 150], ys: [60, 120, 110], target: false },
];

function TrackingDemo({ p, hue }: { p: P; hue: string }) {
  const { colors } = useTheme();
  const J = 28;
  const move = [0.22, 0.46, 0.68];
  return (
    <>
      <Svg width={W} height={H} style={{ position: 'absolute' }}>
        <Line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke={PitchInk.chalkSoft} strokeWidth={2} />
        <Circle cx={W / 2} cy={H / 2} r={30} stroke={PitchInk.chalkSoft} strokeWidth={2} fill="none" />
      </Svg>
      {RUNNERS.map((r, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: [
              { translateX: iv(p, move, r.xs.map((x) => x - J / 2)) },
              { translateY: iv(p, move, r.ys.map((y) => y - J / 2)) },
            ],
          }}
        >
          {r.target ? (
            <Animated.View
              style={{
                position: 'absolute',
                left: -6,
                top: -6,
                width: J + 12,
                height: J + 12,
                borderRadius: (J + 12) / 2,
                borderWidth: 3,
                borderColor: colors.play.amber,
                opacity: iv(p, [0, 0.04, 0.2, 0.24], [0, 1, 1, 0]),
              }}
            />
          ) : null}
          <Jersey size={J} fill={colors.play.azure} />
          {r.target ? (
            <Animated.View
              style={{
                position: 'absolute',
                right: -6,
                top: -6,
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: colors.success,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: iv(p, i === 0 ? [0.76, 0.78, 0.96, 1] : [0.88, 0.9, 0.96, 1], [0, 1, 1, 0]),
              }}
            >
              <Check size={11} color="#FFFFFF" strokeWidth={4} />
            </Animated.View>
          ) : null}
        </Animated.View>
      ))}
      <Finger
        p={p}
        input={[0.68, 0.75, 0.8, 0.86, 0.92, 1]}
        xs={[150, 190, 190, 70, 70, 120]}
        ys={[190, 60, 60, 50, 50, 190]}
        press={[0.76, 0.8]}
      />
      <TapRing p={p} at={0.76} x={190} y={60} color={hue} />
      <TapRing p={p} at={0.88} x={70} y={50} color={hue} />
    </>
  );
}

// ── Go / Stop ────────────────────────────────────────────────────────────────
function GoNoGoDemo({ p }: { p: P }) {
  const { colors } = useTheme();
  const t = useT();
  return (
    <>
      <Pos
        x={W / 2}
        y={H / 2}
        size={78}
        style={{
          opacity: iv(p, [0.02, 0.06, 0.4, 0.44], [0, 1, 1, 0]),
          transform: [{ scale: iv(p, [0.02, 0.08], [0.6, 1]) }],
        }}
      >
        <Football size={78} fill={colors.play.mint} patch="#0A7F5F" stroke="#0A7F5F" />
      </Pos>
      <TapRing p={p} at={0.22} x={W / 2} y={H / 2} color={colors.play.mint} size={80} />
      <Pos
        x={W / 2}
        y={H / 2}
        size={82}
        style={{
          opacity: iv(p, [0.46, 0.5, 0.92, 0.96], [0, 1, 1, 0]),
          transform: [{ scale: iv(p, [0.46, 0.52], [0.6, 1]) }],
        }}
      >
        <StopSign size={82} color={colors.danger} label={t('intelligence.tests.goNoGo.stopSign')} />
      </Pos>
      {/* The finger taps the green ball, then hangs back from the red sign. */}
      <Finger
        p={p}
        input={[0.08, 0.2, 0.26, 0.4, 0.58, 0.7, 0.9]}
        xs={[190, W / 2 + 10, W / 2 + 10, 210, 200, 214, 200]}
        ys={[190, H / 2, H / 2, 140, 132, 140, 190]}
        press={[0.2, 0.25]}
      />
    </>
  );
}

// ── Focus Arrows ─────────────────────────────────────────────────────────────
function FlankerDemo({ p, hue }: { p: P; hue: string }) {
  const { colors } = useTheme();
  const dirs: ('left' | 'right')[] = ['left', 'left', 'right', 'left', 'left'];
  return (
    <>
      <View
        style={{
          position: 'absolute',
          top: 22,
          left: 12,
          right: 12,
          height: 64,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        {dirs.map((d, i) =>
          i === 2 ? (
            <Animated.View
              key={i}
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: alpha(hue, 0.22),
                borderWidth: 2,
                borderColor: hue,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: iv(p, [0, 0.2, 0.35, 0.5], [1, 1.1, 1, 1.08]) }],
              }}
            >
              <Chevron dir={d} size={44} color={colors.text} weight={15} />
            </Animated.View>
          ) : (
            <View key={i} style={{ opacity: 0.45 }}>
              <Chevron dir={d} size={34} color={colors.textSecondary} weight={13} />
            </View>
          ),
        )}
      </View>
      <View style={{ position: 'absolute', left: 30, right: 30, bottom: 14, flexDirection: 'row', gap: 12 }}>
        <View
          style={{
            flex: 1,
            height: 34,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Chevron dir="left" size={22} color={colors.textSecondary} weight={14} />
        </View>
        <View style={{ flex: 1, height: 34 }}>
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              borderRadius: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              borderRadius: 12,
              backgroundColor: colors.success,
              opacity: iv(p, [0.54, 0.56, 0.74, 0.8], [0, 1, 1, 0]),
            }}
          />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Chevron dir="right" size={22} color={colors.text} weight={14} />
          </View>
        </View>
      </View>
      <Finger
        p={p}
        input={[0.3, 0.5, 0.62, 0.8]}
        xs={[220, 180, 180, 230]}
        ys={[190, 118, 118, 190]}
        press={[0.52, 0.58]}
      />
    </>
  );
}

// ── Quick Hands ──────────────────────────────────────────────────────────────
function ReactionDemo({ p, hue }: { p: P; hue: string }) {
  const { colors } = useTheme();
  const gw = 200;
  const gh = 110;
  const gx = (W - gw) / 2;
  const gy = 18;
  const corners = [
    { x: gx + 34, y: gy + 32 },
    { x: gx + gw - 34, y: gy + 32 },
    { x: gx + 34, y: gy + gh - 26 },
    { x: gx + gw - 34, y: gy + gh - 26 },
  ];
  const lit = 1;
  return (
    <>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H - gy - gh + 4, backgroundColor: PitchInk.grassDark }} />
      <View style={{ position: 'absolute', left: gx, top: gy, width: gw, height: gh }}>
        <GoalFront width={gw} height={gh} post={6} />
      </View>
      {corners.map((c, i) => (
        <Pos key={i} x={c.x} y={c.y} size={28}>
          <View style={{ flex: 1, borderRadius: 14, borderWidth: 2, borderColor: PitchInk.chalkSoft }} />
          {i === lit ? (
            <Animated.View
              style={{
                position: 'absolute',
                left: -6,
                top: -6,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: hue,
                borderWidth: 3,
                borderColor: colors.play.cyan,
                opacity: iv(p, [0.22, 0.24, 0.6, 0.62], [0, 1, 1, 0]),
              }}
            />
          ) : null}
        </Pos>
      ))}
      <TapRing p={p} at={0.3} x={corners[lit].x} y={corners[lit].y} color={colors.play.cyan} size={40} />
      <TapRing p={p} at={0.6} x={corners[lit].x} y={corners[lit].y} color="#FFFFFF" size={44} />
      <Finger
        p={p}
        input={[0.3, 0.52, 0.66, 0.84]}
        xs={[W / 2, corners[lit].x, corners[lit].x, W / 2 + 20]}
        ys={[190, corners[lit].y, corners[lit].y, 190]}
        press={[0.56, 0.62]}
      />
    </>
  );
}
