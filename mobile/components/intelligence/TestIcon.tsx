import React from 'react';
import { View } from 'react-native';
import { ArrowLeftRight, Crosshair, Goal, Hand, Radar, Zap } from 'lucide-react-native';

import { alpha } from '@/theme/tokens';
import type { GiTestKey } from '@/lib/gi/catalogue';

const ICONS: Record<GiTestKey, typeof Goal> = {
  pitch_decision: Goal,
  anticipation: Crosshair,
  tracking: Radar,
  go_no_go: Hand,
  flanker: ArrowLeftRight,
  reaction: Zap,
};

/** The game's icon on a soft tile of its own hue. */
export function TestIcon({ test, color, size = 44 }: { test: GiTestKey; color: string; size?: number }) {
  const Icon = ICONS[test];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: alpha(color, 0.16),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={size * 0.5} color={color} strokeWidth={2.2} />
    </View>
  );
}
