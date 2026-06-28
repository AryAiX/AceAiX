import React from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { BadgeCheck, RefreshCw } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { FootballStats } from '@/lib/footballService';
import { isSyncStale } from '@/lib/chessService';

const { width: SW } = Dimensions.get('window');

interface Props {
  stats: FootballStats;
  onRefresh: () => void;
  refreshing: boolean;
}

const STAT_ITEMS = [
  { key: 'apps', label: 'Apps' },
  { key: 'goals', label: 'Goals' },
  { key: 'assists', label: 'Assists' },
  { key: 'minutes', label: 'Mins' },
  { key: 'shots_total', label: 'Shots' },
  { key: 'dribbles_success', label: 'Dribbles' },
  { key: 'tackles', label: 'Tackles' },
  { key: 'yellow_cards', label: 'Yellows' },
];

function sourceLabel(source: string) {
  const MAP: Record<string, string> = { api_football: 'via API-Football', self_reported: 'Self-reported' };
  return MAP[source] ?? source;
}

export function FootballStatsCard({ stats, onRefresh, refreshing }: Props) {
  const verified = stats.source !== 'self_reported';
  const tagColor = verified ? Colors.success : Colors.textDisabled;
  const canRefresh = isSyncStale(stats.last_synced_at, 3600000);

  return (
    <View>
      {/* Source row */}
      <View style={s.sourceRow}>
        <View style={[s.sourceTag, { borderColor: `${tagColor}28`, backgroundColor: `${tagColor}10` }]}>
          {verified && <BadgeCheck color={tagColor} size={11} />}
          <Text style={[s.sourceTxt, { color: tagColor }]}>{sourceLabel(stats.source)}</Text>
          <Text style={s.sourceSep}>·</Text>
          <Text style={s.sourceTime}>{formatAgo(stats.last_synced_at)}</Text>
        </View>
        <TouchableOpacity
          style={[s.refreshBtn, (!canRefresh || refreshing) && { opacity: 0.5 }]}
          onPress={onRefresh}
          disabled={!canRefresh || refreshing}
        >
          {refreshing
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <><RefreshCw color={canRefresh ? Colors.primary : Colors.textDisabled} size={13} /><Text style={[s.refreshTxt, !canRefresh && { color: Colors.textDisabled }]}>Refresh</Text></>
          }
        </TouchableOpacity>
      </View>

      {/* Team + league */}
      {(stats.team || stats.league) && (
        <View style={s.metaRow}>
          {stats.team && <View style={s.metaPill}><Text style={s.metaPillTxt}>{stats.team}</Text></View>}
          {stats.league && <View style={[s.metaPill, { backgroundColor: `${Colors.accent}12`, borderColor: `${Colors.accent}28` }]}><Text style={[s.metaPillTxt, { color: Colors.accent }]}>{stats.league}</Text></View>}
          <Text style={s.seasonTxt}>{stats.season}</Text>
        </View>
      )}

      {/* Rating hero */}
      {stats.rating != null && (
        <View style={s.ratingCard}>
          <Text style={s.ratingNum}>{Number(stats.rating).toFixed(1)}</Text>
          <Text style={s.ratingLbl}>Avg Match Rating</Text>
          {verified && <BadgeCheck color={Colors.success} size={14} style={{ marginTop: 2 }} />}
        </View>
      )}

      {/* Stats grid */}
      <View style={s.statGrid}>
        {STAT_ITEMS.map(item => {
          const val = (stats as any)[item.key];
          if (val === 0 && item.key !== 'apps') return null;
          return (
            <View key={item.key} style={s.statCell}>
              <Text style={s.statVal}>{val ?? 0}</Text>
              <Text style={s.statLbl}>{item.label.toUpperCase()}</Text>
            </View>
          );
        })}
        {stats.passes_accuracy != null && (
          <View style={s.statCell}>
            <Text style={s.statVal}>{Number(stats.passes_accuracy).toFixed(0)}%</Text>
            <Text style={s.statLbl}>PASS ACC</Text>
          </View>
        )}
      </View>

      {/* Attributes */}
      {stats.attributes?.position && (
        <View style={s.posRow}>
          <Text style={s.posLbl}>Position</Text>
          <View style={s.posBadge}>
            <Text style={s.posTxt}>{stats.attributes.position}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const s = StyleSheet.create({
  sourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sourceTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radii.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  sourceTxt: { fontFamily: Typography.family.mono, fontSize: 10 },
  sourceSep: { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textDisabled },
  sourceTime: { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textDisabled },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.md, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderWidth: 1, borderColor: `${Colors.primary}30` },
  refreshTxt: { fontFamily: Typography.family.bold, fontSize: 11, color: Colors.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
  metaPill: { backgroundColor: `${Colors.primary}12`, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: `${Colors.primary}28` },
  metaPillTxt: { fontFamily: Typography.family.bold, fontSize: 11, color: Colors.primary },
  seasonTxt: { fontFamily: Typography.family.mono, fontSize: 11, color: Colors.textDisabled, marginLeft: 'auto' as any },
  ratingCard: { backgroundColor: Colors.elevated, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: `${Colors.primary}30`, alignItems: 'center', marginBottom: Spacing.md },
  ratingNum: { fontFamily: Typography.family.display, fontSize: 48, color: Colors.primary, lineHeight: 54 },
  ratingLbl: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  statCell: { flex: 1, minWidth: (SW - 80) / 4 - 4, backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  statVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xl, color: Colors.primary },
  statLbl: { fontFamily: Typography.family.mono, fontSize: 8, color: Colors.textDisabled, letterSpacing: 0.8, marginTop: 2 },
  posRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  posLbl: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted },
  posBadge: { backgroundColor: `${Colors.primary}15`, borderRadius: Radii.full, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: `${Colors.primary}30` },
  posTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.primary },
});
