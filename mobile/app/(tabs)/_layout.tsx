import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Compass, Home, Plus, Target, User, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { NATIVE_DRIVER } from '@/lib/motion';

/**
 * Five destinations, and only five. Everything else in the app is reachable
 * from one of them — the previous build had sixteen screens hidden behind a
 * drawer, which is the main reason it felt complicated.
 *
 * Composing is not a destination, so it is not a tab. It used to be one — a
 * raised circle occupying the middle of five slots — and that worked only
 * while the number of tabs was odd. Adding Play made it six, and six slots
 * have no middle: the button would have gone back to sitting off-centre, which
 * is the exact defect that was just fixed. So it lifted out of the bar
 * entirely and became what it always was, an action rather than a place.
 *
 * It now floats above the bar, centred on the screen rather than on a slot,
 * which is both more honest and no longer hostage to how many tabs there are.
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
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [focused, lift, reduced]);

  useEffect(() => {
    if (bump === 0 || reduced) return;
    Animated.sequence([
      Animated.spring(bounce, { toValue: 1.18, useNativeDriver: NATIVE_DRIVER, speed: 70, bounciness: 0 }),
      Animated.spring(bounce, { toValue: 1, useNativeDriver: NATIVE_DRIVER, speed: 34, bounciness: 12 }),
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

/**
 * The compose action, floating above the tab bar.
 *
 * Positioned against the screen, not against a tab slot, so it is centred by
 * arithmetic that cannot drift when a destination is added or removed.
 */
function CreateButton({ bottom }: { bottom: number }) {
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
    Animated.spring(scale, { toValue: to, useNativeDriver: NATIVE_DRIVER, speed: 50, bounciness: 6 }).start();
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
            useNativeDriver: NATIVE_DRIVER,
          }),
          Animated.timing(glow, {
            toValue: 1,
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: NATIVE_DRIVER,
          }),
        ]),
        Animated.parallel([
          Animated.timing(breath, {
            toValue: 0,
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: NATIVE_DRIVER,
          }),
          Animated.timing(glow, {
            toValue: 0,
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: NATIVE_DRIVER,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, glow, reduced]);

  /*
   * `left: 0, right: 0` with `alignItems: 'center'` centres against the screen.
   * Its predecessor was a `tabBarButton`, centred by react-navigation's own
   * item style, which it ignored — so the circle sat at the leading edge of a
   * flex:1 slot, thirteen points left of centre on a 414pt screen. Being out
   * of the bar means neither mistake is available any more: there is no slot
   * to be misaligned within, and no tab count that can move it.
   *
   * Two views, and the split is the point. The outer one positions, and is the
   * width of the screen; the inner one animates, and is the width of the
   * button. Scaling the outer one — which is what this did first — grows a
   * 414pt box to 426pt, so it hangs six points past both edges of the screen.
   * A phone shows nothing for that. The web build is a real document, so the
   * page becomes wider than the viewport, the whole app slides sideways under
   * a finger, and a strip of bare page sits down the right-hand edge of every
   * screen in the app. Every margin looks wrong at once and the cause is
   * nowhere near any of them.
   *
   * A 56pt button scaled by that same 3% grows by under a point, well inside
   * its own margin. `tests/e2e/look.mjs` now asserts the document is never
   * wider than the viewport, on every screen, because nobody would find this
   * one by reading the tab bar.
   */
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        alignItems: 'center',
      }}
    >
      <Animated.View
        pointerEvents="box-none"
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: [
            { scale },
            { scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) },
          ],
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
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const t = useT();
  const { profile } = useAuth();

  /*
   * Meetups are eighteen-plus, and the database enforces that — a minor asking
   * gets an empty list, not an error. The tab is hidden from them anyway,
   * because a destination that is always empty reads as a broken app rather
   * than as a rule, and there is nothing there for them to see.
   *
   * `href: null` removes it from the bar without removing the route, so a deep
   * link still resolves and the screen's own empty state handles it.
   */
  const canMeet = profile?.is_minor === false;

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

  /* Clear of the bar and of the home indicator, so it never covers a label. */
  const fabBottom = 60 + insets.bottom + 12;

  return (
    <View style={{ flex: 1 }}>
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
      {/* Still a route, so `/compose` and deep links resolve, but no longer a
          button in the bar — `href: null` takes it out without removing it. */}
      <Tabs.Screen
        name="create"
        options={{ title: t('common.tabCreate'), href: null }}
      />
      <Tabs.Screen
        name="meetups"
        options={{
          title: t('common.tabMeetups'),
          href: canMeet ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              Icon={Users}
              focused={focused}
              label={t('common.tabMeetups')}
              bump={bumpFor('meetups')}
            />
          ),
          tabBarAccessibilityLabel: t('common.tabMeetups'),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => onTabPress('meetups', navigation.isFocused()),
        })}
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

      <CreateButton bottom={fabBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', justifyContent: 'center', width: 72 },
});
