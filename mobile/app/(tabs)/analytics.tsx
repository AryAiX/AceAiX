import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Eye, Star, Target, Users } from 'lucide-react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const { width: SW } = Dimensions.get('window');

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

export default function Analytics() {
  const { user, profile } = useAuth();
  const [monthlyViews, setMonthlyViews] = useState<number[]>(() => Array(12).fill(0));
  const [profileViews, setProfileViews] = useState(0);
  const [networkSize, setNetworkSize] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [applications, setApplications] = useState<{ status: string }[]>([]);
  const [regions, setRegions] = useState<{ region: string; views: number }[]>([]);

  useEffect(() => {
    if (!user || !profile?.athlete_profile_id) return;
    let mounted = true;
    Promise.all([
      supabase
        .from('profile_views')
        .select('created_at,viewer_org')
        .eq('athlete_id', profile.athlete_profile_id),
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
      supabase.from('opportunity_saves').select('opportunity_id').eq('athlete_id', user.id),
      supabase.from('applications').select('status').eq('athlete_id', user.id),
    ]).then(([viewsResult, followsResult, savesResult, applicationsResult]) => {
      if (!mounted) return;
      const views = viewsResult.data ?? [];
      const currentYear = new Date().getFullYear();
      const months = Array(12).fill(0) as number[];
      const regionCounts = new Map<string, number>();

      for (const view of views) {
        const date = new Date(view.created_at);
        if (date.getFullYear() === currentYear) months[date.getMonth()] += 1;
        const region = view.viewer_org?.trim();
        if (region) regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1);
      }

      setMonthlyViews(months);
      setProfileViews(views.length);
      setNetworkSize(followsResult.data?.length ?? 0);
      setSavedCount(savesResult.data?.length ?? 0);
      setApplications((applicationsResult.data ?? []) as { status: string }[]);
      setRegions([...regionCounts.entries()]
        .map(([region, viewCount]) => ({ region, views: viewCount }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5));
    });
    return () => { mounted = false; };
  }, [profile?.athlete_profile_id, user]);

  const progressedApplications = applications.filter((application) => (
    ['shortlisted', 'trial_offered', 'accepted'].includes(application.status)
  )).length;
  const matchRate = applications.length
    ? Math.round((progressedApplications / applications.length) * 100)
    : 0;
  const insights = useMemo(() => [
    { label: 'Profile Views', value: String(profileViews), delta: 'Live', Icon: Eye },
    { label: 'Profile Score', value: String(Math.round(profile?.visibility_score ?? 0)), delta: 'Live', Icon: Star },
    { label: 'Progress Rate', value: applications.length ? `${matchRate}%` : '—', delta: 'Live', Icon: Target },
    { label: 'Network Size', value: String(networkSize), delta: 'Live', Icon: Users },
  ], [applications.length, matchRate, networkSize, profile?.visibility_score, profileViews]);
  const engagement = [
    { label: 'Profile Views', value: profileViews },
    { label: 'Saved Opportunities', value: savedCount },
    { label: 'Applications', value: applications.length },
    { label: 'Shortlists & Trials', value: progressedApplications },
  ];
  const maxEngagement = Math.max(...engagement.map((item) => item.value), 1);
  const maxRegionViews = Math.max(...regions.map((region) => region.views), 1);

  return (
    <View style={s.root}>
      <AppHeader title="Analytics" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.insightsGrid}>
          {insights.map(({ label, value, delta, Icon }) => (
            <View key={label} style={s.insightCard}>
              <View style={s.insightTop}>
                <Icon color={Colors.primary} size={16} />
                <Text style={[s.insightDelta, { color: Colors.success }]}>{delta}</Text>
              </View>
              <Text style={s.insightVal}>{value}</Text>
              <Text style={s.insightLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Profile Views — {new Date().getFullYear()}</Text>
          <BarChartComponent data={monthlyViews} months={MONTHS} w={SW - 64} h={120} />
          <View style={s.monthRow}>
            {MONTHS.map((m, index) => <Text key={`${m}-${index}`} style={s.monthLabel}>{m}</Text>)}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Scout Engagement Breakdown</Text>
          {engagement.map(row => (
            <View key={row.label} style={s.engRow}>
              <View style={s.engLeft}>
                <Text style={s.engLabel}>{row.label}</Text>
                <View style={s.engBar}>
                  <View style={[s.engFill, { width: `${(row.value / maxEngagement) * 100}%` }]} />
                </View>
              </View>
              <Text style={s.engVal}>{row.value.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Viewer Organizations</Text>
          {regions.map(r => (
            <View key={r.region} style={s.geoRow}>
              <Text style={s.geoRegion}>{r.region}</Text>
              <View style={s.geoBarWrap}>
                <View style={[s.geoBar, { width: `${(r.views / maxRegionViews) * 100}%` }]} />
              </View>
              <Text style={s.geoViews}>{r.views.toLocaleString()}</Text>
            </View>
          ))}
          {regions.length === 0 && (
            <Text style={s.emptyText}>No viewer organization data has been recorded yet.</Text>
          )}
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
