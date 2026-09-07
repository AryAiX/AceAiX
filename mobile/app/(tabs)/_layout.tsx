import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Compass, Home, Plus, Target, User } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';

/**
 * Five destinations, and only five. Everything else in the app is reachable
 * from one of them — the previous build had sixteen screens hidden behind a
 * drawer, which is the main reason it felt complicated.
 */

function TabIcon({
  Icon,
  focused,
  label,
  bump = 0,
}: {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  focused: boolean;
  label: string;
  /** Increments every time an already-open tab is tapped again. */
  bump?: number;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const reduced = useReducedMotion();
  const lift = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const bounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) {
      lift.setValue(focused ? 1 : 0);
      return;
    }
    Animated.timing(lift, {
      toValue: focused ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focused, lift, reduced]);

  useEffect(() => {
    if (bump === 0 || reduced) return;
    Animated.sequence([
      Animated.spring(bounce, { toValue: 1.18, useNativeDriver: true, speed: 70, bounciness: 0 }),
      Animated.spring(bounce, { toValue: 1, useNativeDriver: true, speed: 34, bounciness: 12 }),
    ]).start();
  }, [bump, bounce, reduced]);

  const color = focused ? colors.primary : colors.textMuted;

  return (
    <View style={styles.tabItem}>
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 14,
          paddingVertical: 4,
          borderRadius: 999,
          transform: [
            { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
            { scale: bounce },
          ],
        }}
      >
        {/* The active tab wears its colour rather than just borrowing it. */}
        <Animated.View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: 999,
            backgroundColor: theme.alpha(colors.primary, 0.14),
            opacity: lift,
            transform: [{ scale: lift.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          }}
        />
        {/* Wrapped so the pill stays behind it on web, where an absolute
            sibling outranks static content whatever the source order. */}
        <View>
          <Icon size={24} color={color} strokeWidth={focused ? 2.4 : 1.9} />
        </View>
      </Animated.View>
      <Text
        variant="overline"
        color={color}
        style={{ fontSize: 9.5, letterSpacing: 0.4, marginTop: 3 }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

/** Centre action. Not a route — it opens the composer as a modal. */
function CreateButton() {
  const theme = useTheme();
  const router = useRouter();
  const reduced = useReducedMotion();
  const t = useT();
  const scale = useRef(new Animated.Value(1)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const press = (to: number) => {
    if (reduced) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 50, bounciness: 6 }).start();
  };

  /**
   * A slow breath, 2.5% either side of resting. It is meant to be noticed only
   * once — the button is alive, not asking for anything — so it stays well
   * under the threshold where something in the corner of your eye starts to
   * nag. Reduce-motion switches it off entirely.
   */
  useEffect(() => {
    if (reduced) {
      breath.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(breath, {
            toValue: 1,
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 1,
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(breath, {
            toValue: 0,
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0,
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, glow, reduced]);

  /*
   * `tabBarButton` replaces the default button entirely, and the default is the
   * thing that centred it: react-navigation hands the button a style carrying
   * `alignItems: 'center'`, and this one ignored it. The slot is `flex: 1`, so
   * the 56px circle was laid out at the slot's leading edge — about 13px left
   * of centre on a 414pt screen, which is exactly far enough to look wrong
   * beside four symmetrical icons. `alignItems: 'center'` here is the fix; it
   * also means the press and breath scales now pivot on the button rather than
   * on the whole slot.
   */
  return (
    <Animated.View
      style={{
        alignItems: 'center',
        justifyContent: 'flex-start',
        alignSelf: 'stretch',
        transform: [
          { scale },
          { scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) },
        ],
        marginTop: -18,
      }}
    >
      {/* A soft halo that pulses with the breath — colour, not chrome. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -6,
          width: 68,
          height: 68,
          borderRadius: 34,
          backgroundColor: theme.alpha(theme.colors.primary, 0.28),
          opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] }),
          transform: [
            { scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] }) },
          ],
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.tabCreate')}
        testID="tab-create"
        onPressIn={() => press(0.92)}
        onPressOut={() => press(1)}
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }
          router.push('/compose');
        }}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 4,
          borderColor: theme.colors.tabBar,
          overflow: 'hidden',
          ...theme.elevation(2),
        }}
      >
        <LinearGradient
          colors={theme.gradients.action}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* The icon is wrapped rather than bare: on the web build an
            absolutely-positioned sibling paints above static content whatever
            the source order, so an unwrapped <svg> disappears under the
            gradient. A View gives it a stacking context of its own. */}
        <View>
          <Plus size={26} color={theme.colors.textOnBrand} strokeWidth={2.8} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const t = useT();

  /* Which tab was last re-tapped, and how many times. Tapping the tab you are
     already on has no navigation to show for itself, so the icon answers. */
  const [rebump, setRebump] = useState({ route: '', count: 0 });

  const onTabPress = useCallback((route: string, alreadyHere: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    if (alreadyHere) {
      setRebump((prev) => ({ route, count: prev.count + 1 }));
    }
  }, []);

  const bumpFor = (route: string) => (rebump.route === route ? rebump.count : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom || 8,
          elevation: 0,
        },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('common.tabHome'),
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={Home} focused={focused} label={t('common.tabHome')} bump={bumpFor('index')} />
          ),
          tabBarAccessibilityLabel: t('common.tabHome'),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => onTabPress('index', navigation.isFocused()),
        })}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: t('common.tabDiscover'),
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={Compass} focused={focused} label={t('common.tabDiscover')} bump={bumpFor('discover')} />
          ),
          tabBarAccessibilityLabel: t('common.tabDiscover'),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => onTabPress('discover', navigation.isFocused()),
        })}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t('common.tabCreate'),
          tabBarButton: () => <CreateButton />,
        }}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tabs.Screen
        name="opportunities"
        options={{
          title: t('common.tabTrials'),
          tabBarIcon: ({ focused }) => (
            <TabIcon
              Icon={Target}
              focused={focused}
              label={t('common.tabTrials')}
              bump={bumpFor('opportunities')}
            />
          ),
          tabBarAccessibilityLabel: t('common.tabTrials'),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => onTabPress('opportunities', navigation.isFocused()),
        })}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('common.tabYou'),
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={User} focused={focused} label={t('common.tabYou')} bump={bumpFor('profile')} />
          ),
          tabBarAccessibilityLabel: t('common.tabYou'),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => onTabPress('profile', navigation.isFocused()),
        })}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', justifyContent: 'center', width: 72 },
});
