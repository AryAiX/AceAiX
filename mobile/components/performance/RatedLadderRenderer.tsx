import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { SourceTag } from './SourceTag';

const { width: SW } = Dimensions.get('window');

interface Props {
  displayName: string;
  season: string;
  stats: Record<string, any>;
  source: string;
  lastSyncedAt: string;
}

const RATING_KEYS = ['rapid_rating', 'blitz_rating', 'bullet_rating', 'classical_rating', 'fide_rating'];
const RATING_LABELS: Record<string, string> = {
  rapid_rating: 'Rapid', blitz_rating: 'Blitz', bullet_rating: 'Bullet',
  classical_rating: 'Classical', fide_rating: 'FIDE',
};
const TITLE_COLORS: Record<string, string> = {
  GM: Colors.accent, IM: '#B0A0FF', FM: Colors.primary,
  CM: Colors.textMuted, NM: Colors.textMuted,
};

function WldBar({ wins, losses, draws }: { wins: number; losses: number; draws: number }) {
  const total = wins + losses + draws || 1;
  const wPct = (wins / total) * 100;
  const dPct = (draws / total) * 100;
  const lPct = (losses / total) * 100;
  const bw = SW - 96;
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
        <View style={{ width: `${wPct}%` as any, backgroundColor: Colors.success }} />
        <View style={{ width: `${dPct}%` as any, backgroundColor: Colors.warning }} />
        <View style={{ width: `${lPct}%` as any, backgroundColor: Colors.error }} />
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
        <View style={s.wldItem}>
          <View style={[s.wldDot, { backgroundColor: Colors.success }]} />
          <Text style={s.wldLbl}>W</Text>
          <Text style={[s.wldVal, { color: Colors.success }]}>{wins}</Text>
        </View>
        <View style={s.wldItem}>
          <View style={[s.wldDot, { backgroundColor: Colors.warning }]} />
          <Text style={s.wldLbl}>D</Text>
          <Text style={[s.wldVal, { color: Colors.warning }]}>{draws}</Text>
        </View>
        <View style={s.wldItem}>
          <View style={[s.wldDot, { backgroundColor: Colors.error }]} />
          <Text style={s.wldLbl}>L</Text>
          <Text style={[s.wldVal, { color: Colors.error }]}>{losses}</Text>
        </View>
        <View style={s.wldItem}>
          <Text style={s.wldLbl}>Win%</Text>
          <Text style={[s.wldVal, { color: Colors.textPrimary }]}>
            {((wins / total) * 100).toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

export function RatedLadderRenderer({ displayName, season, stats, source, lastSyncedAt }: Props) {
  const title = stats.title as string | undefined;
  const titleColor = title ? (TITLE_COLORS[title] ?? Colors.primary) : undefined;
  const peak = stats.peak_rating as number | undefined;
  const wins = Number(stats.wins ?? 0);
  const losses = Number(stats.losses ?? 0);
  const draws = Number(stats.draws ?? 0);
  const ratingEntries = RATING_KEYS.filter(k => stats[k] != null);

  return (
    <View style={s.wrap}>
      <SourceTag source={source} lastSyncedAt={lastSyncedAt} />

      <View style={s.metaRow}>
        <View style={s.sportPill}>
          <Text style={s.sportPillTxt}>{displayName.toUpperCase()}</Text>
        </View>
        <Text style={s.season}>{season}</Text>
        {title && (
          <View style={[s.titleBadge, { borderColor: `${titleColor}50`, backgroundColor: `${titleColor}15` }]}>
            <Text style={[s.titleTxt, { color: titleColor }]}>{title}</Text>
          </View>
        )}
      </View>

      {/* Rating cards */}
      {ratingEntries.length > 0 && (
        <>
          <Text style={s.sectionLabel}>RATINGS</Text>
          <View style={s.ratingGrid}>
            {ratingEntries.map(key => {
              const val = Number(stats[key]);
              const isPeak = peak && key !== 'fide_rating' && val >= (peak * 0.97);
              return (
                <View key={key} style={[s.ratingCard, !!isPeak && { borderColor: `${Colors.accent}50` }]}>
                  {!!isPeak && (
                    <View style={s.peakBadge}>
                      <Text style={s.peakTxt}>PEAK</Text>
                    </View>
                  )}
                  <Text style={[s.ratingVal, !!isPeak && { color: Colors.accent }]}>{val.toLocaleString()}</Text>
                  <Text style={s.ratingLbl}>{RATING_LABELS[key]}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {peak && (
        <View style={s.peakRow}>
          <Text style={s.peakRowLbl}>Peak Rating</Text>
          <Text style={[s.peakRowVal, { color: Colors.accent }]}>{peak.toLocaleString()}</Text>
        </View>
      )}

      {/* W/L/D */}
      {(wins + losses + draws) > 0 && (
        <View style={{ marginTop: Spacing.md }}>
          <Text style={s.sectionLabel}>WIN / DRAW / LOSS RECORD</Text>
          <WldBar wins={wins} losses={losses} draws={draws} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
  sportPill: { backgroundColor: `${Colors.primary}18`, borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderWidth: 1, borderColor: `${Colors.primary}30` },
  sportPillTxt: { fontFamily: Typography.family.display, fontSize: 9, color: Colors.primary, letterSpacing: 1 },
  season: { fontFamily: Typography.family.mono, fontSize: 11, color: Colors.textDisabled },
  titleBadge: { borderRadius: Radii.sm, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 3 },
  titleTxt: { fontFamily: Typography.family.display, fontSize: 12, letterSpacing: 0.5 },
  sectionLabel: { fontFamily: Typography.family.display, fontSize: 10, color: Colors.textDisabled, letterSpacing: 1.4, marginBottom: Spacing.sm },
  ratingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  ratingCard: { flex: 1, minWidth: (SW - 96) / 3 - 4, backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', position: 'relative' },
  ratingVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xl, color: Colors.primary },
  ratingLbl: { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textDisabled, letterSpacing: 0.8, marginTop: 2 },
  peakBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: `${Colors.accent}20`, borderRadius: Radii.xs, paddingHorizontal: 4, paddingVertical: 1 },
  peakTxt: { fontFamily: Typography.family.display, fontSize: 7, color: Colors.accent, letterSpacing: 0.5 },
  peakRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: `${Colors.accent}10`, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: `${Colors.accent}28`, marginBottom: Spacing.md },
  peakRowLbl: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  peakRowVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xxl },
  wldItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wldDot: { width: 8, height: 8, borderRadius: 4 },
  wldLbl: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textMuted },
  wldVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.sm },
});
