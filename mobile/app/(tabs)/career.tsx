import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Briefcase, TrendingUp, Award, MapPin, ChevronRight, Plus } from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function Career() {
  const { profile } = useAuth();
  const MILESTONES = profile?.current_club ? [{
    year: new Date().getFullYear().toString(),
    event: profile.league ?? profile.sport ?? 'Current level',
    club: profile.current_club,
    role: profile.position ?? 'Athlete',
    rating: profile.performance_score ? profile.performance_score / 10 : 0,
    current: true,
  }] : [];
  const ACHIEVEMENTS: Array<{ label: string; org: string; year: string }> = [];

  return (
    <View style={s.root}>
      <AppHeader title="Career" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.summaryRow}>
          {[
            { label: 'Years Pro', value: MILESTONES.length ? '1+' : '0' },
            { label: 'Clubs', value: String(MILESTONES.length) },
            { label: 'Career Rating', value: profile?.performance_score ? (profile.performance_score / 10).toFixed(1) : '—' },
          ].map((st, i) => (
            <View key={st.label} style={[s.summaryItem, i < 2 && s.summaryBorder]}>
              <Text style={s.summaryVal}>{st.value}</Text>
              <Text style={s.summaryLbl}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Career Timeline</Text>
          {MILESTONES.map((m, i) => (
            <View key={m.year} style={s.timelineItem}>
              <View style={s.timelineLeft}>
                <View style={[s.timelineDot, m.current && s.timelineDotCurrent]} />
                {i < MILESTONES.length - 1 && <View style={s.timelineLine} />}
              </View>
              <View style={[s.timelineCard, m.current && s.timelineCardCurrent]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View>
                    <Text style={s.timelineYear}>{m.year}</Text>
                    <Text style={s.timelineClub}>{m.club}</Text>
                    <Text style={s.timelineRole}>{m.role}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MapPin color={Colors.textDisabled} size={11} />
                      <Text style={s.timelineEvent}>{m.event}</Text>
                    </View>
                  </View>
                  {m.rating > 0 && (
                    <View style={s.ratingBadge}>
                      <Text style={s.ratingVal}>{m.rating}</Text>
                      <Text style={s.ratingLbl}>rating</Text>
                    </View>
                  )}
                </View>
                {m.current && <View style={s.currentBadge}><Text style={s.currentTxt}>Current</Text></View>}
              </View>
            </View>
          ))}
          {MILESTONES.length === 0 && (
            <Text style={s.emptyText}>No career entries yet. Add your club and level in Profile to start building your career timeline.</Text>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Achievements</Text>
          {ACHIEVEMENTS.map((ach, i) => (
            <View key={ach.label} style={[s.achRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.border }]}>
              <Award color={Colors.accent} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={s.achLabel}>{ach.label}</Text>
                <Text style={s.achOrg}>{ach.org} · {ach.year}</Text>
              </View>
            </View>
          ))}
          {ACHIEVEMENTS.length === 0 && (
            <Text style={s.emptyText}>No achievements have been added yet.</Text>
          )}
        </View>

        <TouchableOpacity style={s.addBtn}>
          <Plus color={Colors.primary} size={18} />
          <Text style={s.addTxt}>Add Career Entry</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  summaryRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  summaryBorder: { borderRightWidth: 1, borderRightColor: Colors.border },
  summaryVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xl, color: Colors.textPrimary },
  summaryLbl: { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textMuted },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontFamily: Typography.family.display, fontSize: Typography.size.xl, color: Colors.textPrimary, marginBottom: Spacing.md, letterSpacing: 0.5 },
  timelineItem: { flexDirection: 'row', gap: Spacing.md },
  timelineLeft: { width: 20, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.border, borderWidth: 2, borderColor: Colors.border },
  timelineDotCurrent: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timelineLine: { flex: 1, width: 2, backgroundColor: Colors.border, marginVertical: 2 },
  timelineCard: { flex: 1, backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  timelineCardCurrent: { borderColor: `${Colors.primary}50`, backgroundColor: `${Colors.primary}08` },
  timelineYear: { fontFamily: Typography.family.mono, fontSize: Typography.size.sm, color: Colors.primary },
  timelineClub: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  timelineRole: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted, marginTop: 2 },
  timelineEvent: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },
  ratingBadge: { alignItems: 'center', backgroundColor: `${Colors.accent}15`, borderRadius: Radii.md, padding: Spacing.sm, borderWidth: 1, borderColor: `${Colors.accent}30` },
  ratingVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.lg, color: Colors.accent },
  ratingLbl: { fontFamily: Typography.family.regular, fontSize: 9, color: Colors.textMuted },
  currentBadge: { marginTop: 8, backgroundColor: `${Colors.primary}20`, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  currentTxt: { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.primary },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  achLabel: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  achOrg: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radii.lg, paddingVertical: Spacing.md + 2, borderWidth: 2, borderColor: `${Colors.primary}40`, borderStyle: 'dashed' as any },
  addTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.primary },
  emptyText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 20 },
});
