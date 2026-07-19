import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Award, MapPin, Plus, Trash2, X } from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface CareerMilestone {
  id: string;
  milestone_type: string | null;
  club_or_event: string | null;
  achieved_at: string | null;
  notes: string | null;
}

export default function Career() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<CareerMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState('');
  const [clubOrEvent, setClubOrEvent] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  const loadEntries = useCallback(async () => {
    if (!profile?.athlete_profile_id) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('career_milestones')
      .select('id,milestone_type,club_or_event,achieved_at,notes')
      .eq('athlete_id', profile.athlete_profile_id)
      .order('achieved_at', { ascending: false });
    setLoading(false);
    if (error) {
      Alert.alert('Career history unavailable', error.message);
      return;
    }
    setEntries((data ?? []) as CareerMilestone[]);
  }, [profile?.athlete_profile_id]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  async function addEntry() {
    if (!profile?.athlete_profile_id || !type.trim() || !clubOrEvent.trim()) {
      Alert.alert('Complete the entry', 'Add a milestone type and club or event.');
      return;
    }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Check the date', 'Use YYYY-MM-DD format.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('career_milestones').insert({
      athlete_id: profile.athlete_profile_id,
      milestone_type: type.trim(),
      club_or_event: clubOrEvent.trim(),
      achieved_at: date || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Career entry not added', error.message);
      return;
    }
    setType('');
    setClubOrEvent('');
    setDate('');
    setNotes('');
    setEditorOpen(false);
    await loadEntries();
  }

  async function removeEntry(id: string) {
    const { error } = await supabase.from('career_milestones').delete().eq('id', id);
    if (error) {
      Alert.alert('Career entry not deleted', error.message);
      return;
    }
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  function confirmRemove(entry: CareerMilestone) {
    const label = entry.club_or_event ?? 'this entry';
    if (Platform.OS === 'web') {
      if (globalThis.confirm(`Delete ${label}?`)) void removeEntry(entry.id);
      return;
    }
    Alert.alert('Delete career entry?', label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void removeEntry(entry.id) },
    ]);
  }

  const currentMilestone = profile?.current_club ? [{
    id: 'current-profile',
    year: new Date().getFullYear().toString(),
    event: profile.league ?? profile.sport ?? 'Current level',
    club: profile.current_club,
    role: profile.position ?? 'Athlete',
    rating: profile.performance_score ? profile.performance_score / 10 : 0,
    current: true,
  }] : [];
  const milestones = [
    ...currentMilestone,
    ...entries.map((entry) => ({
      id: entry.id,
      year: entry.achieved_at ? new Date(entry.achieved_at).getFullYear().toString() : 'Date not set',
      event: entry.milestone_type ?? 'Career milestone',
      club: entry.club_or_event ?? 'Club or event',
      role: entry.notes ?? '',
      rating: 0,
      current: false,
    })),
  ];
  const achievements = entries.filter((entry) =>
    /achievement|award|champion|trophy/i.test(entry.milestone_type ?? ''),
  );

  return (
    <View style={s.root}>
      <AppHeader title="Career" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.summaryRow}>
          {[
            { label: 'Entries', value: String(milestones.length) },
            { label: 'Clubs', value: String(new Set(milestones.map((entry) => entry.club)).size) },
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
          {milestones.map((m, i) => (
            <View key={m.id} style={s.timelineItem}>
              <View style={s.timelineLeft}>
                <View style={[s.timelineDot, m.current && s.timelineDotCurrent]} />
                {i < milestones.length - 1 && <View style={s.timelineLine} />}
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
                {!m.current && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Delete career entry ${m.club}`}
                    style={s.deleteEntry}
                    onPress={() => {
                      const entry = entries.find((candidate) => candidate.id === m.id);
                      if (entry) confirmRemove(entry);
                    }}
                  >
                    <Trash2 color={Colors.error} size={14} />
                    <Text style={s.deleteEntryText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          {loading && <ActivityIndicator color={Colors.primary} />}
          {!loading && milestones.length === 0 && (
            <Text style={s.emptyText}>No career entries yet. Add a verified milestone to start building your timeline.</Text>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Achievements</Text>
          {achievements.map((achievement, i) => (
            <View key={achievement.id} style={[s.achRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.border }]}>
              <Award color={Colors.accent} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={s.achLabel}>{achievement.milestone_type}</Text>
                <Text style={s.achOrg}>
                  {achievement.club_or_event}
                  {achievement.achieved_at ? ` · ${new Date(achievement.achieved_at).getFullYear()}` : ''}
                </Text>
              </View>
            </View>
          ))}
          {achievements.length === 0 && (
            <Text style={s.emptyText}>No achievements have been added yet.</Text>
          )}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Add career entry"
          style={s.addBtn}
          onPress={() => setEditorOpen(true)}
        >
          <Plus color={Colors.primary} size={18} />
          <Text style={s.addTxt}>Add Career Entry</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal visible={editorOpen} transparent animationType="slide" onRequestClose={() => setEditorOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.editor}>
            <View style={s.editorHeader}>
              <Text style={s.editorTitle}>Add Career Entry</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close career entry" onPress={() => setEditorOpen(false)}>
                <X color={Colors.textMuted} size={22} />
              </TouchableOpacity>
            </View>
            <TextInput
              accessibilityLabel="Career milestone type"
              style={s.input}
              value={type}
              onChangeText={setType}
              placeholder="Type, e.g. Signed, Award, Championship"
              placeholderTextColor={Colors.textDisabled}
            />
            <TextInput
              accessibilityLabel="Career club or event"
              style={s.input}
              value={clubOrEvent}
              onChangeText={setClubOrEvent}
              placeholder="Club or event"
              placeholderTextColor={Colors.textDisabled}
            />
            <TextInput
              accessibilityLabel="Career milestone date"
              style={s.input}
              value={date}
              onChangeText={setDate}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={Colors.textDisabled}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              accessibilityLabel="Career entry notes"
              style={[s.input, s.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Role, context, or notes"
              placeholderTextColor={Colors.textDisabled}
              multiline
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Save career entry"
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              disabled={saving}
              onPress={() => void addEntry()}
            >
              {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={s.saveBtnText}>Save Entry</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  deleteEntry: { marginTop: Spacing.sm, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  deleteEntryText: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.error },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  achLabel: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  achOrg: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radii.lg, paddingVertical: Spacing.md + 2, borderWidth: 2, borderColor: `${Colors.primary}40`, borderStyle: 'dashed' as any },
  addTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.primary },
  emptyText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 20 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  editor: { backgroundColor: Colors.surface, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editorTitle: { fontFamily: Typography.family.display, fontSize: Typography.size.xl, color: Colors.textPrimary },
  input: { backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary },
  notesInput: { minHeight: 88, textAlignVertical: 'top' },
  saveBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: Radii.md, minHeight: 48 },
  saveBtnText: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white },
});
