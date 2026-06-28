import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polygon, Line, Circle } from 'react-native-svg';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { MetricDef } from '@/constants/sportsConfig';
import { SourceTag } from './SourceTag';

const { width: SW } = Dimensions.get('window');

interface Props {
  sport: string;
  displayName: string;
  season: string;
  stats: Record<string, any>;
  metrics: MetricDef[];
  source: string;
  lastSyncedAt: string;
}

function RadarChart({ values, labels, size = 160 }: { values: number[]; labels: string[]; size?: number }) {
  const cx = size / 2, cy = size / 2, maxR = size / 2 - 26;
  const n = values.length;
  const angles = values.map((_, i) => (i * 2 * Math.PI) / n - Math.PI / 2);
  const pts = (sc: number) =>
    angles.map(a => `${cx + maxR * sc * Math.cos(a)},${cy + maxR * sc * Math.sin(a)}`).join(' ');
  const dataPts = values
    .map((v, i) => `${cx + (v / 100) * maxR * Math.cos(angles[i])},${cy + (v / 100) * maxR * Math.sin(angles[i])}`)
    .join(' ');
  return (
    <View>
      <Svg width={size} height={size}>
        {[0.25, 0.5, 0.75, 1].map(sc => (
          <Polygon key={sc} points={pts(sc)} stroke={Colors.border} strokeWidth="1" fill="none" />
        ))}
        {angles.map((a, i) => (
          <Line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)}
            stroke={Colors.border} strokeWidth="1" />
        ))}
        <Polygon points={dataPts} fill={`${Colors.primary}25`} stroke={Colors.primary} strokeWidth="2" />
        {values.map((v, i) => {
          const x = cx + (v / 100) * maxR * Math.cos(angles[i]);
          const y = cy + (v / 100) * maxR * Math.sin(angles[i]);
          return <Circle key={i} cx={x} cy={y} r="3" fill={Colors.primary} />;
        })}
      </Svg>
      {labels.map((lbl, i) => {
        const lx = cx + (maxR + 14) * Math.cos(angles[i]);
        const ly = cy + (maxR + 14) * Math.sin(angles[i]);
        return (
          <View key={lbl} style={{ position: 'absolute', left: lx - 22, top: ly - 8, width: 44, alignItems: 'center' }}>
            <Text style={{ fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textDisabled }}>{lbl}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function TeamMatchRenderer({ sport, displayName, season, stats, metrics, source, lastSyncedAt }: Props) {
  const numericMetrics = metrics.filter(m => m.type === 'number' || m.type === 'percent');
  const radarMetrics = numericMetrics.slice(0, 6);
  const allValues = radarMetrics.map(m => {
    const v = parseFloat(stats[m.key] ?? 0);
    const max = m.type === 'percent' ? 100 : getMax(m.key);
    return Math.min((v / max) * 100, 100);
  });

  return (
    <View style={s.wrap}>
      <SourceTag source={source} lastSyncedAt={lastSyncedAt} />

      <View style={s.metaRow}>
        <View style={s.sportPill}>
          <Text style={s.sportPillTxt}>{displayName.toUpperCase()}</Text>
        </View>
        <Text style={s.season}>{season}</Text>
      </View>

      {/* Key metric tiles */}
      <View style={s.tileGrid}>
        {numericMetrics.map(m => {
          const v = stats[m.key];
          if (v === undefined || v === null || v === '') return null;
          return (
            <View key={m.key} style={s.tile}>
              <Text style={s.tileVal}>
                {typeof v === 'number' ? v.toFixed(m.type === 'percent' ? 1 : 1) : v}
                {m.unit ? <Text style={s.tileUnit}>{m.unit}</Text> : null}
              </Text>
              <Text style={s.tileLbl}>{m.label.toUpperCase()}</Text>
            </View>
          );
        })}
      </View>

      {/* Attribute radar */}
      {allValues.some(v => v > 0) && (
        <View style={s.radarWrap}>
          <Text style={s.sectionLabel}>ATTRIBUTE RADAR</Text>
          <View style={{ alignItems: 'center' }}>
            <RadarChart values={allValues} labels={radarMetrics.map(m => m.label)} size={180} />
          </View>
        </View>
      )}

      {/* Match history if present */}
      {Array.isArray(stats.match_history) && stats.match_history.length > 0 && (
        <View style={{ marginTop: Spacing.md }}>
          <Text style={s.sectionLabel}>RECENT MATCHES</Text>
          {stats.match_history.slice(0, 5).map((m: any, i: number) => (
            <View key={i} style={[s.matchRow, i > 0 && s.matchBorder]}>
              <View style={[s.resultBadge,
                m.result === 'W' && s.win, m.result === 'D' && s.draw, m.result === 'L' && s.loss]}>
                <Text style={s.resultTxt}>{m.result}</Text>
              </View>
              <Text style={s.matchOpp}>{m.opponent}</Text>
              <Text style={s.matchDate}>{m.date}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function getMax(key: string): number {
  const MAXES: Record<string, number> = {
    kills: 20, blocks: 10, digs: 20, aces: 5, assists: 50, points: 30,
    sets_played: 5, goals: 40, appearances: 40, shots_per_game: 8,
    avg_rating: 10, rebounds: 15, steals: 5, minutes: 40,
  };
  return MAXES[key] ?? 20;
}

const s = StyleSheet.create({
  wrap: { gap: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sportPill: { backgroundColor: `${Colors.primary}18`, borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderWidth: 1, borderColor: `${Colors.primary}30` },
  sportPillTxt: { fontFamily: Typography.family.display, fontSize: 9, color: Colors.primary, letterSpacing: 1 },
  season: { fontFamily: Typography.family.mono, fontSize: 11, color: Colors.textDisabled },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  tile: { flex: 1, minWidth: (SW - 80) / 3 - 4, backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  tileVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xl, color: Colors.primary },
  tileUnit: { fontFamily: Typography.family.mono, fontSize: 11, color: Colors.textMuted },
  tileLbl: { fontFamily: Typography.family.mono, fontSize: 8, color: Colors.textDisabled, letterSpacing: 0.8, marginTop: 2 },
  radarWrap: { marginTop: Spacing.sm },
  sectionLabel: { fontFamily: Typography.family.display, fontSize: 10, color: Colors.textDisabled, letterSpacing: 1.4, marginBottom: Spacing.md },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 8 },
  matchBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  resultBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  win: { backgroundColor: `${Colors.success}20`, borderColor: Colors.success },
  draw: { backgroundColor: `${Colors.warning}20`, borderColor: Colors.warning },
  loss: { backgroundColor: `${Colors.error}20`, borderColor: Colors.error },
  resultTxt: { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.textPrimary },
  matchOpp: { flex: 1, fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary },
  matchDate: { fontFamily: Typography.family.mono, fontSize: Typography.size.xs, color: Colors.textDisabled },
});
