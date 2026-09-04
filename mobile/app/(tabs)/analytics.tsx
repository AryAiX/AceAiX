import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Animated } from 'react-native';
import { Eye, Star, Target, Users } from 'lucide-react-native';
import Svg, { Rect } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const { width: SW } = Dimensions.get('window');

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const AnimatedRect = Animated.createAnimatedComponent(Rect);

function BarChartComponent({ data, w, h, progress }: { data: number[]; w: number; h: number; progress: Animated.Value }) {
  const max = Math.max(...data, 1);
  const barW = (w - 20) / data.length - 4;
  return (
    <Svg width={w} height={h}>
      {data.map((v, i) => {
        const barH = (v / max) * (h - 24);
        const x = 10 + i * ((w - 20) / data.length);
        const y = h - 20 - barH;
        const animatedHeight = progress.interpolate({ inputRange: [0, 1], outputRange: [0, barH] });
        const animatedY = progress.interpolate({ inputRange: [0, 1], outputRange: [h - 20, y] });
        return (
          <AnimatedRect
            key={i}
            x={x}
            y={animatedY}
            width={barW}
            height={animatedHeight}
            rx={3}
            fill={i === data.length - 1 ? Colors.primary : `${Colors.primary}50`}
          />
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!user || !profile?.athlete_profile_id) return;
    let mounted = true;
    setLoading(true);
    setLoadError(false);
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
      if (
        viewsResult.error
        || followsResult.error
        || savesResult.error
        || applicationsResult.error
      ) {
        setLoadError(true);
        return;
      }
      const views = viewsResult.data ?? [];
      const currentYear = new Date().getFullYear();
      const months = Array(12).fill(0) as number[];
      const regionCounts = new Map<string, number>();

      for (const view of views) {
        const date = new Date(view.created_at);
        if (date.getFullYear() === currentYear) months[date.getMonth()] += 1;
        const region = view.viewer_org?.trim() || 'Unspecified';
        regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1);
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
    }).catch(() => { if (mounted) setLoadError(true); })
      .finally(() => { if (mounted) setLoading(false); });
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

  // Entrance animations, triggered once when data successfully loads.
  // Animated.Value instances are created lazily via refs so they stay
  // stable across re-renders instead of being recreated every render.
  const cardAnimsRef = useRef(insights.map(() => new Animated.Value(0)));
  const barAnim = useRef(new Animated.Value(0)).current;
  const engAnimsRef = useRef(engagement.map(() => new Animated.Value(0)));
  // regions is always sliced to a max of 5 items, so size this ref accordingly.
  const geoAnimsRef = useRef(Array.from({ length: 5 }, () => new Animated.Value(0)));
  const [animatedValues, setAnimatedValues] = useState<number[]>(() => insights.map(() => 0));

  useEffect(() => {
    if (loading || loadError) return;
    Animated.stagger(80, cardAnimsRef.current.map((anim) =>
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 })
    )).start();
    Animated.timing(barAnim, { toValue: 1, duration: 700, delay: 200, useNativeDriver: false }).start();
    Animated.stagger(60, engAnimsRef.current.map((anim) =>
      Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: false })
    )).start();
    Animated.stagger(60, geoAnimsRef.current.slice(0, regions.length).map((anim) =>
      Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: false })
    )).start();
    // Number count-up for the 4 insight cards where value is a plain
    // integer (skip the '%' and '—' cases to avoid parsing complexity)
    const targets = [profileViews, Math.round(profile?.visibility_score ?? 0), null, networkSize];
    targets.forEach((target, i) => {
      if (target === null) return;
      const anim = new Animated.Value(0);
      anim.addListener(({ value }) => {
        setAnimatedValues((prev) => {
          const next = [...prev];
          next[i] = Math.round(value);
          return next;
        });
      });
      Animated.timing(anim, { toValue: target, duration: 900, delay: i * 80, useNativeDriver: false }).start();
    });
  }, [loading, loadError, regions.length, profileViews, networkSize, profile?.visibility_score]);

  return (
    <View style={s.root}>
      <AppHeader title="Analytics" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {loading ? (
          <Text style={s.emptyText}>Loading analytics...</Text>
        ) : loadError ? (
          <Text style={s.emptyText}>Couldn’t load analytics data — pull to refresh or try again.</Text>
        ) : (
          <>
            <View style={s.insightsGrid}>
              {insights.map(({ label, value, delta, Icon }, index) => {
                const anim = cardAnimsRef.current[index];
                // Progress Rate (index 2) can be '—' or 'N%', so it keeps its static value.
                const displayValue = index === 2 ? value : String(animatedValues[index] ?? 0);
                return (
                  <Animated.View
                    key={label}
                    style={[
                      s.insightCard,
                      {
                        opacity: anim,
                        transform: [{
                          translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
                        }],
                      },
                    ]}
                  >
                    <View style={s.insightTop}>
                      <Icon color={Colors.primary} size={16} />
                      <Text style={[s.insightDelta, { color: Colors.success }]}>{delta}</Text>
                    </View>
                    <Text style={s.insightVal}>{displayValue}</Text>
                    <Text style={s.insightLabel}>{label}</Text>
                  </Animated.View>
                );
              })}
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Profile Views — {new Date().getFullYear()}</Text>
              {monthlyViews.some((v) => v > 0) ? (
                <>
                  <BarChartComponent data={monthlyViews} w={SW - 64} h={120} progress={barAnim} />
                  <View style={s.monthRow}>
                    {MONTHS.map((m, index) => <Text key={`${m}-${index}`} style={s.monthLabel}>{m}</Text>)}
                  </View>
                </>
              ) : (
                <Text style={s.emptyText}>No profile views recorded yet this year.</Text>
              )}
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Scout Engagement Breakdown</Text>
              {engagement.map((row, index) => {
                const pct = (row.value / maxEngagement) * 100;
                const anim = engAnimsRef.current[index];
                return (
                  <View key={row.label} style={s.engRow}>
                    <View style={s.engLeft}>
                      <Text style={s.engLabel}>{row.label}</Text>
                      <View style={s.engBar}>
                        <Animated.View
                          style={[
                            s.engFill,
                            { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pct}%`] }) },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={s.engVal}>{row.value.toLocaleString()}</Text>
                  </View>
                );
              })}
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Viewer Organizations</Text>
              {regions.map((r, index) => {
                const pct = (r.views / maxRegionViews) * 100;
                const anim = geoAnimsRef.current[index];
                return (
                  <View key={r.region} style={s.geoRow}>
                    <Text style={s.geoRegion}>{r.region}</Text>
                    <View style={s.geoBarWrap}>
                      <Animated.View
                        style={[
                          s.geoBar,
                          { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pct}%`] }) },
                        ]}
                      />
                    </View>
                    <Text style={s.geoViews}>{r.views.toLocaleString()}</Text>
                  </View>
                );
              })}
              {regions.length === 0 && (
                <Text style={s.emptyText}>No viewer organization data has been recorded yet.</Text>
              )}
            </View>
          </>
        )}

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
  geoRegion: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary, width: 80 },
  geoBarWrap: { flex: 1, height: 6, backgroundColor: Colors.elevated, borderRadius: 3, overflow: 'hidden' },
  geoBar: { height: '100%', backgroundColor: `${Colors.primary}70`, borderRadius: 3 },
  geoViews: { fontFamily: Typography.family.mono, fontSize: Typography.size.sm, color: Colors.primary, width: 40, textAlign: 'right' },
  emptyText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 20 },
});
