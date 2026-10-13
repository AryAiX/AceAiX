import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

/**
 * The attacking half of a football pitch, drawn to scale.
 *
 * Coordinates everywhere in Game Intelligence are fractions of this half:
 * x 0 → 1 across the width, y 0 at the opponent's goal line → 1 at halfway.
 * Proportions follow a 68 × 105 m pitch, so the penalty area is 16.5 m deep
 * (0.314 of the half) and 40.3 m wide (0.593 of the width).
 */
export const PITCH_ASPECT = 1.05; // height / width of the drawn half

export function Pitch({ width, children }: { width: number; children?: React.ReactNode }) {
  const w = width;
  const h = Math.round(width * PITCH_ASPECT);
  const line = 'rgba(255,255,255,0.85)';
  const sw = 2;
  const boxW = 0.593 * w;
  const boxH = 0.314 * h;
  const sixW = 0.269 * w;
  const sixH = 0.105 * h;
  const goalW = 0.108 * w;
  const arc = 0.135 * w;

  return (
    <View style={{ width: w, height: h, borderRadius: 18, overflow: 'hidden', backgroundColor: '#1E7B3B' }}>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Rect
            key={i}
            x={0}
            y={(i * h) / 7}
            width={w}
            height={h / 14}
            fill="rgba(255,255,255,0.045)"
          />
        ))}
        <Rect x={sw} y={sw} width={w - 2 * sw} height={h - 2 * sw} stroke={line} strokeWidth={sw} fill="none" />
        <Rect x={(w - boxW) / 2} y={sw} width={boxW} height={boxH} stroke={line} strokeWidth={sw} fill="none" />
        <Rect x={(w - sixW) / 2} y={sw} width={sixW} height={sixH} stroke={line} strokeWidth={sw} fill="none" />
        <Rect x={(w - goalW) / 2} y={0} width={goalW} height={6} fill="#FFFFFF" />
        <Circle cx={w / 2} cy={0.21 * h} r={2.5} fill={line} />
        <Path
          d={`M ${w / 2 - arc * 0.62} ${boxH} A ${arc} ${arc} 0 0 0 ${w / 2 + arc * 0.62} ${boxH}`}
          stroke={line}
          strokeWidth={sw}
          fill="none"
        />
        <Line x1={0} y1={h - sw} x2={w} y2={h - sw} stroke={line} strokeWidth={sw} />
        <Path
          d={`M ${w / 2 - arc} ${h} A ${arc} ${arc} 0 0 1 ${w / 2 + arc} ${h}`}
          stroke={line}
          strokeWidth={sw}
          fill="none"
        />
      </Svg>
      {children}
    </View>
  );
}
