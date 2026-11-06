import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Compass, Handshake, HeartHandshake, Home, Plus, Swords, Target, User, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { NATIVE_DRIVER } from '@/lib/motion';
import { useClaimPendingInvite } from '@/hooks/useClaimPendingInvite';

/** The bar's height above the home indicator. */
const BAR_HEIGHT = 60;
/** The colour line along the bar's top edge: violet tips, cobalt under the + . */
const RAIL = 3;
/** The compose button: a square seated across the top edge, above the centre tab. */
const CREATE_SIZE = 38;
/** The soft ring around it (lavender on light, slate on dark), which cuts the rail. */
const RING = 3;
/** The centre tab's icon and label move down by this much, to clear the + . */
const CENTRE_DROP = 6;
/** The rail swells into a soft hill under the + : this tall, and this far out
    from the centre on each side before it is flat again. */
const HUMP = 20;
const HUMP_HALF = 66;

/**
 * The rail's path: flat along the bar's top edge, rising into a smooth hill
 * that cradles the + and falling back on the other side. `base` is the rail's
 * line; `fill` closes the same hill a little lower, to paint the bar colour
 * under it (and over the hairline edge).
 */
function railPath(width: number, base: number, close?: number): string {
  const cx = width / 2;
  const top = base - HUMP;
  const l = cx - HUMP_HALF;
  const r = cx + HUMP_HALF;
  const half = HUMP_HALF / 2;
  const hill =
    `L ${l} ${base} ` +
    `C ${l + half} ${base} ${cx - half} ${top} ${cx} ${top} ` +
    `C ${cx + half} ${top} ${r - half} ${base} ${r} ${base} `;
  if (close === undefined) return `M 0 ${base} ${hill}L ${width} ${base}`;
  return `M ${l} ${close} L ${l} ${base} ${hill.slice(hill.indexOf('C'))}L ${r} ${close} Z`;
}

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
  centre = false,
}: {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  focused: boolean;
  label: string;
  /** Increments every time an already-open tab is tapped again. */
  bump?: number;
  /** The tab under the + : drawn a little lower so the button never covers it. */
  centre?: boolean;
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
    <View style={[styles.tabItem, centre ? { transform: [{ translateY: CENTRE_DROP }] } : null]}>
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
            ...StyleSheet.absoluteFill,
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
        style={{ fontSize: 9.5, letterSpacing: 0.4, marginTop: 3, width: '100%', textAlign: 'center' }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * The compose action, seated across the top edge of the tab bar, above the
 * centre tab.
 *
 * Positioned against the screen, not against a tab slot, so it is centred by
 * arithmetic that cannot drift when a destination is added or removed. With
 * five tabs the centre slot is Play (Matches for a club), and its icon and
 * label stay in view below the button; with four (under-18s have no Play) the
 * button sits over the gap between Discover and Trials.
 *
 * A 38pt square in the action gradient, 10pt corners, inside a 3pt soft ring
 * (lavender on light, slate on dark) that cuts the rail around it, with a soft
 * shadow so it reads as lifted. No halo and no breathing.
 */
function CreateButton({ bottom }: { bottom: number }) {
  const theme = useTheme();
  const router = useRouter();
  const reduced = useReducedMotion();
  const t = useT();
  const scale = useRef(new Animated.Value(1)).current;

  const press = (to: number) => {
    if (reduced) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, { toValue: to, useNativeDriver: NATIVE_DRIVER, speed: 50, bounciness: 6 }).start();
  };

  /*
   * Two views, and the split is the point. The outer one positions, and is the
   * width of the screen; the inner one animates, and is the width of the
   * button. Scaling the outer one grows a 414pt box past both edges of the
   * screen; on the web build the page becomes wider than the viewport and the
   * whole app slides sideways under a finger. `tests/e2e/look.mjs` asserts the
   * document is never wider than the viewport, on every screen.
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
          borderRadius: theme.radii.button + RING,
          backgroundColor: theme.colors.surfaceAlt,
          /* Lifted: a soft shadow under the ring, so it sits above the rail. */
          ...theme.elevation(2),
          transform: [{ scale }],
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.tabCreate')}
          testID="tab-create"
          /* Up to the 44pt minimum target on three sides, none below — so a
             tap meant for Play's icon is never taken by the button. */
          hitSlop={{ top: 4, left: 4, right: 4, bottom: 0 }}
          onPressIn={() => press(0.92)}
          onPressOut={() => press(1)}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            }
            router.push('/compose');
          }}
          style={{
            width: CREATE_SIZE + RING * 2,
            height: CREATE_SIZE + RING * 2,
            borderRadius: theme.radii.button + RING,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: RING,
            borderColor: theme.colors.surfaceAlt,
            overflow: 'hidden',
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
            <Plus size={20} color={theme.colors.textOnBrand} strokeWidth={2.6} />
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
  const { profile, isSponsor, isGuardian } = useAuth();
  useClaimPendingInvite();

  /*
   * Meetups are eighteen-plus, and the database enforces that — a minor asking
   * gets an empty list, not an error. The tab is hidden from them anyway,
   * because a destination that is always empty reads as a broken app rather
   * than as a rule, and there is nothing there for them to see.
   *
   * Club accounts do not get the tab either. `href: null` removes it from the
   * bar without removing the route, so a deep link still resolves and the
   * screen's own empty state handles it.
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

  /* Seated on the rail's hill above Play, so Play's icon and label below it
     stay in view. */
  const barHeight = BAR_HEIGHT + insets.bottom;
  /* The button sits on the crest of the rail's hill, its centre on the top
     of the curve, so the line seems to lift it out of the bar. */
  const fabBottom = barHeight + HUMP - (CREATE_SIZE + RING * 2) / 2;
  const [barWidth, setBarWidth] = useState(0);
  /* The svg's own box: the rail's line sits 2pt above its bottom edge, which
     is placed 2pt below the bar's top edge — so the line is the edge. */
  /* Room above and below the line for the glow. */
  const GLOW_PAD = 8;
  const svgHeight = HUMP + RAIL + GLOW_PAD * 2;
  const railBase = svgHeight - GLOW_PAD;
  /* The glow gathers around the hill and fades out along the flat rail. */
  const glowStops = [
    { offset: 0, color: colors.accent, opacity: 0 },
    { offset: 0.22, color: colors.accent, opacity: 0.12 },
    { offset: 0.38, color: colors.primary, opacity: 0.55 },
    { offset: 0.5, color: colors.primary, opacity: 1 },
    { offset: 0.62, color: colors.primary, opacity: 0.55 },
    { offset: 0.78, color: colors.accent, opacity: 0.12 },
    { offset: 1, color: colors.accent, opacity: 0 },
  ];
  const dark = theme.scheme === 'dark';
  /* The rail: nearly the full width of the bar, cobalt under the button and
     strong violet towards both tips, fading out only at the very edges. */
  const railColors = [
    theme.alpha(colors.accent, 0),
    colors.accent,
    colors.primary,
    colors.primary,
    colors.accent,
    theme.alpha(colors.accent, 0),
  ] as const;
  const railStops = [0, 0.1, 0.4, 0.6, 0.9, 1] as const;

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setBarWidth(Math.round(e.nativeEvent.layout.width))}>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          height: barHeight,
          paddingTop: 8,
          paddingBottom: insets.bottom || 8,
          elevation: 0,
        },
        tabBarItemStyle: { paddingTop: 2 },
        /* The icon wrapper defaults to a 31pt box, and the label lives inside
           the icon here — so every label longer than three letters was being
           cut to "PRO…". Let the wrapper take the whole slot. */
        tabBarIconStyle: { width: '100%' },
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
          href: canMeet && profile?.role !== 'club' ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              Icon={Users}
              focused={focused}
              label={t('common.tabMeetups')}
              bump={bumpFor('meetups')}
              centre
            />
          ),
          tabBarAccessibilityLabel: t('common.tabMeetups'),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => onTabPress('meetups', navigation.isFocused()),
        })}
      />
      <Tabs.Screen
        name="club-matches"
        options={{
          title: t('common.matches'),
          /* Club accounts only. Everyone else keeps Play in this slot. */
          href: profile?.role === 'club' ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              Icon={Swords}
              focused={focused}
              label={t('common.matches')}
              bump={bumpFor('club-matches')}
              centre
            />
          ),
          tabBarAccessibilityLabel: t('common.matches'),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => onTabPress('club-matches', navigation.isFocused()),
        })}
      />
      <Tabs.Screen
        name="opportunities"
        options={{
          title: t('common.tabTrials'),
          /*
           * Sponsors cannot apply or enter, and a guardian's bar shows
           * Children in this slot instead. The route stays for deep links.
           */
          href: isSponsor || isGuardian ? null : undefined,
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
        name="children"
        options={{
          title: t('common.tabChildren'),
          /* Hidden for every other role. The route stays for deep links. */
          href: isGuardian ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              Icon={HeartHandshake}
              focused={focused}
              label={t('common.tabChildren')}
              bump={bumpFor('children')}
            />
          ),
          tabBarAccessibilityLabel: t('common.tabChildrenA11y'),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => onTabPress('children', navigation.isFocused()),
        })}
      />
      <Tabs.Screen
        name="sponsorship"
        options={{
          title: t('common.tabSponsorship'),
          href: isSponsor ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              Icon={Handshake}
              focused={focused}
              label={t('common.tabSponsorship')}
              bump={bumpFor('sponsorship')}
            />
          ),
          tabBarAccessibilityLabel: t('sponsorship.portal'),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => onTabPress('sponsorship', navigation.isFocused()),
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

      {/* The rail. A sibling rather than part of `tabBarStyle`, which takes a
          flat colour only. It lies on the bar's top edge, never over an icon,
          takes no touches, and is full width and never scaled — so it cannot
          widen the page (tests/e2e/look.mjs). No glow. */}
      {barWidth > 0 ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: barHeight - GLOW_PAD, height: svgHeight }}
        >
          <Svg width={barWidth} height={svgHeight}>
            <Defs>
              <SvgGradient id="rail" x1="0" y1="0" x2="1" y2="0">
                {railColors.map((c, i) => (
                  <Stop key={i} offset={railStops[i]} stopColor={c} />
                ))}
              </SvgGradient>
              <SvgGradient id="glow" x1="0" y1="0" x2="1" y2="0">
                {glowStops.map((s) => (
                  <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
                ))}
              </SvgGradient>
              <SvgGradient id="hillTint" x1="0" y1="0" x2="0" y2="1">
                <Stop offset={0} stopColor={colors.primary} stopOpacity={dark ? 0.28 : 0.16} />
                <Stop offset={1} stopColor={colors.primary} stopOpacity={0} />
              </SvgGradient>
            </Defs>
            {/* The glow: three soft, widening strokes in place of a blur (a
                blur filter is not drawn the same on every phone). */}
            {[14, 9, 6].map((w, i) => (
              <Path
                key={w}
                d={railPath(barWidth, railBase)}
                stroke="url(#glow)"
                strokeWidth={w}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={(dark ? [0.14, 0.22, 0.3] : [0.08, 0.14, 0.2])[i]}
              />
            ))}
            {/* The bar's colour under the hill, a faint tint inside it, then
                the line on top. */}
            <Path d={railPath(barWidth, railBase, railBase + 2)} fill={colors.tabBar} />
            <Path d={railPath(barWidth, railBase, railBase + 2)} fill="url(#hillTint)" />
            <Path
              d={railPath(barWidth, railBase)}
              stroke="url(#rail)"
              strokeWidth={RAIL}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </View>
      ) : null}

      <CreateButton bottom={fabBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 72,
    minWidth: 0,
  },
});
