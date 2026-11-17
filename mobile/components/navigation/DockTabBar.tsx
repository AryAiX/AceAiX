import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewInstance,
  type LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import { NATIVE_DRIVER } from '@/lib/motion';
import { useDockMetrics } from './dockInset';
import { CreateMenu, type CreateChoice, type PlusFrame } from './CreateMenu';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';
import { announceTabReselect } from '@/hooks/useTabReselect';

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
/* The open tab's bead: a round pebble that holds the icon and its word. */
const LENS_W = 56;
const LENS_H = 54;

interface Props extends TabBarProps {
  /** Routes that are not tabs for this account (they stay routes for links). */
  hidden: ReadonlySet<string>;
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
    /* Tapping the tab you are already on: the page goes back to the top and
       reloads, and the icon bumps. */
    if (route.key === activeKey) {
      announceTabReselect(route.name);
      return;
    }
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
        marginTop: -m.overlap,
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
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: dark ? 0.6 : 0.24,
            shadowRadius: 26,
            elevation: 10,
          }}
          testID="tab-dock"
        >
          <View
            style={{
              ...StyleSheet.absoluteFill,
              borderRadius: m.height / 2,
              overflow: 'hidden',
            }}
          >
            <BlurView intensity={90} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            {/* Soft grey, a step darker than the page so the dock stands apart,
                with a gentle shine from top to bottom. The page shows through
                only as a tint, never as readable text. */}
            <LinearGradient
              colors={
                dark
                  ? (['rgba(74,82,103,0.96)', 'rgba(58,65,85,0.96)', 'rgba(44,50,67,0.96)'] as const)
                  : (['rgba(237,235,245,0.97)', 'rgba(224,222,235,0.97)', 'rgba(207,204,223,0.97)'] as const)
              }
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* A lit line along the top, kept off the rounded ends. */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: m.height / 2,
                right: m.height / 2,
                height: 1,
                backgroundColor: dark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.95)',
              }}
            />
            {/* A shaded bottom edge, so the dock reads as raised and lit from above. */}
            <LinearGradient
              pointerEvents="none"
              colors={
                dark
                  ? (['rgba(0,0,0,0)', 'rgba(0,0,0,0.28)'] as const)
                  : (['rgba(22,19,39,0)', 'rgba(22,19,39,0.10)'] as const)
              }
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 12 }}
            />
          </View>
          {/* A polished rim: a bright ring on the edge and a fine dark ring just
              outside it. Each ring is one colour all round, because two colours
              on a pill this round meet in a visible seam at each end. */}
          <View
            pointerEvents="none"
            style={{
              ...StyleSheet.absoluteFill,
              borderRadius: m.height / 2,
              borderWidth: 1,
              borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.75)',
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -1,
              left: -1,
              right: -1,
              bottom: -1,
              borderRadius: m.height / 2 + 1,
              borderWidth: 1,
              borderColor: dark ? 'rgba(0,0,0,0.35)' : 'rgba(22,19,39,0.09)',
            }}
          />

          {/* The glass lens behind the open tab. */}
          {slot > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                /* Centred on the icon and its word together. */
                top: (m.height - Math.min(LENS_H, m.height - 8)) / 2,
                left: 0,
                width: slot,
                height: Math.min(LENS_H, m.height - 8),
                alignItems: 'center',
                transform: [{ translateX: lensX }, { scale: lensScale }],
              }}
            >
              <View
                style={{
                  width: Math.min(LENS_W, slot - 4),
                  height: Math.min(LENS_H, m.height - 8),
                  borderRadius: 27,
                  /* Raised out of the dock: a soft shadow under it. */
                  shadowColor: '#161327',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: dark ? 0.6 : 0.24,
                  shadowRadius: 10,
                  elevation: 4,
                }}
              >
                {/* A pebble: white, lit from the top, with a bright top edge. */}
                <LinearGradient
                  colors={dark ? (['#66708C', '#4C5570'] as const) : (['#FFFFFF', '#F1F0F8'] as const)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    ...StyleSheet.absoluteFill,
                    borderRadius: 27,
                    borderWidth: 1,
                    borderColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(22,19,39,0.05)',
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
                    color: focused ? colors.primary : dark ? '#B5BACB' : '#5E5878',
                    size: 23,
                  })}
                </Pressable>
              );
            })}
          </View>
        </View>

        <CreateButton width={m.plusW} height={m.plus} />
      </View>
    </View>
  );
}

/** The round + : the action gradient, a step smaller than the dock is tall. */
function CreateButton({ width, height }: { width: number; height: number }) {
  const theme = useTheme();
  const router = useRouter();
  const reduced = useReducedMotion();
  const t = useT();
  const scale = useRef(new Animated.Value(1)).current;
  const { profile } = useAuth();

  /* The + opens a small menu: Post, Story, and (for athletes) Highlight. */
  const plusRef = useRef<ViewInstance>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [frame, setFrame] = useState<PlusFrame | null>(null);
  const pending = useRef<CreateChoice | null>(null);

  const go = (choice: CreateChoice) => {
    if (choice === 'post') router.push('/compose');
    else if (choice === 'story') router.push(Routes.newStory);
    else router.navigate({ pathname: Routes.myProfile, params: { tab: 'highlights', add: 'highlight' } });
  };

  const openMenu = () => {
    const node = plusRef.current;
    if (!node) {
      router.push('/compose');
      return;
    }
    node.measureInWindow((x, y, w, h) => {
      setFrame({ x, y, width: w, height: h });
      setMenuOpen(true);
    });
  };

  const afterDismiss = () => {
    const choice = pending.current;
    pending.current = null;
    if (choice) go(choice);
  };

  const pick = (choice: CreateChoice) => {
    setMenuOpen(false);
    /* iOS can't open the next screen while the menu is still closing, so it
       waits for onDismiss there; Android goes straight away. */
    if (Platform.OS !== 'ios') {
      go(choice);
      return;
    }
    pending.current = choice;
    /* In case onDismiss never comes, go anyway once the fade has finished. */
    setTimeout(afterDismiss, 450);
  };

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
        borderRadius: width / 2,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
        transform: [{ scale }],
      }}
    >
      <Pressable
        ref={plusRef}
        accessibilityRole="button"
        accessibilityLabel={t('common.tabCreate')}
        testID="tab-create"
        onPressIn={() => press(0.92)}
        onPressOut={() => press(1)}
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }
          openMenu();
        }}
        style={{
          width,
          height,
          borderRadius: width / 2,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Solid blue, the same as the Messages button. */}
        <View style={{ ...StyleSheet.absoluteFill, backgroundColor: theme.colors.primary }} />
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
      <CreateMenu
        visible={menuOpen}
        frame={frame}
        showHighlight={profile?.role === 'athlete'}
        onPick={pick}
        onClose={() => setMenuOpen(false)}
        onDismiss={afterDismiss}
      />
    </Animated.View>
  );
}
