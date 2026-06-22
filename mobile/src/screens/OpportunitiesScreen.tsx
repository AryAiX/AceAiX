import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Pill, PrimaryButton, SectionHeader } from '../components/ui';
import { colors } from '../theme';
import type { AthleteProfile, Opportunity } from '../types';

interface Props {
  athlete: AthleteProfile;
  opportunities: Opportunity[];
}

function computeMatch(athlete: AthleteProfile, opportunity: Opportunity) {
  let score = 45;
  if (opportunity.sport && athlete.sport && opportunity.sport === athlete.sport) score += 20;
  if (opportunity.position && [athlete.position, athlete.position_primary, athlete.position_secondary].includes(opportunity.position)) score += 25;
  if (athlete.level && opportunity.description?.toLowerCase().includes(athlete.level.toLowerCase())) score += 10;
  return Math.min(score, 96);
}

export function OpportunitiesScreen({ athlete, opportunities }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Opportunities" action={<Pill label={`${opportunities.length} active`} tone="info" />} />
      <Text style={styles.copy}>Matched from the same live opportunities table used by the web recruiter and athlete dashboards.</Text>

      {opportunities.map((opportunity) => {
        const match = computeMatch(athlete, opportunity);
        return (
          <Card key={opportunity.id} accent={match >= 80 ? colors.volt : undefined}>
            <View style={styles.header}>
              <View style={styles.titleWrap}>
                <Text style={styles.title}>{opportunity.title}</Text>
                <Text style={styles.meta}>{opportunity.organization?.name ?? opportunity.location ?? 'Organization not set'}</Text>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.matchText}>{match}%</Text>
              </View>
            </View>
            <View style={styles.tags}>
              {opportunity.type ? <Pill label={opportunity.type} /> : null}
              {opportunity.position ? <Pill label={opportunity.position} tone="info" /> : null}
              {opportunity.sport ? <Pill label={opportunity.sport} tone="success" /> : null}
            </View>
            <Text style={styles.description} numberOfLines={4}>
              {opportunity.description ?? 'No description provided.'}
            </Text>
            {opportunity.organization?.name ? (
              <PrimaryButton
                label="Research club"
                variant="secondary"
                onPress={() => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(opportunity.organization?.name ?? '')}`)}
              />
            ) : null}
          </Card>
        );
      })}

      {opportunities.length === 0 ? (
        <Card>
          <Text style={styles.copy}>No active opportunities match your current profile yet. Complete sport, position, and level to improve matching.</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 110,
  },
  copy: {
    color: colors.slate,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
  },
  meta: {
    color: colors.slate,
    fontSize: 13,
    marginTop: 4,
  },
  matchBadge: {
    alignItems: 'center',
    backgroundColor: colors.volt,
    borderRadius: 18,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  matchText: {
    color: colors.navy900,
    fontSize: 15,
    fontWeight: '900',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  description: {
    color: colors.slate,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
    marginTop: 12,
  },
});
