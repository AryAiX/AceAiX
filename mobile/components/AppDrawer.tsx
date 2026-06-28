import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Image, ScrollView, Pressable, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDrawer } from '@/context/DrawerContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'expo-router';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import {
  Rss, LayoutDashboard, User, Film, TrendingUp, Activity, Users,
  Briefcase, Calendar, Target, Bot, BarChart2, MessageSquare,
  Settings, Globe, Compass, LogOut, X, Settings2,
  BadgeCheck, Brain, Zap, ChevronRight,
} from 'lucide-react-native';

const LOGO = require('@/assets/images/AceAiX_logo_transparent_(1) copy.png');

const DRAWER_WIDTH = Dimensions.get('window').width * 0.82;

interface MenuItem {
  label: string;
  route: string;
  Icon: React.ComponentType<any>;
  badge?: number;
  hot?: boolean;
}

const SECTION_COLORS: Record<string, string> = {
  Main:          Colors.primary,
  Community:     Colors.success,
  'AI & Insights': Colors.accent,
  Partners:      Colors.warning,
  Account:       Colors.textMuted,
};

const SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard',   route: '/(tabs)',              Icon: LayoutDashboard },
      { label: 'Feed',        route: '/(tabs)/feed',         Icon: Rss             },
      { label: 'Profile',     route: '/(tabs)/profile',      Icon: User            },
      { label: 'Media',       route: '/(tabs)/media',        Icon: Film            },
      { label: 'Performance', route: '/(tabs)/performance',  Icon: TrendingUp      },
      { label: 'Medical',     route: '/(tabs)/medical',      Icon: Activity        },
    ],
  },
  {
    title: 'Community',
    items: [
      { label: 'Network',       route: '/(tabs)/network',      Icon: Users    },
      { label: 'Career',        route: '/(tabs)/career',       Icon: Briefcase},
      { label: 'Events',        route: '/(tabs)/events',       Icon: Calendar },
      { label: 'Opportunities', route: '/(tabs)/opportunities', Icon: Target, hot: true },
    ],
  },
  {
    title: 'AI & Insights',
    items: [
      { label: 'AI Coach',  route: '/(tabs)/ai-coach',   Icon: Bot,          hot: true },
      { label: 'Analytics', route: '/(tabs)/analytics',  Icon: BarChart2             },
      { label: 'Messages',  route: '/(tabs)/messages',   Icon: MessageSquare, badge: 3 },
    ],
  },
  {
    title: 'Partners',
    items: [
      { label: 'Sportify Academy', route: '/(tabs)/sportify-academy', Icon: BadgeCheck },
      { label: 'Talent Profile',   route: '/(tabs)/sportify-talent',  Icon: Brain      },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Settings',          route: '/(tabs)/settings',      Icon: Settings  },
      { label: 'Public Profile',    route: '/(tabs)/public-profile', Icon: Globe     },
      { label: 'Discover Athletes', route: '/(tabs)/discover',       Icon: Compass   },
    ],
  },
];

// ── LiveDot ────────────────────────────────────────────────────────────────────
function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.6, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 12, height: 12 }}>
      <Animated.View style={[d.livePulse, { transform: [{ scale: pulse }] }]} />
      <View style={d.liveDotCore} />
    </View>
  );
}

// ── NavItem ────────────────────────────────────────────────────────────────────
// Extracted so hooks run at component top level (not inside .map)
function NavItem({ item, active, color, onPress, delay }: {
  item: MenuItem; active: boolean; color: string; onPress: () => void; delay: number;
}) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(-20)).current;
  const scale = useRef(new Animated.Value(active ? 1 : 0.95)).current;

  useEffect(() => {
    const t = setTimeout(() =>
      Animated.parallel([
        Animated.timing(fade,  { toValue: 1, duration: 340, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 340, useNativeDriver: true }),
      ]).start()
    , delay);
    return () => clearTimeout(t);
  }, []);

  const handlePress = () => {
    Animated.spring(scale, { toValue: 0.93, tension: 200, friction: 10, useNativeDriver: true } as any).start(() =>
      Animated.spring(scale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true } as any).start()
    );
    onPress();
  };

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateX: slide }, { scale }] }}>
      <TouchableOpacity
        style={[d.navItem, active && [d.navItemActive, { borderColor: `${color}28` }]]}
        onPress={handlePress}
        activeOpacity={0.75}
      >
        {active && (
          <LinearGradient
            colors={[`${color}22`, `${color}08`]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        {/* Left accent bar */}
        {active && (
          <LinearGradient
            colors={[color, `${color}60`]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={d.activeBar}
          />
        )}
        {/* Icon wrap */}
        <View style={[d.iconWrap, active && { backgroundColor: `${color}20` }]}>
          <item.Icon
            color={active ? color : Colors.textDisabled}
            size={17}
            strokeWidth={active ? 2.5 : 1.8}
          />
        </View>
        <Text style={[d.navLabel, active && { color, fontFamily: Typography.family.bold }]}>
          {item.label}
        </Text>
        {item.hot && !active && (
          <View style={d.hotPill}>
            <Zap color={Colors.bg} size={8} fill={Colors.bg} />
            <Text style={d.hotTxt}>HOT</Text>
          </View>
        )}
        {item.badge ? (
          <View style={[d.navBadge, { backgroundColor: color }]}>
            <Text style={d.navBadgeTxt}>{item.badge}</Text>
          </View>
        ) : null}
        {active && <ChevronRight color={`${color}80`} size={14} style={d.chevron} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── SectionHeader ──────────────────────────────────────────────────────────────
function SectionHeader({ title, color, delay }: { title: string; color: string; delay: number }) {
  const fade  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() =>
      Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }).start()
    , delay);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View style={[d.sectionHeader, { opacity: fade }]}>
      <View style={[d.sectionDash, { backgroundColor: color }]} />
      <Text style={[d.sectionTitle, { color }]}>{title}</Text>
      <View style={[d.sectionLine, { backgroundColor: `${color}20` }]} />
    </Animated.View>
  );
}

// ── AppDrawer ──────────────────────────────────────────────────────────────────
export function AppDrawer() {
  const { isOpen, close } = useDrawer();
  const { profile, signOut } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const insets   = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  const translateX     = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity= useRef(new Animated.Value(0)).current;
  const headerScale    = useRef(new Animated.Value(0.96)).current;
  const headerOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true } as any),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(headerScale,  { toValue: 1, tension: 80, friction: 10, delay: 80, useNativeDriver: true } as any),
        Animated.timing(headerOpacity, { toValue: 1, duration: 300, delay: 60, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX,     { toValue: -DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropOpacity,{ toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(headerOpacity,  { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
  }, [isOpen]);

  function navigate(route: string) {
    close();
    setTimeout(() => router.push(route as any), 50);
  }

  async function handleSignOut() {
    close();
    await signOut();
    router.replace('/login');
  }

  if (!visible) return null;

  const isActive = (route: string) =>
    route === '/(tabs)' ? pathname === '/' : pathname.includes(route.replace('/(tabs)/', ''));

  // Compute global item index for stagger delay
  let globalIdx = 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[d.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={close} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View style={[d.drawer, { transform: [{ translateX }] }]}>
        {/* Background gradient */}
        <LinearGradient
          colors={[Colors.elevated, Colors.surface, Colors.bg]}
          start={{ x: 0.3, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Subtle top glow */}
        <View style={d.topGlow} />

        <View style={[d.drawerInner, { paddingTop: insets.top }]}>

          {/* ── Header ── */}
          <Animated.View style={[d.drawerHeader, { opacity: headerOpacity, transform: [{ scale: headerScale }] }]}>
            <View style={d.logoRow}>
              <Image source={LOGO} style={d.logoImage} resizeMode="contain" />
              <View style={d.livePill}>
                <LiveDot />
                <Text style={d.liveText}>LIVE</Text>
              </View>
            </View>
            <TouchableOpacity onPress={close} style={d.closeBtn} hitSlop={8}>
              <X color={Colors.textMuted} size={18} />
            </TouchableOpacity>
          </Animated.View>

          {/* ── Athlete card ── */}
          <Animated.View style={{ opacity: headerOpacity, transform: [{ scale: headerScale }] }}>
            <TouchableOpacity style={d.athleteCard} onPress={() => navigate('/(tabs)/profile')} activeOpacity={0.85}>
              <LinearGradient
                colors={[`${Colors.primary}15`, `${Colors.accent}08`]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              {/* Top accent stripe */}
              <LinearGradient
                colors={[Colors.accent, Colors.primary, `${Colors.primary}00`]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={d.cardTopStripe}
              />

              {/* Avatar with gradient ring */}
              <View style={d.athleteAvatarWrap}>
                <LinearGradient
                  colors={[Colors.accent, Colors.primary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={d.avatarRing}
                >
                  <View style={d.avatarRingInner}>
                    {profile?.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={d.athleteAvatar} />
                    ) : (
                      <View style={[d.athleteAvatar, d.avatarDefault]}>
                        <Text style={d.avatarInitial}>{profile?.full_name?.[0]?.toUpperCase() ?? 'A'}</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
                <View style={d.onlineDot} />
              </View>

              <View style={d.athleteInfo}>
                <Text style={d.athleteName} numberOfLines={1}>
                  {profile?.full_name ?? 'Athlete'}
                </Text>
                <Text style={d.athleteRole} numberOfLines={1}>
                  {profile?.position ?? ''}{profile?.position && profile?.sport ? ' · ' : ''}{profile?.sport ?? 'Athlete'}
                </Text>
                {/* AI Score chip */}
                <View style={d.aiChip}>
                  <Zap color={Colors.bg} size={9} fill={Colors.bg} />
                  <Text style={d.aiChipTxt}>AI Score 92</Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => navigate('/(tabs)/settings')} style={d.settingsIcon} hitSlop={8}>
                <Settings2 color={Colors.textMuted} size={16} />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Nav items ── */}
          <ScrollView style={d.navScroll} showsVerticalScrollIndicator={false}>
            {SECTIONS.map((section) => {
              const color = SECTION_COLORS[section.title] ?? Colors.textMuted;
              return (
                <View key={section.title} style={d.section}>
                  <SectionHeader title={section.title} color={color} delay={globalIdx * 35} />
                  {section.items.map((item) => {
                    const active = isActive(item.route);
                    const itemDelay = (globalIdx++) * 35;
                    return (
                      <NavItem
                        key={item.route}
                        item={item}
                        active={active}
                        color={color}
                        onPress={() => navigate(item.route)}
                        delay={itemDelay + 80}
                      />
                    );
                  })}
                </View>
              );
            })}
            <View style={{ height: 24 }} />
          </ScrollView>

          {/* ── Footer / Logout ── */}
          <View style={[d.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
            <LinearGradient
              colors={['transparent', `${Colors.error}12`]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={d.footerGradLine}
            />
            <TouchableOpacity style={d.logoutBtn} onPress={handleSignOut} activeOpacity={0.8}>
              <View style={d.logoutIconWrap}>
                <LogOut color={Colors.error} size={16} />
              </View>
              <Text style={d.logoutText}>Sign Out</Text>
              <ChevronRight color={`${Colors.error}60`} size={14} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const d = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
  },
  topGlow: {
    position: 'absolute',
    top: -80,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${Colors.primary}10`,
  },
  drawerInner: { flex: 1 },

  // Header
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logoRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logoImage:{ width: 130, height: 40 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${Colors.success}15`,
    borderRadius: Radii.full,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: `${Colors.success}30`,
  },
  livePulse:   { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success, opacity: 0.3 },
  liveDotCore: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.success },
  liveText:    { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.success, letterSpacing: 1 },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },

  // Athlete card
  athleteCard: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    overflow: 'hidden',
  },
  cardTopStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  athleteAvatarWrap: { position: 'relative' },
  avatarRing:   { width: 52, height: 52, borderRadius: 26, padding: 2, alignItems: 'center', justifyContent: 'center' },
  avatarRingInner: { width: 47, height: 47, borderRadius: 24, overflow: 'hidden', backgroundColor: Colors.bg },
  athleteAvatar:{ width: 47, height: 47, borderRadius: 24 },
  avatarDefault:{ backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial:{ color: Colors.white, fontFamily: Typography.family.bold, fontSize: Typography.size.lg },
  onlineDot:    { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 5.5, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.bg },
  athleteInfo:  { flex: 1, gap: 2 },
  athleteName:  { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  athleteRole:  { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  aiChip:       { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.accent, borderRadius: Radii.full, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 2 },
  aiChipTxt:    { fontFamily: Typography.family.bold, fontSize: 9, color: Colors.bg, letterSpacing: 0.3 },
  settingsIcon: { padding: 4 },

  // Nav
  navScroll:   { flex: 1, paddingHorizontal: Spacing.sm },
  section:     { marginBottom: Spacing.xs },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.sm, paddingTop: 18, paddingBottom: 6 },
  sectionDash: { width: 3, height: 12, borderRadius: 2 },
  sectionTitle:{ fontFamily: Typography.family.bold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: 1 },

  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    borderRadius: Radii.md,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
    marginVertical: 1,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navItemActive: { borderWidth: 1 },
  activeBar:     { position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, borderRadius: 2 },
  iconWrap:      { width: 32, height: 32, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  navLabel:      { flex: 1, fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  hotPill:       { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.accent, borderRadius: Radii.full, paddingHorizontal: 6, paddingVertical: 2 },
  hotTxt:        { fontFamily: Typography.family.display, fontSize: 8, color: Colors.bg, letterSpacing: 0.8 },
  navBadge:      { borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  navBadgeTxt:   { color: Colors.white, fontFamily: Typography.family.bold, fontSize: 11 },
  chevron:       {},

  // Footer
  footer:       { paddingHorizontal: Spacing.lg },
  footerGradLine:{ height: 1, marginBottom: Spacing.md },
  logoutBtn:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radii.md, backgroundColor: `${Colors.error}10`, borderWidth: 1, borderColor: `${Colors.error}22` },
  logoutIconWrap:{ width: 32, height: 32, borderRadius: Radii.sm, backgroundColor: `${Colors.error}15`, alignItems: 'center', justifyContent: 'center' },
  logoutText:   { flex: 1, fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.error },
});
