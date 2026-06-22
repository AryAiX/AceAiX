import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { getAthleteByUserId, latestClearance, listMatches, listMedia, listOpportunities, profileViewCount } from './src/api/athlete';
import { PrimaryButton } from './src/components/ui';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { MatchesScreen } from './src/screens/MatchesScreen';
import { OpportunitiesScreen } from './src/screens/OpportunitiesScreen';
import { PortfolioScreen } from './src/screens/PortfolioScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { colors } from './src/theme';
import type { AthleteMedia, AthleteProfile, MatchRecord, MedicalClearance, Opportunity } from './src/types';

type TabKey = 'home' | 'portfolio' | 'matches' | 'opps' | 'profile';

interface AthleteData {
  athlete: AthleteProfile;
  media: AthleteMedia[];
  matches: MatchRecord[];
  opportunities: Opportunity[];
  clearance: MedicalClearance | null;
  profileViews: number;
}

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'home', label: 'Home' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'matches', label: 'Matches' },
  { key: 'opps', label: 'Opps' },
  { key: 'profile', label: 'Profile' },
];

function Root() {
  const { loading, profile, signOut, user } = useAuth();

  if (loading) return <Splash label="Loading athlete session..." />;
  if (!user) return <AuthScreen />;
  if (!profile) return <Splash label="Loading profile..." />;
  if (profile.role !== 'athlete') {
    return (
      <SafeAreaView style={styles.roleWrap}>
        <StatusBar style="light" />
        <Text style={styles.roleTitle}>Athlete app only</Text>
        <Text style={styles.roleCopy}>
          This native build is scoped to the athlete role. Use the web app for {profile.role.replace('_', ' ')} tools.
        </Text>
        <PrimaryButton label="Sign out" variant="secondary" onPress={signOut} />
      </SafeAreaView>
    );
  }
  return <AthleteShell />;
}

function Splash({ label }: { label: string }) {
  return (
    <View style={styles.splash}>
      <ActivityIndicator color={colors.volt} size="large" />
      <Text style={styles.splashText}>{label}</Text>
    </View>
  );
}

function AthleteShell() {
  const { profile, user } = useAuth();
  const [tab, setTab] = useState<TabKey>('home');
  const [data, setData] = useState<AthleteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const athlete = await getAthleteByUserId(user.id);
    if (!athlete) throw new Error('No athlete profile exists for this account yet.');
    const [media, matches, opportunities, clearance, views] = await Promise.all([
      listMedia(athlete.id),
      listMatches(athlete.id),
      listOpportunities({ sport: athlete.sport, limit: 20 }),
      latestClearance(athlete.id),
      profileViewCount(athlete.id),
    ]);
    setData({ athlete, media, matches, opportunities, clearance, profileViews: views });
  }, [user]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load athlete data.'))
      .finally(() => setLoading(false));
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh athlete data.');
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) return <Splash label="Loading athlete workspace..." />;
  if (error || !data || !profile) {
    return (
      <SafeAreaView style={styles.roleWrap}>
        <StatusBar style="light" />
        <Text style={styles.roleTitle}>Could not load athlete data</Text>
        <Text style={styles.roleCopy}>{error ?? 'Try again.'}</Text>
        <PrimaryButton label="Retry" onPress={refresh} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>AceAiX</Text>
          <Text style={styles.context}>Athlete mobile</Text>
        </View>
        <Text style={styles.score}>{Math.round(data.athlete.profile_completeness ?? 0)}%</Text>
      </View>

      <View style={styles.screen}>
        {tab === 'home' ? (
          <DashboardScreen {...data} profile={profile} refreshing={refreshing} onRefresh={refresh} />
        ) : null}
        {tab === 'portfolio' ? <PortfolioScreen athlete={data.athlete} media={data.media} onChanged={refresh} /> : null}
        {tab === 'matches' ? <MatchesScreen athlete={data.athlete} matches={data.matches} onChanged={refresh} /> : null}
        {tab === 'opps' ? <OpportunitiesScreen athlete={data.athlete} opportunities={data.opportunities} /> : null}
        {tab === 'profile' ? <ProfileScreen athlete={data.athlete} profile={profile} onChanged={refresh} /> : null}
      </View>

      <View style={styles.tabs}>
        {TABS.map((item) => {
          const active = item.key === tab;
          return (
            <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    backgroundColor: colors.navy900,
    flex: 1,
  },
  splash: {
    alignItems: 'center',
    backgroundColor: colors.navy900,
    flex: 1,
    gap: 14,
    justifyContent: 'center',
  },
  splashText: {
    color: colors.slate,
    fontSize: 14,
    fontWeight: '700',
  },
  roleWrap: {
    backgroundColor: colors.navy900,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  roleTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 10,
  },
  roleCopy: {
    color: colors.slate,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 22,
  },
  topBar: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  brand: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  context: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  score: {
    color: colors.volt,
    fontSize: 22,
    fontWeight: '900',
  },
  screen: {
    flex: 1,
  },
  tabs: {
    backgroundColor: 'rgba(7,17,31,0.98)',
    borderTopColor: 'rgba(255,255,255,0.09)',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 6,
    left: 0,
    paddingBottom: 18,
    paddingHorizontal: 10,
    paddingTop: 10,
    position: 'absolute',
    right: 0,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    paddingVertical: 11,
  },
  tabActive: {
    backgroundColor: colors.navy600,
  },
  tabText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  tabTextActive: {
    color: colors.white,
  },
});
