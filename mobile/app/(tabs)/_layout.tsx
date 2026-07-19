import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Rss, Target, User } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { DrawerProvider } from '@/context/DrawerContext';
import { AppDrawer } from '@/components/AppDrawer';

// ── Tab icon with spring + indicator dot ──────────────────────────────────────
const TAB_ACCENT: Record<string, string> = {
  Dashboard:    Colors.primary,
  Feed:         Colors.success,
  Opportunities:Colors.warning,
  Profile:      Colors.accent,
};

function AnimTabIcon({
  Icon, focused, label,
}: {
  Icon: React.ComponentType<any>;
  focused: boolean;
  label: string;
}) {
  const scale    = useRef(new Animated.Value(focused ? 1.15 : 1)).current;
  const dotScale = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const dotOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const glowOpacity = useRef(new Animated.Value(focused ? 0.5 : 0)).current;

  const color  = TAB_ACCENT[label] ?? Colors.primary;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,    { toValue: focused ? 1.18 : 1,   tension: 200, friction: 8, useNativeDriver: true } as any),
      Animated.spring(dotScale, { toValue: focused ? 1 : 0,      tension: 200, friction: 8, useNativeDriver: true } as any),
      Animated.timing(dotOpacity,  { toValue: focused ? 1 : 0,   duration: 200, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: focused ? 0.35 : 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [focused]);

  return (
    <View style={ti.wrap}>
      {/* Glow backdrop */}
      <Animated.View style={[ti.glow, { backgroundColor: color, opacity: glowOpacity }]} />
      {/* Icon */}
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon
          color={focused ? color : Colors.textDisabled}
          size={22}
          strokeWidth={focused ? 2.5 : 1.8}
          fill={focused ? `${color}20` : 'none'}
        />
      </Animated.View>
      {/* Indicator dot */}
      <Animated.View style={[ti.dot, { backgroundColor: color, transform: [{ scale: dotScale }], opacity: dotOpacity }]} />
    </View>
  );
}

const ti = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', height: 38, width: 38 },
  glow: { position: 'absolute', width: 42, height: 42, borderRadius: 21, top: -2, left: -2 },
  dot:  { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
});

// ── TabsLayout ─────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  return (
    <DrawerProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: Colors.surface,
              borderTopWidth: 0,
              height: 78,
              paddingTop: Spacing.sm,
              paddingBottom: Spacing.lg,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 16,
            },
            tabBarBackground: () => (
              <View style={StyleSheet.absoluteFill}>
                <LinearGradient
                  colors={[`${Colors.surface}00`, Colors.surface]}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.3 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* Top gradient border */}
                <LinearGradient
                  colors={[Colors.primary, Colors.accent, Colors.warning, Colors.primary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 }}
                />
              </View>
            ),
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.textDisabled,
            tabBarLabelStyle: {
              fontFamily: Typography.family.medium,
              fontSize: 10,
              marginTop: 0,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Dashboard',
              tabBarLabel: 'Dashboard',
              tabBarIcon: ({ focused }) => (
                <AnimTabIcon Icon={Home} focused={focused} label="Dashboard" />
              ),
            }}
          />
          <Tabs.Screen
            name="feed"
            options={{
              title: 'Social Feed',
              tabBarLabel: 'Feed',
              tabBarIcon: ({ focused }) => (
                <AnimTabIcon Icon={Rss} focused={focused} label="Feed" />
              ),
            }}
          />
          <Tabs.Screen
            name="opportunities"
            options={{
              title: 'Opportunities',
              tabBarLabel: 'Opps',
              tabBarIcon: ({ focused }) => (
                <AnimTabIcon Icon={Target} focused={focused} label="Opportunities" />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarLabel: 'Profile',
              tabBarIcon: ({ focused }) => (
                <AnimTabIcon Icon={User} focused={focused} label="Profile" />
              ),
            }}
          />
          {/* Hidden screens — accessible via header / drawer */}
          <Tabs.Screen name="messages"         options={{ href: null }} />
          <Tabs.Screen name="performance"      options={{ href: null }} />
          <Tabs.Screen name="settings"         options={{ href: null }} />
          <Tabs.Screen name="edit-profile"     options={{ href: null }} />
          <Tabs.Screen name="notifications"    options={{ href: null }} />
          <Tabs.Screen name="media"            options={{ href: null }} />
          <Tabs.Screen name="medical"          options={{ href: null }} />
          <Tabs.Screen name="network"          options={{ href: null }} />
          <Tabs.Screen name="career"           options={{ href: null }} />
          <Tabs.Screen name="events"           options={{ href: null }} />
          <Tabs.Screen name="ai-coach"         options={{ href: null }} />
          <Tabs.Screen name="analytics"        options={{ href: null }} />
          <Tabs.Screen name="public-profile"   options={{ href: null }} />
          <Tabs.Screen name="discover"         options={{ href: null }} />
          <Tabs.Screen name="sportify-academy" options={{ href: null }} />
          <Tabs.Screen name="sportify-talent"  options={{ href: null }} />
        </Tabs>
        <AppDrawer />
      </View>
    </DrawerProvider>
  );
}
