import React from 'react';
import { Circle, G } from 'react-native-svg';

import { sweepAt } from '@/theme/tokens';

/**
 * A ring's filled arc in the logo's sweep: drawn as one short slice per
 * percent, each in its own colour, so the arc runs from blue at the top and
 * warms as it goes round, like a conic gradient (which SVG does not have).
 * Goes inside an <Svg>; the track behind it is the caller's.
 */
export function SweepArc({
  size,
  strokeWidth,
  percent,
}: {
  size: number;
  strokeWidth: number;
  /** 0–100. */
  percent: number;
}) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  if (p === 0) return null;
  const c = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const slice = circumference / 100;
  const at = (pct: number) => {
    const a = ((pct / 100) * 360 - 90) * (Math.PI / 180);
    return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
  };
  const start = at(0);
  const end = at(p);

  return (
    <G>
      {Array.from({ length: p }, (_, i) => (
        <Circle
          key={i}
          cx={c}
          cy={c}
          r={r}
          stroke={sweepAt((i + 0.5) / 100)}
          strokeWidth={strokeWidth}
          fill="none"
          /* A hair longer than a slice, so neighbours overlap with no seam. */
          strokeDasharray={`${slice + 0.8} ${circumference}`}
          strokeDashoffset={-slice * i}
          transform={`rotate(-90 ${c} ${c})`}
        />
      ))}
      {/* Round ends. */}
      <Circle cx={start.x} cy={start.y} r={strokeWidth / 2} fill={sweepAt(0)} />
      <Circle cx={end.x} cy={end.y} r={strokeWidth / 2} fill={sweepAt(p / 100)} />
    </G>
  );
}
