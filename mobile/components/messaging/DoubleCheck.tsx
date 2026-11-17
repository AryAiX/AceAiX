import React from 'react';
import { View } from 'react-native';
import { Check } from 'lucide-react-native';

/** Two overlapping ticks: "Seen". Built from the plain tick every screen already uses. */
export function DoubleCheck({ size = 15, color }: { size?: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', width: size * 1.35, height: size }}>
      <Check size={size} color={color} strokeWidth={2.4} />
      <View style={{ position: 'absolute', left: size * 0.38 }}>
        <Check size={size} color={color} strokeWidth={2.4} />
      </View>
    </View>
  );
}
