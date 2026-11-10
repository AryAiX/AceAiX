import React from 'react';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

import { LogoColors } from '@/theme/tokens';

/* Index, middle, ring, little: centre x, top y, width. Slim and short. */
const FINGERS: readonly [number, number, number][] = [
  [18.6, 13.5, 4.0],
  [23.6, 10.5, 4.2],
  [28.5, 12.5, 4.0],
  [32.9, 16.5, 3.5],
];

function Hand({ fill, opacity }: { fill: string; opacity?: number }) {
  return (
    <G opacity={opacity}>
      {FINGERS.map(([x, top, w]) => (
        <Rect key={x} x={x - w / 2} y={top} width={w} height={31 - top} rx={w / 2} fill={fill} />
      ))}
      <Path d="M16.45 25h18.6v6.5c0 6-4 10.5-9.6 10.5h-1.3c-4.6 0-7.7-3-7.7-8z" fill={fill} />
      <Rect x={15} y={25} width={4.4} height={14} rx={2.2} fill={fill} transform="rotate(-40 17.2 38.5)" />
    </G>
  );
}

/**
 * A waving hand in the logo's amber, drawn in the same flat two-tone style as
 * the Discover shortcuts (a lighter left half, one white detail), with two
 * blue wave lines. Drawn here so it looks the same on every phone, unlike an emoji.
 */
export function WaveHand({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}>
      <Defs>
        <ClipPath id="wave-hand-left">
          <Rect x={0} y={0} width={25.8} height={48} />
        </ClipPath>
      </Defs>
      <G transform="rotate(-13 26 30)">
        <Hand fill={LogoColors.amber} />
        <G clipPath="url(#wave-hand-left)">
          <Hand fill="#FFE2A6" opacity={0.75} />
        </G>
        <Path d="M21.5 36.5q4.2 1.8 8.4 0" stroke="#FFFFFF" strokeWidth={1.3} fill="none" strokeLinecap="round" />
      </G>
      <Path d="M37.5 7.5a7 7 0 0 1 3.4 5.6" stroke={LogoColors.cobalt} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path
        d="M40.8 4a11 11 0 0 1 4.2 8.4"
        stroke={LogoColors.cobalt}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        opacity={0.5}
      />
    </Svg>
  );
}
