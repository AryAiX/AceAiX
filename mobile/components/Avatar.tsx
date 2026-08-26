import React from 'react';
import { Image, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

type AvatarProps = {
  uri?: string | null;
  initial: string;
  size: number;
};

export default function Avatar({ uri, initial, size }: AvatarProps) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <Text style={[a.text, { fontSize: size * 0.42 }]}>
      {initial}
    </Text>
  );
}

const a = StyleSheet.create({
  text: {
    fontFamily: Typography.family.bold,
    color: Colors.white,
  },
});
