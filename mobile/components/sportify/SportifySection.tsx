import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { BadgeCheck, TrendingUp, TrendingDown, Camera, MapPin, RefreshCw, ChevronDown, ChevronUp, Star, Zap } from 'lucide-react-native';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import {
  SportifyResult,
  RecommendedSport,
  METRIC_LABELS,
  metricDelta,
} from '@/lib/sportifyService';

interface Props {
  results: SportifyResult[];
  onSync?: () => void;
  syncing?: boolean;
}

const SPORT_COLORS = [Colors.accent, Colors.primary, Colors.success, Colors.warning];
const SPORT_BG = [Colors.accentDim, Colors.primaryDim, `${Colors.success}15`, `${Colors.warning}15`];

export function SportifySection({ results, onSync, syncing }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (!results.length) return null;

  // Separate physical and talent results
  const physicalResults = results.filter((r) => r.test_type === 'physical');
  const talentResult = results.find((r) => r.test_type === 'talent');

  // Latest + previous physical for trend comparison
  const latestPhysical = physicalResults[0];
  const previousPhysical = physicalResults[1];

  const lastSynced = results.reduce((latest, r) =>
    new Date(r.last_synced_at) > new Date(latest) ? r.last_synced_at : latest,
    results[0].last_synced_at
  );

  return (
    <View style={s.wrap}>
      {/* Section header */}
      <TouchableOpacity style={s.sectionHeader} onPress={() => setExpanded((v) => !v)} activeOpacity={0.8}>
        <View style={s.headerLeft}>
          <View style={s.verifiedBadge}>
            <BadgeCheck color={Colors.primary} size={14} />
            <Text style={s.verifiedTxt}>Verified</Text>
          </View>
          <View>
            <Text style={s.sectionTitle}>Talent Assessment</Text>
            <Text style={s.sectionSub}>Sportify Academy · {fmtDate(lastSynced)}</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          {onSync && (
            <TouchableOpacity
              style={s.syncBtn}
              onPress={onSync}
              disabled={syncing}
              hitSlop={8}
            >
              <RefreshCw color={syncing ? Colors.textDisabled : Colors.primary} size={14} />
            </TouchableOpacity>
          )}
          {expanded ? (
            <ChevronUp color={Colors.textMuted} size={18} />
          ) : (
            <ChevronDown color={Colors.textMuted} size={18} />
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={s.content}>
          {/* Recommended sports */}
          {talentResult && talentResult.recommended_sports.length > 0 && (
            <View style={s.block}>
              <Text style={s.blockTitle}>Recommended Sports</Text>
              <View style={s.sportsRow}>
                {(talentResult.recommended_sports as RecommendedSport[]).map((rs, i) => (
                  <SportCard key={i} rs={rs} rank={i} />
                ))}
              </View>
            </View>
          )}

          {/* Physical metrics */}
          {latestPhysical && (
            <View style={s.block}>
              <View style={s.blockTitleRow}>
                <Text style={s.blockTitle}>Physical Test Results</Text>
                <MethodTag method={latestPhysical.method} />
              </View>
              <View style={s.locationRow}>
                <MapPin color={Colors.textDisabled} size={11} />
                <Text style={s.locationTxt}>{latestPhysical.academy_location ?? 'Location not specified'}</Text>
              </View>
              <Text style={s.testedAt}>Tested {fmtDate(latestPhysical.tested_at)}</Text>
              <View style={s.metricsGrid}>
                {Object.entries(latestPhysical.metrics as Record<string, number>).map(([key, val]) => {
                  const meta = METRIC_LABELS[key];
                  if (!meta) return null;
                  const prev = previousPhysical
                    ? (previousPhysical.metrics as Record<string, number>)[key]
                    : undefined;
                  const delta = prev != null ? metricDelta(val, prev, meta.higherBetter) : null;
                  return (
                    <MetricCard
                      key={key}
                      label={meta.label}
                      value={val}
                      unit={meta.unit}
                      delta={delta}
                    />
                  );
                })}
              </View>
              {latestPhysical.verification_ref && (
                <View style={s.verifiedRow}>
                  <BadgeCheck color={Colors.primary} size={12} />
                  <Text style={s.verifiedRefTxt}>Ref: {latestPhysical.verification_ref}</Text>
                </View>
              )}
            </View>
          )}

          {/* Trend note if we have multiple sessions */}
          {previousPhysical && (
            <View style={s.trendNote}>
              <TrendingUp color={Colors.success} size={14} />
              <Text style={s.trendTxt}>
                Showing improvement vs. previous test ({fmtDate(previousPhysical.tested_at)})
              </Text>
            </View>
          )}

          {/* Source footer */}
          <View style={s.sourceFooter}>
            <View style={s.sourceTag}>
              <BadgeCheck color={Colors.primary} size={11} />
              <Text style={s.sourceTxt}>Verified by Sportify Academy</Text>
            </View>
            <Text style={s.sourceNote}>
              Derived scores only · Not self-reported
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function SportCard({ rs, rank }: { rs: RecommendedSport; rank: number }) {
  const color = SPORT_COLORS[rank] ?? Colors.textMuted;
  const bg = SPORT_BG[rank] ?? Colors.elevated;
  return (
    <View style={[sp.card, { backgroundColor: bg, borderColor: color + '50' }]}>
      {rank === 0 && (
        <View style={sp.topBadge}>
          <Star color={Colors.accent} size={10} fill={Colors.accent} />
          <Text style={sp.topBadgeTxt}>Top Pick</Text>
        </View>
      )}
      <Text style={[sp.score, { color }]}>{rs.potential_score}</Text>
      <Text style={sp.scorePct}>%</Text>
      <Text style={sp.sport}>{rs.sport}</Text>
      <View style={sp.strengthsWrap}>
        {rs.strengths.slice(0, 3).map((str, i) => (
          <View key={i} style={sp.strengthChip}>
            <Text style={sp.strengthTxt}>{str}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MetricCard({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: number;
  unit: string;
  delta: { label: string; positive: boolean } | null;
}) {
  return (
    <View style={mc.card}>
      <Text style={mc.label} numberOfLines={1}>{label}</Text>
      <Text style={mc.value}>{value}<Text style={mc.unit}> {unit}</Text></Text>
      {delta && (
        <View style={mc.deltaRow}>
          {delta.positive ? (
            <TrendingUp color={Colors.success} size={10} />
          ) : (
            <TrendingDown color={Colors.error} size={10} />
          )}
          <Text style={[mc.deltaTxt, { color: delta.positive ? Colors.success : Colors.error }]}>
            {delta.label}
          </Text>
        </View>
      )}
    </View>
  );
}

function MethodTag({ method }: { method: string }) {
  const isCamera = method === 'camera';
  return (
    <View style={[mt.wrap, { borderColor: isCamera ? Colors.warning + '80' : Colors.primary + '80' }]}>
      {isCamera ? (
        <Camera color={Colors.warning} size={10} />
      ) : (
        <MapPin color={Colors.primary} size={10} />
      )}
      <Text style={[mt.txt, { color: isCamera ? Colors.warning : Colors.primary }]}>
        {isCamera ? 'Camera test' : 'In-person test'}
      </Text>
    </View>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const s = StyleSheet.create({
  wrap: { backgroundColor: Colors.surface, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderWidth: 1, borderColor: `${Colors.primary}40` },
  verifiedTxt: { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.primary },
  sectionTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  sectionSub: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled, marginTop: 1 },
  syncBtn: { padding: Spacing.xs },

  content: { padding: Spacing.lg, gap: Spacing.xl },

  block: { gap: Spacing.sm },
  blockTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },
  testedAt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },

  sportsRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },

  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs },
  verifiedRefTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },

  trendNote: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: `${Colors.success}10`, borderRadius: Radii.sm, padding: Spacing.sm, borderWidth: 1, borderColor: `${Colors.success}30` },
  trendTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.success },

  sourceFooter: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, gap: 3 },
  sourceTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sourceTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.primary },
  sourceNote: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },
});

const sp = StyleSheet.create({
  card: { flex: 1, minWidth: 100, borderRadius: Radii.md, borderWidth: 1, padding: Spacing.md, alignItems: 'center', gap: 3, position: 'relative' },
  topBadge: { position: 'absolute', top: -8, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.elevated, borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderWidth: 1, borderColor: `${Colors.accent}60` },
  topBadgeTxt: { fontFamily: Typography.family.bold, fontSize: 9, color: Colors.accent },
  score: { fontFamily: Typography.family.display, fontSize: Typography.size.xxl },
  scorePct: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: -4 },
  sport: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary, textAlign: 'center' },
  strengthsWrap: { gap: 3, alignItems: 'center', marginTop: Spacing.xs },
  strengthChip: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: Radii.full, paddingHorizontal: 6, paddingVertical: 2 },
  strengthTxt: { fontFamily: Typography.family.regular, fontSize: 9, color: Colors.textMuted },
});

const mc = StyleSheet.create({
  card: { width: '47%', backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm + 2, gap: 2 },
  label: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  value: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  unit: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  deltaTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs },
});

const mt = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderWidth: 1 },
  txt: { fontFamily: Typography.family.bold, fontSize: 10 },
});
