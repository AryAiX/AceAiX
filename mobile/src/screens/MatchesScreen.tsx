import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { createMatch } from '../api/athlete';
import { Card, Field, Metric, PrimaryButton, SectionHeader } from '../components/ui';
import { colors } from '../theme';
import type { AthleteProfile, MatchRecord } from '../types';

interface Props {
  athlete: AthleteProfile;
  matches: MatchRecord[];
  onChanged: () => Promise<void>;
}

export function MatchesScreen({ athlete, matches, onChanged }: Props) {
  const [opponent, setOpponent] = useState('');
  const [competition, setCompetition] = useState('');
  const [goals, setGoals] = useState('0');
  const [assists, setAssists] = useState('0');
  const [saving, setSaving] = useState(false);

  const totalGoals = matches.reduce((sum, match) => sum + (match.goals ?? 0), 0);
  const totalAssists = matches.reduce((sum, match) => sum + (match.assists ?? 0), 0);

  async function addMatch() {
    setSaving(true);
    try {
      await createMatch({
        athlete_id: athlete.id,
        match_date: new Date().toISOString().slice(0, 10),
        opponent: opponent.trim() || null,
        competition: competition.trim() || null,
        goals: Number(goals) || 0,
        assists: Number(assists) || 0,
      });
      setOpponent('');
      setCompetition('');
      setGoals('0');
      setAssists('0');
      await onChanged();
    } catch (error) {
      Alert.alert('Could not log match', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Matches" />
      <View style={styles.metricRow}>
        <Metric label="Matches" value={matches.length} />
        <Metric label="Goals" value={totalGoals} />
        <Metric label="Assists" value={totalAssists} />
      </View>

      <Card accent={colors.volt}>
        <Text style={styles.cardTitle}>Quick log</Text>
        <Field label="Opponent" value={opponent} onChangeText={setOpponent} placeholder="Al Ain U21" autoCapitalize="words" />
        <Field label="Competition" value={competition} onChangeText={setCompetition} placeholder="League, friendly..." autoCapitalize="words" />
        <View style={styles.formRow}>
          <Field label="Goals" value={goals} onChangeText={setGoals} keyboardType="number-pad" style={styles.smallInput} />
          <Field label="Assists" value={assists} onChangeText={setAssists} keyboardType="number-pad" style={styles.smallInput} />
        </View>
        <PrimaryButton label={saving ? 'Saving...' : 'Log match'} disabled={saving} onPress={addMatch} />
      </Card>

      {matches.map((match) => (
        <Card key={match.id}>
          <View style={styles.matchRow}>
            <View>
              <Text style={styles.matchTitle}>{match.opponent ?? 'Opponent not set'}</Text>
              <Text style={styles.matchMeta}>{match.competition ?? match.match_date}</Text>
            </View>
            <Text style={styles.matchScore}>
              {match.goals}G {match.assists}A
            </Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 110,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smallInput: {
    minWidth: 0,
  },
  matchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  matchTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  matchMeta: {
    color: colors.slate,
    fontSize: 12,
    marginTop: 4,
  },
  matchScore: {
    color: colors.volt,
    fontSize: 16,
    fontWeight: '900',
  },
});
