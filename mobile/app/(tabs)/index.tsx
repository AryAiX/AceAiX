import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
  Animated, AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Polygon, Line, Path, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import {
  BadgeCheck, Flame, Shield, Eye, Star, TrendingUp, ChevronRight,
  Zap, MessageCircle, Sparkles, MapPin, Clock, Target, Activity,
  Users, Trophy,
} from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useRouter } from 'expo-router';

const { width: SW } = Dimensions.get('window');

// ── Data ──────────────────────────────────────────────────────────────────────
const FORM: Array<{ r: 'W' | 'D' | 'L'; opp: string; rating: number; g: number; a: number }> = [];
const ATTRIBUTES: Array<{ label: string; v: number; color: string }> = [];
const CAREER = { years: [] as string[], actual: [] as number[], forecast: [] as number[] };
const SCOUTS: Array<{ name: string; role: string; verified: boolean; time: string; views: number; color: string }> = [];
const OPPS: Array<{ title: string; club: string; loc: string; salary: string; tag: string; isNew: boolean; match: number }> = [];

const CHECKLIST = [
  { label: 'Complete profile info', key: 'full_name' },
  { label: 'Upload profile photo',  key: 'avatar_url' },
  { label: 'Medical verification',  key: null },
  { label: 'Get endorsements',      key: null },
  { label: 'Add match records',     key: null },
];

// ── Animation hooks ───────────────────────────────────────────────────────────
function useCountUp(to: number, duration = 1200, delay = 400): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value: v }) => setValue(Math.round(v)));
    Animated.timing(anim, { toValue: to, duration, delay, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [to]);
  return value;
}

function useArcProgress(to: number, duration = 1400, delay = 500): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value: v }) => setP(v));
    Animated.timing(anim, { toValue: to, duration, delay, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [to]);
  return p;
}

// ── Primitives ────────────────────────────────────────────────────────────────
function LiveDot({ reduced }: { reduced: boolean }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[s.liveDot, { opacity: anim }]} />;
}

function PulseRing({ color, size, reduced }: { color: string; size: number; reduced: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.loop(
      Animated.parallel([
        Animated.timing(scale,   { toValue: 2.0, duration: 1800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,   duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: 1.5, borderColor: color,
        transform: [{ scale }], opacity,
      }}
    />
  );
}

function ScanLine({ cardHeight, reduced }: { cardHeight: number; reduced: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: cardHeight, duration: 2800, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, [cardHeight]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: 0, right: 0, height: 1.5,
        backgroundColor: `${Colors.primary}55`,
        transform: [{ translateY: anim }],
      }}
    />
  );
}

function RevealCard({ children, index, style, reduced }: {
  children: React.ReactNode; index: number; style?: object; reduced: boolean;
}) {
  const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduced ? 0 : 22)).current;
  useEffect(() => {
    if (reduced) return;
    const delay = 80 + index * 60;
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 360, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 360, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[s.card, style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

function AnimatedBar({ value, color, delay = 700 }: { value: number; color: string; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 900, delay, useNativeDriver: false }).start();
  }, [value]);
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={s.barBg}>
      <Animated.View style={[s.barFill, { width, backgroundColor: color }]} />
    </View>
  );
}

function GaugeArc({ value, max = 10, size = 100, sw = 9, color, bg }: {
  value: number; max?: number; size?: number; sw?: number; color: string; bg: string;
}) {
  const progress = useArcProgress(value / max);
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const filled = progress * circ;
  const c = size / 2;
  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={r} stroke={bg} strokeWidth={sw} fill="none" />
      <Circle cx={c} cy={c} r={r} stroke={color} strokeWidth={sw} fill="none"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform={`rotate(-90, ${c}, ${c})`}
      />
    </Svg>
  );
}

function AnimatedRadar({ data, size = 166 }: { data: number[]; size?: number }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value: v }) => setProgress(v));
    Animated.timing(anim, { toValue: 1, duration: 1000, delay: 600, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, []);
  const cx = size / 2, cy = size / 2, maxR = size / 2 - 24;
  const n = data.length;
  const angles = data.map((_, i) => (i * 2 * Math.PI) / n - Math.PI / 2);
  const pts = (scale: number) =>
    angles.map(a => `${cx + maxR * scale * Math.cos(a)},${cy + maxR * scale * Math.sin(a)}`).join(' ');
  const dataPts = data.map((v, i) => {
    const scaled = (v / 100) * progress;
    return `${cx + maxR * scaled * Math.cos(angles[i])},${cy + maxR * scaled * Math.sin(angles[i])}`;
  }).join(' ');
  return (
    <Svg width={size} height={size}>
      {[0.25, 0.5, 0.75, 1].map(sc => (
        <Polygon key={sc} points={pts(sc)} stroke={Colors.border} strokeWidth="1" fill="none" />
      ))}
      {angles.map((a, i) => (
        <Line key={i} x1={cx} y1={cy}
          x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)}
          stroke={Colors.border} strokeWidth="1" />
      ))}
      <Polygon points={dataPts} fill={`${Colors.primary}30`} stroke={Colors.primary} strokeWidth="2.5" />
    </Svg>
  );
}

function LineAreaChart({ actual, forecast, w, h }: { actual: number[]; forecast: number[]; w: number; h: number }) {
  const pad = { t: 8, r: 8, b: 8, l: 8 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const all = [...actual, ...forecast];
  const minV = Math.min(...all) - 0.3, maxV = Math.max(...all) + 0.3;
  const xS = (i: number) => pad.l + (i / (actual.length - 1)) * cw;
  const yS = (v: number) => pad.t + ch - ((v - minV) / (maxV - minV)) * ch;
  const aPath = actual.map((v, i) => `${i === 0 ? 'M' : 'L'}${xS(i)},${yS(v)}`).join(' ');
  const fPath = forecast.map((v, i) => `${i === 0 ? 'M' : 'L'}${xS(i)},${yS(v)}`).join(' ');
  const areaPath = `${aPath} L${xS(actual.length - 1)},${pad.t + ch} L${xS(0)},${pad.t + ch} Z`;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <SvgGrad id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor={Colors.primary} stopOpacity="0.25" />
          <Stop offset="1"   stopColor={Colors.primary} stopOpacity="0"    />
        </SvgGrad>
      </Defs>
      <Path d={areaPath} fill="url(#areaGrad)" />
      <Path d={aPath} stroke={Colors.primary} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={fPath} stroke={Colors.accent}  strokeWidth="2"   fill="none" strokeDasharray="5,4" strokeLinecap="round" />
    </Svg>
  );
}

function SectionTag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[s.sectionTag, { borderColor: color }]}>
      <View style={[s.sectionTagBar, { backgroundColor: color }]} />
      <Text style={[s.sectionTagTxt, { color }]}>{label}</Text>
    </View>
  );
}

function SH({ title, color = Colors.primary, onMore }: { title: string; color?: string; onMore?: () => void }) {
  return (
    <View style={s.sh}>
      <SectionTag label={title} color={color} />
      {onMore && (
        <TouchableOpacity onPress={onMore} style={s.shMore}>
          <Text style={[s.shMoreTxt, { color }]}>View all</Text>
          <ChevronRight color={color} size={13} />
        </TouchableOpacity>
      )}
    </View>
  );
}

type DashboardStatCard = {
  label: string;
  value: number;
  display: string;
  delta: string;
  sub: string;
  Icon: any;
  grad: readonly [string, string];
  accent: string;
};

function StatCard({ card, delay }: { card: DashboardStatCard; delay: number }) {
  const { label, value, delta, sub, Icon, grad, accent } = card;
  const counted = useCountUp(value, 1100, delay);
  const shown =
    label === 'Rank'        ? `#${counted}` :
    label === 'Scout Views' ? counted.toLocaleString() :
                              String(counted);
  return (
    <View style={s.statCard}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: Radii.lg }]} />
      <View style={[s.statIconWrap, { backgroundColor: `${accent}25` }]}>
        <Icon color={accent} size={16} />
      </View>
      <Text style={[s.statNum, { color: accent }]}>{shown}</Text>
      <Text style={s.statLbl}>{label}</Text>
      <View style={s.statDeltaRow}>
        <View style={[s.statDeltaBadge, { backgroundColor: `${accent}20` }]}>
          <Text style={[s.statDeltaTxt, { color: accent }]}>{delta}</Text>
        </View>
        <Text style={s.statSub}>{sub}</Text>
      </View>
    </View>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
  }, []);

  const completedKeys = useMemo(() => {
    if (!profile) return new Set<string>();
    return new Set(Object.entries(profile).filter(([, v]) => !!v).map(([k]) => k));
  }, [profile]);

  const completeness = useMemo(() => {
    const keys = CHECKLIST.map(c => c.key).filter(Boolean) as string[];
    const done = keys.filter(k => completedKeys.has(k)).length;
    return Math.round((done / keys.length) * 100);
  }, [completedKeys]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.full_name?.split(' ')[0]?.toUpperCase() ?? 'ATHLETE';
  const performanceScore = profile?.performance_score ?? 0;
  const visibilityScore = profile?.visibility_score ?? 0;
  const score10 = (performanceScore / 10).toFixed(1);
  const visibility10 = (visibilityScore / 10).toFixed(1);
  const statCards = [
    { label: 'Scout Views', value: visibilityScore, display: String(visibilityScore), delta: 'Live', sub: 'visibility', Icon: Eye, grad: ['#0D2447', '#1C4D90'] as const, accent: Colors.primary },
    { label: 'Profile', value: completeness, display: `${completeness}%`, delta: 'Live', sub: 'complete', Icon: Star, grad: ['#0A2D1A', '#145C2C'] as const, accent: Colors.success },
    { label: 'Open Opps', value: 0, display: '0', delta: 'Live', sub: 'matched', Icon: Target, grad: ['#2D1F0A', '#5C3A10'] as const, accent: Colors.warning },
    { label: 'AI Score', value: performanceScore, display: String(performanceScore), delta: 'Live', sub: 'profile', Icon: TrendingUp, grad: ['#2A1010', '#5C1A1A'] as const, accent: Colors.error },
  ];

  return (
    <View style={s.root}>
      <AppHeader title="Dashboard" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <Animated.View style={s.hero}>
          <LinearGradient
            colors={['#060C17', '#0E1C38', '#091220']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* glow blobs */}
          <View style={[s.glowBlob, { top: -40, left: -40, backgroundColor: `${Colors.primary}22`, width: 180, height: 180 }]} />
          <View style={[s.glowBlob, { bottom: -20, right: -20, backgroundColor: `${Colors.accent}14`, width: 140, height: 140 }]} />

          {!reduced && <ScanLine cardHeight={220} reduced={reduced} />}

          <View style={s.heroInner}>
            {/* top row */}
            <View style={s.heroTop}>
              <View style={s.livePill}>
                <LiveDot reduced={reduced} />
                <Text style={s.liveTxt}>LIVE</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <BadgeCheck color={Colors.primary} size={14} />
                <Text style={s.verifiedTxt}>AceAiX Verified</Text>
              </View>
            </View>

            {/* name block */}
            <Text style={s.heroGreeting}>{greeting},</Text>
            <Text style={s.heroName} numberOfLines={1}>{firstName}</Text>
            <Text style={s.heroBio} numberOfLines={1}>
              {[profile?.position, profile?.sport, profile?.league]
                .filter(Boolean).join(' · ') || 'Professional Athlete'}
            </Text>

            {/* score strip */}
            <View style={s.heroScoreStrip}>
              {[
                { label: 'AI SCORE', val: score10, color: Colors.accent },
                { label: 'VISIBILITY', val: visibility10, color: Colors.primary },
                { label: 'PROFILE', val: `${completeness}%`, color: Colors.success },
              ].map(item => (
                <View key={item.label} style={s.heroScoreItem}>
                  <Text style={[s.heroScoreVal, { color: item.color }]}>{item.val}</Text>
                  <Text style={s.heroScoreLbl}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* form row */}
            <View style={s.formRow}>
              <View>
                <Text style={s.formLabel}>RECENT FORM</Text>
                <View style={{ flexDirection: 'row', gap: 5 }}>
                  {FORM.map((m, i) => (
                    <View key={i} style={[s.fc,
                      m.r === 'W' && s.fw, m.r === 'D' && s.fd, m.r === 'L' && s.fl]}>
                      <Text style={s.fcTxt}>{m.r}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={s.viewPubBtn}
                onPress={() => router.push('/(tabs)/public-profile' as any)}
                activeOpacity={0.85}
              >
                <Text style={s.viewPubTxt}>Public Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ── STAT CARDS (horizontal scroll) ───────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.statScroll}
          style={{ marginHorizontal: -Spacing.lg }}
        >
          {statCards.map((card, i) => (
            <StatCard key={card.label} card={card} delay={300 + i * 120} />
          ))}
        </ScrollView>

        {/* ── VISIBILITY SCORE ─────────────────────────────────────────── */}
        <RevealCard index={1} reduced={reduced} style={{ borderColor: `${Colors.accent}35` }}>
          <LinearGradient
            colors={[`${Colors.accent}10`, Colors.surface]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: Radii.lg }]}
          />
          <SH title="Visibility Score" color={Colors.accent} />
          <View style={s.visRow}>
            <View style={s.visGaugeWrap}>
              {!reduced && <PulseRing color={Colors.accent} size={110} reduced={reduced} />}
              <GaugeArc value={visibilityScore / 10} max={10} size={110} sw={10} color={Colors.accent} bg={`${Colors.accent}18`} />
              <View style={s.visCenter}>
                <Text style={[s.visScore, { color: Colors.accent }]}>{visibility10}</Text>
                <Text style={s.visMax}>/10</Text>
              </View>
            </View>
            <View style={s.visRight}>
              <View style={s.visMetric}>
                <Text style={s.visMetricLbl}>AI SCORE</Text>
                <View style={s.visMetricRow}>
                  <GaugeArc value={performanceScore / 10} max={10} size={48} sw={5} color={Colors.primary} bg={`${Colors.primary}18`} />
                  <View style={s.visMiniCenter}>
                    <Text style={[s.visMiniVal, { color: Colors.primary }]}>{score10}</Text>
                  </View>
                </View>
              </View>
              <View style={s.visMetric}>
                <Text style={s.visMetricLbl}>PROFILE</Text>
                <View style={s.visMetricRow}>
                  <GaugeArc value={completeness} max={100} size={48} sw={5} color={Colors.success} bg={`${Colors.success}18`} />
                  <View style={s.visMiniCenter}>
                    <Text style={[s.visMiniVal, { color: Colors.success }]}>{completeness}%</Text>
                  </View>
                </View>
              </View>
              <View style={[s.visBadge]}>
                <Sparkles color={Colors.accent} size={11} />
                <Text style={s.visBadgeTxt}>Live Supabase data</Text>
              </View>
            </View>
          </View>
        </RevealCard>

        {/* ── ATTRIBUTE BREAKDOWN ──────────────────────────────────────── */}
        <RevealCard index={2} reduced={reduced}>
          <SH title="Attribute Breakdown" color={Colors.primary} />
          <Text style={s.attrSubtitle}>AI-calculated · {profile?.sport ?? 'Sport'} · Current season</Text>
          {ATTRIBUTES.length ? (
            <View style={s.attrRow}>
              <AnimatedRadar data={ATTRIBUTES.map(a => a.v)} size={166} />
              <View style={s.attrList}>
                {ATTRIBUTES.map((a, i) => (
                  <View key={a.label} style={s.attrItem}>
                    <View style={s.attrLabelRow}>
                      <Text style={s.attrLabel}>{a.label}</Text>
                      <Text style={[s.attrVal, { color: a.color }]}>{a.v}</Text>
                    </View>
                    <AnimatedBar value={a.v} color={a.color} delay={700 + i * 100} />
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={s.emptySectionText}>No verified attribute data yet. Add performance records to populate this chart.</Text>
          )}
        </RevealCard>

        {/* ── CAREER TRAJECTORY ────────────────────────────────────────── */}
        <RevealCard index={3} reduced={reduced}>
          <View style={s.careerHeader}>
            <SH title="Career Trajectory" color={Colors.primary} />
            <View style={s.top15}>
              <Sparkles color={Colors.accent} size={11} />
              <Text style={s.top15Txt}>Live</Text>
            </View>
          </View>
          {CAREER.actual.length ? (
            <>
              <LineAreaChart actual={CAREER.actual} forecast={CAREER.forecast} w={SW - 64} h={110} />
              <View style={s.yearRow}>
                {CAREER.years.map(y => <Text key={y} style={s.yearLabel}>{y}</Text>)}
              </View>
              <View style={s.legendRow}>
                {[
                  { label: 'Actual', color: Colors.primary },
                  { label: 'AI Forecast', color: Colors.accent, dashed: true },
                ].map(l => (
                  <View key={l.label} style={s.legendItem}>
                    <View style={[s.legendLine, { backgroundColor: l.color }]} />
                    <Text style={s.legendTxt}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={s.emptySectionText}>No career trajectory data yet.</Text>
          )}
        </RevealCard>

        {/* ── SCOUT INTEL ──────────────────────────────────────────────── */}
        <RevealCard index={4} reduced={reduced} style={{ borderColor: `${Colors.success}30` }}>
          <LinearGradient
            colors={[`${Colors.success}0A`, Colors.surface]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: Radii.lg }]}
          />
          <SH title="Scout Interest" color={Colors.success} onMore={() => router.push('/(tabs)/network' as any)} />
          {SCOUTS.map((sc, i) => (
            <View key={sc.name} style={[s.scoutRow, i < SCOUTS.length - 1 && s.scoutBorder]}>
              <View style={[s.scoutAv, { backgroundColor: `${sc.color}22`, borderColor: sc.color }]}>
                <Text style={[s.scoutAvTxt, { color: sc.color }]}>{sc.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.scoutNameRow}>
                  <Text style={s.scoutName}>{sc.name}</Text>
                  {sc.verified && <BadgeCheck color={Colors.primary} size={12} />}
                </View>
                <Text style={s.scoutRole}>{sc.role}</Text>
              </View>
              <View style={s.scoutRight}>
                <Text style={[s.scoutViews, { color: Colors.success }]}>{sc.views} views</Text>
                <Text style={s.scoutTime}>{sc.time}</Text>
              </View>
            </View>
          ))}
          {SCOUTS.length === 0 && <Text style={s.emptySectionText}>No scout profile views yet.</Text>}
        </RevealCard>

        {/* ── MATCHED OPPORTUNITIES ────────────────────────────────────── */}
        <RevealCard index={5} reduced={reduced} style={{ borderColor: `${Colors.warning}30` }}>
          <LinearGradient
            colors={[`${Colors.warning}0A`, Colors.surface]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: Radii.lg }]}
          />
          <SH title="Matched Opportunities" color={Colors.warning} onMore={() => router.push('/(tabs)/opportunities' as any)} />
          {OPPS.map(opp => (
            <View key={opp.title} style={s.oppCard}>
              <View style={s.oppRow}>
                <View style={s.oppMatchWrap}>
                  <GaugeArc value={opp.match} max={100} size={52} sw={5}
                    color={opp.match >= 90 ? Colors.success : Colors.warning}
                    bg={Colors.elevated}
                  />
                  <View style={s.oppMatchCenter}>
                    <Text style={s.oppMatchPct}>{opp.match}%</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.oppBadgeRow}>
                    {opp.isNew && <View style={s.oppNew}><Text style={s.oppNewTxt}>New</Text></View>}
                    <View style={[s.oppTag, {
                      backgroundColor: opp.tag === 'Hot Match' ? `${Colors.error}20` : `${Colors.primary}20`,
                    }]}>
                      <Text style={[s.oppTagTxt, {
                        color: opp.tag === 'Hot Match' ? Colors.error : Colors.primary,
                      }]}>{opp.tag}</Text>
                    </View>
                  </View>
                  <Text style={s.oppTitle}>{opp.title}</Text>
                  <Text style={s.oppClub}>{opp.club}</Text>
                  <View style={s.oppMeta}>
                    <MapPin color={Colors.textDisabled} size={10} />
                    <Text style={s.oppLoc}>{opp.loc}</Text>
                    <Text style={[s.oppSalary, { color: Colors.success }]}>{opp.salary}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
          {OPPS.length === 0 && <Text style={s.emptySectionText}>No matched opportunities yet. Complete your sport and position to improve matching.</Text>}
        </RevealCard>

        {/* ── LAST 5 PERFORMANCES ──────────────────────────────────────── */}
        <RevealCard index={6} reduced={reduced}>
          <SH title="Last 5 Performances" color={Colors.primary} onMore={() => router.push('/(tabs)/performance' as any)} />
          {FORM.map((m, i) => {
            const resultColor = m.r === 'W' ? Colors.success : m.r === 'D' ? Colors.warning : Colors.error;
            return (
              <View key={i} style={[s.matchRow, i < FORM.length - 1 && s.matchBorder]}>
                <View style={[s.mrBadge, { backgroundColor: `${resultColor}22`, borderColor: resultColor }]}>
                  <Text style={[s.mrTxt, { color: resultColor }]}>{m.r}</Text>
                </View>
                <Text style={s.matchOpp}>{m.opp}</Text>
                <View style={s.matchStats}>
                  <Text style={s.matchRating}>{m.rating.toFixed(1)}</Text>
                  <Text style={s.matchGoals}>{m.g}G {m.a}A</Text>
                </View>
              </View>
            );
          })}
          {FORM.length === 0 && <Text style={s.emptySectionText}>No recent match records yet.</Text>}
        </RevealCard>

        {/* ── MEDICAL INTEL ────────────────────────────────────────────── */}
        <RevealCard index={7} reduced={reduced} style={{ borderColor: `${Colors.success}30` }}>
          <SH title="Medical Intelligence" color={Colors.success} onMore={() => router.push('/(tabs)/medical' as any)} />
          <View style={s.medRow}>
            <View style={[s.medIconWrap, { backgroundColor: `${Colors.success}18` }]}>
              <Shield color={Colors.success} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.medPill}>
                <Text style={s.medPillTxt}>PENDING · No active clearance</Text>
              </View>
              <Text style={s.medDesc}>Medical intelligence will appear when a partner-issued clearance is available.</Text>
            </View>
          </View>
          <View style={s.medFooter}>
            <Clock color={Colors.textDisabled} size={11} />
            <Text style={s.medTime}>Last verified: —</Text>
            <BadgeCheck color={Colors.primary} size={12} />
            <Text style={s.medVerified}>Verified</Text>
          </View>
        </RevealCard>

        {/* ── AI COACH ─────────────────────────────────────────────────── */}
        <RevealCard index={8} reduced={reduced} style={{ borderColor: `${Colors.primary}50` }}>
          <LinearGradient
            colors={[`${Colors.primary}14`, Colors.surface]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: Radii.lg }]}
          />
          <View style={s.aiTop}>
            <View style={s.aiAvWrap}>
              {!reduced && <PulseRing color={Colors.primary} size={46} reduced={reduced} />}
              <View style={s.aiAv}>
                <Zap color={Colors.bg} size={18} fill={Colors.bg} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.aiName}>AI Career Coach</Text>
              <View style={s.aiOnlineRow}>
                <View style={s.aiDot} />
                <Text style={s.aiOnline}>Online · Ready</Text>
              </View>
            </View>
          </View>
          <View style={s.aiBubble}>
            <Text style={s.aiBubbleTxt}>
              Your dashboard is connected to live AceAiX data. Complete profile, media, performance,
              and medical records to improve the guidance shown here.
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
            {['Improve my score', 'Matching clubs', 'Training plan'].map(chip => (
              <TouchableOpacity key={chip} style={s.aiChip} onPress={() => router.push('/(tabs)/ai-coach' as any)}>
                <Text style={s.aiChipTxt}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={s.aiInput} onPress={() => router.push('/(tabs)/ai-coach' as any)}>
            <Text style={s.aiPlaceholder}>Ask your AI coach…</Text>
            <MessageCircle color={Colors.primary} size={18} />
          </TouchableOpacity>
        </RevealCard>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  scroll:  { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },

  // ── Hero
  hero: {
    borderRadius: Radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    ...Shadows.glow(Colors.primary),
  },
  heroInner:   { padding: Spacing.lg },
  glowBlob:    { position: 'absolute', borderRadius: 9999, opacity: 1 },
  heroTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  livePill:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${Colors.success}18`, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: `${Colors.success}35` },
  liveDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  liveTxt:     { fontFamily: Typography.family.display, fontSize: 10, color: Colors.success, letterSpacing: 1.8 },
  verifiedTxt: { fontFamily: Typography.family.medium, fontSize: 11, color: Colors.textMuted },
  heroGreeting: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, marginBottom: 2 },
  heroName:    { fontFamily: Typography.family.display, fontSize: 38, color: Colors.textPrimary, letterSpacing: -1, lineHeight: 40, marginBottom: 4 },
  heroBio:     { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textMuted, marginBottom: Spacing.md },
  heroScoreStrip: { flexDirection: 'row', gap: 2, marginBottom: Spacing.md },
  heroScoreItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: Radii.sm, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  heroScoreVal: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg },
  heroScoreLbl: { fontFamily: Typography.family.display, fontSize: 9, color: Colors.textDisabled, letterSpacing: 1 },
  formRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  formLabel:   { fontFamily: Typography.family.display, fontSize: 9, color: Colors.textDisabled, letterSpacing: 1.5, marginBottom: 7 },
  fc:    { width: 30, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  fw:    { backgroundColor: `${Colors.success}28`, borderWidth: 1.5, borderColor: Colors.success },
  fd:    { backgroundColor: `${Colors.warning}28`, borderWidth: 1.5, borderColor: Colors.warning },
  fl:    { backgroundColor: `${Colors.error}28`,   borderWidth: 1.5, borderColor: Colors.error   },
  fcTxt: { fontFamily: Typography.family.bold, fontSize: 11, color: Colors.textPrimary },
  viewPubBtn: { backgroundColor: `${Colors.primary}18`, borderRadius: Radii.md, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: `${Colors.primary}35` },
  viewPubTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.primary },

  // ── Stat scroll
  statScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingVertical: 2 },
  statCard: {
    width: 148, borderRadius: Radii.lg, overflow: 'hidden',
    padding: Spacing.md, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    ...Shadows.card,
  },
  statIconWrap:   { width: 32, height: 32, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  statNum:        { fontFamily: Typography.family.display, fontSize: 26, letterSpacing: -1 },
  statLbl:        { fontFamily: Typography.family.medium, fontSize: 11, color: Colors.textMuted },
  statDeltaRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statDeltaBadge: { borderRadius: Radii.full, paddingHorizontal: 7, paddingVertical: 2 },
  statDeltaTxt:   { fontFamily: Typography.family.bold, fontSize: 10 },
  statSub:        { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textDisabled },

  // ── Card base
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  // Section tag header
  sh:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sectionTag:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, backgroundColor: 'transparent' },
  sectionTagBar: { width: 3, height: 12, borderRadius: 2 },
  sectionTagTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, letterSpacing: 0.8 },
  shMore:        { flexDirection: 'row', alignItems: 'center', gap: 2 },
  shMoreTxt:     { fontFamily: Typography.family.medium, fontSize: Typography.size.xs },

  // ── Visibility
  visRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
  visGaugeWrap:   { alignItems: 'center', justifyContent: 'center', width: 110, height: 110 },
  visCenter:      { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  visScore:       { fontFamily: Typography.family.display, fontSize: 28, letterSpacing: -1 },
  visMax:         { fontFamily: Typography.family.regular, fontSize: 11, color: Colors.textMuted, marginTop: -4 },
  visRight:       { flex: 1, gap: Spacing.md },
  visMetric:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  visMetricLbl:   { fontFamily: Typography.family.display, fontSize: 9, color: Colors.textDisabled, letterSpacing: 1, flex: 1 },
  visMetricRow:   { alignItems: 'center', justifyContent: 'center' },
  visMiniCenter:  { position: 'absolute' },
  visMiniVal:     { fontFamily: Typography.family.bold, fontSize: 11 },
  visBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.accent}15`, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: `${Colors.accent}30` },
  visBadgeTxt:    { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.accent },

  // ── Attributes
  attrSubtitle: { fontFamily: Typography.family.mono, fontSize: 10, color: Colors.textDisabled, marginBottom: Spacing.md },
  attrRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  attrList:     { flex: 1, gap: 10 },
  attrItem:     { gap: 5 },
  attrLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  attrLabel:    { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textMuted },
  attrVal:      { fontFamily: Typography.family.bold, fontSize: Typography.size.xs },
  barBg:        { height: 5, backgroundColor: Colors.elevated, borderRadius: 3, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 3 },

  // ── Career chart
  careerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  top15:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.accent}18`, borderRadius: Radii.full, paddingHorizontal: 8, paddingVertical: 3 },
  top15Txt:     { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.accent },
  yearRow:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  yearLabel:    { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textDisabled },
  legendRow:    { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine:   { width: 16, height: 3, borderRadius: 2 },
  legendTxt:    { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },

  // ── Scouts
  scoutRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10 },
  scoutBorder:  { borderBottomWidth: 1, borderBottomColor: Colors.border },
  scoutAv:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  scoutAvTxt:   { fontFamily: Typography.family.bold, fontSize: Typography.size.md },
  scoutNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoutName:    { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  scoutRole:    { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 1 },
  scoutRight:   { alignItems: 'flex-end' },
  scoutViews:   { fontFamily: Typography.family.bold, fontSize: Typography.size.xs },
  scoutTime:    { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textDisabled },

  // ── Opportunities
  oppCard:      { backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  oppRow:       { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  oppMatchWrap: { alignItems: 'center', justifyContent: 'center', width: 52, height: 52 },
  oppMatchCenter: { position: 'absolute' },
  oppMatchPct:  { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.textPrimary },
  oppBadgeRow:  { flexDirection: 'row', gap: 5, marginBottom: 4 },
  oppNew:       { backgroundColor: `${Colors.success}20`, borderRadius: Radii.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: `${Colors.success}35` },
  oppNewTxt:    { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.success },
  oppTag:       { borderRadius: Radii.full, paddingHorizontal: 7, paddingVertical: 2 },
  oppTagTxt:    { fontFamily: Typography.family.bold, fontSize: 10 },
  oppTitle:     { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  oppClub:      { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textMuted, marginBottom: 5 },
  oppMeta:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  oppLoc:       { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textDisabled, flex: 1 },
  oppSalary:    { fontFamily: Typography.family.mono, fontSize: 10 },

  // ── Match history
  matchRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  matchBorder:  { borderBottomWidth: 1, borderBottomColor: Colors.border },
  mrBadge:      { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  mrTxt:        { fontFamily: Typography.family.bold, fontSize: 11 },
  matchOpp:     { flex: 1, fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary },
  matchStats:   { alignItems: 'flex-end' },
  matchRating:  { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.primary },
  matchGoals:   { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textMuted },

  // ── Medical
  medRow:       { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', marginBottom: Spacing.sm },
  medIconWrap:  { width: 44, height: 44, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  medPill:      { backgroundColor: `${Colors.success}18`, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6, borderWidth: 1, borderColor: `${Colors.success}30` },
  medPillTxt:   { fontFamily: Typography.family.display, fontSize: 9, color: Colors.success, letterSpacing: 1 },
  medDesc:      { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, lineHeight: 18 },
  medFooter:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  medTime:      { fontFamily: Typography.family.mono, fontSize: 10, color: Colors.textDisabled, flex: 1 },
  medVerified:  { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.primary },

  // ── AI Coach
  aiTop:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  aiAvWrap:     { alignItems: 'center', justifyContent: 'center', width: 46, height: 46 },
  aiAv:         { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  aiName:       { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  aiOnlineRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  aiDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  aiOnline:     { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.success },
  aiBubble:     { backgroundColor: `${Colors.primary}10`, borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.primary, borderWidth: 1, borderColor: `${Colors.primary}20` },
  aiBubbleTxt:  { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary, lineHeight: 20 },
  aiChip:       { backgroundColor: `${Colors.primary}15`, borderRadius: Radii.full, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: `${Colors.primary}28` },
  aiChipTxt:    { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.primary },
  aiInput:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.elevated, borderRadius: Radii.md, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
  aiPlaceholder: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled },
  emptySectionText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 20 },
});
