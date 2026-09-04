import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, Switch,
  KeyboardAvoidingView, Platform, FlatList, Keyboard,
} from 'react-native';
import { X, Calendar, Clock, MapPin, ChevronDown, CheckCircle2 } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { createEvent, updateEvent, type AthleteEvent, type CreateEventInput } from '@/lib/eventsService';

const EVENT_TYPES = ['Match', 'Training', 'Showcase', 'Trial', 'Camp', 'Friendly', 'Tournament', 'Other'];

export const TYPE_COLORS: Record<string, string> = {
  Match: Colors.primary,
  Training: Colors.success,
  Showcase: Colors.accent,
  Trial: Colors.warning,
  Camp: '#818CF8',
  Friendly: '#34D399',
  Tournament: Colors.error,
  Other: Colors.textMuted,
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => String(currentYear + i));
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];
type PickerItem = { label: string; value: string };

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  editingEvent?: AthleteEvent | null;
}

export function CreateEventSheet({ visible, onClose, onCreated, editingEvent }: Props) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Training');
  const [eventDay, setEventDay] = useState('');
  const [eventMonth, setEventMonth] = useState('');
  const [eventYear, setEventYear] = useState('');
  const [eventHour, setEventHour] = useState('');
  const [eventMinute, setEventMinute] = useState('');
  const [eventPeriod, setEventPeriod] = useState('');
  const [pickerTarget, setPickerTarget] = useState<'day' | 'month' | 'year' | 'hour' | 'minute' | 'period' | null>(null);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle(''); setType('Training');
    setEventDay(''); setEventMonth(''); setEventYear('');
    setEventHour(''); setEventMinute(''); setEventPeriod('');
    setLocation(''); setDescription(''); setIsPublic(false); setError(null);
  }

  useEffect(() => {
    if (!visible) return;
    if (editingEvent) {
      setTitle(editingEvent.title);
      setType(editingEvent.type);
      if (!editingEvent.event_date) {
        setEventDay('');
        setEventMonth('');
        setEventYear('');
      } else {
        const [year, monthNum, day] = editingEvent.event_date.split('-');
        setEventDay(day);
        setEventMonth(MONTHS[parseInt(monthNum, 10) - 1]);
        setEventYear(year);
      }
      const timeMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(editingEvent.event_time);
      if (timeMatch) {
        setEventHour(timeMatch[1]);
        setEventMinute(timeMatch[2]);
        setEventPeriod(timeMatch[3].toUpperCase());
      } else {
        setEventHour('');
        setEventMinute('');
        setEventPeriod('');
      }
      setLocation(editingEvent.location);
      setDescription(editingEvent.description ?? '');
      setIsPublic(editingEvent.is_public);
      setError(null);
    } else {
      reset();
    }
  }, [visible, editingEvent]);

  function handleClose() {
    if (loading) return;
    reset();
    onClose();
  }

  function buildEventDate(day: string, month: string, year: string): string | null {
    if (!day && !month && !year) return null;
    if (!day || !month || !year) return 'incomplete';
    const mIdx = MONTHS.indexOf(month) + 1;
    return `${year}-${String(mIdx).padStart(2, '0')}-${day}`;
  }
  function buildEventTime(hour: string, minute: string, period: string): string | null {
    if (!hour && !minute && !period) return null;
    if (!hour || !minute || !period) return 'incomplete';
    return `${hour}:${minute} ${period}`;
  }

  async function handleCreate() {
    if (!title.trim()) { setError('Title is required.'); return; }
    const builtDate = buildEventDate(eventDay, eventMonth, eventYear);
    if (builtDate === null) { setError('Date is required.'); return; }
    if (builtDate === 'incomplete') { setError('Select a day, month, and year.'); return; }
    const parsedDate = new Date(`${builtDate}T00:00:00Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== builtDate) {
      setError('Enter a valid calendar date.');
      return;
    }
    const builtTime = buildEventTime(eventHour, eventMinute, eventPeriod);
    if (builtTime === 'incomplete') { setError('Select an hour, minute, and AM/PM, or leave time blank.'); return; }
    if (!location.trim()) { setError('Location is required.'); return; }

    setLoading(true);
    setError(null);

    const input: CreateEventInput = {
      title: title.trim(),
      type,
      event_date: builtDate,
      event_time: builtTime ?? '',
      location: location.trim(),
      description: description.trim() || undefined,
      color: TYPE_COLORS[type] ?? Colors.primary,
      is_public: isPublic,
    };

    const { error: err } = editingEvent
      ? await updateEvent(editingEvent.id, input)
      : await createEvent(input);
    setLoading(false);
    if (err) { setError(err); return; }
    reset();
    onCreated();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />

            <View style={s.header}>
              <Text style={s.heading}>{editingEvent ? 'Edit Event' : 'Create Event'}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close event form"
                onPress={handleClose}
                hitSlop={8}
              >
                <X color={Colors.textMuted} size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {error && (
                <View style={s.errorBanner}>
                  <Text style={s.errorTxt}>{error}</Text>
                </View>
              )}

              <View style={s.field}>
                <Text style={s.label}>Title *</Text>
                <TextInput
                  accessibilityLabel="Event title"
                  style={s.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Regional Training Session"
                  placeholderTextColor={Colors.textDisabled}
                  returnKeyType="next"
                />
              </View>

              <View style={s.field}>
                <Text style={s.label}>Type</Text>
                <View style={s.typeGrid}>
                  {EVENT_TYPES.map(t => {
                    const active = type === t;
                    const col = TYPE_COLORS[t];
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[s.typeChip, active && { backgroundColor: `${col}22`, borderColor: col }]}
                        onPress={() => setType(t)}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.typeChipTxt, active && { color: col }]}>{t}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.label}>Date *</Text>
                <View style={s.pickerRow}>
                  <TouchableOpacity style={[s.pickerBtn, s.pickerBtnFlex]} onPress={() => setPickerTarget('day')} activeOpacity={0.7}>
                    <Text style={[s.pickerBtnTxt, !eventDay && s.pickerPlaceholder]}>{eventDay || 'Day'}</Text>
                    <ChevronDown color={Colors.textMuted} size={14} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.pickerBtn, { flex: 1.4 }]} onPress={() => setPickerTarget('month')} activeOpacity={0.7}>
                    <Text style={[s.pickerBtnTxt, !eventMonth && s.pickerPlaceholder]} numberOfLines={1}>{eventMonth || 'Month'}</Text>
                    <ChevronDown color={Colors.textMuted} size={14} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.pickerBtn, s.pickerBtnFlex]} onPress={() => setPickerTarget('year')} activeOpacity={0.7}>
                    <Text style={[s.pickerBtnTxt, !eventYear && s.pickerPlaceholder]}>{eventYear || 'Year'}</Text>
                    <ChevronDown color={Colors.textMuted} size={14} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.field}>
                <Text style={s.label}>Time</Text>
                <View style={s.pickerRow}>
                  <TouchableOpacity style={[s.pickerBtn, s.pickerBtnFlex]} onPress={() => setPickerTarget('hour')} activeOpacity={0.7}>
                    <Text style={[s.pickerBtnTxt, !eventHour && s.pickerPlaceholder]}>{eventHour || 'Hr'}</Text>
                    <ChevronDown color={Colors.textMuted} size={14} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.pickerBtn, s.pickerBtnFlex]} onPress={() => setPickerTarget('minute')} activeOpacity={0.7}>
                    <Text style={[s.pickerBtnTxt, !eventMinute && s.pickerPlaceholder]}>{eventMinute || 'Min'}</Text>
                    <ChevronDown color={Colors.textMuted} size={14} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.pickerBtn, s.pickerBtnFlex]} onPress={() => setPickerTarget('period')} activeOpacity={0.7}>
                    <Text style={[s.pickerBtnTxt, !eventPeriod && s.pickerPlaceholder]}>{eventPeriod || 'AM/PM'}</Text>
                    <ChevronDown color={Colors.textMuted} size={14} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.label}>Location *</Text>
                <View style={s.iconInput}>
                  <MapPin color={Colors.textMuted} size={14} />
                  <TextInput
                    accessibilityLabel="Event location"
                    style={s.iconInputText}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Venue or city"
                    placeholderTextColor={Colors.textDisabled}
                  />
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.label}>Description</Text>
                <TextInput
                  accessibilityLabel="Event description"
                  style={[s.input, s.multiline]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Optional details…"
                  placeholderTextColor={Colors.textDisabled}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={s.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>Make public</Text>
                  <Text style={s.toggleSub}>Visible to other athletes on the platform</Text>
                </View>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ false: Colors.elevated, true: `${Colors.primary}60` }}
                  thumbColor={isPublic ? Colors.primary : Colors.textMuted}
                />
              </View>

              <View style={{ height: 16 }} />
            </ScrollView>

            <View style={s.footer}>
              <TouchableOpacity style={s.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={editingEvent ? 'Save changes' : 'Create event'}
                style={[s.createBtn, loading && { opacity: 0.7 }]}
                onPress={handleCreate}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={s.createTxt}>{editingEvent ? 'Save Changes' : 'Create Event'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
          <InlinePickerSheet
            visible={pickerTarget !== null}
            title={
              pickerTarget === 'day' ? 'Day' : pickerTarget === 'month' ? 'Month' : pickerTarget === 'year' ? 'Year' :
              pickerTarget === 'hour' ? 'Hour' : pickerTarget === 'minute' ? 'Minute' : 'AM / PM'
            }
            items={
              pickerTarget === 'day' ? DAYS.map(d => ({ label: d, value: d })) :
              pickerTarget === 'month' ? MONTHS.map(m => ({ label: m, value: m })) :
              pickerTarget === 'year' ? YEARS.map(y => ({ label: y, value: y })) :
              pickerTarget === 'hour' ? HOURS.map(h => ({ label: h, value: h })) :
              pickerTarget === 'minute' ? MINUTES.map(m => ({ label: m, value: m })) :
              PERIODS.map(p => ({ label: p, value: p }))
            }
            selected={
              pickerTarget === 'day' ? eventDay : pickerTarget === 'month' ? eventMonth : pickerTarget === 'year' ? eventYear :
              pickerTarget === 'hour' ? eventHour : pickerTarget === 'minute' ? eventMinute : eventPeriod
            }
            onSelect={(item) => {
              if (pickerTarget === 'day') setEventDay(item.value);
              else if (pickerTarget === 'month') setEventMonth(item.value);
              else if (pickerTarget === 'year') setEventYear(item.value);
              else if (pickerTarget === 'hour') setEventHour(item.value);
              else if (pickerTarget === 'minute') setEventMinute(item.value);
              else if (pickerTarget === 'period') setEventPeriod(item.value);
            }}
            onClose={() => setPickerTarget(null)}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function InlinePickerSheet({
  visible, title, items, selected, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selected: string;
  onSelect: (item: PickerItem) => void;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={s.inlineOverlay}>
      <TouchableOpacity style={s.inlineBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={s.inlineSheet}>
        <View style={s.inlineHandle} />
        <View style={s.inlineHeader}>
          <Text style={s.inlineTitle}>{title}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Close ${title} picker`} onPress={onClose} hitSlop={8}>
            <X color={Colors.textMuted} size={20} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={items}
          keyExtractor={(i) => i.value}
          style={s.inlineList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const active = item.value === selected;
            return (
              <TouchableOpacity
                style={[s.inlineItem, active && s.inlineItemActive]}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[s.inlineItemTxt, active && s.inlineItemTxtActive]}>{item.label}</Text>
                {active && <CheckCircle2 color={Colors.primary} size={16} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.border,
    maxHeight: '92%',
    ...Shadows.card,
  },
  handle: {
    width: 40, height: 4,
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  heading: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  errorBanner: {
    backgroundColor: `${Colors.error}18`,
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: `${Colors.error}35`,
    marginBottom: Spacing.md,
  },
  errorTxt: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.error,
  },
  field: { marginBottom: Spacing.md },
  row2: { flexDirection: 'row', gap: Spacing.md },
  label: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.elevated,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  multiline: {
    minHeight: 80,
    paddingTop: 11,
  },
  iconInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.elevated,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: 44,
  },
  iconInputText: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radii.full,
    backgroundColor: Colors.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipTxt: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.elevated,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  toggleLabel: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  toggleSub: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.elevated,
  },
  cancelTxt: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.md,
    color: Colors.textMuted,
  },
  createBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
  },
  createTxt: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.md,
    color: Colors.white,
  },
  pickerRow: { flexDirection: 'row', gap: Spacing.sm },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 44 },
  pickerBtnFlex: { flex: 1 },
  pickerBtnTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary },
  pickerPlaceholder: { color: Colors.textDisabled },
  inlineOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 999, elevation: 999 },
  inlineBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)' },
  inlineSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.lg, paddingBottom: Spacing.xxxl, maxHeight: '60%', borderWidth: 1, borderColor: Colors.border, borderBottomWidth: 0 },
  inlineHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.sm },
  inlineHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  inlineTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  inlineList: { maxHeight: 280 },
  inlineItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: Spacing.sm, borderRadius: Radii.md },
  inlineItemActive: { backgroundColor: `${Colors.primary}15` },
  inlineItemTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.md, color: Colors.textPrimary },
  inlineItemTxtActive: { fontFamily: Typography.family.bold, color: Colors.primary },
});
