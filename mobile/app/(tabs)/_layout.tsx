import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Compass, Handshake, HeartHandshake, Home, Swords, Target, User, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { DockTabBar, type TabBarProps } from '@/components/navigation/DockTabBar';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { NATIVE_DRIVER } from '@/lib/motion';
import { useClaimPendingInvite } from '@/hooks/useClaimPendingInvite';

/**
 * Five destinations, and only five. Everything else in the app is reachable
 * from one of them.
 *
 * The bar is a floating glass dock (components/navigation/DockTabBar): the
 * tabs spread evenly, a glass lens slides behind the open one, and the + is
 * a round button of its own beside the dock. Composing is an action rather
 * than a place, so it is not a tab.
 */

/** One tab: its icon and name. The glass lens behind it lives in the dock. */
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
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const bounce = useRef(new Animated.Value(1)).current;

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
      <Animated.View style={{ transform: [{ scale: bounce }] }}>
        <Icon size={23} color={color} strokeWidth={focused ? 2.3 : 1.9} />
      </Animated.View>
      <Text
        variant="captionStrong"
        color={color}
        style={{ fontSize: 10.5, lineHeight: 13, marginTop: 2, width: '100%', textAlign: 'center' }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
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
  const isClub = profile?.role === 'club';

  /* The same rules as the `href: null`s below, for the dock to skip. */
  const hidden = useMemo(() => {
    const out = new Set<string>(['create']);
    if (!(canMeet && !isClub)) out.add('meetups');
    if (!isClub) out.add('club-matches');
    if (isSponsor || isGuardian) out.add('opportunities');
    if (!isGuardian) out.add('children');
    if (!isSponsor) out.add('sponsorship');
    return out;
  }, [canMeet, isClub, isSponsor, isGuardian]);

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
      /* Each prop is passed by name: some router versions define them as
         getters, which a {...props} spread silently drops. */
      tabBar={(props) => {
        const p = props as unknown as TabBarProps;
        return (
          <DockTabBar
            state={p.state}
            descriptors={p.descriptors}
            navigation={p.navigation}
            hidden={hidden}
          />
        );
      }}
      screenOptions={{ headerShown: false }}
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
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minWidth: 0,
  },
});
