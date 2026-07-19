import React, { useState, useRef, useEffect } from 'react';
import {
  Alert, View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
  Animated, AccessibilityInfo, Image, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Polygon, Line, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import {
  BadgeCheck, Edit3, MapPin, Globe, Share2,
  Zap, Shield, Activity, ChevronRight, Plus, UserCheck,
  Play, Eye, ThumbsUp, TrendingUp, Award, Star, Flame,
  Users, Radio, Target,
} from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { useChessStats } from '@/hooks/useChessStats';
import { useFootballStats } from '@/hooks/useFootballStats';
import { triggerChessSyncFull } from '@/lib/chessService';
import { triggerFootballSync } from '@/lib/footballService';
import { ChessPerformanceCard } from '@/components/performance/ChessPerformanceCard';
import { FootballStatsCard } from '@/components/performance/FootballStatsCard';
import { useRouter } from 'expo-router';
import { fetchMyPosts } from '@/lib/postsService';
import { supabase } from '@/lib/supabase';

const { width: SW } = Dimensions.get('window');

const SIMILAR_ATHLETES: Array<{ name: string; pos: string; club: string; score: number }> = [];
const NETWORK_LIST: Array<{ name: string; role: string; org: string; type: string; connected: boolean }> = [];
const SEASON_STATS: Array<{ label: string; value: string; sub: string }> = [];

interface ProfileHighlight {
  id: string;
  title: string;
  duration: string;
  tags: string[];
  views: string;
  featured: boolean;
  imageUrl?: string;
}

interface CareerEntry {
  club: string;
  role: string;
  period: string;
  caps: number;
  goals: number;
  current: boolean;
}

const TABS = ['Overview', 'Performance', 'Career', 'Network'];

const TAB_COLORS: Record<string, string> = {
  Overview: Colors.primary,
  Performance: Colors.accent,
  Career: Colors.warning,
  Network: Colors.success,
};

// ── Utilities ──────────────────────────────────────────────────────────────────
function attrColor(v: number) {
  if (v >= 88) return Colors.accent;
  if (v >= 78) return Colors.primary;
  if (v >= 60) return Colors.textMuted;
  return Colors.error;
}

// ── useCountUp ─────────────────────────────────────────────────────────────────
function useCountUp(to: number, duration = 1000, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const anim = new Animated.Value(0);
    anim.addListener(({ value: v }) => setVal(Math.round(v)));
    const t = setTimeout(() =>
      Animated.timing(anim, { toValue: to, duration, useNativeDriver: false }).start()
    , delay);
    return () => { clearTimeout(t); anim.removeAllListeners(); };
  }, [to]);
  return val;
}

// ── Animated arc gauge ─────────────────────────────────────────────────────────
function AnimGauge({ value, size = 96, sw = 9, color, reduced }: {
  value: number; size?: number; sw?: number; color: string; reduced: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(reduced ? value : 0);
  const r = (size - sw) / 2, circ = 2 * Math.PI * r, c = size / 2;

  useEffect(() => {
    if (reduced) { setDisplayValue(value); return; }
    const anim = new Animated.Value(0);
    anim.addListener(({ value: v }) => setDisplayValue(Math.round(v)));
    Animated.timing(anim, { toValue: value, duration: 1000, delay: 300, useNativeDriver: false }).start();
    return () => anim.removeAllListeners();
  }, []);

  const pct = Math.min(displayValue / 100, 1);
  const filled = pct * circ;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgGrad id={`g${color.replace('#','')}`} x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity="1" />
          <Stop offset="1" stopColor={color === Colors.accent ? '#A8D430' : Colors.primaryGlow} stopOpacity="1" />
        </SvgGrad>
      </Defs>
      <Circle cx={c} cy={c} r={r} stroke={`${color}20`} strokeWidth={sw} fill="none" />
      <Circle cx={c} cy={c} r={r} stroke={`url(#g${color.replace('#','')})`} strokeWidth={sw} fill="none"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform={`rotate(-90, ${c}, ${c})`}
      />
    </Svg>
  );
}

// ── Animated radar chart ───────────────────────────────────────────────────────
function AnimRadar({ data, labels, size = 180, reduced }: { data: number[]; labels: string[]; size?: number; reduced: boolean }) {
  const scale = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const cx = size / 2, cy = size / 2, maxR = size / 2 - 28;
  const n = data.length;
  const angles = data.map((_, i) => (i * 2 * Math.PI) / n - Math.PI / 2);
  const pts = (sc: number) => angles.map(a => `${cx + maxR * sc * Math.cos(a)},${cy + maxR * sc * Math.sin(a)}`).join(' ');

  const [scaleVal, setScaleVal] = useState(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    scale.addListener(({ value: v }) => setScaleVal(v));
    Animated.spring(scale, { toValue: 1, tension: 60, friction: 8, delay: 200, useNativeDriver: false } as any).start();
    return () => scale.removeAllListeners();
  }, []);

  const dataPts = data.map((v, i) =>
    `${cx + (v / 100) * scaleVal * maxR * Math.cos(angles[i])},${cy + (v / 100) * scaleVal * maxR * Math.sin(angles[i])}`
  ).join(' ');

  return (
    <View>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGrad id="rdarFill" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.35" />
            <Stop offset="1" stopColor={Colors.accent}  stopOpacity="0.15" />
          </SvgGrad>
        </Defs>
        {[0.25, 0.5, 0.75, 1].map(sc => (
          <Polygon key={sc} points={pts(sc)} stroke={Colors.border} strokeWidth="1" fill="none" />
        ))}
        {angles.map((a, i) => (
          <Line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke={Colors.border} strokeWidth="1" />
        ))}
        <Polygon points={dataPts} fill="url(#rdarFill)" stroke={Colors.primary} strokeWidth="2" />
        {data.map((v, i) => {
          const x = cx + (v / 100) * scaleVal * maxR * Math.cos(angles[i]);
          const y = cy + (v / 100) * scaleVal * maxR * Math.sin(angles[i]);
          const col = attrColor(v);
          return (
            <React.Fragment key={i}>
              <Circle cx={x} cy={y} r="5" fill={`${col}30`} />
              <Circle cx={x} cy={y} r="3" fill={col} />
            </React.Fragment>
          );
        })}
      </Svg>
      {labels.map((lbl, i) => {
        const lx = cx + (maxR + 14) * Math.cos(angles[i]);
        const ly = cy + (maxR + 14) * Math.sin(angles[i]);
        return (
          <View key={lbl} style={{ position: 'absolute', left: lx - 24, top: ly - 9, width: 48, alignItems: 'center' }}>
            <Text style={{ fontFamily: Typography.family.mono, fontSize: 9, color: attrColor(data[i] ?? 50), letterSpacing: 0.3 }}>
              {lbl}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── HUD corner frame ───────────────────────────────────────────────────────────
function HudFrame({ children, color = Colors.primary }: { children: React.ReactNode; color?: string }) {
  const len = 12, thick = 2;
  const corner = (top: boolean, left: boolean) => ({
    position: 'absolute' as const,
    width: len + thick, height: len + thick,
    top: top ? 0 : undefined, bottom: top ? undefined : 0,
    left: left ? 0 : undefined, right: left ? undefined : 0,
    borderTopWidth: top ? thick : 0, borderBottomWidth: top ? 0 : thick,
    borderLeftWidth: left ? thick : 0, borderRightWidth: left ? 0 : thick,
    borderColor: color,
  });
  return (
    <View style={{ padding: 10 }}>
      <View style={corner(true, true)} /><View style={corner(true, false)} />
      <View style={corner(false, true)} /><View style={corner(false, false)} />
      {children}
    </View>
  );
}

// ── Animated attribute bar row (component so hook is at top level) ─────────────
function AttrBar({ label, value, endorsements, isOwn, reduced, delay }: {
  label: string; value: number; endorsements: number; isOwn: boolean; reduced: boolean; delay: number;
}) {
  const col = attrColor(value);
  const barAnim = useRef(new Animated.Value(0)).current;
  const entryAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) { barAnim.setValue(value); entryAnim.setValue(1); return; }
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(barAnim,   { toValue: value, duration: 700, useNativeDriver: false }),
        Animated.timing(entryAnim, { toValue: 1,     duration: 400, useNativeDriver: true  }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);

  const barWidth = barAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[s.attrRow, { opacity: entryAnim }]}>
      <Text style={s.attrName}>{label}</Text>
      <View style={s.attrBarBg}>
        <Animated.View style={[s.attrBarFill, { width: barWidth as any, backgroundColor: col }]} />
      </View>
      <Text style={[s.attrVal, { color: col }]}>{value}</Text>
      <View style={s.endorseCount}>
        <ThumbsUp color={Colors.textDisabled} size={9} />
        <Text style={s.endorseCountTxt}>{endorsements}</Text>
      </View>
      {!isOwn && (
        <TouchableOpacity style={[s.endorseBtn, { borderColor: `${col}30` }]}>
          <Text style={[s.endorseBtnTxt, { color: col }]}>+1</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ── Language bar row ───────────────────────────────────────────────────────────
function LangBar({ lang, proficiency, pct, reduced, delay }: {
  lang: string; proficiency: string; pct: number; reduced: boolean; delay: number;
}) {
  const col = pct === 1 ? Colors.accent : pct >= 0.8 ? Colors.primary : Colors.textMuted;
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) { barAnim.setValue(pct * 100); return; }
    const t = setTimeout(() =>
      Animated.timing(barAnim, { toValue: pct * 100, duration: 800, useNativeDriver: false }).start()
    , delay);
    return () => clearTimeout(t);
  }, []);

  const barWidth = barAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={s.langName}>{lang}</Text>
        <View style={[s.langProfPill, { backgroundColor: `${col}15`, borderColor: `${col}30` }]}>
          <Text style={[s.langProf, { color: col }]}>{proficiency}</Text>
        </View>
      </View>
      <View style={s.langBarBg}>
        <Animated.View style={[s.langBarFill, { width: barWidth as any, backgroundColor: col }]} />
      </View>
    </View>
  );
}

// ── Timeline entry (animated stagger) ─────────────────────────────────────────
function TimelineEntry({ club, isLast, delay, reduced }: {
  club: CareerEntry; isLast: boolean; delay: number; reduced: boolean;
}) {
  const entryAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(20)).current;
  const dotPulse   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) { entryAnim.setValue(1); slideAnim.setValue(0); return; }
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(entryAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!club.current || reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(dotPulse, { toValue: 1.5, duration: 700, useNativeDriver: true }),
      Animated.timing(dotPulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [club.current]);

  return (
    <Animated.View style={[s.timelineItem, { opacity: entryAnim, transform: [{ translateX: slideAnim }] }]}>
      <View style={{ alignItems: 'center', width: 32 }}>
        <Animated.View style={[
          s.timelineDot,
          club.current && s.timelineDotActive,
          club.current && { transform: [{ scale: dotPulse }] },
        ]} />
        {!isLast && <View style={[s.timelineLine, club.current && { backgroundColor: `${Colors.primary}40` }]} />}
      </View>
      <View style={[s.timelineCard, club.current && { borderColor: `${Colors.primary}60`, borderLeftWidth: 3, borderLeftColor: Colors.primary }]}>
        {club.current && (
          <LinearGradient
            colors={[`${Colors.primary}08`, 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={s.clubName}>{club.club}</Text>
            <Text style={s.clubRole}>{club.role}</Text>
            <Text style={s.clubPeriod}>{club.period}</Text>
          </View>
          {club.current && (
            <View style={s.currentBadge}>
              <View style={s.currentDot} />
              <Text style={s.currentBadgeTxt}>Current</Text>
            </View>
          )}
        </View>
        <View style={s.clubStats}>
          {[{ val: club.caps, lbl: 'Caps' }, { val: club.goals, lbl: 'Goals' }].map(({ val, lbl }) => (
            <View key={lbl} style={s.clubStatItem}>
              <Text style={s.clubStatVal}>{val}</Text>
              <Text style={s.clubStatLbl}>{lbl}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ── Network avatar (type-colored gradient) ─────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  scout:   Colors.primary,
  agent:   Colors.accent,
  medical: Colors.success,
};

// ── Video clip card ────────────────────────────────────────────────────────────
function ClipCard({ clip, wide }: { clip: ProfileHighlight; wide?: boolean }) {
  return (
    <View style={[s.clipCard, wide && { width: SW - 32 }]}>
      <View style={s.clipThumb}>
        {clip.imageUrl ? (
          <Image
            source={{ uri: clip.imageUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[Colors.elevated, `${Colors.primary}50`]}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={StyleSheet.absoluteFillObject} />
        {clip.featured && (
          <View style={s.featuredBadge}>
            <Zap color={Colors.bg} size={9} fill={Colors.bg} />
            <Text style={s.featuredTxt}>FEATURED</Text>
          </View>
        )}
        <View style={s.playBtn}>
          <Play color={Colors.white} size={14} fill={Colors.white} />
        </View>
        <View style={s.durationChip}><Text style={s.durationTxt}>{clip.duration}</Text></View>
      </View>
      <View style={s.clipInfo}>
        <Text style={s.clipTitle} numberOfLines={2}>{clip.title}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {clip.tags.map(tag => <View key={tag} style={s.clipTag}><Text style={s.clipTagTxt}>{tag}</Text></View>)}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <Eye color={Colors.textDisabled} size={11} />
          <Text style={s.clipViews}>{clip.views}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SH({ title, action, onAction, color = Colors.primary }: {
  title: string; action?: string; onAction?: () => void; color?: string;
}) {
  return (
    <View style={s.sh}>
      <LinearGradient
        colors={[color, `${color}40`]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={s.shAccent}
      />
      <Text style={s.shTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction} style={s.shBtn}>
          <Text style={[s.shBtnTxt, { color }]}>{action}</Text>
          <ChevronRight color={color} size={12} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Stat tile (count-up) ───────────────────────────────────────────────────────
function StatTile({ label, value, unit, delay, reduced }: {
  label: string; value: string; unit: string; delay: number; reduced: boolean;
}) {
  const numVal = parseInt(value, 10);
  const isNum = !isNaN(numVal) && value.length <= 3;
  const counted = useCountUp(isNum ? numVal : 0, 900, delay);
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) { scale.setValue(1); opacity.setValue(1); return; }
    const t = setTimeout(() =>
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start()
    , delay);
    return () => clearTimeout(t);
  }, []);

  const tileGrad: Record<string, [string, string]> = {
    PACE:   [Colors.accent,   `${Colors.accent}60`],
    HEIGHT: [Colors.primary,  `${Colors.primary}50`],
    WEIGHT: [Colors.warning,  `${Colors.warning}50`],
    FOOT:   [Colors.success,  `${Colors.success}50`],
    AGE:    [Colors.primary,  `${Colors.primary}50`],
    APPS:   [Colors.accent,   `${Colors.accent}50`],
    GOALS:  [Colors.error,    `${Colors.error}50`],
  };
  const [c1, c2] = tileGrad[label] ?? [Colors.primary, `${Colors.primary}50`];

  return (
    <Animated.View style={[s.statTile, { opacity, transform: [{ scale }] }]}>
      <LinearGradient
        colors={[`${c1}15`, `${c1}05`]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[s.statTileAccent, { backgroundColor: c1 }]} />
      <Text style={[s.statTileVal, { color: c1 }]}>
        {isNum ? counted : value}
        <Text style={s.statTileUnit}>{unit}</Text>
      </Text>
      <Text style={s.statTileLabel}>{label}</Text>
    </Animated.View>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────────
function OverviewTab({ profile, reduced, isOwn, router }: any) {
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [highlightTab, setHighlightTab] = useState<'Highlights' | 'Activity'>('Highlights');
  const [highlights, setHighlights] = useState<ProfileHighlight[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const scoutPulse = useRef(new Animated.Value(1)).current;
  const scoutGlow  = useRef(new Animated.Value(0.5)).current;
  const bio = profile?.bio || 'No athlete bio has been added yet.';
  const performanceScore = Math.round(profile?.performance_score ?? 0);
  const visibilityScore = Math.round(profile?.visibility_score ?? 0);
  const fitnessScore = Math.round(profile?.fitness_score ?? 0);
  const verificationTiles = profile?.is_verified ? [{
    icon: Shield,
    label: 'Identity and athlete profile',
    source: 'Verified by AceAiX',
    color: Colors.success,
  }] : [];
  const attributes = Object.entries(profile?.attributes ?? {})
    .filter(([, value]) => typeof value === 'number')
    .slice(0, 6)
    .map(([label, value]) => ({
      label: label.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      value: Math.max(0, Math.min(100, Number(value))),
      endorsements: 0,
    }));
  const statTiles = Object.entries(profile?.highlighted_stats ?? {})
    .filter(([, value]) => typeof value === 'number')
    .slice(0, 6)
    .map(([label, value]) => ({
      label: label.replace(/_/g, ' ').toUpperCase(),
      value: String(value),
      unit: '',
    }));
  const languageLevels: Record<string, number> = {
    native: 1,
    fluent: 0.9,
    professional: 0.8,
    conversational: 0.65,
    basic: 0.4,
  };
  const languages: { lang: string; proficiency: string; pct: number }[] = (profile?.languages ?? []).map((language: { language: string; proficiency: string }) => ({
    lang: language.language,
    proficiency: language.proficiency,
    pct: languageLevels[language.proficiency.toLowerCase()] ?? 0.6,
  }));

  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;
    Promise.all([
      fetchMyPosts(profile.id),
      supabase
        .from('opportunity_matches')
        .select('opportunity_id', { count: 'exact', head: true })
        .eq('athlete_id', profile.id),
    ]).then(([posts, matches]) => {
      if (!mounted) return;
      setHighlights(posts
        .filter((post) => post.media.length > 0)
        .slice(0, 5)
        .map((post) => ({
          id: post.id,
          title: post.caption ?? 'Athlete highlight',
          duration: post.media[0]?.type === 'video' ? 'VIDEO' : 'PHOTO',
          tags: post.tags
            .map((tag) => typeof tag === 'string' ? tag : tag.value)
            .filter(Boolean)
            .slice(0, 3),
          views: String(post.view_count),
          featured: post.is_featured,
          imageUrl: post.media[0]?.signed_url,
        })));
      setMatchCount(matches.count ?? 0);
    });
    return () => { mounted = false; };
  }, [profile?.id]);

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(scoutPulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(scoutGlow,  { toValue: 1,    duration: 900, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(scoutPulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
        Animated.timing(scoutGlow,  { toValue: 0.5,  duration: 900, useNativeDriver: true }),
      ]),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <>
      {/* Opportunity match pulse */}
      <View style={s.scoutCard}>
        <LinearGradient
          colors={[`${Colors.accent}18`, `${Colors.accent}06`]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[s.scoutCardBorder]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={[s.scoutGlow, { opacity: scoutGlow }]} />
            <Animated.View style={[s.scoutIconWrap, { transform: [{ scale: scoutPulse }] }]}>
              <Zap color={Colors.bg} size={18} fill={Colors.bg} />
            </Animated.View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <Text style={s.scoutTitle}>Opportunity Match</Text>
              <View style={s.livePill}>
                <View style={s.liveDot} />
                <Text style={s.liveTxt}>LIVE</Text>
              </View>
            </View>
            <Text style={s.scoutBody}>
              <Text style={{ color: Colors.accent, fontFamily: Typography.family.bold }}>
                {matchCount} opportunity {matchCount === 1 ? 'match' : 'matches'}
              </Text>
              {' '}currently fit this profile.
            </Text>
          </View>
        </View>
        <TouchableOpacity style={s.scoutBtn} onPress={() => router.push('/(tabs)/opportunities' as any)}>
          <LinearGradient
            colors={[Colors.accent, '#A8D430']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.scoutBtnGrad}
          >
            <Target color={Colors.bg} size={13} />
            <Text style={s.scoutBtnTxt}>View Matches</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Verification */}
      <View style={s.card}>
        <SH title="AceAiX Verified Athlete" color={Colors.success} />
        <View style={{ gap: Spacing.sm }}>
          {verificationTiles.map(({ icon: Icon, label, source, color }, i) => (
            <VerifyRow key={label} icon={Icon} label={label} source={source} color={color} delay={i * 100} reduced={reduced} />
          ))}
          {verificationTiles.length === 0 && (
            <Text style={s.emptyText}>Identity verification has not been completed yet.</Text>
          )}
        </View>
      </View>

      {/* Key Metrics */}
      <View style={s.card}>
        <SH title="Key Metrics" color={Colors.primary} />
        <HudFrame color={Colors.primary}>
          <View style={s.gaugesRow}>
            {[
              { label: 'Performance', v: performanceScore, color: Colors.accent   },
              { label: 'Visibility',  v: visibilityScore,  color: Colors.primary  },
              { label: 'Fitness',     v: fitnessScore,     color: Colors.success  },
            ].map(({ label, v, color }) => (
              <View key={label} style={s.gaugeWrap}>
                <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                  <AnimGauge value={v} color={color} size={90} sw={8} reduced={reduced} />
                  <View style={s.gaugeCenter}>
                    <Text style={[s.gaugeV, { color }]}>{v}</Text>
                  </View>
                </View>
                <Text style={[s.gaugeLabel, { color }]}>{label}</Text>
              </View>
            ))}
          </View>
        </HudFrame>
        <View style={s.statTilesGrid}>
          {statTiles.map(({ label, value, unit }, i) => (
            <StatTile key={label} label={label} value={value} unit={unit} delay={200 + i * 80} reduced={reduced} />
          ))}
        </View>
      </View>

      {/* About */}
      <View style={s.card}>
        <SH title="About" color={Colors.primary} />
        <Text style={s.bioTxt} numberOfLines={aboutExpanded ? undefined : 3}>{bio}</Text>
        <TouchableOpacity onPress={() => setAboutExpanded(!aboutExpanded)} style={{ marginTop: 6 }}>
          <Text style={s.moreBtn}>{aboutExpanded ? 'Show less' : '… show more'}</Text>
        </TouchableOpacity>
      </View>

      {/* Highlights */}
      <View style={s.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
          <View style={s.toggleRow}>
            {(['Highlights', 'Activity'] as const).map(t => (
              <TouchableOpacity key={t} style={[s.toggleBtn, highlightTab === t && s.toggleBtnActive]} onPress={() => setHighlightTab(t)}>
                {highlightTab === t && (
                  <LinearGradient colors={[`${Colors.primary}25`, `${Colors.primary}10`]} style={StyleSheet.absoluteFillObject} />
                )}
                <Text style={[s.toggleTxt, highlightTab === t && s.toggleTxtActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {isOwn && (
            <TouchableOpacity style={s.uploadClipBtn} onPress={() => router.push('/(tabs)/media' as any)}>
              <Plus color={Colors.primary} size={13} />
              <Text style={s.uploadClipTxt}>Add Clip</Text>
            </TouchableOpacity>
          )}
        </View>
        {highlightTab === 'Highlights' ? (
          highlights.length > 0 ? (
            <>
              <ClipCard clip={highlights[0]} wide />
              <Text style={s.allClipsTxt}>ALL CLIPS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg }}>
                {highlights.slice(1).map(clip => <ClipCard key={clip.id} clip={clip} />)}
              </ScrollView>
            </>
          ) : (
            <View style={s.activityEmpty}>
              <Play color={Colors.textDisabled} size={24} />
              <Text style={s.activityEmptyTxt}>No highlight clips have been added yet.</Text>
            </View>
          )
        ) : (
          highlights.length > 0 ? (
            <View style={{ gap: Spacing.sm }}>
              {highlights.slice(0, 3).map((highlight) => (
                <View key={highlight.id} style={s.activityRow}>
                  <Activity color={Colors.primary} size={16} />
                  <Text style={[s.activityEmptyTxt, { flex: 1 }]} numberOfLines={2}>
                    {highlight.title}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={s.activityEmpty}>
              <Activity color={Colors.textDisabled} size={24} />
              <Text style={s.activityEmptyTxt}>No recent activity to show.</Text>
            </View>
          )
        )}
      </View>

      {/* Attributes */}
      <View style={s.card}>
        <SH title="Attributes & Skills" color={Colors.accent} />
        <Text style={s.aiTagTxt}>Profile attributes · {profile?.sport ?? 'Sport'} · Current season</Text>
        <View style={{ alignItems: 'center', marginBottom: Spacing.md }}>
          <HudFrame color={Colors.accent}>
            {attributes.length > 0 ? (
              <AnimRadar data={attributes.map(a => a.value)} labels={attributes.map(a => a.label)} size={180} reduced={reduced} />
            ) : (
              <Text style={s.emptyText}>Add performance attributes to display the skills chart.</Text>
            )}
          </HudFrame>
        </View>
        <View style={{ gap: 12 }}>
          {attributes.map((attr, i) => (
            <AttrBar key={attr.label} label={attr.label} value={attr.value} endorsements={attr.endorsements} isOwn={isOwn} reduced={reduced} delay={i * 90} />
          ))}
        </View>
      </View>

      {/* Languages */}
      <View style={s.card}>
        <SH title="Languages" color={Colors.warning} />
        <View style={{ gap: 14 }}>
          {languages.map(({ lang, proficiency, pct }, i) => (
            <LangBar key={lang} lang={lang} proficiency={proficiency} pct={pct} reduced={reduced} delay={i * 120} />
          ))}
          {languages.length === 0 && <Text style={s.emptyText}>No languages have been added yet.</Text>}
        </View>
      </View>

      {/* People Also Viewed */}
      {SIMILAR_ATHLETES.length > 0 && (
        <View style={s.card}>
          <SH title="People Also Viewed" color={Colors.primary} />
          <View style={{ gap: Spacing.sm }}>
            {SIMILAR_ATHLETES.map((a, i) => (
            <View key={a.name} style={[s.similarRow, i < SIMILAR_ATHLETES.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.border }]}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryGlow]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.similarAv}
              >
                <Text style={s.similarAvTxt}>{a.name[0]}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={s.similarName}>{a.name}</Text>
                <Text style={s.similarPos}>{a.pos} · {a.club}</Text>
              </View>
              <View style={[s.aiScoreChip, a.score >= 88 ? { backgroundColor: Colors.accent } : { backgroundColor: Colors.primary }]}>
                <Zap color={Colors.bg} size={9} fill={Colors.bg} />
                <Text style={s.aiScoreChipTxt}>{a.score}</Text>
              </View>
              <TouchableOpacity style={s.followBtn}>
                <Plus color={Colors.primary} size={14} />
              </TouchableOpacity>
            </View>
            ))}
          </View>
        </View>
      )}
    </>
  );
}

// ── Verify row with fade-in ────────────────────────────────────────────────────
function VerifyRow({ icon: Icon, label, source, color, delay, reduced }: {
  icon: any; label: string; source: string; color: string; delay: number; reduced: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(-12)).current;
  useEffect(() => {
    if (reduced) { anim.setValue(1); slide.setValue(0); return; }
    const t = setTimeout(() =>
      Animated.parallel([
        Animated.timing(anim,  { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]).start()
    , delay + 200);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View style={[s.verifyRow, { opacity: anim, transform: [{ translateX: slide }] }]}>
      <View style={[s.verifyIconWrap, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
        <Icon color={color} size={16} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={s.verifyLabel}>{label}</Text>
          <BadgeCheck color={color} size={13} />
        </View>
        <Text style={s.verifySource}>{source}</Text>
      </View>
      <View style={[s.verifyPill, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
        <Text style={[s.verifyPillTxt, { color }]}>Verified</Text>
      </View>
    </Animated.View>
  );
}

// ── Performance Tab ────────────────────────────────────────────────────────────
function PerformanceTab({ router, sport, userId, profile }: { router: any; sport: string | null; userId?: string; profile?: any }) {
  const { stats: chessStats, loading: chessLoading, refresh: chessRefresh } = useChessStats(sport === 'chess' ? userId : null);
  const { stats: footballStats, loading: footballLoading, refresh: footballRefresh } = useFootballStats(
    (sport && sport !== 'chess') ? userId : null
  );
  const [refreshing, setRefreshing] = React.useState(false);

  async function handleChessRefresh() {
    setRefreshing(true);
    await triggerChessSyncFull(userId!, profile?.chesscom_username, profile?.lichess_username);
    await chessRefresh();
    setRefreshing(false);
  }

  async function handleFootballRefresh() {
    if (!userId || !profile?.football_api_player_id) return;
    setRefreshing(true);
    await triggerFootballSync(userId, profile.football_api_player_id, undefined, profile?.league);
    await footballRefresh();
    setRefreshing(false);
  }

  if (sport === 'chess') {
    return (
      <>
        <View style={s.card}>
          <SH title="Chess Performance" color={Colors.accent} action="Engine" onAction={() => router.push('/(tabs)/performance' as any)} />
          {chessLoading ? (
            <Text style={s.loadingTxt}>Loading…</Text>
          ) : chessStats ? (
            <ChessPerformanceCard stats={chessStats} onRefresh={handleChessRefresh} refreshing={refreshing} />
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>No chess data yet</Text>
              <Text style={s.emptyBody}>Add your Chess.com or Lichess username in Settings.</Text>
              <TouchableOpacity style={s.settingsBtn} onPress={() => router.push('/(tabs)/settings' as any)}>
                <Text style={s.settingsBtnTxt}>Go to Settings</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <AnalyticsCard router={router} />
      </>
    );
  }

  return (
    <>
      {footballStats ? (
        <View style={s.card}>
          <SH title={`${footballStats.season} Season Stats`} color={Colors.accent} action="Full History" onAction={() => router.push('/(tabs)/performance' as any)} />
          <FootballStatsCard stats={footballStats} onRefresh={handleFootballRefresh} refreshing={refreshing} />
        </View>
      ) : (
        <View style={s.card}>
          <SH title="Season Stats" color={Colors.accent} />
          <View style={s.statsGrid}>
            {SEASON_STATS.map(({ label, value, sub }) => (
              <View key={label} style={s.statsCell}>
                <Text style={s.statsCellVal}>{value}</Text>
                <Text style={s.statsCellLabel}>{label}</Text>
                <Text style={s.statsCellSub}>{sub}</Text>
              </View>
            ))}
          </View>
          {SEASON_STATS.length === 0 && (
            <Text style={s.emptyText}>No season stats have been added yet.</Text>
          )}
        </View>
      )}
      <View style={s.card}>
        <SH title="Match Ratings" color={Colors.warning} action="Full History" onAction={() => router.push('/(tabs)/performance' as any)} />
        {([] as Array<{ opp: string; date: string; rating: number; result: 'W' | 'D' | 'L' }>).map((m, i) => {
          const rc = m.result === 'W' ? Colors.success : m.result === 'D' ? Colors.warning : Colors.error;
          return (
            <View key={i} style={s.matchRow}>
              <View style={[s.resultBadge, { backgroundColor: `${rc}18`, borderColor: rc }]}>
                <Text style={[s.resultTxt, { color: rc }]}>{m.result}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.matchOpp}>{m.opp}</Text>
                <Text style={s.matchDate}>{m.date}</Text>
              </View>
              <Text style={[s.matchRating, { color: m.rating >= 8 ? Colors.accent : m.rating >= 7 ? Colors.primary : Colors.textMuted }]}>
                {m.rating.toFixed(1)}
              </Text>
            </View>
          );
        })}
        <Text style={s.emptyText}>No match ratings have been added yet.</Text>
      </View>
      <AnalyticsCard router={router} />
    </>
  );
}

function AnalyticsCard({ router }: { router: any }) {
  return (
    <View style={s.card}>
      <SH title="Analytics" color={Colors.primary} action="View All" onAction={() => router.push('/(tabs)/analytics' as any)} />
      <View style={s.anaRow}>
        {[
          { label: 'Heat Map', icon: Activity, color: Colors.error   },
          { label: 'Pass Map', icon: TrendingUp, color: Colors.primary },
          { label: 'Shot Chart', icon: Target,  color: Colors.accent  },
        ].map(({ label, icon: Icon, color }) => (
          <TouchableOpacity key={label} style={[s.anaCell, { borderColor: `${color}25` }]} onPress={() => router.push('/(tabs)/analytics' as any)}>
            <LinearGradient colors={[`${color}15`, `${color}05`]} style={StyleSheet.absoluteFillObject} />
            <Icon color={color} size={20} />
            <Text style={[s.anaCellTxt, { color }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Career Tab ─────────────────────────────────────────────────────────────────
function CareerTab({ router, reduced, profile }: { router: any; reduced: boolean; profile: any }) {
  const MILESTONES: Array<{ label: string; date: string; icon: any; color: string }> = [];
  const careerTimeline: CareerEntry[] = profile?.current_club ? [{
    club: profile.current_club,
    role: profile.position ?? 'Athlete',
    period: 'Current',
    caps: Number(profile.highlighted_stats?.appearances ?? 0),
    goals: Number(profile.highlighted_stats?.goals ?? 0),
    current: true,
  }] : [];

  return (
    <>
      <View style={s.card}>
        <SH title="Club History" color={Colors.warning} action="Full Career" onAction={() => router.push('/(tabs)/career' as any)} />
        <View>
          {careerTimeline.map((club, i) => (
            <TimelineEntry key={club.club} club={club} isLast={i === careerTimeline.length - 1} delay={i * 120} reduced={reduced} />
          ))}
          {careerTimeline.length === 0 && <Text style={s.emptyText}>No club history has been added yet.</Text>}
        </View>
      </View>
      <View style={s.card}>
        <SH title="Milestones" color={Colors.accent} />
        {MILESTONES.map(({ label, date, icon: Icon, color }, i) => (
          <View key={label} style={[s.milestoneRow, i < MILESTONES.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.border }]}>
            <LinearGradient
              colors={[`${color}25`, `${color}10`]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.milestoneIcon}
            >
              <Icon color={color} size={15} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.milestoneTxt}>{label}</Text>
              <Text style={s.milestoneDate}>{date}</Text>
            </View>
            <View style={[s.milestonePill, { borderColor: `${color}30` }]}>
              <Text style={[s.milestonePillTxt, { color }]}>Achieved</Text>
            </View>
          </View>
        ))}
        {MILESTONES.length === 0 && <Text style={s.emptyText}>No milestones have been added yet.</Text>}
      </View>
    </>
  );
}

// ── Network Tab ────────────────────────────────────────────────────────────────
function NetworkTab({ router, reduced, profile }: { router: any; reduced: boolean; profile: any }) {
  const [scoutViewTarget, setScoutViewTarget] = useState(0);
  const followers   = useCountUp(profile?.followers_count ?? 0, 1000, 100);
  const connections = useCountUp(profile?.connections_count ?? 0, 900, 200);
  const scoutViews  = useCountUp(scoutViewTarget, 1100, 300);

  useEffect(() => {
    if (!profile?.athlete_profile_id) return;
    supabase
      .from('profile_views')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', profile.athlete_profile_id)
      .then(({ count }) => setScoutViewTarget(count ?? 0));
  }, [profile?.athlete_profile_id]);

  return (
    <>
      <View style={s.card}>
        <SH title="My Network" color={Colors.success} action="Explore" onAction={() => router.push('/(tabs)/network' as any)} />
        <View style={s.networkStatRow}>
          {[
            { label: 'Followers', value: followers >= 1000 ? `${(followers/1000).toFixed(1)}K` : String(followers), color: Colors.primary },
            { label: 'Scout Views', value: scoutViews >= 1000 ? `${(scoutViews/1000).toFixed(1)}K` : String(scoutViews), color: Colors.accent },
            { label: 'Connections', value: String(connections), color: Colors.success },
          ].map(({ label, value, color }, i, arr) => (
            <View key={label} style={[s.networkStat, i < arr.length - 1 && { borderRightWidth: 1, borderRightColor: Colors.border }]}>
              <Text style={[s.networkStatVal, { color }]}>{value}</Text>
              <Text style={s.networkStatLbl}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={s.card}>
        <SH title="Connections" color={Colors.success} />
        {NETWORK_LIST.map((person, i) => {
          const col = TYPE_COLORS[person.type] ?? Colors.primary;
          return (
            <View key={person.name} style={[s.networkRow, i < NETWORK_LIST.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.border }]}>
              <LinearGradient
                colors={[col, `${col}80`]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.networkAv}
              >
                <Text style={s.networkAvTxt}>{person.name[0]}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={s.networkName}>{person.name}</Text>
                  {person.connected && <UserCheck color={col} size={12} />}
                </View>
                <Text style={s.networkRole}>{person.role} · {person.org}</Text>
              </View>
              <View style={[s.networkTypePill, { backgroundColor: `${col}15`, borderColor: `${col}30` }]}>
                <Text style={[s.networkTypeTxt, { color: col }]}>{person.type}</Text>
              </View>
            </View>
          );
        })}
        {NETWORK_LIST.length === 0 && <Text style={s.emptyText}>No profile connections yet.</Text>}
      </View>
    </>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function Profile() {
  const { profile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Overview');
  const [reduced, setReduced] = useState(false);
  const [medicallyCleared, setMedicallyCleared] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const tabOffsetY = useRef(0);
  const [sticky, setSticky] = useState(false);
  const isOwn = true;
  const performanceScore = Math.round(profile?.performance_score ?? 0);

  // Hero animations
  const scanLine   = useRef(new Animated.Value(0)).current;
  const heroFade   = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(0.6)).current;
  const scoreRing  = useRef(new Animated.Value(0)).current;

  // Tab indicator
  const tabW = 90;
  const indicatorX = useRef(new Animated.Value(0)).current;

  // Followers / connections counters
  const followers   = useCountUp(profile?.followers_count ?? 0, 1100, 600);
  const connections = useCountUp(profile?.connections_count ?? 0, 1000, 700);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
  }, []);

  useEffect(() => {
    if (!profile?.athlete_profile_id) {
      setMedicallyCleared(false);
      return;
    }
    supabase
      .from('medical_clearances')
      .select('status,effective_to')
      .eq('athlete_id', profile.athlete_profile_id)
      .eq('status', 'cleared')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const valid = !data?.effective_to
          || new Date(data.effective_to).getTime() >= new Date().setHours(0, 0, 0, 0);
        setMedicallyCleared(Boolean(data && valid));
      });
  }, [profile?.athlete_profile_id]);

  useEffect(() => {
    if (reduced) { heroFade.setValue(1); scoreScale.setValue(1); scoreRing.setValue(1); return; }
    // Scan line loop
    const scan = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ])
    );
    scan.start();
    // Hero entry
    Animated.parallel([
      Animated.timing(heroFade,   { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scoreScale, { toValue: 1, tension: 70, friction: 8, delay: 300, useNativeDriver: true } as any),
      Animated.timing(scoreRing,  { toValue: 1, duration: 1200, delay: 200, useNativeDriver: true }),
    ]).start();
    return () => scan.stop();
  }, [reduced]);

  const handleTabPress = (tab: string, idx: number) => {
    setActiveTab(tab);
    Animated.spring(indicatorX, { toValue: idx * tabW, tension: 80, friction: 10, useNativeDriver: true } as any).start();
  };

  const handleShare = async () => {
    await Share.share({ message: `Check out ${profile?.full_name ?? 'this athlete'}'s profile on AceAiX!` });
  };

  const scanTranslate = scanLine.interpolate({ inputRange: [0, 1], outputRange: [-10, 250] });
  const ringRotate    = scoreRing.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (!profile) return null;

  return (
    <View style={s.root}>
      {/* Sticky compact header */}
      {sticky && (
        <View style={s.stickyHeader}>
          <LinearGradient
            colors={[Colors.surface, `${Colors.surface}F0`]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={s.stickyAv}>
            <Text style={s.stickyAvTxt}>{profile?.full_name?.[0]?.toUpperCase() ?? 'A'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.stickyName} numberOfLines={1}>{profile?.full_name ?? 'Athlete'}</Text>
            <Text style={s.stickyPos} numberOfLines={1}>
              {[profile?.position, profile?.sport].filter(Boolean).join(' · ') || 'Professional Athlete'}
            </Text>
          </View>
          {TABS.map((tab, idx) => (
            <TouchableOpacity key={tab} style={[s.stickyTab, tab === activeTab && { backgroundColor: `${TAB_COLORS[tab]}20` }]}
              onPress={() => handleTabPress(tab, idx)}>
              <Text style={[s.stickyTabTxt, tab === activeTab && { color: TAB_COLORS[tab], fontFamily: Typography.family.bold }]}>
                {tab.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={e => setSticky(e.nativeEvent.contentOffset.y > tabOffsetY.current + 20)}
        scrollEventThrottle={16}
      >
        {/* ── Hero Cover ── */}
        <View style={s.coverWrap}>
          <LinearGradient
            colors={[`${Colors.primary}A0`, `${Colors.accent}30`, Colors.bg]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          {/* Scan line */}
          {!reduced && (
            <Animated.View style={[s.scanLine, { transform: [{ translateY: scanTranslate }] }]} />
          )}
          {/* Performance score badge */}
          <Animated.View style={[s.aiScoreBadge, { opacity: heroFade, transform: [{ scale: scoreScale }] }]}>
            <Animated.View style={[s.scoreRingOuter, { transform: [{ rotate: ringRotate }] }]}>
              {[0, 60, 120, 180, 240, 300].map(deg => (
                <View key={deg} style={[s.scoreRingDash, { transform: [{ rotate: `${deg}deg` }, { translateY: -22 }] }]} />
              ))}
            </Animated.View>
            <View style={s.aiScoreInner}>
              <Text style={s.aiScoreNum}>{performanceScore}</Text>
              <Text style={s.aiScoreLbl}>PERFORMANCE</Text>
              {performanceScore > 0 && (
                <View style={s.elitePill}>
                  <Zap color={Colors.bg} size={8} fill={Colors.bg} />
                  <Text style={s.eliteTxt}>{performanceScore >= 85 ? 'HIGH' : 'ACTIVE'}</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Scout count live */}
          <Animated.View style={[s.scoutCountBadge, { opacity: heroFade }]}>
            <View style={s.scoutCountDot} />
            <Text style={s.scoutCountTxt}>No scout watch data yet</Text>
          </Animated.View>
        </View>

        {/* ── Profile Card ── */}
        <Animated.View style={[s.heroCard, { opacity: heroFade }]}>
          <LinearGradient
            colors={[`${Colors.accent}08`, 'transparent', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Left accent stripe */}
          <LinearGradient
            colors={[Colors.accent, Colors.primary, Colors.primary + '00']}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={s.heroStripe}
          />

          {/* Avatar + availability */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md, marginBottom: Spacing.md }}>
            <View style={s.athletePhotoWrap}>
              <LinearGradient
                colors={[Colors.accent, Colors.primary]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.avatarRing}
              >
                <View style={s.athletePhoto}>
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={s.avatarImg} />
                  ) : (
                    <Text style={s.athletePhotoTxt}>{profile?.full_name?.[0]?.toUpperCase() ?? 'A'}</Text>
                  )}
                </View>
              </LinearGradient>
            </View>
            <View style={{ flex: 1 }}>
              {profile.is_open_to_offers && (
                <View style={s.availPill}>
                  <View style={s.availDot} />
                  <Text style={s.availTxt}>Open to Opportunities</Text>
                </View>
              )}
            </View>
          </View>

          {/* Name + badge */}
          <View style={s.nameRow}>
            <Text style={s.heroName} numberOfLines={1}>{profile?.full_name ?? 'Athlete Name'}</Text>
            {profile.is_verified && <BadgeCheck color={Colors.primary} size={20} />}
          </View>
          <Text style={s.heroPos}>
            {[profile?.position, profile?.sport].filter(Boolean).join(' · ') || 'Sport profile not completed'}
          </Text>

          {/* Meta row */}
          <View style={s.metaRow}>
            {profile?.league && (
              <View style={s.metaItem}>
                <Shield color={Colors.primary} size={11} />
                <Text style={s.metaTxt}>{profile.league}</Text>
              </View>
            )}
            {profile?.current_location && (
              <View style={s.metaItem}>
                <MapPin color={Colors.textMuted} size={11} />
                <Text style={s.metaTxt}>{profile.current_location}</Text>
              </View>
            )}
            {profile?.nationality && (
              <View style={s.metaItem}>
                <Globe color={Colors.textMuted} size={11} />
                <Text style={s.metaTxt}>{profile.nationality}</Text>
              </View>
            )}
            {medicallyCleared && (
              <View style={s.clearedPill}>
                <BadgeCheck color={Colors.success} size={10} />
                <Text style={s.clearedTxt}>Medically Cleared</Text>
              </View>
            )}
          </View>

          {/* Counts */}
          <View style={s.countsRow}>
            <View style={s.countItem}>
              <Text style={s.countVal}>{followers >= 1000 ? `${(followers / 1000).toFixed(1)}K` : followers}</Text>
              <Text style={s.countLbl}>Followers</Text>
            </View>
            <View style={s.countDivider} />
            <View style={s.countItem}>
              <Text style={s.countVal}>{connections}</Text>
              <Text style={s.countLbl}>Connections</Text>
            </View>
          </View>

          {/* Own profile banner */}
          {isOwn && (
            <View style={s.ownBanner}>
              <View style={[StyleSheet.absoluteFillObject, { borderRadius: Radii.md, overflow: 'hidden' }]}>
                <LinearGradient
                  colors={[`${Colors.primary}10`, `${Colors.accent}08`]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
              <Text style={s.ownBannerTxt}>You are viewing your public profile</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                <TouchableOpacity style={s.dashBtn} onPress={() => router.push('/(tabs)/' as any)}>
                  <Text style={s.dashBtnTxt}>Dashboard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.editBtn} onPress={() => router.push('/(tabs)/edit-profile' as any)}>
                  <Edit3 color={Colors.primary} size={12} />
                  <Text style={s.editBtnTxt}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={s.actionsRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="About profile endorsements"
              style={s.endorseAction}
              onPress={() => Alert.alert(
                'Your public profile',
                'Other AceAiX members can endorse your skills when they view this profile.',
              )}
            >
              <LinearGradient
                colors={[Colors.accent, '#A8D430']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.endorseGrad}
              >
                <ThumbsUp color={Colors.bg} size={15} fill={Colors.bg} />
                <Text style={s.endorseActionTxt}>Endorse</Text>
              </LinearGradient>
            </TouchableOpacity>
            {!isOwn && (
              <TouchableOpacity style={s.connectBtn}>
                <UserCheck color={Colors.primary} size={15} />
                <Text style={s.connectBtnTxt}>Connect</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
              <Share2 color={Colors.textMuted} size={15} />
              <Text style={s.shareBtnTxt}>Share</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Tabs ── */}
        <View onLayout={e => { tabOffsetY.current = e.nativeEvent.layout.y; }}>
          <View style={s.tabsBar}>
            <Animated.View style={[s.tabIndicator, {
              width: tabW,
              backgroundColor: TAB_COLORS[activeTab],
              transform: [{ translateX: indicatorX }],
            }]} />
            {TABS.map((tab, idx) => {
              const col = TAB_COLORS[tab];
              return (
                <TouchableOpacity key={tab} style={[s.tabBtn, { width: tabW }]} onPress={() => handleTabPress(tab, idx)}>
                  <Text style={[s.tabBtnTxt, tab === activeTab && { color: col, fontFamily: Typography.family.bold }]}>{tab}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Tab Content ── */}
        <View style={s.tabContent}>
          {activeTab === 'Overview'    && <OverviewTab profile={profile} reduced={reduced} isOwn={isOwn} router={router} />}
          {activeTab === 'Performance' && <PerformanceTab router={router} sport={profile?.sport ?? null} userId={profile?.id} profile={profile} />}
          {activeTab === 'Career'      && <CareerTab router={router} reduced={reduced} profile={profile} />}
          {activeTab === 'Network'     && <NetworkTab router={router} reduced={reduced} profile={profile} />}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },

  // Sticky
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  stickyAv:     { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  stickyAvTxt:  { fontFamily: Typography.family.bold, fontSize: 13, color: Colors.white },
  stickyName:   { fontFamily: Typography.family.bold, fontSize: 13, color: Colors.textPrimary },
  stickyPos:    { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textMuted },
  stickyTab:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radii.sm },
  stickyTabTxt: { fontFamily: Typography.family.medium, fontSize: 11, color: Colors.textMuted },

  // Cover
  coverWrap: { height: 240, position: 'relative', overflow: 'hidden' },
  scanLine:  { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: `${Colors.primary}30` },

  // Performance score badge
  aiScoreBadge:   { position: 'absolute', top: 18, right: 16, alignItems: 'center', justifyContent: 'center', width: 90, height: 90 },
  scoreRingOuter: { position: 'absolute', width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  scoreRingDash:  { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.accent, opacity: 0.7 },
  aiScoreInner:   { alignItems: 'center', backgroundColor: 'rgba(10,14,20,0.82)', borderRadius: 40, padding: 12, borderWidth: 1.5, borderColor: `${Colors.accent}60` },
  aiScoreNum:     { fontFamily: Typography.family.display, fontSize: 26, color: Colors.accent, lineHeight: 30 },
  aiScoreLbl:     { fontFamily: Typography.family.mono, fontSize: 8, color: Colors.textMuted, letterSpacing: 1 },
  elitePill:      { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.accent, borderRadius: Radii.full, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  eliteTxt:       { fontFamily: Typography.family.display, fontSize: 8, color: Colors.bg, letterSpacing: 0.8 },

  // Scout count (live)
  scoutCountBadge: { position: 'absolute', bottom: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(10,14,20,0.75)', borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: `${Colors.error}40` },
  scoutCountDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.error },
  scoutCountTxt:   { fontFamily: Typography.family.bold, fontSize: 11, color: Colors.textPrimary },

  // Hero card
  heroCard:       { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: -Spacing.xxl, borderRadius: Radii.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  heroStripe:     { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: Radii.xl, borderBottomLeftRadius: Radii.xl },
  avatarRing:     { width: 88, height: 88, borderRadius: 44, padding: 2.5, alignItems: 'center', justifyContent: 'center' },
  athletePhotoWrap:{ position: 'relative' },
  athletePhoto:   { width: 82, height: 82, borderRadius: 41, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg:      { width: 82, height: 82 },
  athletePhotoTxt:{ fontFamily: Typography.family.display, fontSize: 28, color: Colors.white },
  availPill:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${Colors.success}15`, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: `${Colors.success}35`, alignSelf: 'flex-start' },
  availDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  availTxt:       { fontFamily: Typography.family.bold, fontSize: 11, color: Colors.success },
  nameRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  heroName:       { fontFamily: Typography.family.display, fontSize: 26, color: Colors.textPrimary, flex: 1 },
  heroPos:        { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted, marginBottom: Spacing.sm },
  metaRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  metaItem:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt:        { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  clearedPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.success}15`, borderRadius: Radii.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: `${Colors.success}28` },
  clearedTxt:     { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.success },
  countsRow:      { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, marginBottom: Spacing.md },
  countItem:      { flex: 1, alignItems: 'center' },
  countVal:       { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xl, color: Colors.textPrimary },
  countLbl:       { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textMuted },
  countDivider:   { width: 1, height: 32, backgroundColor: Colors.border },

  ownBanner:      { borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: `${Colors.primary}25`, overflow: 'hidden' },
  ownBannerTxt:   { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, textAlign: 'center' },
  dashBtn:        { flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.md, borderWidth: 1, borderColor: `${Colors.primary}30` },
  dashBtnTxt:     { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.primary },
  editBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.md, borderWidth: 1, borderColor: `${Colors.primary}30` },
  editBtnTxt:     { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.primary },

  actionsRow:     { flexDirection: 'row', gap: Spacing.sm },
  endorseAction:  { flex: 2, borderRadius: Radii.md, overflow: 'hidden' },
  endorseGrad:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  endorseActionTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.bg },
  connectBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.md, borderWidth: 1, borderColor: `${Colors.primary}30`, paddingVertical: 12 },
  connectBtnTxt:  { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.primary },
  shareBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: 12 },
  shareBtnTxt:    { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.textMuted },

  // Tabs
  tabsBar:      { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, position: 'relative', marginTop: Spacing.md },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, height: 2, borderRadius: 1 },
  tabBtn:       { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md },
  tabBtnTxt:    { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  tabContent:   { padding: Spacing.lg, gap: Spacing.md },

  // Cards
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },

  // Section header
  sh:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  shAccent: { width: 3, height: 16, borderRadius: 2 },
  shTitle:  { flex: 1, fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  shBtn:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  shBtnTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs },

  // Scout card
  scoutCard:       { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: `${Colors.accent}35`, overflow: 'hidden' },
  scoutCardBorder: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: Colors.accent, opacity: 0.6 },
  scoutGlow:       { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.accent, opacity: 0.2 },
  scoutIconWrap:   { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  scoutTitle:      { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  scoutBody:       { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 19, marginTop: 2 },
  scoutBtn:        { borderRadius: Radii.md, overflow: 'hidden', marginTop: Spacing.md },
  scoutBtnGrad:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  scoutBtnTxt:     { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.bg },
  livePill:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.error}20`, borderRadius: Radii.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: `${Colors.error}40` },
  liveDot:         { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.error },
  liveTxt:         { fontFamily: Typography.family.display, fontSize: 9, color: Colors.error, letterSpacing: 1 },

  // Verification
  verifyRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  verifyIconWrap:{ width: 38, height: 38, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  verifyLabel:   { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  verifySource:  { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textDisabled },
  verifyPill:    { borderRadius: Radii.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  verifyPillTxt: { fontFamily: Typography.family.bold, fontSize: 10 },

  // Gauges
  gaugesRow:  { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.sm },
  gaugeWrap:  { alignItems: 'center', gap: 6 },
  gaugeCenter:{ position: 'absolute' },
  gaugeV:     { fontFamily: Typography.family.monoBold, fontSize: 17 },
  gaugeLabel: { fontFamily: Typography.family.bold, fontSize: 10, letterSpacing: 0.3 },

  // Stat tiles
  statTilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  statTile:      { flex: 1, minWidth: (SW - 80) / 3, backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', overflow: 'hidden' },
  statTileAccent:{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  statTileVal:   { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xl },
  statTileUnit:  { fontFamily: Typography.family.mono, fontSize: 10, color: Colors.textMuted },
  statTileLabel: { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textDisabled, letterSpacing: 0.8, marginTop: 2 },

  // Bio
  bioTxt:   { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 20 },
  moreBtn:  { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.primary },
  aiTagTxt: { fontFamily: Typography.family.mono, fontSize: 10, color: Colors.textDisabled, marginBottom: Spacing.md },

  // Highlights
  toggleRow:      { flexDirection: 'row', backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: 2, borderWidth: 1, borderColor: Colors.border },
  toggleBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radii.sm - 2, overflow: 'hidden' },
  toggleBtnActive:{ backgroundColor: Colors.surface },
  toggleTxt:      { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textMuted },
  toggleTxtActive:{ fontFamily: Typography.family.bold, color: Colors.textPrimary },
  uploadClipBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.md, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: `${Colors.primary}28` },
  uploadClipTxt:  { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.primary },
  allClipsTxt:    { fontFamily: Typography.family.mono, fontSize: 10, color: Colors.textDisabled, letterSpacing: 1.2, marginVertical: Spacing.sm },
  activityEmpty:  { alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.md },
  activityEmptyTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radii.md, backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },

  // Clip card
  clipCard:     { width: 162, marginRight: Spacing.md, backgroundColor: Colors.elevated, borderRadius: Radii.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  clipThumb:    { height: 100, backgroundColor: Colors.border, position: 'relative' },
  featuredBadge:{ position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.accent, borderRadius: Radii.full, paddingHorizontal: 7, paddingVertical: 3 },
  featuredTxt:  { fontFamily: Typography.family.display, fontSize: 8, color: Colors.bg, letterSpacing: 1 },
  playBtn:      { position: 'absolute', top: '50%', left: '50%', marginTop: -16, marginLeft: -16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  durationChip: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  durationTxt:  { fontFamily: Typography.family.mono, fontSize: 10, color: Colors.white },
  clipInfo:     { padding: Spacing.sm },
  clipTitle:    { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.textPrimary, lineHeight: 16 },
  clipTag:      { backgroundColor: `${Colors.primary}18`, borderRadius: Radii.xs, paddingHorizontal: 5, paddingVertical: 2 },
  clipTagTxt:   { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.primary },
  clipViews:    { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textDisabled },

  // Attributes
  attrRow:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attrName:         { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textMuted, width: 70 },
  attrBarBg:        { flex: 1, height: 6, backgroundColor: Colors.elevated, borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  attrBarFill:      { height: '100%', borderRadius: 3 },
  attrVal:          { fontFamily: Typography.family.monoBold, fontSize: Typography.size.sm, width: 26, textAlign: 'right' },
  endorseCount:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  endorseCountTxt:  { fontFamily: Typography.family.mono, fontSize: 10, color: Colors.textDisabled },
  endorseBtn:       { backgroundColor: `${Colors.primary}12`, borderRadius: Radii.xs, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1 },
  endorseBtnTxt:    { fontFamily: Typography.family.bold, fontSize: 10 },

  // Languages
  langName:      { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary },
  langProf:      { fontFamily: Typography.family.mono, fontSize: Typography.size.xs },
  langProfPill:  { borderRadius: Radii.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  langBarBg:     { height: 5, backgroundColor: Colors.elevated, borderRadius: 3, overflow: 'hidden' },
  langBarFill:   { height: '100%', borderRadius: 3 },

  // Similar athletes
  similarRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10 },
  similarAv:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  similarAvTxt:  { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white },
  similarName:   { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  similarPos:    { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  aiScoreChip:   { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: Radii.full, paddingHorizontal: 7, paddingVertical: 3 },
  aiScoreChipTxt:{ fontFamily: Typography.family.monoBold, fontSize: 10, color: Colors.bg },
  followBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: `${Colors.primary}15`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${Colors.primary}28` },

  // Performance
  loadingTxt:      { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.xl },
  emptyState:      { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyTitle:      { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  emptyBody:       { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, textAlign: 'center' },
  settingsBtn:     { backgroundColor: `${Colors.primary}15`, borderRadius: Radii.md, paddingVertical: 9, paddingHorizontal: Spacing.xl, borderWidth: 1, borderColor: `${Colors.primary}30`, marginTop: Spacing.sm },
  settingsBtnTxt:  { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.primary },
  statsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  statsCell:       { flex: 1, minWidth: (SW - 80) / 2 - 8, backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  statsCellVal:    { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xxl, color: Colors.primary },
  statsCellLabel:  { fontFamily: Typography.family.medium, fontSize: 11, color: Colors.textPrimary, marginTop: 2 },
  statsCellSub:    { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textDisabled },
  matchRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  resultBadge:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  resultTxt:       { fontFamily: Typography.family.bold, fontSize: 11 },
  matchOpp:        { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  matchDate:       { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },
  matchRating:     { fontFamily: Typography.family.monoBold, fontSize: Typography.size.lg },
  anaRow:          { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  anaCell:         { flex: 1, backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.lg, alignItems: 'center', gap: 6, borderWidth: 1, overflow: 'hidden' },
  anaCellTxt:      { fontFamily: Typography.family.medium, fontSize: Typography.size.xs },

  // Career
  timelineItem:     { flexDirection: 'row', alignItems: 'flex-start' },
  timelineDot:      { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.textDisabled, borderWidth: 2, borderColor: Colors.border, marginTop: 14 },
  timelineDotActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4 },
  timelineLine:     { width: 2, flex: 1, backgroundColor: Colors.border, marginLeft: 5, minHeight: 24 },
  timelineCard:     { flex: 1, backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, marginLeft: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  clubName:         { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  clubRole:         { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  clubPeriod:       { fontFamily: Typography.family.mono, fontSize: Typography.size.xs, color: Colors.primary, marginTop: 2 },
  currentBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: `${Colors.primary}28` },
  currentDot:       { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.primary },
  currentBadgeTxt:  { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.primary },
  clubStats:        { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  clubStatItem:     { alignItems: 'center' },
  clubStatVal:      { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xl, color: Colors.primary },
  clubStatLbl:      { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textDisabled },
  milestoneRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 12 },
  milestoneIcon:    { width: 36, height: 36, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  milestoneTxt:     { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  milestoneDate:    { fontFamily: Typography.family.mono, fontSize: Typography.size.xs, color: Colors.textDisabled },
  milestonePill:    { borderRadius: Radii.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, backgroundColor: 'transparent' },
  milestonePillTxt: { fontFamily: Typography.family.bold, fontSize: 10 },

  // Network
  networkStatRow: { flexDirection: 'row', marginBottom: Spacing.md },
  networkStat:    { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm },
  networkStatVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xxl },
  networkStatLbl: { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textMuted },
  networkRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 11 },
  networkAv:      { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  networkAvTxt:   { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white },
  networkName:    { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  networkRole:    { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  networkTypePill:{ borderRadius: Radii.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  networkTypeTxt: { fontFamily: Typography.family.bold, fontSize: 10 },
  emptyText:      { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 20 },
});
