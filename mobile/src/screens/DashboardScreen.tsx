import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Metric, Pill, ScoreBubble, SectionHeader } from '../components/ui';
import { colors } from '../theme';
import type { AthleteMedia, AthleteProfile, MatchRecord, MedicalClearance, Opportunity, UserProfile } from '../types';

interface Props {
  athlete: AthleteProfile;
  profile: UserProfile;
  media: AthleteMedia[];
  matches: MatchRecord[];
  opportunities: Opportunity[];
  clearance: MedicalClearance | null;
  profileViews: number;
  refreshing: boolean;
  onRefresh: () => void;
}

export function DashboardScreen({
  athlete,
  profile,
  media,
  matches,
  opportunities,
  clearance,
  profileViews,
  refreshing,
  onRefresh,
}: Props) {
  const firstName = profile.full_name?.split(' ')[0] ?? 'Athlete';
  const nextSteps = [
    !profile.bio && 'add a short bio',
    media.length === 0 && 'upload a highlight',
    matches.length < 3 && 'log recent matches',
    !clearance && 'request medical clearance',
  ].filter(Boolean);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.volt} onRefresh={onRefresh} />}
    >
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(profile.full_name ?? 'A').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.heroText}>
          <Text style={styles.kicker}>Good evening</Text>
          <Text style={styles.title}>{profile.full_name ?? 'Athlete'}</Text>
          <Text style={styles.subtitle}>
            {athlete.position_primary ?? athlete.position ?? 'Position not set'} · {athlete.sport ?? 'Football'}
          </Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <ScoreBubble label="AI Score" value={athlete.performance_score ?? 0} />
        <ScoreBubble label="Visibility" value={athlete.visibility_score ?? 0} />
        <ScoreBubble label="Profile" value={athlete.profile_completeness ?? 0} />
      </View>

      <Card accent={colors.volt}>
        <SectionHeader title="Today" />
        <Text style={styles.aiText}>
          {nextSteps.length
            ? `${firstName}, your mobile dashboard is live. Next: ${nextSteps.join(', ')}.`
            : `${firstName}, your athlete profile has strong coverage across media, matches, medical, and profile data.`}
        </Text>
      </Card>

      <View style={styles.metricRow}>
        <Metric label="Views" value={profileViews} helper="All time" />
        <Metric label="Highlights" value={media.length} helper="Portfolio" />
      </View>
      <View style={styles.metricRow}>
        <Metric label="Matches" value={matches.length} helper="Logged" />
        <Metric label="Open opps" value={opportunities.length} helper="Matched" />
      </View>

      <Card>
        <SectionHeader title="Recent form" />
        {matches.length ? (
          matches.slice(0, 4).map((match) => (
            <View key={match.id} style={styles.listRow}>
              <View>
                <Text style={styles.rowTitle}>{match.opponent ?? 'Opponent not set'}</Text>
                <Text style={styles.rowMeta}>{match.competition ?? match.match_date}</Text>
              </View>
              <Text style={styles.rowValue}>
                {match.goals}G / {match.assists}A
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No match records yet. Add a recent match from the Matches tab.</Text>
        )}
      </Card>

      <Card>
        <SectionHeader title="Medical" action={<Pill label={clearance?.status ?? 'Pending'} tone={clearance?.status === 'cleared' ? 'success' : 'warning'} />} />
        <Text style={styles.empty}>
          {clearance
            ? `Latest clearance status is ${clearance.status}${clearance.effective_to ? ` through ${clearance.effective_to}` : ''}.`
            : 'No partner-issued clearance is on file yet.'}
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 110,
  },
  hero: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.volt,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarText: {
    color: colors.navy900,
    fontSize: 24,
    fontWeight: '900',
  },
  heroText: {
    flex: 1,
  },
  kicker: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  subtitle: {
    color: colors.slate,
    fontSize: 14,
    marginTop: 3,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  aiText: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 23,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  listRow: {
    alignItems: 'center',
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  rowMeta: {
    color: colors.slate,
    fontSize: 12,
    marginTop: 3,
  },
  rowValue: {
    color: colors.volt,
    fontSize: 14,
    fontWeight: '900',
  },
  empty: {
    color: colors.slate,
    fontSize: 14,
    lineHeight: 21,
  },
});
