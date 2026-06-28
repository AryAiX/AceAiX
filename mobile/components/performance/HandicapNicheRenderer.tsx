import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { SourceTag } from './SourceTag';

interface Props {
  displayName: string;
  season: string;
  stats: Record<string, any>;
  source: string;
  lastSyncedAt: string;
}

function HandicapStars({ value }: { value: number }) {
  const max = 10;
  const filled = Math.max(0, Math.min(value, max));
  return (
    <View style={{ flexDirection: 'row', gap: 3, flexWrap: 'wrap' }}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={18}
          color={i < filled ? Colors.accent : Colors.border}
          fill={i < filled ? Colors.accent : 'none'}
        />
      ))}
    </View>
  );
}

export function HandicapNicheRenderer({ displayName, season, stats, source, lastSyncedAt }: Props) {
  const handicap = stats.handicap != null ? Number(stats.handicap) : null;
  const tournaments = stats.tournaments_played != null ? Number(stats.tournaments_played) : null;
  const goals = stats.goals_scored != null ? Number(stats.goals_scored) : null;

  return (
    <View style={s.wrap}>
      <SourceTag source={source} lastSyncedAt={lastSyncedAt} />

      <View style={s.metaRow}>
        <View style={s.sportPill}>
          <Text style={s.sportPillTxt}>{displayName.toUpperCase()}</Text>
        </View>
        <Text style={s.season}>{season}</Text>
      </View>

      {handicap != null && (
        <View style={s.handicapCard}>
          <Text style={s.handicapNum}>{handicap}</Text>
          <Text style={s.handicapLbl}>HANDICAP GOALS</Text>
          <View style={{ marginTop: Spacing.md }}>
            <HandicapStars value={handicap} />
          </View>
        </View>
      )}

      <View style={s.statsRow}>
        {tournaments != null && (
          <View style={s.stat}>
            <Text style={s.statVal}>{tournaments}</Text>
            <Text style={s.statLbl}>TOURNAMENTS</Text>
          </View>
        )}
        {goals != null && (
          <View style={[s.stat, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
            <Text style={s.statVal}>{goals}</Text>
            <Text style={s.statLbl}>GOALS SCORED</Text>
          </View>
        )}
      </View>

      {Array.isArray(stats.results) && stats.results.length > 0 && (
        <View style={{ marginTop: Spacing.md }}>
          <Text style={s.sectionLabel}>TOURNAMENT RESULTS</Text>
          {stats.results.slice(0, 5).map((r: any, i: number) => (
            <View key={i} style={[s.resultRow, i > 0 && s.resultBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={s.resultName}>{r.tournament}</Text>
                <Text style={s.resultMeta}>{r.location} · {r.date}</Text>
              </View>
              {r.place && (
                <View style={s.placeBadge}>
                  <Text style={s.placeTxt}>{r.place}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sportPill: { backgroundColor: `${Colors.primary}18`, borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderWidth: 1, borderColor: `${Colors.primary}30` },
  sportPillTxt: { fontFamily: Typography.family.display, fontSize: 9, color: Colors.primary, letterSpacing: 1 },
  season: { fontFamily: Typography.family.mono, fontSize: 11, color: Colors.textDisabled },
  handicapCard: { backgroundColor: Colors.elevated, borderRadius: Radii.lg, padding: Spacing.xl, borderWidth: 1, borderColor: `${Colors.accent}30`, alignItems: 'center', marginBottom: Spacing.md },
  handicapNum: { fontFamily: Typography.family.display, fontSize: 72, color: Colors.accent, lineHeight: 80 },
  handicapLbl: { fontFamily: Typography.family.mono, fontSize: 10, color: Colors.textDisabled, letterSpacing: 1.5, marginTop: 4 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, overflow: 'hidden' },
  stat: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg },
  statVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xxl, color: Colors.primary },
  statLbl: { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textDisabled, letterSpacing: 0.8 },
  sectionLabel: { fontFamily: Typography.family.display, fontSize: 10, color: Colors.textDisabled, letterSpacing: 1.4, marginBottom: Spacing.sm },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10 },
  resultBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  resultName: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  resultMeta: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  placeBadge: { backgroundColor: `${Colors.accent}18`, borderRadius: Radii.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: `${Colors.accent}30` },
  placeTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.accent },
});
