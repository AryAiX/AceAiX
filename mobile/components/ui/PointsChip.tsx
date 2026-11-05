import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/ThemeProvider';
import { PointsInk, PointsRamp, pointsBand } from '@/theme/tokens';
import { Text } from './Text';

/**
 * Points you can gain, coloured by how many: 1–6 yellow, 7–11 orange, 12 and
 * up green — the same cut-offs on every screen, so a "+7" is the same chip
 * wherever it appears. The caller passes the words, because they are
 * translated ("+7 pts", "+7 points", "+7").
 */
export function PointsChip({
  points,
  label,
  testID,
}: {
  points: number;
  label: string;
  testID?: string;
}) {
  const { radii, font } = useTheme();
  const band = pointsBand(points);

  return (
    <View style={{ borderRadius: radii.xs, overflow: 'hidden' }} testID={testID}>
      <LinearGradient
        colors={PointsRamp[band]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 8, paddingVertical: 3 }}
      >
        <Text variant="captionStrong" color={PointsInk[band]} style={{ fontFamily: font.monoBold }}>
          {label}
        </Text>
      </LinearGradient>
    </View>
  );
}
