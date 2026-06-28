import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BadgeCheck,
  ChevronLeft,
  MapPin,
  Calendar,
  Star,
  Zap,
  Target,
  Activity,
  Heart,
  Brain,
  TrendingUp,
  Award,
  RefreshCw,
  Lock,
  ChevronRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import {
  fetchSportifyResults,
  fetchConsent,
  SportifyResult,
  RecommendedSport,
  SportifyConsent,
  METRIC_LABELS,
} from '@/lib/sportifyService';
import { useAuth } from '@/context/AuthContext';

const { width: SW } = Dimensions.get('window');

const SPORT_PALETTE = [
  { color: Colors.accent, bg: Colors.accentDim, border: `${Colors.accent}50` },
  { color: Colors.primary, bg: Colors.primaryDim, border: `${Colors.primary}50` },
  { color: Colors.success, bg: `${Colors.success}15`, border: `${Colors.success}50` },
  { color: Colors.warning, bg: `${Colors.warning}15`, border: `${Colors.warning}50` },
];

const ATHLETICISM_DIMENSIONS: { key: string; label: string; icon: any; color: string }[] = [
  { key: 'overall_athleticism', label: 'Overall Athleticism', icon: Activity, color: Colors.accent },
  { key: 'explosiveness', label: 'Explosiveness', icon: Zap, color: Colors.warning },
  { key: 'coordination', label: 'Coordination', icon: Target, color: Colors.primary },
  { key: 'endurance_base', label: 'Endurance Base', icon: Heart, color: Colors.success },
];

export default function SportifyTalentScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const [results, setResults] = useState<SportifyResult[]>([]);
  const [consent, setConsent] = useState<SportifyConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    if (!user) return;
    if (showRefresh) setRefreshing(true);
    const [r, c] = await Promise.all([
      fetchSportifyResults(user.id),
      fetchConsent(user.id),
    ]);
    setResults(r);
    setConsent(c);
    if (showRefresh) setRefreshing(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [user]);

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    await load();
    setSyncing(false);
  };

  const consentActive = consent?.granted_at && !consent.revoked_at;
  const talentResult = results.find((r) => r.test_type === 'talent');
  const physicalResults = results.filter((r) => r.test_type === 'physical');
  const latestPhysical = physicalResults[0];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ChevronLeft color={Colors.textPrimary} size={22} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.verifiedBadge}>
            <BadgeCheck color={Colors.primary} size={12} />
            <Text style={s.verifiedTxt}>Sportify Academy</Text>
          </View>
          <Text style={s.headerTitle}>Talent Profile</Text>
        </View>
        <TouchableOpacity style={s.syncIconBtn} onPress={handleSync} disabled={syncing}>
          <RefreshCw color={syncing ? Colors.textDisabled : Colors.primary} size={18} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxxl }} />
      ) : !consentActive ? (
        <NoConsentState onGoSettings={() => router.push('/(tabs)/settings' as any)} />
      ) : !talentResult ? (
        <NoTalentState onSync={handleSync} syncing={syncing} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />
          }
        >
          <HeroSection result={talentResult} />
          <SportMatchesSection sports={talentResult.recommended_sports as RecommendedSport[]} />
          <AthleticismSection metrics={talentResult.metrics as Record<string, number>} />
          {latestPhysical && <PhysicalFoundationSection result={latestPhysical} />}
          <AssessmentDetailsSection result={talentResult} />
        </ScrollView>
      )}
    </View>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection({ result }: { result: SportifyResult }) {
  const metrics = result.metrics as Record<string, number>;
  const overall = metrics.overall_athleticism ?? 0;
  const topSport = (result.recommended_sports as RecommendedSport[])[0];

  return (
    <LinearGradient
      colors={[`${Colors.accent}14`, Colors.bg]}
      style={hero.wrap}
    >
      {/* Overall score ring */}
      <View style={hero.ringWrap}>
        <ScoreRing score={overall} size={140} color={Colors.accent} />
        <View style={hero.ringInner}>
          <Text style={hero.ringScore}>{overall}</Text>
          <Text style={hero.ringLabel}>/ 100</Text>
        </View>
      </View>

      <Text style={hero.title}>Overall Athleticism</Text>
      <Text style={hero.sub}>
        Assessed {fmtDate(result.tested_at)} · {result.academy_location ?? 'Sportify Academy'}
      </Text>

      {topSport && (
        <View style={hero.topSportBadge}>
          <Star color={Colors.accent} size={12} fill={Colors.accent} />
          <Text style={hero.topSportTxt}>Top sport match: <Text style={{ color: Colors.accent }}>{topSport.sport}</Text></Text>
        </View>
      )}
    </LinearGradient>
  );
}

// ── Sport Matches ─────────────────────────────────────────────────────────────

function SportMatchesSection({ sports }: { sports: RecommendedSport[] }) {
  if (!sports.length) return null;
  return (
    <SectionCard title="Sport Fit Rankings" icon={<Award color={Colors.accent} size={16} />}>
      <View style={sm.list}>
        {sports.map((s, i) => (
          <SportMatchRow key={i} sport={s} rank={i} />
        ))}
      </View>
    </SectionCard>
  );
}

function SportMatchRow({ sport, rank }: { sport: RecommendedSport; rank: number }) {
  const pal = SPORT_PALETTE[rank] ?? SPORT_PALETTE[3];
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: sport.potential_score / 100,
      duration: 700 + rank * 120,
      useNativeDriver: false,
    }).start();
  }, [sport.potential_score]);

  return (
    <View style={[sm.row, { borderColor: pal.border, backgroundColor: pal.bg }]}>
      <View style={sm.rowTop}>
        <View style={sm.rankBadge}>
          <Text style={[sm.rankNum, { color: pal.color }]}>#{rank + 1}</Text>
        </View>
        <View style={sm.rowInfo}>
          <View style={sm.rowTitleRow}>
            <Text style={sm.sportName}>{sport.sport}</Text>
            {rank === 0 && (
              <View style={sm.topPickChip}>
                <Star color={Colors.accent} size={9} fill={Colors.accent} />
                <Text style={sm.topPickTxt}>Top Pick</Text>
              </View>
            )}
          </View>
          <View style={sm.barTrack}>
            <Animated.View
              style={[
                sm.barFill,
                { backgroundColor: pal.color, width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>
        </View>
        <Text style={[sm.score, { color: pal.color }]}>{sport.potential_score}<Text style={sm.scorePct}>%</Text></Text>
      </View>
      {sport.strengths.length > 0 && (
        <View style={sm.strengthsRow}>
          {sport.strengths.map((str, i) => (
            <View key={i} style={[sm.chip, { borderColor: pal.border }]}>
              <Text style={[sm.chipTxt, { color: pal.color }]}>{str}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Athleticism ───────────────────────────────────────────────────────────────

function AthleticismSection({ metrics }: { metrics: Record<string, number> }) {
  const available = ATHLETICISM_DIMENSIONS.filter((d) => metrics[d.key] != null);
  if (!available.length) return null;
  return (
    <SectionCard title="Athleticism Profile" icon={<Activity color={Colors.primary} size={16} />}>
      <View style={ath.list}>
        {available.map((dim) => (
          <AthleticismBar
            key={dim.key}
            label={dim.label}
            value={metrics[dim.key]}
            color={dim.color}
            Icon={dim.icon}
          />
        ))}
      </View>
    </SectionCard>
  );
}

function AthleticismBar({
  label,
  value,
  color,
  Icon,
}: {
  label: string;
  value: number;
  color: string;
  Icon: any;
}) {
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: value / 100,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const tier = value >= 90 ? 'Elite' : value >= 80 ? 'Advanced' : value >= 70 ? 'High' : value >= 60 ? 'Good' : 'Developing';

  return (
    <View style={ath.row}>
      <View style={ath.rowLeft}>
        <View style={[ath.iconWrap, { backgroundColor: `${color}18` }]}>
          <Icon color={color} size={14} />
        </View>
        <Text style={ath.label}>{label}</Text>
      </View>
      <View style={ath.barWrap}>
        <View style={ath.barTrack}>
          <Animated.View
            style={[
              ath.barFill,
              {
                backgroundColor: color,
                width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
          {/* Glow cap */}
          <Animated.View
            style={[
              ath.barGlow,
              {
                backgroundColor: color,
                left: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>
        <View style={ath.barLabels}>
          <Text style={[ath.value, { color }]}>{value}</Text>
          <Text style={[ath.tier, { color }]}>{tier}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Physical Foundation ───────────────────────────────────────────────────────

function PhysicalFoundationSection({ result }: { result: SportifyResult }) {
  const metrics = result.metrics as Record<string, number>;
  const entries = Object.entries(metrics).filter(([k]) => METRIC_LABELS[k]);

  if (!entries.length) return null;

  return (
    <SectionCard
      title="Physical Foundation"
      subtitle="Supporting data from latest physical test"
      icon={<Zap color={Colors.warning} size={16} />}
    >
      <View style={pf.grid}>
        {entries.map(([key, val]) => {
          const meta = METRIC_LABELS[key];
          if (!meta) return null;
          return (
            <View key={key} style={pf.card}>
              <Text style={pf.metricVal}>
                {val}
                <Text style={pf.metricUnit}> {meta.unit}</Text>
              </Text>
              <Text style={pf.metricLabel} numberOfLines={2}>{meta.label}</Text>
            </View>
          );
        })}
      </View>
      <View style={pf.footer}>
        <MapPin color={Colors.textDisabled} size={11} />
        <Text style={pf.footerTxt}>{result.academy_location ?? 'Sportify Academy'}</Text>
        <Text style={pf.dot}>·</Text>
        <Calendar color={Colors.textDisabled} size={11} />
        <Text style={pf.footerTxt}>{fmtDate(result.tested_at)}</Text>
      </View>
    </SectionCard>
  );
}

// ── Assessment Details ────────────────────────────────────────────────────────

function AssessmentDetailsSection({ result }: { result: SportifyResult }) {
  return (
    <SectionCard title="Assessment Details" icon={<BadgeCheck color={Colors.primary} size={16} />}>
      <View style={ad.list}>
        <DetailRow label="Assessment Date" value={fmtDateFull(result.tested_at)} />
        <DetailRow label="Location" value={result.academy_location ?? 'Sportify Academy'} />
        <DetailRow label="Method" value={result.method === 'camera' ? 'Camera-Based Analysis' : 'In-Person Assessment'} />
        <DetailRow label="Data Source" value={result.source} />
        {result.verification_ref && (
          <DetailRow label="Verification Ref" value={result.verification_ref} accent />
        )}
        <DetailRow label="Last Synced" value={fmtDateFull(result.last_synced_at)} />
      </View>
      <View style={ad.footer}>
        <BadgeCheck color={Colors.primary} size={12} />
        <Text style={ad.footerTxt}>Verified by Sportify Academy · Derived scores only · Not self-reported</Text>
      </View>
    </SectionCard>
  );
}

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={ad.row}>
      <Text style={ad.rowLabel}>{label}</Text>
      <Text style={[ad.rowValue, accent && { color: Colors.primary }]}>{value}</Text>
    </View>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={sc.wrap}>
      <View style={sc.header}>
        <View style={sc.headerLeft}>
          {icon}
          <View>
            <Text style={sc.title}>{title}</Text>
            {subtitle && <Text style={sc.subtitle}>{subtitle}</Text>}
          </View>
        </View>
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}

function ScoreRing({ score, size, color }: { score: number; size: number; color: string }) {
  const stroke = 10;
  const r = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      {/* Track ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: `${color}20`,
        }}
      />
      {/* Score arc approximated via multiple overlapping borders */}
      {/* SVG not available in RN without react-native-svg; use a conic-gradient approximation */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: color,
          borderRightColor: score > 75 ? color : 'transparent',
          borderBottomColor: score > 50 ? color : 'transparent',
          borderLeftColor: score > 25 ? color : 'transparent',
          transform: [{ rotate: '-90deg' }],
          opacity: 0.9,
        }}
      />
    </View>
  );
}

function NoTalentState({ onSync, syncing }: { onSync: () => void; syncing: boolean }) {
  return (
    <View style={nt.wrap}>
      <Brain color={Colors.textFaint} size={52} strokeWidth={1.5} />
      <Text style={nt.title}>No Talent Assessment Yet</Text>
      <Text style={nt.sub}>
        Sync your Sportify Academy account to import your talent potential assessment and sport recommendations.
      </Text>
      <TouchableOpacity style={nt.btn} onPress={onSync} disabled={syncing}>
        {syncing ? (
          <ActivityIndicator size="small" color={Colors.black} />
        ) : (
          <>
            <RefreshCw color={Colors.black} size={14} />
            <Text style={nt.btnTxt}>Sync Now</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function NoConsentState({ onGoSettings }: { onGoSettings: () => void }) {
  return (
    <View style={nc.wrap}>
      <Lock color={Colors.textFaint} size={48} strokeWidth={1.5} />
      <Text style={nc.title}>Consent Required</Text>
      <Text style={nc.sub}>
        Link your Sportify Academy account in Settings to access your talent profile.
      </Text>
      <TouchableOpacity style={nc.btn} onPress={onGoSettings}>
        <Text style={nc.btnTxt}>Go to Settings</Text>
        <ChevronRight color={Colors.black} size={14} />
      </TouchableOpacity>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function fmtDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.sm },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderWidth: 1, borderColor: `${Colors.primary}40` },
  verifiedTxt: { fontFamily: Typography.family.bold, fontSize: 9, color: Colors.primary },
  syncIconBtn: { padding: Spacing.sm },
  scrollContent: { paddingBottom: Spacing.giant },
});

const hero = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: Spacing.xxxl, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  ringWrap: { position: 'relative', width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  ringInner: { position: 'absolute', alignItems: 'center' },
  ringScore: { fontFamily: Typography.family.display, fontSize: 44, color: Colors.accent, lineHeight: 48 },
  ringLabel: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: -4 },
  title: { fontFamily: Typography.family.display, fontSize: Typography.size.xxl, color: Colors.textPrimary },
  sub: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled, textAlign: 'center' },
  topSportBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.accentDim, borderRadius: Radii.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: `${Colors.accent}40`, marginTop: Spacing.xs },
  topSportTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary },
});

const sm = StyleSheet.create({
  list: { gap: Spacing.md },
  row: { borderRadius: Radii.md, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rankBadge: { width: 32, alignItems: 'center' },
  rankNum: { fontFamily: Typography.family.display, fontSize: Typography.size.xl },
  rowInfo: { flex: 1, gap: Spacing.sm },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sportName: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  topPickChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.accentDim, borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderWidth: 1, borderColor: `${Colors.accent}50` },
  topPickTxt: { fontFamily: Typography.family.bold, fontSize: 9, color: Colors.accent },
  barTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radii.full, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: Radii.full },
  score: { fontFamily: Typography.family.display, fontSize: Typography.size.xxl, minWidth: 52, textAlign: 'right' },
  scorePct: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  strengthsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { borderRadius: Radii.full, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: 3 },
  chipTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs },
});

const ath = StyleSheet.create({
  list: { gap: Spacing.lg },
  row: { gap: Spacing.sm },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconWrap: { width: 28, height: 28, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary },
  barWrap: { gap: Spacing.xs },
  barTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: Radii.full, overflow: 'visible', position: 'relative' },
  barFill: { height: 8, borderRadius: Radii.full },
  barGlow: { position: 'absolute', top: -2, width: 4, height: 12, borderRadius: 2, opacity: 0.8, marginLeft: -4 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  value: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm },
  tier: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, opacity: 0.7 },
});

const pf = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  card: {
    width: (SW - Spacing.lg * 2 - Spacing.xl * 2 - Spacing.sm * 2) / 3,
    backgroundColor: Colors.elevated,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  metricVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.md, color: Colors.textPrimary, textAlign: 'center' },
  metricUnit: { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textDisabled },
  metricLabel: { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs },
  footerTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },
  dot: { color: Colors.textFaint },
});

const ad = StyleSheet.create({
  list: { gap: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: Spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  rowLabel: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled, flex: 1 },
  rowValue: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary, flex: 1.4, textAlign: 'right' },
  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginTop: Spacing.md, backgroundColor: `${Colors.primary}10`, borderRadius: Radii.sm, padding: Spacing.sm, borderWidth: 1, borderColor: `${Colors.primary}25` },
  footerTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled, flex: 1, lineHeight: 16 },
});

const sc = StyleSheet.create({
  wrap: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  subtitle: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled, marginTop: 1 },
  body: { padding: Spacing.lg },
});

const nt = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', paddingTop: Spacing.giant, paddingHorizontal: Spacing.xxxl, gap: Spacing.lg },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textMuted },
  sub: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled, textAlign: 'center', lineHeight: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.accent, borderRadius: Radii.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  btnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.black },
});

const nc = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxl, gap: Spacing.lg },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textMuted },
  sub: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled, textAlign: 'center', lineHeight: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.accent, borderRadius: Radii.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  btnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.black },
});
