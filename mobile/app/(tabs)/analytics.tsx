import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { BarChart2, TrendingUp, Eye, Star, Target, Users } from 'lucide-react-native';
import Svg, { Rect, Line, Path, Circle } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';

const { width: SW } = Dimensions.get('window');

const MONTHLY_VIEWS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function BarChartComponent({ data, months, w, h }: { data: number[]; months: string[]; w: number; h: number }) {
  const max = Math.max(...data, 1);
  const barW = (w - 20) / data.length - 4;
  return (
    <Svg width={w} height={h}>
      {data.map((v, i) => {
        const barH = (v / max) * (h - 24);
        const x = 10 + i * ((w - 20) / data.length);
        const y = h - 20 - barH;
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={y} width={barW} height={barH} rx={3} fill={i === data.length - 1 ? Colors.primary : `${Colors.primary}50`} />
            <Svg x={x} y={h - 18} width={barW} height={16}>
              <Line x1={barW / 2} y1={0} x2={barW / 2} y2={16} stroke="transparent" />
            </Svg>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

const INSIGHTS = [
  { label: 'Scout Views', value: '0', delta: 'Live', up: true, Icon: Eye },
  { label: 'Profile Score', value: '—', delta: 'Live', up: true, Icon: Star },
  { label: 'Match Rate', value: '—', delta: 'Live', up: true, Icon: Target },
  { label: 'Network Size', value: '0', delta: 'Live', up: true, Icon: Users },
];

export default function Analytics() {
  return (
    <View style={s.root}>
      <AppHeader title="Analytics" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.insightsGrid}>
          {INSIGHTS.map(({ label, value, delta, up, Icon }) => (
            <View key={label} style={s.insightCard}>
              <View style={s.insightTop}>
                <Icon color={Colors.primary} size={16} />
                <Text style={[s.insightDelta, { color: up ? Colors.success : Colors.error }]}>{delta}</Text>
              </View>
              <Text style={s.insightVal}>{value}</Text>
              <Text style={s.insightLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Profile Views — 2025</Text>
          <BarChartComponent data={MONTHLY_VIEWS} months={MONTHS} w={SW - 64} h={120} />
          <View style={s.monthRow}>
            {MONTHS.map((m, index) => <Text key={`${m}-${index}`} style={s.monthLabel}>{m}</Text>)}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Scout Engagement Breakdown</Text>
          {[
            { label: 'Profile Views', value: 0, pct: 0 },
            { label: 'Full Profile Reads', value: 0, pct: 0 },
            { label: 'Contact Initiated', value: 0, pct: 0 },
            { label: 'Trial Requests', value: 0, pct: 0 },
          ].map(row => (
            <View key={row.label} style={s.engRow}>
              <View style={s.engLeft}>
                <Text style={s.engLabel}>{row.label}</Text>
                <View style={s.engBar}>
                  <View style={[s.engFill, { width: `${row.pct}%` }]} />
                </View>
              </View>
              <Text style={s.engVal}>{row.value.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Geographic Reach</Text>
          {([] as Array<{ region: string; views: number; flag: string }>).map(r => (
            <View key={r.region} style={s.geoRow}>
              <Text style={s.geoFlag}>{r.flag}</Text>
              <Text style={s.geoRegion}>{r.region}</Text>
              <View style={s.geoBarWrap}>
                <View style={[s.geoBar, { width: `${(r.views / 1240) * 100}%` }]} />
              </View>
              <Text style={s.geoViews}>{r.views.toLocaleString()}</Text>
            </View>
          ))}
          <Text style={s.emptyText}>No geographic analytics have been recorded yet.</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  insightsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  insightCard: { flex: 1, minWidth: (SW - 48) / 2 - 8, backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  insightTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  insightDelta: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs },
  insightVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xxl, color: Colors.textPrimary },
  insightLabel: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 2 },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontFamily: Typography.family.display, fontSize: Typography.size.xl, color: Colors.textPrimary, marginBottom: Spacing.md, letterSpacing: 0.5 },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  monthLabel: { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textDisabled, flex: 1, textAlign: 'center' },
  engRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  engLeft: { flex: 1, gap: 4 },
  engLabel: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary },
  engBar: { height: 5, backgroundColor: Colors.elevated, borderRadius: 3, overflow: 'hidden' },
  engFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  engVal: { fontFamily: Typography.family.mono, fontSize: Typography.size.sm, color: Colors.textMuted, width: 50, textAlign: 'right' },
  geoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  geoFlag: { fontSize: 18, width: 26 },
  geoRegion: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary, width: 80 },
  geoBarWrap: { flex: 1, height: 6, backgroundColor: Colors.elevated, borderRadius: 3, overflow: 'hidden' },
  geoBar: { height: '100%', backgroundColor: `${Colors.primary}70`, borderRadius: 3 },
  geoViews: { fontFamily: Typography.family.mono, fontSize: Typography.size.sm, color: Colors.primary, width: 40, textAlign: 'right' },
  emptyText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 20 },
});
