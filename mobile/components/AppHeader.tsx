import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Image, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, Bell, MessageSquare, Search, X } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { useDrawer } from '@/context/DrawerContext';
import { useAuth } from '@/context/AuthContext';
import { useNotificationContext } from '@/context/NotificationContext';
import { useRouter } from 'expo-router';

interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const { open, isOpen } = useDrawer();
  const { profile } = useAuth();
  const { unreadCount } = useNotificationContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [searchFocused, setSearchFocused] = useState(false);

  // Menu burger bar animations
  const bar1Rot  = useRef(new Animated.Value(0)).current;
  const bar2Opacity = useRef(new Animated.Value(1)).current;
  const bar3Rot  = useRef(new Animated.Value(0)).current;
  const bar1Y    = useRef(new Animated.Value(0)).current;
  const bar3Y    = useRef(new Animated.Value(0)).current;

  // Bell pulse (when unread)
  const bellPulse   = useRef(new Animated.Value(1)).current;
  const bellGlow    = useRef(new Animated.Value(0)).current;

  // Badge pop
  const badgeScale  = useRef(new Animated.Value(0)).current;

  // Search glow
  const searchBorder = useRef(new Animated.Value(0)).current;

  // Header entry
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide   = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerSlide,   { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Drawer open/close morphs burger into X
  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(bar1Rot,     { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(bar2Opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(bar3Rot,     { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(bar1Y,       { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(bar3Y,       { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bar1Rot,     { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(bar2Opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(bar3Rot,     { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(bar1Y,       { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(bar3Y,       { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen]);

  // Bell pulse loop
  useEffect(() => {
    if (unreadCount > 0) {
      const loop = Animated.loop(Animated.sequence([
        Animated.parallel([
          Animated.timing(bellPulse, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(bellGlow,  { toValue: 1,   duration: 500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(bellPulse, { toValue: 1,   duration: 500, useNativeDriver: true }),
          Animated.timing(bellGlow,  { toValue: 0,   duration: 500, useNativeDriver: true }),
        ]),
        Animated.delay(1800),
      ]));
      loop.start();
      return () => loop.stop();
    }
  }, [unreadCount]);

  // Badge pop on mount
  useEffect(() => {
    if (unreadCount > 0) {
      Animated.spring(badgeScale, { toValue: 1, tension: 200, friction: 7, delay: 300, useNativeDriver: true } as any).start();
    }
  }, []);

  // Search border glow
  useEffect(() => {
    Animated.timing(searchBorder, {
      toValue: searchFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [searchFocused]);

  const bar1Rotate = bar1Rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const bar3Rotate = bar3Rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-45deg'] });
  const bar1TransY = bar1Y.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });
  const bar3TransY = bar3Y.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  const searchBorderColor = searchBorder.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });

  return (
    <Animated.View
      style={[h.wrap, { paddingTop: insets.top + 6, opacity: headerOpacity, transform: [{ translateY: headerSlide }] }]}
    >
      {/* Gradient border bottom */}
      <LinearGradient
        colors={[Colors.primary, Colors.accent, `${Colors.primary}00`]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={h.borderBottom}
      />

      {/* ── Top row ── */}
      <View style={h.row}>
        {/* Animated burger / X */}
        <TouchableOpacity onPress={open} hitSlop={10} style={h.burgerBtn} activeOpacity={0.7}>
          <View style={h.burgerWrap}>
            <Animated.View style={[h.bar, { transform: [{ rotate: bar1Rotate }, { translateY: bar1TransY }] }]} />
            <Animated.View style={[h.bar, h.barMid, { opacity: bar2Opacity }]} />
            <Animated.View style={[h.bar, { transform: [{ rotate: bar3Rotate }, { translateY: bar3TransY }] }]} />
          </View>
        </TouchableOpacity>

        {/* Title */}
        <Text style={h.title} numberOfLines={1}>{title}</Text>

        {/* Right icons */}
        <View style={h.right}>
          {/* Messages */}
          <TouchableOpacity
            style={h.iconBtn}
            hitSlop={8}
            onPress={() => router.push('/(tabs)/messages' as any)}
            activeOpacity={0.75}
          >
            <MessageSquare color={Colors.textMuted} size={21} />
          </TouchableOpacity>

          {/* Bell */}
          <TouchableOpacity
            style={h.iconBtn}
            hitSlop={8}
            onPress={() => router.push('/(tabs)/notifications' as any)}
            activeOpacity={0.75}
          >
            <Animated.View style={{ transform: [{ scale: bellPulse }] }}>
              {unreadCount > 0 && (
                <Animated.View style={[h.bellGlow, { opacity: bellGlow }]} />
              )}
              <Bell
                color={unreadCount > 0 ? Colors.primary : Colors.textMuted}
                size={21}
                fill={unreadCount > 0 ? `${Colors.primary}30` : 'none'}
              />
            </Animated.View>
            {unreadCount > 0 && (
              <Animated.View style={[h.badge, { transform: [{ scale: badgeScale }] }]}>
                <Text style={h.badgeTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>

          {/* Avatar */}
          <TouchableOpacity onPress={open} activeOpacity={0.8} style={h.avatarBtn}>
            <LinearGradient
              colors={[Colors.accent, Colors.primary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={h.avatarRing}
            >
              <View style={h.avatarInner}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={h.avatar} />
                ) : (
                  <View style={[h.avatar, h.avatarDefault]}>
                    <Text style={h.avatarInitial}>{profile?.full_name?.[0]?.toUpperCase() ?? 'A'}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search bar ── */}
      <Animated.View style={[h.searchBar, { borderColor: searchBorderColor as any }]}>
        {searchFocused
          ? <LinearGradient colors={[`${Colors.primary}08`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
          : null
        }
        <Search color={searchFocused ? Colors.primary : Colors.textDisabled} size={14} />
        <TextInput
          style={h.searchInput}
          placeholder="Search athletes, clubs, opportunities…"
          placeholderTextColor={Colors.textDisabled}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {searchFocused && (
          <TouchableOpacity onPress={() => setSearchFocused(false)} hitSlop={8}>
            <X color={Colors.textDisabled} size={14} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const BAR_W = 20;

const h = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    zIndex: 10,
    position: 'relative',
  },
  borderBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },

  // Burger
  burgerBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  burgerWrap: { width: BAR_W, gap: 5, alignItems: 'flex-start' },
  bar:        { width: BAR_W, height: 2, backgroundColor: Colors.textPrimary, borderRadius: 1 },
  barMid:     { width: BAR_W * 0.7 },

  title: {
    flex: 1,
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  iconBtn:  { position: 'relative' },

  // Bell
  bellGlow: {
    position: 'absolute',
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    opacity: 0.15,
    alignSelf: 'center',
    top: -6, left: -6,
  },
  badge: {
    position: 'absolute',
    top: -5, right: -7,
    backgroundColor: Colors.error,
    borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: Colors.bg,
  },
  badgeTxt: { color: Colors.white, fontSize: 9, fontFamily: Typography.family.bold },

  // Avatar
  avatarBtn:    {},
  avatarRing:   { width: 36, height: 36, borderRadius: 18, padding: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarInner:  { width: 33, height: 33, borderRadius: 16.5, overflow: 'hidden', backgroundColor: Colors.bg },
  avatar:       { width: 33, height: 33, borderRadius: 16.5 },
  avatarDefault:{ backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial:{ color: Colors.white, fontFamily: Typography.family.bold, fontSize: Typography.size.xs },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.elevated,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 38,
    gap: Spacing.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
});
