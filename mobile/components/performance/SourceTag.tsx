import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { sourceLabel, isVerifiedSource } from '@/lib/performanceService';

interface Props {
  source: string;
  lastSyncedAt: string;
}

export function SourceTag({ source, lastSyncedAt }: Props) {
  const verified = isVerifiedSource(source);
  const color = verified ? Colors.success : Colors.textDisabled;
  const since = formatAgo(lastSyncedAt);

  return (
    <View style={[s.wrap, { borderColor: `${color}28`, backgroundColor: `${color}10` }]}>
      {verified && <BadgeCheck color={color} size={11} />}
      <Text style={[s.label, { color }]}>{sourceLabel(source)}</Text>
      <Text style={s.sep}>·</Text>
      <Text style={[s.time, { color: Colors.textDisabled }]}>{since}</Text>
    </View>
  );
}

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: Radii.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    marginBottom: Spacing.md,
  },
  label: { fontFamily: Typography.family.mono, fontSize: 10 },
  sep: { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textDisabled },
  time: { fontFamily: Typography.family.regular, fontSize: 10 },
});
