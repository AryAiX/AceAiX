import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Calendar,
  Bookmark,
  Zap,
  BadgeCheck,
  Trophy,
  ChevronRight,
  Flame,
  Target,
  Star,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { FilterSheet } from '@/components/opportunities/FilterSheet';
import { OpportunityDetail } from '@/components/opportunities/OpportunityDetail';
import { ApplySheet } from '@/components/opportunities/ApplySheet';
import { Colors, Spacing, Radii, Typography, Shadows } from '@/constants/theme';
import {
  Opportunity,
  Application,
  OpportunityFilters,
  fetchForYouOpportunities,
  fetchAllOpportunities,
  fetchSavedOpportunities,
  fetchMyApplications,
  toggleOpportunitySave,
  formatSalary,
  deadlineLabel,
  oppTimeAgo,
  APP_STATUS_LABELS,
  APP_STATUS_COLORS,
} from '@/lib/opportunitiesService';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const { width: SW } = Dimensions.get('window');

type Tab = 'For You' | 'All' | 'Saved' | 'Applied';
const TABS: Tab[] = ['For You', 'All', 'Saved', 'Applied'];

// ── Type colors ───────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  Trial:    Colors.warning,
  Contract: Colors.primary,
  Academy:  Colors.success,
  Loan:     Colors.accent,
  Tryout:   Colors.error,
};

// ── Animation hooks ───────────────────────────────────────────────────────────
function useCountUp(to: number, delay = 300): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (to === 0) return;
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value: v }) => setVal(Math.round(v)));
    Animated.timing(anim, { toValue: to, duration: 900, delay, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [to]);
  return val;
}

// ── HeroBanner ────────────────────────────────────────────────────────────────
function HeroBanner({
  matchCount, hotCount, newCount, savedCount,
}: {
  matchCount: number; hotCount: number; newCount: number; savedCount: number;
}) {
  const cm = useCountUp(matchCount, 200);
  const ch = useCountUp(hotCount, 350);
  const cn = useCountUp(newCount, 500);
  const cs = useCountUp(savedCount, 650);

  const tiles = [
    { label: 'Matched',      value: cm, Icon: Target, color: Colors.primary },
    { label: 'Hot Match',    value: ch, Icon: Flame,  color: Colors.error   },
    { label: 'New Today',    value: cn, Icon: Star,   color: Colors.accent  },
    { label: 'Saved',        value: cs, Icon: Bookmark, color: Colors.success },
  ];

  return (
    <View style={hb.wrap}>
      {tiles.map(({ label, value, Icon, color }) => (
        <View key={label} style={hb.tile}>
          <LinearGradient
            colors={[`${color}22`, `${color}08`]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[hb.iconWrap, { backgroundColor: `${color}20` }]}>
            <Icon color={color} size={13} />
          </View>
          <Text style={[hb.value, { color }]}>{value}</Text>
          <Text style={hb.label}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const hb = StyleSheet.create({
  wrap:    { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  tile:    { flex: 1, borderRadius: Radii.lg, padding: Spacing.sm, alignItems: 'center', gap: 3, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  iconWrap:{ width: 26, height: 26, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  value:   { fontFamily: Typography.family.display, fontSize: Typography.size.lg },
  label:   { fontFamily: Typography.family.medium, fontSize: 9, color: Colors.textDisabled, textAlign: 'center' },
});

// ── HotBadge ──────────────────────────────────────────────────────────────────
function HotBadge() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 550, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[hot.wrap, { transform: [{ scale: pulse }] }]}>
      <Zap color={Colors.error} size={10} fill={Colors.error} />
      <Text style={hot.txt}>Hot</Text>
    </Animated.View>
  );
}

const hot = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radii.full, backgroundColor: `${Colors.error}20`, borderWidth: 1, borderColor: Colors.error },
  txt:  { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.error },
});

// ── OpportunityCard ───────────────────────────────────────────────────────────
function OpportunityCard({
  opp, onPress, onSave, onApply,
}: {
  opp: Opportunity; onPress: () => void; onSave: () => void; onApply: () => void;
}) {
  const salary   = formatSalary(opp);
  const deadline = deadlineLabel(opp.deadline);
  const score    = opp.match_score;
  const isHot    = score != null && score >= 85;
  const isNew    = Date.now() - new Date(opp.created_at).getTime() < 48 * 3600000;
  const typeColor  = TYPE_COLORS[opp.type] ?? Colors.primary;
  const scoreColor = score == null ? Colors.primary : score >= 85 ? Colors.error : score >= 70 ? Colors.warning : Colors.primary;

  // Entry animation
  const entryOpacity = useRef(new Animated.Value(0)).current;
  const entryY       = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(entryOpacity, { toValue: 1, duration: 360, delay: 60,  useNativeDriver: true }),
      Animated.timing(entryY,       { toValue: 0, duration: 360, delay: 60,  useNativeDriver: true }),
    ]).start();
  }, []);

  // Save scale animation
  const saveScale = useRef(new Animated.Value(1)).current;
  const handleSave = () => {
    Animated.sequence([
      Animated.spring(saveScale, { toValue: 1.35, useNativeDriver: true }),
      Animated.spring(saveScale, { toValue: 1,    useNativeDriver: true }),
    ]).start();
    onSave();
  };

  return (
    <Animated.View style={[
      c.card,
      isHot && { borderColor: `${Colors.error}45` },
      { opacity: entryOpacity, transform: [{ translateY: entryY }] },
    ]}>
      {/* Hot glow overlay */}
      {isHot && (
        <LinearGradient
          colors={[`${Colors.error}14`, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.45 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      {/* Type accent bar */}
      <View style={[c.accentBar, { backgroundColor: typeColor }]} />

      <View style={c.body}>
        {/* Header */}
        <View style={c.headerRow}>
          <LinearGradient
            colors={[`${typeColor}45`, `${typeColor}18`]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={c.crest}
          >
            <Text style={c.crestTxt}>{opp.club_abbr ?? opp.club.slice(0, 3).toUpperCase()}</Text>
          </LinearGradient>

          <View style={c.titleCol}>
            <Text style={c.position} numberOfLines={1}>{opp.position}</Text>
            <View style={c.clubRow}>
              <Text style={c.club} numberOfLines={1}>{opp.club}</Text>
              <BadgeCheck color={Colors.primary} size={12} />
            </View>
            <View style={c.metaRow}>
              <MapPin color={Colors.textDisabled} size={11} />
              <Text style={c.meta} numberOfLines={1}>{opp.location}</Text>
              {opp.level && <Text style={c.metaDot}>· {opp.level}</Text>}
            </View>
          </View>

          <View style={c.rightCol}>
            {score != null && (
              <View style={[c.scoreBadge, { backgroundColor: `${scoreColor}18`, borderColor: `${scoreColor}50` }]}>
                <Text style={[c.scoreNum, { color: scoreColor }]}>{score}</Text>
                <Text style={[c.scorePct, { color: scoreColor }]}>%</Text>
              </View>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${opp.saved ? 'Unsave' : 'Save'} opportunity ${opp.club}`}
              onPress={handleSave}
              hitSlop={8}
            >
              <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                <Bookmark
                  color={opp.saved ? Colors.accent : Colors.textFaint}
                  fill={opp.saved ? Colors.accent : 'transparent'}
                  size={18}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Salary */}
        {salary && (
          <View style={c.salaryRow}>
            <Text style={c.salary}>{salary}</Text>
          </View>
        )}

        {/* Badges + deadline */}
        <View style={c.badgesRow}>
          <View style={c.badgesLeft}>
            {isHot && <HotBadge />}
            <TypeChipSmall type={opp.type} color={typeColor} />
            {isNew && (
              <View style={c.newBadge}>
                <Text style={c.newTxt}>New</Text>
              </View>
            )}
          </View>
          <View style={c.deadlineRow}>
            <Calendar color={Colors.textDisabled} size={11} />
            <Text style={c.deadlineTxt}>{deadline}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={c.footer}>
          {opp.applied ? (
            <View style={c.appliedChip}>
              <BadgeCheck color={Colors.success} size={13} />
              <Text style={c.appliedTxt}>
                {APP_STATUS_LABELS[opp.application_status ?? 'applied']}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Apply to ${opp.club}`}
              style={c.applyBtn}
              onPress={onApply}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryGlow]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Zap color={Colors.white} size={14} fill={Colors.white} />
              <Text style={c.applyTxt}>Apply Now</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`View ${opp.club} opportunity details`}
            style={c.detailBtn}
            onPress={onPress}
          >
            <Text style={c.detailTxt}>Details</Text>
            <ChevronRight color={Colors.textMuted} size={13} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

function TypeChipSmall({ type, color }: { type: string; color: string }) {
  return (
    <View style={[tc.wrap, { borderColor: `${color}60`, backgroundColor: `${color}12` }]}>
      <Text style={[tc.txt, { color }]}>{type}</Text>
    </View>
  );
}

// ── ApplicationRow ────────────────────────────────────────────────────────────
function ApplicationRow({ app, onPress }: { app: Application; onPress: () => void }) {
  const opp     = app.opportunity;
  const color   = APP_STATUS_COLORS[app.status];
  const pulse   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (app.status !== 'applied') return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [app.status]);

  const typeColor = opp?.type ? (TYPE_COLORS[opp.type] ?? Colors.primary) : Colors.primary;

  return (
    <TouchableOpacity style={ar.card} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={[`${typeColor}22`, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[ar.accentBar, { backgroundColor: typeColor }]} />
      <LinearGradient
        colors={[`${typeColor}40`, `${typeColor}15`]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={ar.crest}
      >
        <Text style={ar.crestTxt}>{opp?.club_abbr ?? (opp?.club ?? '?').slice(0, 3).toUpperCase()}</Text>
      </LinearGradient>
      <View style={ar.body}>
        <Text style={ar.position} numberOfLines={1}>{opp?.position ?? 'Opportunity'}</Text>
        <Text style={ar.club} numberOfLines={1}>{opp?.club}</Text>
        <Text style={ar.time}>{oppTimeAgo(app.updated_at)}</Text>
      </View>
      <View style={[ar.statusPill, { borderColor: `${color}55`, backgroundColor: `${color}15` }]}>
        <Animated.View style={[ar.statusDot, { backgroundColor: color, opacity: pulse }]} />
        <Text style={[ar.statusTxt, { color }]}>{APP_STATUS_LABELS[app.status]}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
function EmptyState({ tab, onProfilePress }: { tab: Tab; onProfilePress: () => void }) {
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 2.4, duration: 1600, useNativeDriver: true }),
          Animated.timing(v, { toValue: 1,   duration: 0,    useNativeDriver: true }),
        ])
      );
    anim(ring1, 0).start();
    anim(ring2, 800).start();
  }, []);

  const r1o = ring1.interpolate({ inputRange: [1, 2.4], outputRange: [0.55, 0] });
  const r2o = ring2.interpolate({ inputRange: [1, 2.4], outputRange: [0.35, 0] });

  const messages: Record<Tab, { title: string; body: string; cta?: boolean }> = {
    'For You': { title: 'No matches yet',          body: 'Complete your profile to improve opportunity matching.', cta: true },
    All:       { title: 'No opportunities',         body: 'Check back soon — new opportunities are added daily.' },
    Saved:     { title: 'No saved opportunities',   body: 'Bookmark opportunities to find them here quickly.' },
    Applied:   { title: 'No applications yet',      body: 'Browse opportunities and express your interest.' },
  };
  const m = messages[tab];

  return (
    <View style={es.wrap}>
      <View style={es.ringCenter}>
        <Animated.View style={[es.ring, { transform: [{ scale: ring1 }], opacity: r1o, borderColor: Colors.primary }]} />
        <Animated.View style={[es.ring, { transform: [{ scale: ring2 }], opacity: r2o, borderColor: Colors.accent  }]} />
        <View style={es.icon}>
          <Trophy color={Colors.primary} size={26} strokeWidth={1.5} />
        </View>
      </View>
      <Text style={es.title}>{m.title}</Text>
      <Text style={es.body}>{m.body}</Text>
      {m.cta && (
        <TouchableOpacity style={es.ctaBtn} onPress={onProfilePress}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryGlow]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={es.ctaTxt}>Complete Profile</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function OpportunitiesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const [tab, setTab]         = useState<Tab>('For You');
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const [searchText, setSearchText] = useState('');

  const [forYou, setForYou]   = useState<Opportunity[]>([]);
  const [all, setAll]         = useState<Opportunity[]>([]);
  const [saved, setSaved]     = useState<Opportunity[]>([]);
  const [applied, setApplied] = useState<Application[]>([]);

  const [loadingMap, setLoadingMap] = useState<Record<Tab, boolean>>({
    'For You': true, All: false, Saved: false, Applied: false,
  });
  const [refreshing,  setRefreshing]  = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const allCursorRef  = useRef<string | undefined>(undefined);
  const allHasMoreRef = useRef(true);
  const fetchedTabs   = useRef<Set<Tab>>(new Set());

  const [filterVisible, setFilterVisible] = useState(false);
  const [detailOpp,     setDetailOpp]     = useState<Opportunity | null>(null);
  const [applyOpp,      setApplyOpp]      = useState<Opportunity | null>(null);

  const indicatorX = useRef(new Animated.Value(0)).current;
  const tabW = (SW - Spacing.lg * 2) / TABS.length;

  const setLoading = (t: Tab, v: boolean) =>
    setLoadingMap(prev => ({ ...prev, [t]: v }));

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadForYou = useCallback(async () => {
    if (!user) return;
    const f = { ...filters, search: searchText || undefined };
    const data = await fetchForYouOpportunities(user.id, f);
    setForYou(data);
  }, [user, filters, searchText]);

  const loadAll = useCallback(async (reset = false) => {
    if (!user) return;
    const f = { ...filters, search: searchText || undefined };
    const cursor = reset ? undefined : allCursorRef.current;
    const data = await fetchAllOpportunities(user.id, cursor, f);
    if (data.length > 0) allCursorRef.current = data[data.length - 1].created_at;
    allHasMoreRef.current = data.length === 20;
    setAll(prev => reset ? data : [...prev, ...data]);
  }, [user, filters, searchText]);

  const loadSaved   = useCallback(async () => {
    if (!user) return;
    const data = await fetchSavedOpportunities(user.id);
    setSaved(data);
  }, [user]);

  const loadApplied = useCallback(async () => {
    if (!user) return;
    const data = await fetchMyApplications(user.id);
    setApplied(data);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading('For You', true);
    loadForYou().finally(() => setLoading('For You', false));
    fetchedTabs.current = new Set(['For You']);
  }, [user]);

  useEffect(() => {
    if (!user || fetchedTabs.current.has(tab)) return;
    fetchedTabs.current.add(tab);
    setLoading(tab, true);
    const loader = tab === 'All' ? loadAll(true) : tab === 'Saved' ? loadSaved() : loadApplied();
    loader.finally(() => setLoading(tab, false));
  }, [tab, user]);

  useEffect(() => {
    if (!user) return;
    if (tab === 'For You') {
      setLoading('For You', true);
      loadForYou().finally(() => setLoading('For You', false));
    } else if (tab === 'All') {
      allCursorRef.current = undefined;
      allHasMoreRef.current = true;
      setLoading('All', true);
      loadAll(true).finally(() => setLoading('All', false));
    }
  }, [filters, searchText]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`applications:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'applications', filter: `athlete_id=eq.${user.id}`,
      }, () => loadApplied())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user, loadApplied]);

  const onRefresh = async () => {
    setRefreshing(true);
    fetchedTabs.current = new Set();
    allCursorRef.current = undefined;
    allHasMoreRef.current = true;
    if (tab === 'For You') await loadForYou();
    if (tab === 'All')     await loadAll(true);
    if (tab === 'Saved')   await loadSaved();
    if (tab === 'Applied') await loadApplied();
    fetchedTabs.current.add(tab);
    setRefreshing(false);
  };

  const onLoadMoreAll = async () => {
    if (loadingMore || !allHasMoreRef.current || tab !== 'All') return;
    setLoadingMore(true);
    await loadAll(false);
    setLoadingMore(false);
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const handleSaveToggle = useCallback(async (oppId: string, nowSaved: boolean) => {
    if (!user) return;
    const update = (opp: Opportunity) => opp.id === oppId ? { ...opp, saved: nowSaved } : opp;
    setForYou(p => p.map(update));
    setAll(p => p.map(update));
    setSaved(p => nowSaved ? p : p.filter(o => o.id !== oppId));
    if (detailOpp?.id === oppId) setDetailOpp(prev => prev ? { ...prev, saved: nowSaved } : prev);
    await toggleOpportunitySave(oppId, user.id, !nowSaved);
  }, [user, detailOpp]);

  const handleApplied = useCallback((oppId: string, appId: string) => {
    const mark = (opp: Opportunity) =>
      opp.id === oppId ? { ...opp, applied: true, application_status: 'applied' as const, application_id: appId } : opp;
    setForYou(p => p.map(mark));
    setAll(p => p.map(mark));
    setSaved(p => p.map(mark));
    if (detailOpp?.id === oppId) setDetailOpp(prev => prev ? mark(prev) : prev);
    loadApplied();
  }, [detailOpp, loadApplied]);

  // ── Tab change ─────────────────────────────────────────────────────────────
  const handleTabChange = (t: Tab, idx: number) => {
    setTab(t);
    Animated.spring(indicatorX, {
      toValue: idx * tabW, useNativeDriver: true, tension: 80, friction: 10,
    }).start();
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;
  const currentData = tab === 'For You' ? forYou : tab === 'All' ? all : tab === 'Saved' ? saved : [];
  const isLoading   = loadingMap[tab];

  const matchCount = forYou.length;
  const hotCount   = forYou.filter(o => (o.match_score ?? 0) >= 85).length;
  const newCount   = forYou.filter(o => Date.now() - new Date(o.created_at).getTime() < 48 * 3600000).length;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <AppHeader title="Opportunities" />

      {/* Hero stats */}
      <HeroBanner
        matchCount={matchCount}
        hotCount={hotCount}
        newCount={newCount}
        savedCount={saved.length}
      />

      {/* Search + filter */}
      <View style={s.searchRow}>
        <View style={s.searchField}>
          <Search color={Colors.textDisabled} size={14} />
          <TextInput
            style={s.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Club, position, location…"
            placeholderTextColor={Colors.textDisabled}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={[s.filterBtn, activeFiltersCount > 0 && s.filterBtnActive]}
          onPress={() => setFilterVisible(true)}
        >
          <SlidersHorizontal color={activeFiltersCount > 0 ? Colors.primary : Colors.textMuted} size={17} />
          {activeFiltersCount > 0 && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeTxt}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Animated tabs */}
      <View style={s.tabsWrap}>
        <View style={s.tabsRow}>
          {TABS.map((t, i) => (
            <TouchableOpacity
              key={t}
              style={s.tabBtn}
              onPress={() => handleTabChange(t, i)}
              activeOpacity={0.75}
            >
              <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t}</Text>
              {t === 'Applied' && applied.length > 0 && (
                <View style={s.tabBadge}><Text style={s.tabBadgeTxt}>{applied.length}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.indicatorTrack}>
          <Animated.View style={[s.indicator, { width: tabW, transform: [{ translateX: indicatorX }] }]}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryGlow]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ flex: 1, borderRadius: 1 }}
            />
          </Animated.View>
        </View>
      </View>

      {/* Lists */}
      {tab === 'Applied' ? (
        isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxxl }} />
        ) : (
          <FlatList
            data={applied}
            keyExtractor={a => a.id}
            renderItem={({ item }) => (
              <ApplicationRow app={item} onPress={() => item.opportunity && setDetailOpp(item.opportunity)} />
            )}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<EmptyState tab="Applied" onProfilePress={() => router.push('/(tabs)/profile' as any)} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          />
        )
      ) : (
        isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxxl }} />
        ) : (
          <FlatList
            data={currentData}
            keyExtractor={o => o.id}
            renderItem={({ item }) => (
              <OpportunityCard
                opp={item}
                onPress={() => setDetailOpp(item)}
                onSave={() => handleSaveToggle(item.id, !item.saved)}
                onApply={() => !item.applied && setApplyOpp(item)}
              />
            )}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<EmptyState tab={tab} onProfilePress={() => router.push('/(tabs)/profile' as any)} />}
            ListFooterComponent={
              loadingMore ? <ActivityIndicator color={Colors.primary} style={{ paddingVertical: Spacing.xl }} /> : null
            }
            onEndReached={onLoadMoreAll}
            onEndReachedThreshold={0.4}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          />
        )
      )}

      <FilterSheet
        visible={filterVisible}
        filters={filters}
        onApply={f => { setFilters(f); fetchedTabs.current = new Set(); }}
        onClose={() => setFilterVisible(false)}
      />
      <OpportunityDetail
        opportunity={detailOpp}
        onClose={() => setDetailOpp(null)}
        onApply={opp => setApplyOpp(opp)}
        onSaveToggled={handleSaveToggle}
      />
      <ApplySheet
        opportunity={applyOpp}
        onClose={() => setApplyOpp(null)}
        onApplied={handleApplied}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  searchRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  searchField:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 9 },
  searchInput:    { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary },
  filterBtn:      { width: 42, height: 42, borderRadius: Radii.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive:{ borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  filterBadge:    { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  filterBadgeTxt: { fontFamily: Typography.family.bold, fontSize: 9, color: Colors.white },

  tabsWrap:       { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: Spacing.xs },
  tabsRow:        { flexDirection: 'row', paddingHorizontal: Spacing.lg },
  tabBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: 12 },
  tabTxt:         { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textDisabled },
  tabTxtActive:   { fontFamily: Typography.family.bold, color: Colors.primary },
  tabBadge:       { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  tabBadgeTxt:    { fontFamily: Typography.family.bold, fontSize: 9, color: Colors.white },
  indicatorTrack: { height: 2, backgroundColor: Colors.border },
  indicator:      { height: 2 },

  listContent:    { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl + 20 },
});

const c = StyleSheet.create({
  card:       { backgroundColor: Colors.surface, borderRadius: Radii.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadows.card },
  accentBar:  { height: 3 },
  body:       { padding: Spacing.lg, gap: Spacing.md },
  headerRow:  { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  crest:      { width: 50, height: 50, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  crestTxt:   { fontFamily: Typography.family.display, fontSize: Typography.size.xs, color: Colors.white, textAlign: 'center', letterSpacing: 0.5 },
  titleCol:   { flex: 1, gap: 2 },
  position:   { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  clubRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  club:       { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  meta:       { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },
  metaDot:    { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textFaint },
  rightCol:   { alignItems: 'flex-end', gap: Spacing.sm },
  scoreBadge: { borderRadius: Radii.sm, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  scoreNum:   { fontFamily: Typography.family.display, fontSize: Typography.size.md },
  scorePct:   { fontFamily: Typography.family.bold, fontSize: 9 },

  salaryRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${Colors.accent}10`, borderRadius: Radii.sm, paddingHorizontal: Spacing.sm, paddingVertical: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: `${Colors.accent}25` },
  salary:     { fontFamily: Typography.family.monoBold, fontSize: Typography.size.sm, color: Colors.accent },

  badgesRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgesLeft: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', alignItems: 'center' },
  newBadge:   { paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radii.full, backgroundColor: `${Colors.success}18`, borderWidth: 1, borderColor: `${Colors.success}50` },
  newTxt:     { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.success },
  deadlineRow:{ flexDirection: 'row', alignItems: 'center', gap: 3 },
  deadlineTxt:{ fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textDisabled },

  footer:      { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  applyBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radii.lg, paddingVertical: 11, overflow: 'hidden' },
  applyTxt:    { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },
  appliedChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: `${Colors.success}15`, borderRadius: Radii.lg, paddingVertical: 11, borderWidth: 1, borderColor: `${Colors.success}40` },
  appliedTxt:  { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.success },
  detailBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: Spacing.xs },
  detailTxt:   { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
});

const tc = StyleSheet.create({
  wrap: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radii.full, borderWidth: 1 },
  txt:  { fontFamily: Typography.family.bold, fontSize: 10 },
});

const ar = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radii.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadows.card },
  accentBar: { width: 3, alignSelf: 'stretch' },
  crest:     { width: 46, height: 46, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  crestTxt:  { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.white, textAlign: 'center' },
  body:      { flex: 1, paddingVertical: Spacing.md },
  position:  { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  club:      { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 1 },
  time:      { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textDisabled, marginTop: 2 },
  statusPill:{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radii.full, borderWidth: 1, marginRight: Spacing.md },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontFamily: Typography.family.bold, fontSize: 10 },
});

const es = StyleSheet.create({
  wrap:      { alignItems: 'center', paddingTop: Spacing.huge + Spacing.xl, paddingHorizontal: Spacing.xxxl, gap: Spacing.lg },
  ringCenter:{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  ring:      { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 1.5 },
  icon:      { width: 58, height: 58, borderRadius: 29, backgroundColor: `${Colors.primary}15`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${Colors.primary}30` },
  title:     { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textMuted },
  body:      { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled, textAlign: 'center', lineHeight: 20 },
  ctaBtn:    { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.full, overflow: 'hidden', marginTop: Spacing.sm },
  ctaTxt:    { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },
});
