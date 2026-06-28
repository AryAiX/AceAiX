import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { MetricDef } from '@/constants/sportsConfig';
import { SourceTag } from './SourceTag';

const { width: SW } = Dimensions.get('window');

interface Props {
  displayName: string;
  season: string;
  stats: Record<string, any>;
  metrics: MetricDef[];
  source: string;
  lastSyncedAt: string;
}

function TimeBadge({ time, label, isTop }: { time: string; label: string; isTop: boolean }) {
  const color = isTop ? Colors.accent : Colors.primary;
  return (
    <View style={[s.eventCard, isTop && { borderColor: `${Colors.accent}50` }]}>
      {isTop && (
        <View style={s.pbBadge}>
          <Text style={s.pbTxt}>PB</Text>
        </View>
      )}
      <Text style={[s.eventTime, { color }]}>{time}</Text>
      <Text style={s.eventLabel}>{label}</Text>
    </View>
  );
}

function isFastest(key: string, value: string, allStats: Record<string, any>, allMetrics: MetricDef[]): boolean {
  const me = parseTime(value);
  const others = allMetrics
    .filter(m => m.type === 'time' && m.key !== key && allStats[m.key])
    .map(m => parseTime(allStats[m.key]));
  if (others.length === 0) return false;
  const best = Math.min(me, ...others);
  return me === best;
}

function parseTime(raw: string): number {
  if (!raw) return Infinity;
  if (raw.includes(':')) {
    const [min, sec] = raw.split(':').map(parseFloat);
    return min * 60 + sec;
  }
  return parseFloat(raw);
}

export function TimedMeasuredRenderer({ displayName, season, stats, metrics, source, lastSyncedAt }: Props) {
  const timeMetrics = metrics.filter(m => m.type === 'time' && stats[m.key]);
  const allValues = timeMetrics.map(m => parseTime(stats[m.key]));
  const best = allValues.length > 0 ? Math.min(...allValues) : null;

  return (
    <View style={s.wrap}>
      <SourceTag source={source} lastSyncedAt={lastSyncedAt} />

      <View style={s.metaRow}>
        <View style={s.sportPill}>
          <Text style={s.sportPillTxt}>{displayName.toUpperCase()}</Text>
        </View>
        <Text style={s.season}>{season}</Text>
      </View>

      {timeMetrics.length === 0 ? (
        <Text style={s.empty}>No personal bests recorded yet.</Text>
      ) : (
        <>
          <Text style={s.sectionLabel}>PERSONAL BESTS</Text>
          <View style={s.eventGrid}>
            {timeMetrics.map(m => {
              const raw = stats[m.key] as string;
              const isTop = parseTime(raw) === best;
              return <TimeBadge key={m.key} time={raw} label={m.label} isTop={isTop} />;
            })}
          </View>
        </>
      )}

      {/* Meet results if present */}
      {Array.isArray(stats.meet_results) && stats.meet_results.length > 0 && (
        <View style={{ marginTop: Spacing.md }}>
          <Text style={s.sectionLabel}>RECENT MEETS</Text>
          {stats.meet_results.slice(0, 4).map((r: any, i: number) => (
            <View key={i} style={[s.meetRow, i > 0 && s.meetBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={s.meetName}>{r.meet}</Text>
                <Text style={s.meetEvent}>{r.event}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.meetTime}>{r.time}</Text>
                <Text style={s.meetDate}>{r.date}</Text>
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
  sectionLabel: { fontFamily: Typography.family.display, fontSize: 10, color: Colors.textDisabled, letterSpacing: 1.4, marginBottom: Spacing.sm },
  empty: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled, textAlign: 'center', paddingVertical: Spacing.xl },
  eventGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  eventCard: { flex: 1, minWidth: (SW - 96) / 2 - 4, backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', position: 'relative' },
  eventTime: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xl },
  eventLabel: { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textDisabled, letterSpacing: 0.8, marginTop: 2 },
  pbBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: `${Colors.accent}20`, borderRadius: Radii.xs, paddingHorizontal: 4, paddingVertical: 1 },
  pbTxt: { fontFamily: Typography.family.display, fontSize: 7, color: Colors.accent, letterSpacing: 0.5 },
  meetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10 },
  meetBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  meetName: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  meetEvent: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  meetTime: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.md, color: Colors.primary },
  meetDate: { fontFamily: Typography.family.mono, fontSize: 10, color: Colors.textDisabled },
  placeBadge: { backgroundColor: `${Colors.accent}18`, borderRadius: Radii.sm, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: `${Colors.accent}30` },
  placeTxt: { fontFamily: Typography.family.bold, fontSize: 11, color: Colors.accent },
});
