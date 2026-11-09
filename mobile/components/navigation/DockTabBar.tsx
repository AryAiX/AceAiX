import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import { NATIVE_DRIVER } from '@/lib/motion';

/* The props React Navigation hands a custom tab bar. Typed loosely on
   purpose: the package is a dependency of expo-router, not of this app. */
interface Route {
  key: string;
  name: string;
  params?: object;
}
export interface TabBarProps {
  state: { index: number; routes: Route[] };
  descriptors: Record<
    string,
    {
      options: {
        tabBarIcon?: (p: { focused: boolean; color: string; size: number }) => React.ReactNode;
        tabBarAccessibilityLabel?: string;
        title?: string;
      };
      /** The screen's own navigation, used if the navigator's is missing. */
      navigation?: { navigate: (name: string, params?: object) => void };
    }
  >;
  navigation?: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
}

/** Inner padding of the dock, around the tabs and the lens. */
const pad = 5;
/** The glass lens: a small pill around the open tab's icon. */
const LENS_W = 52;
const LENS_H = 32;

interface Props extends TabBarProps {
  /** Routes that are not tabs for this account (they stay routes for links). */
  hidden: ReadonlySet<string>;
}

/**
 * Sizes that hold on every phone: the dock and the + scale a little with the
 * screen width, within limits, and the dock stops growing on a tablet.
 */
function useDockMetrics() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const side = Math.round(Math.min(20, Math.max(12, width * 0.035)));
  const height = width < 360 ? 60 : 66;
  const plus = height - 4;
  const gap = 8;
  /* On a phone with a home bar the dock sits a little into the safe area,
     so it does not float too high; on one without, it keeps a margin. */
  const bottom = insets.bottom > 0 ? Math.max(insets.bottom - 10, 12) : 12;
  const maxRow = 560;
  return { side, height, plus, gap, bottom, maxRow };
}

/**
 * The floating dock: the tabs spread evenly on frosted glass, and a glass lens
 * behind the open tab that slides to the next one. Drag a finger along the
 * dock and the lens follows it, then settles on the tab you let go over.
 * The + is its own round button on the right.
 */
export function DockTabBar({ state, descriptors, navigation, hidden }: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const dark = theme.scheme === 'dark';
  const reduced = useReducedMotion();
  const m = useDockMetrics();

  const tabs = useMemo(() => state.routes.filter((r) => !hidden.has(r.name)), [state.routes, hidden]);
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(
    0,
    tabs.findIndex((r) => r.key === activeKey),
  );

  const [dockWidth, setDockWidth] = useState(0);
  const slot = dockWidth > 0 ? (dockWidth - pad * 2) / tabs.length : 0;
  const lensX = useRef(new Animated.Value(0)).current;
  const lensScale = useRef(new Animated.Value(1)).current;
  const dragging = useRef(false);
  const startX = useRef(0);

  /* Follow the open tab: a spring, so it slides like glass rather than jumps. */
  useEffect(() => {
    if (slot === 0 || dragging.current) return;
    const to = pad + activeIndex * slot;
    if (reduced) lensX.setValue(to);
    else
      Animated.spring(lensX, {
        toValue: to,
        useNativeDriver: NATIVE_DRIVER,
        speed: 18,
        bounciness: 6,
      }).start();
  }, [activeIndex, slot, lensX, reduced]);

  /* The tab press goes through the navigator, so the screens hear it (tap
     the open tab again to go back to the top). If a router version ever
     hands the bar no navigator, fall back to the screen's own navigation
     rather than crash. */
  const open = (route: Route) => {
    if (navigation?.emit) {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (route.key !== activeKey && !event.defaultPrevented) navigation.navigate(route.name, route.params);
      return;
    }
    if (route.key !== activeKey) descriptors[route.key]?.navigation?.navigate(route.name, route.params);
  };

  /* Refs so the responder, made once, always sees the latest layout. */
  const live = useRef({ slot, tabs, activeIndex, open });
  live.current = { slot, tabs, activeIndex, open };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => {
          const { slot: s, activeIndex: i } = live.current;
          dragging.current = true;
          startX.current = pad + i * s;
          Animated.spring(lensScale, { toValue: 1.12, useNativeDriver: NATIVE_DRIVER, speed: 30, bounciness: 4 }).start();
        },
        onPanResponderMove: (_, g) => {
          const { slot: s, tabs: t } = live.current;
          const max = pad + (t.length - 1) * s;
          lensX.setValue(Math.min(max, Math.max(pad, startX.current + g.dx)));
        },
        onPanResponderRelease: (_, g) => {
          const { slot: s, tabs: t, open: go } = live.current;
          dragging.current = false;
          const x = startX.current + g.dx - pad;
          const i = Math.min(t.length - 1, Math.max(0, Math.round(x / (s || 1))));
          Animated.parallel([
            Animated.spring(lensScale, { toValue: 1, useNativeDriver: NATIVE_DRIVER, speed: 24, bounciness: 8 }),
            Animated.spring(lensX, { toValue: pad + i * s, useNativeDriver: NATIVE_DRIVER, speed: 18, bounciness: 6 }),
          ]).start();
          if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
          go(t[i]);
        },
        onPanResponderTerminate: () => {
          const { slot: s, activeIndex: i } = live.current;
          dragging.current = false;
          Animated.parallel([
            Animated.spring(lensScale, { toValue: 1, useNativeDriver: NATIVE_DRIVER }),
            Animated.spring(lensX, { toValue: pad + i * s, useNativeDriver: NATIVE_DRIVER }),
          ]).start();
        },
      }),
    [lensScale, lensX],
  );

  const onDockLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setDockWidth((prev) => (prev === w ? prev : w));
  };

  /* The dock floats over the page with nothing behind it: cards and clips
     run under it and on to the bottom of the screen. Taps beside and below
     the dock go through to the page. */
  return (
    <View
      pointerEvents="box-none"
      style={{
        /* The bar takes no room: the page runs clear to the bottom of the
           screen, under the dock and below it. */
        marginTop: -(6 + m.height + m.bottom),
        paddingTop: 6,
        paddingBottom: m.bottom,
        paddingHorizontal: m.side,
      }}
    >
      <View
        pointerEvents="box-none"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: m.gap,
          width: '100%',
          maxWidth: m.maxRow,
          alignSelf: 'center',
        }}
      >
        <View
          onLayout={onDockLayout}
          {...pan.panHandlers}
          style={{
            flex: 1,
            height: m.height,
            borderRadius: m.height / 2,
            /* The shadow lives on this view; the glass inside it clips. */
            shadowColor: dark ? '#000000' : '#14143C',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: dark ? 0.5 : 0.16,
            shadowRadius: 22,
            elevation: 10,
          }}
          testID="tab-dock"
        >
          <View
            style={{
              ...StyleSheet.absoluteFill,
              borderRadius: m.height / 2,
              overflow: 'hidden',
              borderWidth: 1,
              /* A lit rim: brighter along the top edge than the sides. */
              borderColor: dark ? 'rgba(255,255,255,0.10)' : 'rgba(214,211,235,0.9)',
              borderTopColor: dark ? 'rgba(255,255,255,0.22)' : '#FFFFFF',
            }}
          >
            <BlurView intensity={90} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            {/* Mostly solid, with a soft shine from top to bottom: the page
                shows through only as a tint, never as readable text. */}
            <LinearGradient
              colors={
                dark
                  ? (['rgba(58,65,82,0.95)', 'rgba(42,47,60,0.95)'] as const)
                  : (['rgba(255,255,255,0.97)', 'rgba(244,243,251,0.95)'] as const)
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {/* The glass lens behind the open tab. */}
          {slot > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                /* Centred on the icon: the icon (23), a 2pt gap and the
                   label (13) sit in the middle of the dock. */
                top: (m.height - 38) / 2 + 11.5 - LENS_H / 2,
                left: 0,
                width: slot,
                height: LENS_H,
                alignItems: 'center',
                transform: [{ translateX: lensX }, { scale: lensScale }],
              }}
            >
              <View
                style={{
                  width: Math.min(LENS_W, slot - 4),
                  height: LENS_H,
                  borderRadius: LENS_H / 2,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.18,
                  shadowRadius: 6,
                }}
              >
                {/* A glass bead: lighter at the top, with a lit top edge. */}
                <LinearGradient
                  colors={[
                    theme.alpha(colors.primary, dark ? 0.32 : 0.2),
                    theme.alpha(colors.primary, dark ? 0.2 : 0.11),
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    ...StyleSheet.absoluteFill,
                    borderRadius: LENS_H / 2,
                    borderWidth: 1,
                    borderColor: dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.7)',
                    borderTopColor: dark ? 'rgba(255,255,255,0.25)' : '#FFFFFF',
                  }}
                />
              </View>
            </Animated.View>
          ) : null}

          <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: pad }}>
            {tabs.map((route) => {
              const { options } = descriptors[route.key];
              const focused = route.key === activeKey;
              return (
                <Pressable
                  key={route.key}
                  onPress={() => open(route)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={options.tabBarAccessibilityLabel ?? options.title}
                  testID={`tab-${route.name}`}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                >
                  {options.tabBarIcon?.({
                    focused,
                    color: focused ? colors.primary : colors.textMuted,
                    size: 23,
                  })}
                </Pressable>
              );
            })}
          </View>
        </View>

        <CreateButton size={m.plus} />
      </View>
    </View>
  );
}

/** The round + : the action gradient, a step smaller than the dock is tall. */
function CreateButton({ size }: { size: number }) {
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

  return (
    <Animated.View
      style={{
        borderRadius: size / 2,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
        transform: [{ scale }],
      }}
    >
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
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={theme.gradients.action}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* A highlight across the top half, so the + reads as a raised button. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.55 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Wrapped: on web an absolute sibling paints above a bare <svg>. */}
        <View>
          <Plus size={24} color={theme.colors.textOnBrand} strokeWidth={2.6} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
