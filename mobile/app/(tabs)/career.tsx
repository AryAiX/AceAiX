import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Award, CheckCircle2, ChevronDown, Edit, MapPin, Plus, Search, Trash2, X } from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 70 }, (_, i) => String(currentYear - 10 - i));

type PickerItem = { label: string; value: string; prefix?: string };

interface CareerMilestone {
  id: string;
  milestone_type: string | null;
  club_or_event: string | null;
  achieved_at: string | null;
  notes: string | null;
}

const MILESTONE_TYPES = ['Signed', 'Debut', 'Trophy', 'Championship', 'Award', 'Milestone', 'Other'];
const ACHIEVEMENT_TYPES = new Set(['trophy', 'championship', 'award']);

export default function Career() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<CareerMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState('');
  const [clubOrEvent, setClubOrEvent] = useState('');
  const [entryDay, setEntryDay] = useState('');
  const [entryMonth, setEntryMonth] = useState('');
  const [entryYear, setEntryYear] = useState('');
  const [datePickerTarget, setDatePickerTarget] = useState<'day' | 'month' | 'year' | null>(null);
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  function openEditor(entry?: CareerMilestone) {
    if (entry) {
      setEditingId(entry.id);
      setType(entry.milestone_type ?? '');
      setClubOrEvent(entry.club_or_event ?? '');
      if (!entry.achieved_at) {
        setEntryDay('');
        setEntryMonth('');
        setEntryYear('');
      } else {
        const [year, monthNum, day] = entry.achieved_at.split('-');
        setEntryDay(day);
        setEntryMonth(MONTHS[parseInt(monthNum, 10) - 1]);
        setEntryYear(year);
      }
      setNotes(entry.notes ?? '');
    } else {
      setEditingId(null);
      setType('');
      setClubOrEvent('');
      setEntryDay('');
      setEntryMonth('');
      setEntryYear('');
      setNotes('');
    }
    setEditorOpen(true);
  }

  const loadEntries = useCallback(async () => {
    if (!profile?.athlete_profile_id) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase
      .from('career_milestones')
      .select('id,milestone_type,club_or_event,achieved_at,notes')
      .eq('athlete_id', profile.athlete_profile_id)
      .order('achieved_at', { ascending: false });
    setLoading(false);
    if (error) {
      setLoadError(true);
      Alert.alert('Career history unavailable', error.message);
      return;
    }
    setEntries((data ?? []) as CareerMilestone[]);
  }, [profile?.athlete_profile_id]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  // Dismissing mid-save would hide whether the milestone was stored.
  function closeEditor() {
    if (saving) return;
    setEditingId(null);
    setEditorOpen(false);
  }

  function buildEntryDate(day: string, month: string, year: string): string | null {
    if (!day && !month && !year) return null;
    if (!day || !month || !year) return 'incomplete';
    const mIdx = MONTHS.indexOf(month) + 1;
    return `${year}-${String(mIdx).padStart(2, '0')}-${day}`;
  }

  async function saveEntry() {
    if (!profile?.athlete_profile_id || !type.trim() || !clubOrEvent.trim()) {
      Alert.alert('Complete the entry', 'Add a milestone type and club or event.');
      return;
    }
    const builtDate = buildEntryDate(entryDay, entryMonth, entryYear);
    if (builtDate === 'incomplete') {
      Alert.alert('Check the date', 'Select a day, month, and year, or leave all three blank.');
      return;
    }
    const parsed = builtDate ? new Date(builtDate) : null;
    if (builtDate && (Number.isNaN(parsed!.getTime()) || parsed!.toISOString().slice(0, 10) !== builtDate)) {
      Alert.alert('Check the date', 'Enter a valid calendar date.');
      return;
    }
    setSaving(true);
    const payload = {
      milestone_type: type.trim(),
      club_or_event: clubOrEvent.trim(),
      achieved_at: builtDate,
      notes: notes.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from('career_milestones').update(payload).eq('id', editingId)
      : await supabase.from('career_milestones').insert({ ...payload, athlete_id: profile.athlete_profile_id });
    setSaving(false);
    if (error) {
      Alert.alert('Career entry not added', error.message);
      return;
    }
    setType('');
    setClubOrEvent('');
    setEntryDay('');
    setEntryMonth('');
    setEntryYear('');
    setNotes('');
    setEditingId(null);
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
    ACHIEVEMENT_TYPES.has((entry.milestone_type ?? '').toLowerCase()),
  );
  const clubCount = new Set(
    milestones
      .filter((entry) => !ACHIEVEMENT_TYPES.has((entry.event ?? '').toLowerCase()))
      .map((entry) => entry.club.trim().toLowerCase().replace(/\s+/g, ' '))
  ).size;

  return (
    <View style={s.root}>
      <AppHeader title="Career" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.summaryRow}>
          {[
            { label: 'Entries', value: String(milestones.length) },
            { label: 'Clubs', value: String(clubCount) },
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
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Edit career entry ${m.club}`}
                      style={s.editEntry}
                      onPress={() => {
                        const entry = entries.find((candidate) => candidate.id === m.id);
                        if (entry) openEditor(entry);
                      }}
                    >
                      <Edit color={Colors.primary} size={14} />
                      <Text style={s.editEntryText}>Edit</Text>
                    </TouchableOpacity>
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
                  </View>
                )}
              </View>
            </View>
          ))}
          {loading && <ActivityIndicator color={Colors.primary} />}
          {!loading && loadError && (
            <Text style={s.emptyText}>Couldn’t load your career history. Pull to refresh or try again.</Text>
          )}
          {!loading && !loadError && milestones.length === 0 && (
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
          onPress={() => openEditor()}
        >
          <Plus color={Colors.primary} size={18} />
          <Text style={s.addTxt}>Add Career Entry</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal
        visible={editorOpen}
        transparent
        animationType="slide"
        onRequestClose={closeEditor}
        accessibilityViewIsModal
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={s.modalBackdrop}>
            <View style={s.editor}>
              <View style={s.editorHeader}>
                <Text style={s.editorTitle}>{editingId ? 'Edit Career Entry' : 'Add Career Entry'}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close career entry" onPress={closeEditor}>
                  <X color={Colors.textMuted} size={22} />
                </TouchableOpacity>
              </View>
              <View style={s.typeGrid}>
                {MILESTONE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    accessibilityRole="button"
                    accessibilityLabel={`Select milestone type ${t}`}
                    style={[s.typeChip, type === t && s.typeChipActive]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[s.typeChipTxt, type === t && s.typeChipTxtActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                accessibilityLabel="Career club or event"
                style={s.input}
                value={clubOrEvent}
                onChangeText={setClubOrEvent}
                placeholder="Club or event"
                placeholderTextColor={Colors.textDisabled}
              />
              <View style={s.dateRow}>
                <SelectButton
                  value={entryDay}
                  placeholder="Day"
                  onPress={() => setDatePickerTarget('day')}
                  style={s.dateSelectDay}
                />
                <SelectButton
                  value={entryMonth}
                  placeholder="Month"
                  onPress={() => setDatePickerTarget('month')}
                  style={s.dateSelectMonth}
                />
                <SelectButton
                  value={entryYear}
                  placeholder="Year"
                  onPress={() => setDatePickerTarget('year')}
                  style={s.dateSelectYear}
                />
              </View>
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
                onPress={() => void saveEntry()}
              >
                {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={s.saveBtnText}>{editingId ? 'Save Changes' : 'Save Entry'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <PickerModal
        visible={datePickerTarget !== null}
        title={datePickerTarget === 'day' ? 'Day' : datePickerTarget === 'month' ? 'Month' : 'Year'}
        items={
          datePickerTarget === 'day' ? DAYS.map(d => ({ label: d, value: d })) :
          datePickerTarget === 'month' ? MONTHS.map(m => ({ label: m, value: m })) :
          YEARS.map(y => ({ label: y, value: y }))
        }
        selected={datePickerTarget === 'day' ? entryDay : datePickerTarget === 'month' ? entryMonth : entryYear}
        onSelect={(item) => {
          if (datePickerTarget === 'day') setEntryDay(item.value);
          else if (datePickerTarget === 'month') setEntryMonth(item.value);
          else if (datePickerTarget === 'year') setEntryYear(item.value);
        }}
        onClose={() => setDatePickerTarget(null)}
      />
    </View>
  );
}

function SelectButton({
  value, placeholder, onPress, error, style, textStyle,
}: {
  value: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
  style?: any;
  textStyle?: any;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={value ? `${placeholder}, currently ${value}` : placeholder}
      accessibilityState={{ selected: Boolean(value) }}
      style={[s.selectBtn, style, error ? s.inputError : null]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.selectText, textStyle, !value && s.placeholderText]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <ChevronDown color={Colors.textMuted} size={16} />
    </TouchableOpacity>
  );
}

function PickerModal({
  visible, title, items, selected, onSelect, onClose, searchable = false,
}: {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selected: string;
  onSelect: (item: PickerItem) => void;
  onClose: () => void;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState('');
  const filtered = searchable && query.trim()
    ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  function handleSelect(item: PickerItem) {
    Keyboard.dismiss();
    onSelect(item);
    onClose();
    setQuery('');
  }

  function handleClose() {
    Keyboard.dismiss();
    onClose();
    setQuery('');
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      {/* KAV is the full-screen container so the sheet lifts above the keyboard */}
      <KeyboardAvoidingView
        style={pm.kavOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={pm.sheet}>
          <View style={pm.handle} />
          <View style={pm.header}>
            <Text style={pm.title}>{title}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Close ${title} picker`}
              onPress={handleClose}
              hitSlop={8}
            >
              <X color={Colors.textMuted} size={20} />
            </TouchableOpacity>
          </View>
          {searchable && (
            <View style={pm.searchRow}>
              <Search color={Colors.textMuted} size={15} />
              <TextInput
                accessibilityLabel={`Search ${title}`}
                style={pm.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search…"
                placeholderTextColor={Colors.textDisabled}
                returnKeyType="search"
              />
            </View>
          )}
          <FlatList
            data={filtered}
            keyExtractor={i => i.value}
            style={pm.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item.value === selected;
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: active }}
                  style={[pm.item, active && pm.itemActive]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  {item.prefix ? <Text style={pm.prefix}>{item.prefix}</Text> : null}
                  <Text style={[pm.itemText, active && pm.itemTextActive]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {active && <CheckCircle2 color={Colors.primary} size={16} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  editEntry: { marginTop: Spacing.sm, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  editEntryText: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.primary },
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
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.full, backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border },
  typeChipActive: { backgroundColor: `${Colors.primary}20`, borderColor: `${Colors.primary}50` },
  typeChipTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  typeChipTxtActive: { color: Colors.primary },
  notesInput: { minHeight: 88, textAlignVertical: 'top' },
  saveBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: Radii.md, minHeight: 48 },
  saveBtnText: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white },
  inputError: { borderColor: Colors.error },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  selectText: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  placeholderText: { color: Colors.textDisabled },
  dateRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'stretch' },
  dateSelectDay: { flex: 0.95, minWidth: 0, paddingHorizontal: Spacing.md, minHeight: 54 },
  dateSelectMonth: { flex: 1.35, minWidth: 0, paddingHorizontal: Spacing.md, minHeight: 54 },
  dateSelectYear: { flex: 1.05, minWidth: 0, paddingHorizontal: Spacing.md, minHeight: 54 },
});

const pm = StyleSheet.create({
  kavOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingBottom: Spacing.xxxl,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xxl,
    marginVertical: Spacing.md,
    backgroundColor: Colors.elevated,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  list: { flexShrink: 1, maxHeight: 340 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  itemActive: { backgroundColor: 'rgba(46, 139, 255, 0.08)' },
  prefix: { fontSize: Typography.size.lg, width: 28 },
  itemText: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.md,
    color: Colors.textMuted,
  },
  itemTextActive: { color: Colors.textPrimary, fontFamily: Typography.family.medium },
});
